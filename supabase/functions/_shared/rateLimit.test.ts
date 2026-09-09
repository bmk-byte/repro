// Deno test for the shared rate-limit-check helper used by auth-login and
// auth-signup. Run with: deno test supabase/functions/_shared/
//
// This environment did not have a Deno runtime available to execute this
// file during authoring — it was written to Deno's standard `Deno.test`
// API and reviewed for correctness against that API, but has not been run
// here. Run it in CI (see .github/workflows/ci.yml, "edge-functions" job)
// or locally with the Deno CLI installed before relying on it.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkRateLimitsFailOpen } from './rateLimit.ts';

function fakeAdminClient(responses: Array<{ data?: boolean; error?: unknown }>) {
  let call = 0;
  return {
    rpc: (_fn: string, _args: Record<string, unknown>) => {
      const response = responses[call] ?? { data: true };
      call += 1;
      return Promise.resolve(response);
    },
  };
}

Deno.test('allows the request when all checks return true (under the limit)', async () => {
  const client = fakeAdminClient([{ data: true }, { data: true }]);
  const result = await checkRateLimitsFailOpen(client, 'test-fn', [
    { key: 'a', maxCount: 5, windowSeconds: 60 },
    { key: 'b', maxCount: 5, windowSeconds: 60 },
  ]);
  assertEquals(result.blocked, false);
  assertEquals(result.limiterFailed, false);
});

Deno.test('blocks the request when any check returns false', async () => {
  const client = fakeAdminClient([{ data: true }, { data: false }]);
  const result = await checkRateLimitsFailOpen(client, 'test-fn', [
    { key: 'a', maxCount: 5, windowSeconds: 60 },
    { key: 'b', maxCount: 5, windowSeconds: 60 },
  ]);
  assertEquals(result.blocked, true);
  assertEquals(result.limiterFailed, false);
});

Deno.test('fails open (does not block) when a check errors, and reports limiterFailed', async () => {
  const client = fakeAdminClient([{ error: new Error('db unavailable') }, { data: true }]);
  const result = await checkRateLimitsFailOpen(client, 'test-fn', [
    { key: 'a', maxCount: 5, windowSeconds: 60 },
    { key: 'b', maxCount: 5, windowSeconds: 60 },
  ]);
  assertEquals(result.blocked, false);
  assertEquals(result.limiterFailed, true);
});

Deno.test('fails open when the RPC call itself throws', async () => {
  const client = {
    rpc: () => Promise.reject(new Error('network error')),
  };
  const result = await checkRateLimitsFailOpen(client, 'test-fn', [
    { key: 'a', maxCount: 5, windowSeconds: 60 },
  ]);
  assertEquals(result.blocked, false);
  assertEquals(result.limiterFailed, true);
});

Deno.test('a real false result still blocks even if a different check errors', async () => {
  // Order matters here: error first, explicit false second — both signals
  // must be honored (fail open on the error, but still block on the false).
  const client = fakeAdminClient([{ error: new Error('db unavailable') }, { data: false }]);
  const result = await checkRateLimitsFailOpen(client, 'test-fn', [
    { key: 'a', maxCount: 5, windowSeconds: 60 },
    { key: 'b', maxCount: 5, windowSeconds: 60 },
  ]);
  assertEquals(result.blocked, true);
  assertEquals(result.limiterFailed, true);
});
