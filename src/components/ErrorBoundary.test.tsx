import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from './ErrorBoundary';
import { isChunkLoadError } from '../lib/chunkRecovery';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let shouldThrow = true;
const Boom = () => {
  if (shouldThrow) throw new Error('render failed');
  return <p>recovered</p>;
};

describe('isChunkLoadError', () => {
  it('recognises stale-deploy chunk failures across browsers', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
  });

  it('ignores ordinary errors', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of null (reading 'map')"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('section variant shows an in-page card and recovers on retry', () => {
    render(
      <ErrorBoundary variant="section">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('errorBoundary.sectionTitle')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByText('errorBoundary.tryAgain'));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('resets automatically when resetKey changes (tab navigation)', () => {
    const { rerender } = render(
      <ErrorBoundary variant="section" resetKey="cases">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    rerender(
      <ErrorBoundary variant="section" resetKey="judgments">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('app variant keeps the full-screen fallback', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('errorBoundary.title')).toBeInTheDocument();
  });
});
