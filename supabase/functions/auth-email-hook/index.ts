// Supabase Auth "Send Email" Hook — replaces Supabase Auth's built-in
// signup/password-reset/email-change/magic-link emails with Resend, so every
// email the app sends (transactional or auth) shares the same branding.
//
// This function is NOT active until manually wired up in the Supabase
// Dashboard: Authentication -> Hooks -> "Send Email hook" -> point it at this
// function's deployed URL, and set a signing secret both there and as this
// function's SEND_EMAIL_HOOK_SECRET env var. Until that's done, Supabase
// keeps using its own built-in email delivery and this function is unused.
//
// IMPORTANT: once enabled, if this function errors, the auth request itself
// (signup, password reset, etc.) fails — there is no fallback to Supabase's
// built-in email. Test signup and password-reset end-to-end on a throwaway
// account immediately after enabling the hook.
import { Webhook } from 'npm:standardwebhooks@1.0.0';

// NOTE: this function's error responses deliberately do NOT use the shared
// `_shared/errorResponse.ts` helper. Supabase's Auth "Send Email" hook
// contract requires the specific nested `{ error: { http_code, message } }`
// shape below — GoTrue parses that exact structure to decide how to surface
// the failure to the signup/reset request. Using the app's own generic
// `{ error, code, status }` shape here would silently break that contract.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'onboarding@resend.dev';
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET');

interface HookPayload {
  user: { email: string };
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | 'signup'
      | 'recovery'
      | 'email_change'
      | 'magiclink'
      | 'invite'
      | 'reauthentication'
      | 'password_changed_notification';
    site_url: string;
    token_hash_new?: string;
  };
}

interface RenderEmailOptions {
  heading: string;
  body: string;
  /** Omit for a pure notification with nothing to act on (no verification link exists, e.g. "your password was changed"). */
  cta?: { label: string; url: string };
}

function renderEmail({ heading, body, cta }: RenderEmailOptions): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #9C1D20; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: #fff; font-size: 18px; font-weight: 600;">ReproPulse</span>
      </div>
      <div style="border: 1px solid #E7E3DB; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
        <h1 style="margin: 0 0 12px; font-size: 18px; color: #25211A;">${heading}</h1>
        <p style="margin: 0 0 ${cta ? '20px' : '0'}; font-size: 14px; line-height: 1.6; color: #524A3C;">${body}</p>
        ${
          cta
            ? `<a href="${cta.url}" style="display: inline-block; background: #9C1D20; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">${cta.label}</a>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #F3F1ED;">
          <p style="margin: 0; font-size: 12px; color: #8A7F6C;">Having trouble with the button? Paste this link into your browser instead:</p>
          <p style="margin: 6px 0 0; font-size: 12px; color: #B3A996; word-break: break-all;">${cta.url}</p>
        </div>`
            : ''
        }
      </div>
    </div>
  `;
}

function buildEmail(payload: HookPayload): { subject: string; html: string } {
  const { email_data } = payload;
  // /auth/v1/verify only exists on the Supabase project's own API host, not
  // the app's Site URL — SUPABASE_URL is a reserved env var Supabase injects
  // into every edge function automatically, no manual setup needed.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${email_data.redirect_to}`;

  switch (email_data.email_action_type) {
    case 'signup':
    case 'invite':
      return {
        subject: 'Confirm your ReproPulse account',
        html: renderEmail({
          heading: 'Confirm your email',
          body: 'Welcome to ReproPulse. Click below to confirm your email address and activate your account.',
          cta: { label: 'Confirm Email', url: verifyUrl },
        }),
      };
    case 'recovery':
    case 'reauthentication':
      return {
        subject: 'Reset your ReproPulse password',
        html: renderEmail({
          heading: 'Reset your password',
          body: "We received a request to reset your ReproPulse password. If you didn't make this request, you can safely ignore this email.",
          cta: { label: 'Reset Password', url: verifyUrl },
        }),
      };
    case 'email_change':
      return {
        subject: 'Confirm your new email address',
        html: renderEmail({
          heading: 'Confirm your new email',
          body: 'Click below to confirm this new email address for your ReproPulse account.',
          cta: { label: 'Confirm Email', url: verifyUrl },
        }),
      };
    case 'magiclink':
      return {
        subject: 'Your ReproPulse sign-in link',
        html: renderEmail({
          heading: 'Sign in to ReproPulse',
          body: 'Click below to sign in.',
          cta: { label: 'Sign In', url: verifyUrl },
        }),
      };
    case 'password_changed_notification':
      // Pure security notice — no token is issued for this type, so there's
      // nothing to verify and no CTA to show.
      return {
        subject: 'Your ReproPulse password was changed',
        html: renderEmail({
          heading: 'Password changed',
          body: "Your ReproPulse account password was just changed. If you made this change, no action is needed. If you didn't, please contact an administrator immediately — your account may be compromised.",
        }),
      };
    default:
      return {
        subject: 'ReproPulse account notice',
        html: renderEmail({
          heading: 'Account notice',
          body: 'Something changed on your ReproPulse account. If this was you, no action is needed.',
        }),
      };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!RESEND_API_KEY || !HOOK_SECRET) {
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Email hook is not configured' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);

  try {
    // Supabase's dashboard secret is prefixed like "v1,whsec_..." — the
    // standardwebhooks library expects just the base64 secret.
    const secret = HOOK_SECRET.replace(/^v1,/, '').replace(/^whsec_/, '');
    const wh = new Webhook(secret);
    const payload = wh.verify(payloadText, headers) as HookPayload;

    const { subject, html } = buildEmail(payload);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: payload.user.email, subject, html }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      throw new Error(`Resend API error: ${errText}`);
    }
  } catch (error) {
    console.error('auth-email-hook error:', error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 401,
          message: error instanceof Error ? error.message : 'Failed to send auth email',
        },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
