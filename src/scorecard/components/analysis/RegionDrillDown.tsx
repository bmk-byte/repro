import { useTranslation } from 'react-i18next';
import { X, TrendingUp, TrendingDown, Users, Award } from 'lucide-react';
import type { RegionalAnalysisData } from '../../lib/api';
import type { ScorecardPillar as Pillar } from '../../types/database';
import { RadarChart } from '../charts/RadarChart';
import { Badge } from '../../../components/ui';

interface RegionDrillDownProps {
  region: RegionalAnalysisData;
  pillars: Pillar[];
  onClose: () => void;
}

const TIER_TONE: Record<'Progressive' | 'Emergent' | 'Regressive', 'success' | 'warning' | 'danger'> = {
  Progressive: 'success',
  Emergent: 'warning',
  Regressive: 'danger',
};

function classifyTier(score: number): 'Progressive' | 'Emergent' | 'Regressive' {
  if (score >= 60) return 'Progressive';
  if (score >= 40) return 'Emergent';
  return 'Regressive';
}

function getScoreColor(score: number) {
  if (score >= 60) return 'text-green-700';
  if (score >= 40) return 'text-yellow-700';
  return 'text-red-600';
}

function getBarColor(score: number) {
  if (score >= 60) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-red-500';
}

export function RegionDrillDown({ region, pillars, onClose }: RegionDrillDownProps) {
  const { t } = useTranslation('scorecard');
  const tier = classifyTier(region.averageCompositeScore);
  const total =
    region.tierDistribution.Progressive +
    region.tierDistribution.Emergent +
    region.tierDistribution.Regressive;

  const progressivePct = total > 0 ? (region.tierDistribution.Progressive / total) * 100 : 0;
  const emergentPct = total > 0 ? (region.tierDistribution.Emergent / total) * 100 : 0;
  const regressivePct = total > 0 ? (region.tierDistribution.Regressive / total) * 100 : 0;

  const radarData = pillars.map((p) => ({
    label: p.code,
    value: region.pillarAverages.get(p.id) ?? 0,
    maxValue: 100,
  }));

  const countriesWithScores = region.countries.map((c) => ({
    country: c,
    score: null as number | null,
  }));

  const topPerformer = region.countries.length > 0 ? region.countries[0] : null;
  const bottomPerformer =
    region.countries.length > 1 ? region.countries[region.countries.length - 1] : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden animate-slide-in">
      <div
        className="px-6 py-5 flex items-start justify-between"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5016 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white">{region.region}</h2>
            <Badge tone={TIER_TONE[tier]}>{t(`tier.${tier.toLowerCase()}`)}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {t('regionDrillDown.countryCount', { count: region.countries.length })}
            </span>
            <span>{t('regionDrillDown.avgScore')} <strong className="text-white">{region.averageCompositeScore.toFixed(1)}</strong></span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {t('regionDrillDown.tierDistribution')}
            </h3>
            <span className="text-xs text-gray-500">{t('regionDrillDown.assessedCountries', { count: total })}</span>
          </div>
          <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
            {progressivePct > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${progressivePct}%` }}
                title={t('regionDrillDown.progressiveCount', { count: region.tierDistribution.Progressive })}
              />
            )}
            {emergentPct > 0 && (
              <div
                className="bg-yellow-400 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${emergentPct}%` }}
                title={t('regionDrillDown.emergentCount', { count: region.tierDistribution.Emergent })}
              />
            )}
            {regressivePct > 0 && (
              <div
                className="bg-primary-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${regressivePct}%` }}
                title={t('regionDrillDown.regressiveCount', { count: region.tierDistribution.Regressive })}
              />
            )}
            {total === 0 && <div className="bg-gray-200 flex-1" />}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              {t('regionDrillDown.progressiveCount', { count: region.tierDistribution.Progressive })}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              {t('regionDrillDown.emergentCount', { count: region.tierDistribution.Emergent })}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block" />
              {t('regionDrillDown.regressiveCount', { count: region.tierDistribution.Regressive })}
            </span>
          </div>
        </div>

        {radarData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              {t('regionDrillDown.pillarAverages')}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex justify-center">
                <RadarChart
                  data={radarData}
                  size={280}
                  color="#DC2626"
                  showLabels={true}
                  showGrid={true}
                />
              </div>
              <div className="space-y-2">
                {pillars.map((p) => {
                  const avg = region.pillarAverages.get(p.id) ?? 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-gray-500 w-8 flex-shrink-0">
                        {p.code}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${getBarColor(avg)}`}
                          style={{ width: `${avg}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-12 text-right ${getScoreColor(avg)}`}>
                        {avg.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {(topPerformer || bottomPerformer) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topPerformer && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">
                    {t('regionDrillDown.firstListed')}
                  </div>
                  <div className="text-sm font-bold text-gray-900">{topPerformer.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{topPerformer.code}</div>
                </div>
              </div>
            )}
            {bottomPerformer && (
              <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-lg border border-primary-100">
                <div className="p-1.5 bg-primary-100 rounded-lg flex-shrink-0">
                  <TrendingDown className="w-4 h-4 text-primary-700" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-0.5">
                    {t('regionDrillDown.lastListed')}
                  </div>
                  <div className="text-sm font-bold text-gray-900">{bottomPerformer.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{bottomPerformer.code}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {t('regionDrillDown.countriesInRegion')}
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {countriesWithScores.map(({ country }) => (
              <div
                key={country.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100"
              >
                <span className="text-xs font-mono text-gray-400 flex-shrink-0">{country.code}</span>
                <span className="text-sm text-gray-800 font-medium truncate">{country.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
