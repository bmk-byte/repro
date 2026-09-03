/**
 * Warms the browser's cache for the lazy-loaded tab components (see the
 * `lazy(() => import(...))` calls in App.tsx) so switching tabs doesn't show
 * a visible loading flash. Calling `import()` again for a module the
 * browser already fetched resolves from cache instantly — this doesn't
 * duplicate the network request, it just moves it earlier.
 *
 * Two triggers, used together (see App.tsx / Navbar.tsx):
 * - `prefetchAllRoutes()`: fired once, during idle time, shortly after a
 *   user signs in — warms everything in the background before they've
 *   clicked anything.
 * - `prefetchRoute(tabId)`: fired on nav-item hover/focus — catches the
 *   case where a user clicks before the idle prefetch has finished.
 */

// Same import specifiers as the `lazy()` calls in App.tsx — must stay in
// sync with that file's lazy component list.
const ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  dashboard: () => import('../components/DashboardLayout'),
  analytics: () => import('../components/AnalyticsPage'),
  cases: () => import('../components/CasesPage'),
  'rapid-response': () => import('../components/RapidResponseCasesPage'),
  'submit-case': () => import('../components/SubmissionForm'),
  'submit-judgment': () => import('../components/SubmissionForm'),
  'upload-case': () => import('../components/SubmissionForm'),
  moderation: () => import('../components/ModerationPage'),
  'moderator-admin': () => import('../components/ModeratorAdminPanel'),
  'admin-management': () => import('../components/AdminManagementPanel'),
  laws: () => import('../components/LawsRepository'),
  judgments: () => import('../components/JudgmentsPage'),
  resources: () => import('../components/ResourcesPage'),
  settings: () => import('../components/SettingsPage'),
};

export function prefetchRoute(tabId: string): void {
  ROUTE_LOADERS[tabId]?.().catch(() => {
    // A failed prefetch (e.g. offline) isn't a real error — the normal
    // lazy() Suspense load will just retry when the tab is actually opened.
  });
}

export function prefetchAllRoutes(): void {
  // SubmissionForm is registered 3x above (one per tab id) but this only
  // needs to fetch each distinct module once.
  const uniqueLoaders = new Set(Object.values(ROUTE_LOADERS));
  uniqueLoaders.forEach((load) => {
    load().catch(() => {});
  });
}

/**
 * Runs `prefetchAllRoutes()` once the browser is idle, so it never competes
 * with the current render for the main thread. Falls back to a short
 * timeout on browsers without `requestIdleCallback` (Safari).
 */
export function schedulePrefetchAllRoutes(): () => void {
  const w = window as typeof window & {
    requestIdleCallback?: (cb: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(() => prefetchAllRoutes());
    return () => w.cancelIdleCallback?.(id);
  }

  const timeoutId = window.setTimeout(prefetchAllRoutes, 1500);
  return () => window.clearTimeout(timeoutId);
}
