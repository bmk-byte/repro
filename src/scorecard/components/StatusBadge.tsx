import { useTranslation } from 'react-i18next';
import { FileEdit, Clock, Eye } from 'lucide-react';
import { Badge } from '../../components/ui';

interface StatusBadgeProps {
  status: 'draft' | 'submitted' | 'published';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation('scorecard');

  if (status === 'submitted') {
    return (
      <Badge tone="warning" icon={<Clock className="w-4 h-4" />}>
        {t('status.submitted')}
      </Badge>
    );
  }

  if (status === 'published') {
    return (
      <Badge tone="success" icon={<Eye className="w-4 h-4" />}>
        {t('status.published')}
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" icon={<FileEdit className="w-4 h-4" />}>
      {t('status.draft')}
    </Badge>
  );
}
