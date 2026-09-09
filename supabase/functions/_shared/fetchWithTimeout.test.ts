// Deno test for the shared fetch-with-timeout wrapper. Run with:
// deno test supabase/functions/_shared/
//
// Not executed in this authoring environment (no Deno runtime available) —
// see rateLimit.test.ts for the same caveat. Run via CI or a local Deno
// install before relying on it.
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchWithTimeout, UpstreamTimeoutError } from './fetchWithTimeout.ts';

Deno.test('resolves normally when the request completes before the timeout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(new Response('ok', { status: 200 }));
  try {
    const res = await fetchWithTimeout('https://example.test', {}, 1000);
    assertEquals(res.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('throws UpstreamTimeoutError when the request is aborted by the timeout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_input: string | URL | Request, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  try {
    await assertRejects(
      () => fetchWithTimeout('https://example.test', {}, 10),
      UpstreamTimeoutError
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('propagates a non-abort error unchanged', async () => {
  const originalFetch = globalThis.fetch;
  const networkError = new Error('network down');
  globalThis.fetch = () => Promise.reject(networkError);
  try {
    await assertRejects(
      () => fetchWithTimeout('https://example.test', {}, 1000),
      Error,
      'network down'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
