import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Consistent "nothing here yet" panel — used for empty lists and zero-result searches. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
    {icon && <div className="text-stone-300" aria-hidden="true">{icon}</div>}
    <p className="text-base font-medium text-stone-700">{title}</p>
    {description && <p className="max-w-sm text-sm text-stone-500">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
