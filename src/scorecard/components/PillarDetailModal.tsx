import { useTranslation } from 'react-i18next';
import type { ScorecardPillar as Pillar, ScorecardIndicator as Indicator } from '../types/database';
import { Modal, Button } from '../../components/ui';

interface PillarDetailModalProps {
  pillar: Pillar;
  indicators: Indicator[];
  onClose: () => void;
}

export function PillarDetailModal({
  pillar,
  indicators,
  onClose,
}: PillarDetailModalProps) {
  const { t } = useTranslation('scorecard');

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${pillar.code} — ${pillar.title}`}
      size="xl"
      footer={<Button onClick={onClose} className="w-full">{t('indicatorDetailModal.close')}</Button>}
    >
      <section className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          {t('pillarDetailModal.description')}
        </h3>
        <p className="text-gray-700 leading-relaxed">{pillar.description}</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          {t('pillarDetailModal.policyScope')}
        </h3>
        <p className="text-gray-700 leading-relaxed">
          {t('pillarDetailModal.policyScopeDescription', { count: indicators.length, weight: pillar.weight })}
        </p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {t('pillarDetailModal.indicatorsInPillar', { count: indicators.length })}
        </h3>
        <div className="space-y-4">
          {indicators.map((indicator) => (
            <div
              key={indicator.id}
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-start gap-3 mb-2">
                <span className="font-mono text-sm font-bold text-primary-600 bg-primary-100 px-2 py-1 rounded">
                  {indicator.code}
                </span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {indicator.title}
                  </h4>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed ml-16">
                {indicator.definition}
              </p>
            </div>
          ))}
        </div>
      </section>
    </Modal>
  );
}
