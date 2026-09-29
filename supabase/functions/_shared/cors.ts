// Shared CORS helper for Edge Functions invoked directly from the browser
// (auth-login, auth-signup, send-email). These previously hardcoded
// `Access-Control-Allow-Origin: '*'`, which lets any website's script call
// them cross-origin using a visitor's browser — unnecessary here since only
// this app's own frontend ever needs to call them. Allow-listing the known
// origin(s) and echoing back the request's Origin only when it matches
// closes that off without needing a preflight-breaking hardcoded single
// value (a `Vary: Origin` header tells caches the response depends on it).
//
// `ALLOWED_ORIGIN` (a Supabase Edge Function secret, not committed anywhere)
// lets a staging/preview/local-dev deployment add its own origin without a
// code change — unset in production, where only the canonical domain below
// is needed.

const PRODUCTION_ORIGIN = 'https://repropulseafyanahaki.org';

function getAllowedOrigins(): string[] {
  const extra = Deno.env.get('ALLOWED_ORIGIN');
  return extra ? [PRODUCTION_ORIGIN, extra] : [PRODUCTION_ORIGIN];
}

/**
 * Builds CORS response headers for a given request. Only includes
 * `Access-Control-Allow-Origin` when the request's `Origin` header matches
 * the allow-list — otherwise the header is omitted entirely, which makes
 * the browser reject the cross-origin response (fail closed).
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };

  if (origin && getAllowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}
