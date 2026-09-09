// Shared Sentry wiring for Edge Functions, mirroring the frontend's
// src/lib/errorReporting.ts pattern: no-op unless a DSN is configured, so
// this is safe to import from every function regardless of whether Sentry
// has been set up for this project yet.
//
// IMPORTANT — unverified in this environment: this was written against the
// @sentry/deno package's documented API but could not be executed here (no
// Deno runtime was available). Before relying on this in production:
//   1. Set the SENTRY_DSN secret: supabase secrets set SENTRY_DSN=<your dsn>
//      (the same DSN the frontend's VITE_SENTRY_DSN uses is fine — Sentry
//      DSNs are project-wide, not platform-specific).
//   2. Deploy and trigger one real failure (e.g. a deliberately malformed
//      request) to confirm an event actually arrives in Sentry.
//   3. If @sentry/deno's API has moved on from what's used below, fix this
//      file — it is the only place that imports the package, by design.
export type EdgeErrorCategory =
  | 'SECURITY'
  | 'RELIABILITY'
  | 'PERFORMANCE'
  | 'DATA'
  | 'AUTHENTICATION'
  | 'DEPLOYMENT';

// deno-lint-ignore no-explicit-any
type SentryModule = any;

let sentryModule: SentryModule | null = null;
let initAttempted = false;

/**
 * Lazily imports @sentry/deno only when a DSN is actually configured, and
 * only once. This keeps every caller (including tests, and any deployment
 * that hasn't set SENTRY_DSN yet) fully independent of the package and of
 * network access to resolve the npm: specifier — the import only happens
 * on the code path that needs it.
 */
async function ensureInitialized(): Promise<SentryModule | null> {
  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) return null;
  if (sentryModule) return sentryModule;
  if (initAttempted) return null; // a prior import failed this cold start — don't retry every call
  initAttempted = true;
  try {
    const Sentry = await import('npm:@sentry/deno@^7');
    Sentry.init({ dsn, tracesSampleRate: 0 });
    sentryModule = Sentry;
    return sentryModule;
  } catch (importError) {
    console.error('Failed to load @sentry/deno — Sentry reporting disabled for this cold start:', importError);
    return null;
  }
}

/**
 * Reports an error from an Edge Function to Sentry, tagged with a broad
 * category the same way the frontend's reportError() does — see
 * docs/MONITORING.md. No-op if SENTRY_DSN isn't set; never throws, so a
 * monitoring failure can never break the request it's reporting on.
 *
 * Never pass request bodies, tokens, or passwords in `extra` — only
 * identifiers and operation names (e.g. a rate-limit key, a function name).
 */
export async function reportEdgeFunctionError(
  error: unknown,
  options: { category: EdgeErrorCategory; functionName: string; extra?: Record<string, unknown> }
): Promise<void> {
  try {
    const Sentry = await ensureInitialized();
    if (!Sentry) return;
    Sentry.captureException(error, {
      tags: { category: options.category, function: options.functionName },
      extra: options.extra,
    });
  } catch (reportingError) {
    // Monitoring must never be the thing that breaks a request.
    console.error('reportEdgeFunctionError failed:', reportingError);
  }
}
