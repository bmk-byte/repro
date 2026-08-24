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
 * Report an error that was already handled locally (e.g. inside an
 * ErrorBoundary or a caught rejection) — a no-op if reporting isn't
 * configured.
 */
export const reportError = (error: unknown, context?: Record<string, unknown>) => {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
};
