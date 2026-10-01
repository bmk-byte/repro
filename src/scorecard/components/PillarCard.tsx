import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import type { ScorecardPillar as Pillar } from '../types/database';
import { getPerformanceLevel, getPerformanceColor } from '../lib/scoring';

interface PillarCardProps {
  pillar: Pillar;
  average: number;
  weightedContribution: number;
  onClick?: () => void;
}

export function PillarCard({
  pillar,
  average,
  weightedContribution,
  onClick,
}: PillarCardProps) {
  const { t } = useTranslation('scorecard');
  const performanceLevel = getPerformanceLevel(average);
  const colorClass = getPerformanceColor(performanceLevel);
  const performanceLabel = t(`performance.${performanceLevel}`);

  return (
    <button
      onClick={onClick}
      className="w-full p-5 bg-white border-2 rounded-lg shadow-sm hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-500 mb-1">{pillar.code}</div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
            {pillar.title}
          </h3>
        </div>
        <Info className="w-5 h-5 text-gray-400 group-hover:text-primary-500 flex-shrink-0 ml-2" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">{t('pillarCard.score')}</div>
          <div className="text-2xl font-bold text-gray-900">
            {average.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">{t('pillarCard.weight')}</div>
          <div className="text-2xl font-bold text-gray-700">
            {pillar.weight}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">{t('pillarCard.contribution')}</div>
          <div className="text-2xl font-bold text-primary-600">
            {weightedContribution.toFixed(1)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${colorClass}`}
        >
          {t('pillarCard.performance', { level: performanceLabel })}
        </span>
      </div>
    </button>
  );
}
