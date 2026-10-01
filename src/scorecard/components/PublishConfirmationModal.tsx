import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui';

interface PublishConfirmationModalProps {
  countryName: string;
  totalIndicators: number;
  scoredIndicators: number;
  compositeScore: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PublishConfirmationModal({
  countryName,
  totalIndicators,
  scoredIndicators,
  compositeScore,
  onConfirm,
  onCancel,
}: PublishConfirmationModalProps) {
  const { t } = useTranslation('scorecard');
  const completeness = totalIndicators > 0
    ? Math.round((scoredIndicators / totalIndicators) * 100)
    : 0;
  const isComplete = completeness === 100;

  return (
    <ConfirmDialog
      isOpen
      onClose={onCancel}
      onConfirm={onConfirm}
      title={t('publishConfirmation.title')}
      confirmLabel={t('publishConfirmation.confirmPublish')}
      description={
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>{t('publishConfirmation.willMakeVisibleStrong')}</strong> {t('publishConfirmation.willMakeVisibleRest')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('publishConfirmation.country')}</span>
              <span className="font-semibold text-gray-900">{countryName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('publishConfirmation.indicatorsScored')}</span>
              <span className="font-semibold text-gray-900">
                {t('publishConfirmation.indicatorsScoredValue', { scored: scoredIndicators, total: totalIndicators, pct: completeness })}
              </span>
            </div>

            {compositeScore !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('publishConfirmation.compositeScore')}</span>
                <span className="font-semibold text-gray-900">
                  {compositeScore.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {isComplete ? (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <strong>{t('publishConfirmation.completeLabel')}</strong> {t('publishConfirmation.completeDetail')}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>{t('publishConfirmation.incompleteLabel')}</strong> {t('publishConfirmation.incompleteDetail')}
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
