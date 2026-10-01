import { useTranslation } from 'react-i18next';
import type { ScorecardPillar as Pillar } from '../types/database';

interface ScoreVisualizationProps {
  pillars: Pillar[];
  pillarAverages: Map<string, number>;
}

export function ScoreVisualization({ pillars, pillarAverages }: ScoreVisualizationProps) {
  const { t } = useTranslation('scorecard');
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        {t('scoreVisualization.heading')}
      </h3>

      <div className="space-y-4">
        {pillars.map((pillar) => {
          const average = pillarAverages.get(pillar.id) || 0;
          const percentage = average;
          const barColor =
            percentage >= 70
              ? 'bg-green-500'
              : percentage >= 40
              ? 'bg-yellow-500'
              : 'bg-primary-600';

          return (
            <div key={pillar.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-gray-600">
                    {pillar.code}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {pillar.title}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    {average.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {t('scoreVisualization.weight', { weight: pillar.weight })}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">{t('scoreVisualization.legendHigh')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-700">{t('scoreVisualization.legendMedium')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary-600 rounded"></div>
            <span className="text-gray-700">{t('scoreVisualization.legendLow')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
