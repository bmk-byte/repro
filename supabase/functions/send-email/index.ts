import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'onboarding@resend.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Uniform `{ error, code?, status }` shape for this function's error responses. */
function errorResponse(message: string, status: number, extraHeaders: Record<string, string> = {}, code?: string): Response {
  return new Response(
    JSON.stringify({ error: message, code, status }),
    { status, headers: { ...extraHeaders, 'Content-Type': 'application/json' } }
  );
}

// 20 emails/hour/user — generous for legitimate use (submission confirmations,
// moderation decisions, moderator grant/revoke notices) while closing the
// open-relay-via-Resend risk of an unthrottled authenticated-only function.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return errorResponse('RESEND_API_KEY is not configured', 500, corsHeaders);
  }

  // Only signed-in users may trigger an email send
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('Missing Authorization header', 401, corsHeaders);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return errorResponse('Unauthorized', 401, corsHeaders);
  }

  // Fail OPEN on limiter unavailability — availability of the email feature
  // matters more than perfect rate limiting for a low-volume transactional
  // sender, and a limiter outage should never block a real notification.
  try {
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_key: `send-email:${user.id}`,
      p_max_count: RATE_LIMIT_MAX,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    });

    if (!rateLimitError && allowed === false) {
      return errorResponse('Too many emails sent. Please try again later.', 429, corsHeaders, 'rate_limited');
    }
  } catch (err) {
    console.error('send-email rate limit check failed, failing open:', err);
  }

  let body: SendEmailRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400, corsHeaders);
  }

  const { to, subject, html } = body;
  if (!to || !subject || !html) {
    return errorResponse('to, subject and html are required', 400, corsHeaders);
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });

  const resendData = await resendRes.json();

  return new Response(JSON.stringify(resendData), {
    status: resendRes.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
