import { lazy, type ComponentType } from 'react';

/**
 * Recovery for "stale deploy" chunk failures.
 *
 * Every Vercel deploy publishes new hashed JS chunks and removes the old
 * ones. A browser tab opened before the deploy still references the old
 * chunk names, so the first time it lazy-loads a page it hasn't visited yet
 * the import fails ("Failed to fetch dynamically imported module" /
 * "Importing a module script failed"). Without handling, that error bubbles
 * into the top-level ErrorBoundary and shows the full-screen
 * "Something went wrong" page. A reload fetches the new index.html and fixes
 * it, so we do that reload automatically — at most once per window, guarded
 * by sessionStorage, so a genuinely broken deploy can't cause a reload loop.
 */

const RELOAD_KEY = 'chunk-reload-at';
const RELOAD_WINDOW_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name ?? '';
  const message = String((error as { message?: string }).message ?? error);
  return (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

/**
 * Reloads the page once to pick up the latest deploy. Returns false (and
 * does nothing) if we already reloaded for this reason in the last
 * RELOAD_WINDOW_MS, so the caller can fall back to showing an error.
 */
export function reloadOnceForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode etc.) — still try one reload.
  }
  window.location.reload();
  return true;
}

/**
 * Drop-in replacement for React.lazy that retries a failed import once
 * (covers a transient network blip) and, if it still fails with a chunk
 * error, reloads the page to pick up the current deploy.
 */
export function lazyWithRetry<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (firstError) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        return await factory();
      } catch (error) {
        if (isChunkLoadError(error) && reloadOnceForChunkError()) {
          // Keep Suspense showing its fallback while the page reloads.
          return new Promise<{ default: ComponentType<P> }>(() => {});
        }
        throw error ?? firstError;
      }
    }
  });
}

/**
 * Vite fires `vite:preloadError` when a chunk's preload fails (the same
 * stale-deploy case, caught earlier). Registering it once at startup lets us
 * reload before React ever sees the error.
 */
export function installChunkErrorHandler(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForChunkError()) event.preventDefault();
  });
}
