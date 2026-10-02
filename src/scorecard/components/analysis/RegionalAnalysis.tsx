import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe as GlobeIcon, LayoutGrid, BarChart3, Table2 } from 'lucide-react';
import type { RegionalAnalysisData } from '../../lib/api';
import type { ScorecardPillar as Pillar } from '../../types/database';
import { BarChart, BarChartData } from '../charts/BarChart';
import { AfricaGlobe } from './AfricaGlobe';
import { RegionDrillDown } from './RegionDrillDown';

interface RegionalAnalysisProps {
  data: RegionalAnalysisData[];
  pillars: Pillar[];
}

type ViewMode = 'globe' | 'overview' | 'chart' | 'table';

export function RegionalAnalysis({ data, pillars }: RegionalAnalysisProps) {
  const { t } = useTranslation('scorecard');
  const [activeView, setActiveView] = useState<ViewMode>('globe');
  const [selectedRegion, setSelectedRegion] = useState<RegionalAnalysisData | null>(null);

  const regionalScores: BarChartData[] = data.map((region) => ({
    label: region.region,
    value: region.averageCompositeScore,
    color: '#3B82F6',
    metadata: region,
  }));

  const totalCountries = data.reduce((sum, region) => sum + region.countries.length, 0);

  // A display-mode toggle, not a second navigation layer — deliberately
  // icon-only (no text labels, no description subtext) so it reads as "how
  // do you want to see this" rather than a second tab bar stacked inside
  // AnalysisPage's own tabs (src/components/ui/Tabs.tsx).
  const viewModes: { id: ViewMode; icon: typeof GlobeIcon; label: string }[] = [
    { id: 'globe', icon: GlobeIcon, label: t('regionalAnalysis.tabGlobe') },
    { id: 'overview', icon: LayoutGrid, label: t('regionalAnalysis.tabOverview') },
    { id: 'chart', icon: BarChart3, label: t('regionalAnalysis.tabChart') },
    { id: 'table', icon: Table2, label: t('regionalAnalysis.tabTable') },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-stone-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{t('regionalAnalysis.heading')}</h2>
            <p className="text-sm text-stone-600 mt-1">
              {t('regionalAnalysis.summary', { regions: data.length, countries: totalCountries })}
            </p>
          </div>

          <div className="flex bg-stone-100 rounded-lg p-1 gap-1" role="group" aria-label={t('regionalAnalysis.viewMode')}>
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeView === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    setActiveView(mode.id);
                    if (mode.id !== 'globe') setSelectedRegion(null);
                  }}
                  title={mode.label}
                  aria-label={mode.label}
                  aria-pressed={isActive}
                  className={`p-2 rounded-md transition-all ${
                    isActive
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        {activeView === 'globe' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <AfricaGlobe
                data={data}
                selectedRegion={selectedRegion}
                onRegionSelect={setSelectedRegion}
              />

              <div>
                {selectedRegion ? (
                  <RegionDrillDown
                    region={selectedRegion}
                    pillars={pillars}
                    onClose={() => setSelectedRegion(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-8">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-stone-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-stone-700 mb-2">
                      {t('regionalAnalysis.selectRegion')}
                    </h3>
                    <p className="text-sm text-stone-500">
                      {t('regionalAnalysis.selectRegionHint')}
                    </p>

                    <div className="mt-6 w-full space-y-2">
                      {data.map((d) => {
                        const score = d.averageCompositeScore;
                        const barColor =
                          score >= 60
                            ? 'bg-success'
                            : score >= 40
                            ? 'bg-warning'
                            : 'bg-danger';
                        return (
                          <button
                            key={d.region}
                            onClick={() => setSelectedRegion(d)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-all text-left"
                          >
                            <span className="text-sm font-medium text-stone-800 flex-1">
                              {d.region}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="w-20 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${barColor}`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-stone-700 w-10 text-right">
                                {score.toFixed(1)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeView === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((region) => (
              <div
                key={region.region}
                className="border border-stone-200 rounded-lg p-5 hover:shadow-raised transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedRegion(region);
                  setActiveView('globe');
                }}
              >
                <h3 className="font-bold text-stone-900 mb-3">{region.region}</h3>

                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-stone-600">{t('regionalAnalysis.averageScore')}</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {region.averageCompositeScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full">
                    <div
                      className="h-2 bg-primary-600 rounded-full"
                      style={{ width: `${region.averageCompositeScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">{t('regionDrillDown.countriesInRegion')}</span>
                    <span className="font-medium text-stone-900">{region.countries.length}</span>
                  </div>

                  <div className="text-sm">
                    <div className="text-stone-600 mb-1">{t('regionDrillDown.tierDistribution')}</div>
                    <div className="flex gap-2">
                      <div
                        className="bg-success text-white px-2 py-1 rounded text-xs"
                        title={t('tier.progressive')}
                      >
                        {region.tierDistribution.Progressive}
                      </div>
                      <div
                        className="bg-warning text-white px-2 py-1 rounded text-xs"
                        title={t('tier.emergent')}
                      >
                        {region.tierDistribution.Emergent}
                      </div>
                      <div
                        className="bg-danger text-white px-2 py-1 rounded text-xs"
                        title={t('tier.regressive')}
                      >
                        {region.tierDistribution.Regressive}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-stone-600 mb-2">{t('regionDrillDown.pillarAverages')}</div>
                  <div className="space-y-1">
                    {pillars.slice(0, 4).map((pillar) => {
                      const avg = region.pillarAverages.get(pillar.id) || 0;
                      return (
                        <div key={pillar.id} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-stone-500 w-8">{pillar.code}</span>
                          <div className="flex-1 h-1.5 bg-stone-200 rounded-full">
                            <div
                              className="h-1.5 bg-primary-500 rounded-full"
                              style={{ width: `${avg}%` }}
                            />
                          </div>
                          <span className="text-xs text-stone-600 w-10 text-right">
                            {avg.toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeView === 'chart' && (
        <BarChart
          data={regionalScores}
          title={t('regionalAnalysis.regionalCompositeScores')}
          maxValue={100}
          height={400}
          showValues={true}
        />
      )}

      {activeView === 'table' && (
        <div className="bg-white rounded-lg border border-stone-200 p-6">
          <h3 className="text-lg font-bold text-stone-900 mb-4">{t('regionalAnalysis.pillarPerformanceByRegion')}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider">
                    {t('regionalAnalysis.region')}
                  </th>
                  {pillars.map((pillar) => (
                    <th
                      key={pillar.id}
                      className="px-4 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider"
                      title={pillar.title}
                    >
                      {pillar.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {data.map((region) => (
                  <tr key={region.region} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">{region.region}</td>
                    {pillars.map((pillar) => {
                      const avg = region.pillarAverages.get(pillar.id) || 0;
                      const colorClass =
                        avg >= 60
                          ? 'bg-success-light text-success-dark'
                          : avg >= 40
                          ? 'bg-warning-light text-warning-dark'
                          : 'bg-danger-light text-danger-dark';
                      return (
                        <td key={pillar.id} className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded font-medium ${colorClass}`}>
                            {avg.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
