// Signup proxy — same purpose as auth-login: enforces check_rate_limit()
// server-side (service-role key, can't be skipped by calling GoTrue
// directly) before forwarding to Supabase Auth's signup endpoint.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimitsFailOpen } from '../_shared/rateLimit.ts';
import { fetchWithTimeout, UpstreamTimeoutError } from '../_shared/fetchWithTimeout.ts';
import { reportEdgeFunctionError } from '../_shared/sentry.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function errorResponse(message: string, status: number, code?: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Signups are rarer than logins, so a tighter per-email limit; per-IP limit
// catches mass account creation from one source across many emails.
const EMAIL_MAX = 3;
const EMAIL_WINDOW_SECONDS = 3600;
const IP_MAX = 10;
const IP_WINDOW_SECONDS = 3600;

interface SignUpRequest {
  email?: string;
  password?: string;
  data?: {
    full_name?: string;
    phone_number?: string;
    profession?: string;
    organization?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  let body: SignUpRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return errorResponse('email and password are required', 400);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Fail OPEN on limiter unavailability — see auth-login for the same
  // convention. Every fail-open path is logged (RATE_LIMITER_FAIL_OPEN).
  const { blocked } = await checkRateLimitsFailOpen(adminClient, 'auth-signup', [
    { key: `signup:${email}`, maxCount: EMAIL_MAX, windowSeconds: EMAIL_WINDOW_SECONDS },
    { key: `signup-ip:${ip}`, maxCount: IP_MAX, windowSeconds: IP_WINDOW_SECONDS },
  ]);

  if (blocked) {
    return errorResponse('Too many signup attempts. Please try again later.', 429, 'rate_limited');
  }

  // Forward to GoTrue's signup endpoint as-is. Response shape depends on
  // whether email confirmation is required: a raw User object (no session)
  // when confirmation is pending, or {access_token, refresh_token, user}
  // when it isn't. Auth.tsx handles both.
  //
  // A timeout here is deliberately NOT retried: a timed-out signup request
  // may have already created the account server-side, so an automatic
  // retry could attempt a duplicate signup. The user sees a clear timeout
  // message and can retry manually (GoTrue will correctly reject a second
  // signup for an email that already exists).
  try {
    const signupRes = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/signup`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, data: body.data ?? {} }),
      },
      10_000
    );

    const signupData = await signupRes.json();

    return new Response(JSON.stringify(signupData), {
      status: signupRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof UpstreamTimeoutError) {
      console.error('auth-signup: upstream GoTrue request timed out');
      await reportEdgeFunctionError(err, { category: 'RELIABILITY', functionName: 'auth-signup', extra: { reason: 'upstream_timeout' } });
      return errorResponse(
        'The sign-up request took too long. If you did not receive confirmation, try signing up again in a moment.',
        504,
        'upstream_timeout'
      );
    }
    console.error('auth-signup: upstream GoTrue request failed:', err);
    await reportEdgeFunctionError(err, { category: 'RELIABILITY', functionName: 'auth-signup', extra: { reason: 'upstream_error' } });
    return errorResponse('Sign-up is temporarily unavailable. Please try again shortly.', 502, 'upstream_error');
  }
});
