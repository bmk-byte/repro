import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CountryAnalysisData } from '../../lib/api';
import type { ScorecardIndicator as Indicator, ScorecardPillar as Pillar } from '../../types/database';
import { ScatterPlot, ScatterPlotPoint } from '../charts/ScatterPlot';
import { HeatMap, HeatMapCell } from '../charts/HeatMap';

interface CorrelationInsightsProps {
  data: CountryAnalysisData[];
  indicators: Indicator[];
  pillars: Pillar[];
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function CorrelationInsights({ data, indicators, pillars }: CorrelationInsightsProps) {
  const { t } = useTranslation('scorecard');
  const pillarCorrelations = useMemo(() => {
    const correlations: HeatMapCell[] = [];

    pillars.forEach((pillar1) => {
      pillars.forEach((pillar2) => {
        const values1: number[] = [];
        const values2: number[] = [];

        data.forEach((countryData) => {
          const pr1 = countryData.pillarResults.find((pr) => pr.pillar_id === pillar1.id);
          const pr2 = countryData.pillarResults.find((pr) => pr.pillar_id === pillar2.id);

          if (pr1 && pr2) {
            values1.push(pr1.average_score);
            values2.push(pr2.average_score);
          }
        });

        if (values1.length > 0) {
          const correlation = calculateCorrelation(values1, values2);
          correlations.push({
            row: pillar1.code,
            col: pillar2.code,
            value: correlation,
            metadata: { pillar1, pillar2 },
          });
        }
      });
    });

    return correlations;
  }, [data, pillars]);

  const indicatorToCompositeCorrelations = useMemo(() => {
    return indicators
      .map((indicator) => {
        const indicatorScores: number[] = [];
        const compositeScores: number[] = [];

        data.forEach((countryData) => {
          const score = countryData.indicatorScores.find(
            (s) => s.indicator_id === indicator.id
          );
          const composite = countryData.submission?.composite_score;

          if (score && composite !== null && composite !== undefined) {
            indicatorScores.push(score.normalized_score);
            compositeScores.push(composite);
          }
        });

        if (indicatorScores.length > 0) {
          const correlation = calculateCorrelation(indicatorScores, compositeScores);
          return {
            indicator,
            correlation,
            sampleSize: indicatorScores.length,
          };
        }

        return null;
      })
      .filter((item) => item !== null)
      .sort((a, b) => Math.abs(b!.correlation) - Math.abs(a!.correlation));
  }, [data, indicators]);

  const topPositiveCorrelations = indicatorToCompositeCorrelations
    .filter((item) => item!.correlation > 0)
    .slice(0, 5);

  const scatterData: ScatterPlotPoint[] = useMemo(() => {
    if (topPositiveCorrelations.length === 0) return [];

    const topIndicator = topPositiveCorrelations[0]!.indicator;

    return data
      .map((countryData) => {
        const score = countryData.indicatorScores.find(
          (s) => s.indicator_id === topIndicator.id
        );
        const composite = countryData.submission?.composite_score;

        if (score && composite !== null && composite !== undefined) {
          return {
            x: score.normalized_score,
            y: composite,
            label: countryData.country.name,
            color: '#3B82F6',
            metadata: { country: countryData.country },
          };
        }

        return null;
      })
      .filter((point) => point !== null) as ScatterPlotPoint[];
  }, [data, topPositiveCorrelations]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('correlationInsights.heading')}</h2>
        <p className="text-sm text-gray-600 mb-6">
          {t('correlationInsights.subheading')}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-medium text-green-900 mb-3">
              {t('correlationInsights.topPositive')}
            </h3>
            <div className="space-y-3">
              {topPositiveCorrelations.map((item, index) => (
                <div key={item!.indicator.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item!.indicator.code} - {item!.indicator.title}
                    </div>
                    <div className="text-xs text-gray-600">
                      {t('correlationInsights.correlationSample', { correlation: item!.correlation.toFixed(3), n: item!.sampleSize })}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-lg font-bold text-green-600">
                      {(item!.correlation * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-5">
            <h3 className="font-medium text-primary-900 mb-3">{t('correlationInsights.keyInsights')}</h3>
            <div className="space-y-3 text-sm text-gray-700">
              {topPositiveCorrelations.length > 0 && (
                <>
                  <p>
                    <span className="font-medium text-primary-900">
                      {topPositiveCorrelations[0]!.indicator.title}
                    </span>{' '}
                    {t('correlationInsights.strongestDriver')}
                  </p>
                  <p>
                    {t('correlationInsights.targetedImprovements')}
                  </p>
                </>
              )}
              <p>
                {t('correlationInsights.interconnectedPolicy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {scatterData.length > 0 && topPositiveCorrelations.length > 0 && (
        <ScatterPlot
          data={scatterData}
          title={t('correlationInsights.scatterTitle', { code: topPositiveCorrelations[0]!.indicator.code })}
          xLabel={topPositiveCorrelations[0]!.indicator.title}
          yLabel={t('correlationInsights.compositeScore')}
          width={800}
          height={500}
        />
      )}

      <HeatMap
        data={pillarCorrelations}
        title={t('correlationInsights.pillarCorrelationMatrix')}
        minValue={-1}
        maxValue={1}
        colorScheme="blue"
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {t('correlationInsights.allIndicatorsHeading')}
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('correlationInsights.rank')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('scoreInputTable.indicator')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('correlationInsights.correlation')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('correlationInsights.sampleSize')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('correlationInsights.strength')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {indicatorToCompositeCorrelations.slice(0, 15).map((item, index) => {
                const absCorr = Math.abs(item!.correlation);
                const strength =
                  absCorr > 0.7 ? t('correlationInsights.strong') : absCorr > 0.4 ? t('correlationInsights.moderate') : t('correlationInsights.weak');
                const strengthColor =
                  absCorr > 0.7
                    ? 'bg-green-100 text-green-800'
                    : absCorr > 0.4
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800';

                return (
                  <tr key={item!.indicator.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{item!.indicator.code}</div>
                      <div className="text-gray-600">{item!.indicator.title}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-primary-600 rounded-full"
                            style={{ width: `${absCorr * 100}%` }}
                          />
                        </div>
                        <span className="font-medium text-gray-900">
                          {item!.correlation.toFixed(3)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item!.sampleSize}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${strengthColor}`}>
                        {strength}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
