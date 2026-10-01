import { useTranslation } from 'react-i18next';
import type { ScorecardIndicator as Indicator } from '../types/database';
import { Modal, Button } from '../../components/ui';

interface IndicatorDetailModalProps {
  indicator: Indicator;
  onClose: () => void;
}

export function IndicatorDetailModal({ indicator, onClose }: IndicatorDetailModalProps) {
  const { t } = useTranslation('scorecard');
  const scoringCriteria = indicator.scoring_criteria;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${indicator.code} — ${indicator.title}`}
      size="lg"
      footer={<Button onClick={onClose} className="w-full">{t('indicatorDetailModal.close')}</Button>}
    >
      <section className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {t('indicatorDetailModal.whatIsAssessed')}
        </h3>
        <p className="text-gray-700 leading-relaxed">{indicator.definition}</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          {t('indicatorDetailModal.scoringCriteria')}
        </h3>
        <div className="space-y-3">
          {Object.entries(scoringCriteria).map(([score, description]) => (
            <div
              key={score}
              className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {score}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {indicator.evidence_sources && indicator.evidence_sources.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            {t('indicatorDetailModal.primaryEvidenceSources')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {indicator.evidence_sources.map((source, index) => (
              <div
                key={index}
                className="px-4 py-2 bg-primary-50 border border-primary-200 rounded-md text-sm text-primary-900"
              >
                {source}
              </div>
            ))}
          </div>
        </section>
      )}
    </Modal>
  );
}
