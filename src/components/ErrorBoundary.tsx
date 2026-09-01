import React, { ReactNode } from 'react';
import { reportError } from '../lib/errorReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

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
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
          <div className="max-w-md w-full rounded-xl bg-white p-8 shadow-lg border border-stone-100 text-center">
            <h1 className="text-2xl font-semibold text-stone-900">Something went wrong</h1>
            <p className="mt-3 text-sm text-stone-600 leading-6">
              The dashboard encountered an unexpected error. Reloading the page should fix it.
            </p>
            <button
              onClick={this.handleReload}
              className="mt-6 inline-flex items-center rounded-md bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
            >
              Reload dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
