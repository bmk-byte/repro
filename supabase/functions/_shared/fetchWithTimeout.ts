// Shared timeout wrapper for outbound fetch() calls from Edge Functions
// (GoTrue token/signup endpoints today). GoTrue's password-grant and
// signup endpoints are NOT safe to blindly retry on timeout: a timed-out
// request may have already succeeded server-side (a session issued, or an
// account created), so retrying could attempt a duplicate signup or mask a
// real failure as a false negative. This wrapper therefore only adds a
// timeout with a clear error — no retry — leaving retry decisions to the
// caller if a specific operation is later proven idempotent.

export class UpstreamTimeoutError extends Error {
  constructor(message = 'Upstream request timed out') {
    super(message);
    this.name = 'UpstreamTimeoutError';
  }
}

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new UpstreamTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
