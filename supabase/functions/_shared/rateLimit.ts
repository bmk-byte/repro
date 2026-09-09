// Shared rate-limit-check helper for the auth-login/auth-signup proxies.
//
// The limiter is deliberately fail-open: if check_rate_limit() itself
// errors (DB unavailable, RPC misconfigured, etc.), the request is allowed
// through rather than locking every user out of login/signup because of an
// unrelated infrastructure problem. That trade-off is intentional and is
// NOT changed here.
//
// What this file adds is observability: previously, an RPC-level error
// (adminClient.rpc() resolving with `.error` set, as opposed to throwing)
// was never logged at all — only a thrown exception from the network call
// itself hit the surrounding try/catch. A silent-fail-open on every login
// during a limiter outage is exactly the kind of failure that should be
// loud in logs even though it must not be loud to the end user.
//
// This logs via console.error with a greppable marker
// (RATE_LIMITER_FAIL_OPEN), which lands in Supabase's Function Logs, and
// also reports to Sentry (see _shared/sentry.ts) under the SECURITY
// category — a limiter outage is a security-relevant availability
// decision (fail open), not just an operational hiccup. Sentry reporting
// is a no-op until the SENTRY_DSN function secret is configured; see
// sentry.ts's header comment for setup and the "unverified in this
// environment" caveat.

import { reportEdgeFunctionError } from './sentry.ts';

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface RateLimitCheck {
  key: string;
  maxCount: number;
  windowSeconds: number;
}

interface RateLimitResult {
  /** true if the request should be BLOCKED (a real, non-error `false` from the RPC) */
  blocked: boolean;
  /** true if the limiter itself failed for at least one check (fail-open path taken) */
  limiterFailed: boolean;
}

/**
 * Runs one or more check_rate_limit() calls in parallel. Blocks only on an
 * explicit `false` result from a check that did not itself error. Any RPC
 * error (or a thrown exception from the call) is logged and treated as
 * fail-open — the caller proceeds — but `limiterFailed` tells the caller
 * that happened, so it can decide whether to log/report further.
 */
export async function checkRateLimitsFailOpen(
  adminClient: SupabaseClient,
  functionName: string,
  checks: RateLimitCheck[]
): Promise<RateLimitResult> {
  try {
    const results = await Promise.all(
      checks.map(check =>
        adminClient.rpc('check_rate_limit', {
          p_key: check.key,
          p_max_count: check.maxCount,
          p_window_seconds: check.windowSeconds,
        })
      )
    );

    let limiterFailed = false;
    let blocked = false;

    // Sequential, not Promise.all: this only runs at most twice per request
    // (email + IP checks) and it matters that every report is actually
    // awaited before the function returns — an Edge Function isolate can
    // be torn down right after the response is sent, and a fire-and-forget
    // reporting call risks never completing (see sentry.ts).
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      if (result.error) {
        limiterFailed = true;
        console.error(
          `RATE_LIMITER_FAIL_OPEN function=${functionName} key=${checks[index].key} reason=rpc_error`,
          result.error
        );
        await reportEdgeFunctionError(result.error, {
          category: 'SECURITY',
          functionName,
          extra: { reason: 'rpc_error', key: checks[index].key },
        });
        continue;
      }
      if (result.data === false) {
        blocked = true;
      }
    }

    return { blocked, limiterFailed };
  } catch (err) {
    const keys = checks.map(c => c.key).join(',');
    console.error(`RATE_LIMITER_FAIL_OPEN function=${functionName} reason=exception keys=${keys}`, err);
    await reportEdgeFunctionError(err, { category: 'SECURITY', functionName, extra: { reason: 'exception', keys } });
    return { blocked: false, limiterFailed: true };
  }
}
