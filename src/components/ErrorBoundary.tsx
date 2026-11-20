import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { reportError } from '../lib/errorReporting';
import { isChunkLoadError, reloadOnceForChunkError } from '../lib/chunkRecovery';

interface Props {
  children: ReactNode;
  /**
   * 'app' (default) is the last-resort full-screen fallback. 'section' is a
   * compact in-page card used around individual tabs, so a crash in one
   * page doesn't take down the navbar and every other page with it.
   */
  variant?: 'app' | 'section';
  /**
   * When this value changes the boundary clears its error — e.g. pass the
   * current route so navigating to another tab recovers automatically.
   */
  resetKey?: unknown;
  /** Extra tag sent with the error report, e.g. the tab name. */
  name?: string;
}

interface State {
  error: unknown;
  hasError: boolean;
}

// A class component can't call hooks directly, so the translated fallback UI
// lives in these small functional components instead.
const AppFallback: React.FC<{ onReload: () => void; error: unknown }> = ({ onReload, error }) => {
  const { t } = useTranslation('misc');
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md w-full rounded-xl bg-white p-8 shadow-lg border border-stone-100 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">{t('errorBoundary.title')}</h1>
        <p className="mt-3 text-sm text-stone-600 leading-6">
          {t('errorBoundary.description')}
        </p>
        <DevErrorDetails error={error} />
        <button
          onClick={onReload}
          className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
        >
          {t('errorBoundary.reload')}
        </button>
      </div>
    </div>
  );
};

const SectionFallback: React.FC<{ onRetry: () => void; error: unknown }> = ({ onRetry, error }) => {
  const { t } = useTranslation('misc');
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">{t('errorBoundary.sectionTitle')}</h2>
      <p className="mt-2 text-sm text-stone-600">{t('errorBoundary.sectionDescription')}</p>
      <DevErrorDetails error={error} />
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
      >
        {t('errorBoundary.tryAgain')}
      </button>
    </div>
  );
};

// Shows the actual error message in local development only, so a crash can
// be diagnosed from the screen instead of digging through the console.
const DevErrorDetails: React.FC<{ error: unknown }> = ({ error }) => {
  if (!import.meta.env.DEV || !error) return null;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    <pre className="mt-4 max-h-40 overflow-auto rounded bg-stone-100 p-3 text-left text-xs text-danger-dark whitespace-pre-wrap">
      {message}
    </pre>
  );
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // A stale-deploy chunk failure is fixed by loading the new build, so
    // do that silently instead of showing an error (at most once — see
    // chunkRecovery.ts — so a truly broken deploy still shows the fallback).
    if (isChunkLoadError(error) && reloadOnceForChunkError()) return;

    console.error(`Application crashed${this.props.name ? ` in ${this.props.name}` : ''}:`, error);
    reportError(error, {
      componentStack: info.componentStack,
      boundary: this.props.name ?? this.props.variant ?? 'app',
      category: 'RELIABILITY',
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && !Object.is(prevProps.resetKey, this.props.resetKey)) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.variant === 'section' ? (
        <SectionFallback onRetry={this.handleRetry} error={this.state.error} />
      ) : (
        <AppFallback onReload={this.handleReload} error={this.state.error} />
      );
    }
    return this.props.children;
  }
}
