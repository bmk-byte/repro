// Login proxy — enforces check_rate_limit() server-side (via the service-role
// key, so it can't be skipped by calling GoTrue directly) before forwarding
// the password grant to Supabase Auth. Closes the gap where a caller could
// bypass the client-side rate-limit RPC by calling
// supabase.auth.signInWithPassword() directly. Auth.tsx calls this function
// instead of the SDK's signInWithPassword; on success it hydrates the
// session locally via supabase.auth.setSession().
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

// Per-email limit matches the UX-level check this replaces; per-IP limit is
// new — it catches an attacker who spreads guesses across many email
// addresses from one source instead of hammering a single account.
const EMAIL_MAX = 5;
const EMAIL_WINDOW_SECONDS = 300;
const IP_MAX = 20;
const IP_WINDOW_SECONDS = 300;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  let body: { email?: string; password?: string };
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

  // Fail OPEN on limiter unavailability, same convention as send-email and
  // the rate-limit migration comments — a limiter outage must never lock
  // everyone out of login. Only an explicit `false` result blocks. Every
  // fail-open path is logged (RATE_LIMITER_FAIL_OPEN) so a persistent
  // limiter outage is discoverable in Supabase Function Logs instead of
  // being silently invisible.
  const { blocked } = await checkRateLimitsFailOpen(adminClient, 'auth-login', [
    { key: `login:${email}`, maxCount: EMAIL_MAX, windowSeconds: EMAIL_WINDOW_SECONDS },
    { key: `login-ip:${ip}`, maxCount: IP_MAX, windowSeconds: IP_WINDOW_SECONDS },
  ]);

  if (blocked) {
    return errorResponse('Too many login attempts. Please try again later.', 429, 'rate_limited');
  }

  // Forward straight to GoTrue's own token endpoint and pass its response
  // through as-is (status included) — the client already knows how to parse
  // this shape (access_token/refresh_token/user on success, msg/error_description
  // on failure), it's exactly what supabase-js itself would have received.
  //
  // A timeout (not a retry: a timed-out password grant may have already
  // succeeded server-side, so retrying is not safe here) fails gracefully
  // with a message the client already knows how to show via
  // proxyErrorMessage().
  try {
    const tokenRes = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      },
      10_000
    );

    const tokenData = await tokenRes.json();

    return new Response(JSON.stringify(tokenData), {
      status: tokenRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof UpstreamTimeoutError) {
      console.error('auth-login: upstream GoTrue request timed out');
      await reportEdgeFunctionError(err, { category: 'RELIABILITY', functionName: 'auth-login', extra: { reason: 'upstream_timeout' } });
      return errorResponse('The sign-in request took too long. Please try again.', 504, 'upstream_timeout');
    }
    console.error('auth-login: upstream GoTrue request failed:', err);
    await reportEdgeFunctionError(err, { category: 'RELIABILITY', functionName: 'auth-login', extra: { reason: 'upstream_error' } });
    return errorResponse('Sign-in is temporarily unavailable. Please try again shortly.', 502, 'upstream_error');
  }
});
