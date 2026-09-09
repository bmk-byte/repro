// Deno test for the lazy Sentry wiring. Same execution caveat as the other
// files in this directory — not run in this authoring environment (no
// Deno runtime available). Run with: deno test supabase/functions/_shared/
//
// Deliberately does NOT test the "SENTRY_DSN is set" path here: that would
// require either real network access to resolve npm:@sentry/deno or a
// mocked dynamic import, and getting that mock wrong could hide a real
// integration bug. The "unverified in this environment" caveat in
// sentry.ts is honest about this gap — verify the DSN-configured path
// manually against a real Sentry project (see that file's header) rather
// than trusting a mocked test of it.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { reportEdgeFunctionError } from './sentry.ts';

Deno.test('is a no-op and does not throw when SENTRY_DSN is not set', async () => {
  const original = Deno.env.get('SENTRY_DSN');
  Deno.env.delete('SENTRY_DSN');
  try {
    // Should resolve cleanly with no network access attempted at all.
    await reportEdgeFunctionError(new Error('test error'), {
      category: 'SECURITY',
      functionName: 'test-fn',
    });
    assertEquals(true, true); // reaching here means it didn't throw
  } finally {
    if (original !== undefined) Deno.env.set('SENTRY_DSN', original);
  }
});

Deno.test('never throws even if the reported error is unusual (null, undefined, a string)', async () => {
  Deno.env.delete('SENTRY_DSN');
  for (const weirdError of [null, undefined, 'a plain string error', 42]) {
    await reportEdgeFunctionError(weirdError, { category: 'RELIABILITY', functionName: 'test-fn' });
  }
  assertEquals(true, true);
});
