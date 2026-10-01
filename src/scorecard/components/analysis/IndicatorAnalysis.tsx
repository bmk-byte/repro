import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CountryAnalysisData } from '../../lib/api';
import type { ScorecardIndicator as Indicator, ScorecardPillar as Pillar } from '../../types/database';
import { BarChart, BarChartData } from '../charts/BarChart';

interface IndicatorAnalysisProps {
  data: CountryAnalysisData[];
  indicators: Indicator[];
  pillars?: Pillar[];
}

export function IndicatorAnalysis({ data, indicators, pillars = [] }: IndicatorAnalysisProps) {
  const { t } = useTranslation('scorecard');
  const pillarList = useMemo(() => {
    if (pillars.length > 0) return pillars;
    const seen = new Map<string, { id: string; code: string; title: string }>();
    indicators.forEach((ind) => {
      if (!seen.has(ind.pillar_id)) {
        seen.set(ind.pillar_id, { id: ind.pillar_id, code: ind.code.charAt(0), title: ind.pillar_id });
      }
    });
    return Array.from(seen.values());
  }, [pillars, indicators]);

  const [selectedPillarId, setSelectedPillarId] = useState<string>(
    pillarList[0]?.id ?? ''
  );

  const filteredIndicators = useMemo(
    () => indicators.filter((i) => i.pillar_id === selectedPillarId),
    [indicators, selectedPillarId]
  );

  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(
    filteredIndicators[0] || null
  );

  const handlePillarChange = (pillarId: string) => {
    setSelectedPillarId(pillarId);
    const first = indicators.find((i) => i.pillar_id === pillarId) || null;
    setSelectedIndicator(first);
  };

  if (!selectedIndicator) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600">{t('indicatorAnalysis.noIndicatorsAvailable')}</p>
      </div>
    );
  }

  const indicatorScores: BarChartData[] = data
    .map((countryData) => {
      const score = countryData.indicatorScores.find(
        (s) => s.indicator_id === selectedIndicator.id
      );

      return {
        label: countryData.country.name,
        value: score?.normalized_score ?? 0,
        color: score ? '#3B82F6' : '#E5E7EB',
        metadata: { country: countryData.country, score },
      };
    })
    .filter((item) => item.metadata.score)
    .sort((a, b) => b.value - a.value);

  const scores = indicatorScores.map((item) => item.value);
  const average = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  const median =
    scores.length > 0
      ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
      : 0;
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;

  const distribution = {
    high: scores.filter((s) => s >= 70).length,
    medium: scores.filter((s) => s >= 40 && s < 70).length,
    low: scores.filter((s) => s < 40).length,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('indicatorAnalysis.heading')}</h2>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('indicatorAnalysis.selectPillar')}
            </label>
            <select
              value={selectedPillarId}
              onChange={(e) => handlePillarChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {pillarList.map((pillar) => (
                <option key={pillar.id} value={pillar.id}>
                  {pillar.code} - {pillar.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('indicatorAnalysis.selectIndicator')}
            </label>
            <select
              value={selectedIndicator.id}
              onChange={(e) => {
                const indicator = filteredIndicators.find((i) => i.id === e.target.value);
                setSelectedIndicator(indicator || null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {filteredIndicators.map((indicator) => (
                <option key={indicator.id} value={indicator.id}>
                  {indicator.code} - {indicator.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">{selectedIndicator.title}</h3>
          <p className="text-sm text-gray-600">{selectedIndicator.definition}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.average')}</div>
            <div className="text-2xl font-bold text-primary-600">{average.toFixed(1)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.median')}</div>
            <div className="text-2xl font-bold text-green-600">{median.toFixed(1)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.highest')}</div>
            <div className="text-2xl font-bold text-gray-900">{max.toFixed(1)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.lowest')}</div>
            <div className="text-2xl font-bold text-gray-900">{min.toFixed(1)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.countries')}</div>
            <div className="text-2xl font-bold text-gray-900">{scores.length}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">{t('indicatorAnalysis.performanceDistribution')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.high')}</div>
              <div className="text-xl font-bold text-green-700">{distribution.high}</div>
              <div className="text-xs text-gray-500">
                {scores.length > 0
                  ? ((distribution.high / scores.length) * 100).toFixed(0)
                  : 0}
                %
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.medium')}</div>
              <div className="text-xl font-bold text-yellow-700">{distribution.medium}</div>
              <div className="text-xs text-gray-500">
                {scores.length > 0
                  ? ((distribution.medium / scores.length) * 100).toFixed(0)
                  : 0}
                %
              </div>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">{t('indicatorAnalysis.low')}</div>
              <div className="text-xl font-bold text-primary-700">{distribution.low}</div>
              <div className="text-xs text-gray-500">
                {scores.length > 0 ? ((distribution.low / scores.length) * 100).toFixed(0) : 0}
                %
              </div>
            </div>
          </div>
        </div>
      </div>

      <BarChart
        data={indicatorScores.slice(0, 20)}
        title={t('indicatorAnalysis.top20Title', { code: selectedIndicator.code })}
        maxValue={100}
        height={500}
        showValues={true}
      />
    </div>
  );
}
