import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

/** Inline loading spinner with a screen-reader announcement. */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label = 'Loading', className = '' }) => (
  <span role="status" className={['inline-flex items-center gap-2 text-stone-400', className].join(' ')}>
    <Loader2 className={[sizeClasses[size], 'animate-spin'].join(' ')} aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </span>
);

/** Full-region loading state — use in place of a bare spinner for a whole page/panel. */
export const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
    <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
    <p className="text-sm">{label}</p>
  </div>
);
