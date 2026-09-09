import * as Sentry from '@sentry/react';

/**
 * Production error reporting. No-op unless VITE_SENTRY_DSN is set, so local
 * development and any deployment that hasn't configured a DSN yet keep
 * working exactly as before — this only adds visibility, it never gates
 * anything.
 */
export const initErrorReporting = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info('VITE_SENTRY_DSN not set — error reporting disabled.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
};

/**
 * Broad operational category for an error, used as a Sentry tag so events
 * can be filtered/alerted on without parsing free-text messages. Keep this
 * list small and stable — it's meant to answer "what kind of problem is
 * this" at a glance in the Sentry issue list, not to replace `context`.
 */
export type ErrorCategory =
  | 'SECURITY'
  | 'RELIABILITY'
  | 'PERFORMANCE'
  | 'DATA'
  | 'AUTHENTICATION'
  | 'DEPLOYMENT';

interface ReportErrorOptions extends Record<string, unknown> {
  category?: ErrorCategory;
}

/**
 * Report an error that was already handled locally (e.g. inside an
 * ErrorBoundary or a caught rejection) — a no-op if reporting isn't
 * configured.
 *
 * `context.category` (if provided) is sent as a Sentry tag (`category`) so
 * issues can be filtered by SECURITY/RELIABILITY/PERFORMANCE/DATA/
 * AUTHENTICATION/DEPLOYMENT in the Sentry UI. Everything else in `context`
 * is attached as extra data. Never pass raw request bodies, tokens,
 * passwords, or full case/user records here — only identifiers and
 * operation names.
 */
export const reportError = (error: unknown, context?: ReportErrorOptions) => {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  const { category, ...extra } = context ?? {};
  Sentry.captureException(error, {
    tags: category ? { category } : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  });
};
