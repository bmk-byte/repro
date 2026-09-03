import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export interface ErrorStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

/** Consistent "something went wrong" panel — used for failed data fetches, with an optional retry action. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="text-danger" aria-hidden="true">
        {icon ?? <AlertTriangle className="h-8 w-8" />}
      </div>
      <p className="text-base font-medium text-stone-700">{title ?? t('common.somethingWentWrong')}</p>
      {description && <p className="max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
