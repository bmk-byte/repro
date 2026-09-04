// Signup proxy — same purpose as auth-login: enforces check_rate_limit()
// server-side (service-role key, can't be skipped by calling GoTrue
// directly) before forwarding to Supabase Auth's signup endpoint.
import { createClient } from 'npm:@supabase/supabase-js@2';

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
  // convention.
  try {
    const [emailCheck, ipCheck] = await Promise.all([
      adminClient.rpc('check_rate_limit', {
        p_key: `signup:${email}`,
        p_max_count: EMAIL_MAX,
        p_window_seconds: EMAIL_WINDOW_SECONDS,
      }),
      adminClient.rpc('check_rate_limit', {
        p_key: `signup-ip:${ip}`,
        p_max_count: IP_MAX,
        p_window_seconds: IP_WINDOW_SECONDS,
      }),
    ]);

    if ((!emailCheck.error && emailCheck.data === false) || (!ipCheck.error && ipCheck.data === false)) {
      return errorResponse('Too many signup attempts. Please try again later.', 429, 'rate_limited');
    }
  } catch (err) {
    console.error('auth-signup rate limit check failed, failing open:', err);
  }

  // Forward to GoTrue's signup endpoint as-is. Response shape depends on
  // whether email confirmation is required: a raw User object (no session)
  // when confirmation is pending, or {access_token, refresh_token, user}
  // when it isn't. Auth.tsx handles both.
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, data: body.data ?? {} }),
  });

  const signupData = await signupRes.json();

  return new Response(JSON.stringify(signupData), {
    status: signupRes.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
