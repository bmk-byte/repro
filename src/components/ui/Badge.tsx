import React from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: React.ReactNode;
}

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  primary: 'bg-primary-50 text-primary-dark',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  info: 'bg-info-light text-info-dark',
};

/**
 * Status pill. Semantic tone (success/warning/danger/info) is always paired
 * with the label text itself — color is never the only signal.
 */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', icon, className = '', children, ...props }) => (
  <span
    className={[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      toneClasses[tone],
      className,
    ].join(' ')}
    {...props}
  >
    {icon && <span className="flex-none" aria-hidden="true">{icon}</span>}
    {children}
  </span>
);
