import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

/** Inline loading spinner with a screen-reader announcement. */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label, className = '' }) => {
  const { t } = useTranslation();
  return (
    <span role="status" className={['inline-flex items-center gap-2 text-stone-400', className].join(' ')}>
      <Loader2 className={[sizeClasses[size], 'animate-spin'].join(' ')} aria-hidden="true" />
      <span className="sr-only">{label ?? t('common.loading')}</span>
    </span>
  );
};

/** Full-region loading state — use in place of a bare spinner for a whole page/panel. */
export const LoadingState: React.FC<{ label?: string }> = ({ label }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label ?? t('common.loading')}</p>
    </div>
  );
};
