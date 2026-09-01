import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...props
}) => (
  <div
    className={[
      'rounded-xl border border-stone-200 bg-white shadow-card',
      hoverable && 'transition-shadow duration-200 hover:shadow-raised',
      paddingClasses[padding],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={['flex items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-4', className].join(' ')} {...props}>
    {children}
  </div>
);
