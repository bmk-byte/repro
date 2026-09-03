import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { reportError } from '../lib/errorReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// A class component can't call hooks directly, so the translated fallback UI
// lives in this small functional component instead.
const ErrorFallback: React.FC<{ onReload: () => void }> = ({ onReload }) => {
  const { t } = useTranslation('misc');
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md w-full rounded-xl bg-white p-8 shadow-lg border border-stone-100 text-center">
        <h1 className="text-2xl font-semibold text-stone-900">{t('errorBoundary.title')}</h1>
        <p className="mt-3 text-sm text-stone-600 leading-6">
          {t('errorBoundary.description')}
        </p>
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

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Application crashed:', error);
    reportError(error, { componentStack: info.componentStack });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
