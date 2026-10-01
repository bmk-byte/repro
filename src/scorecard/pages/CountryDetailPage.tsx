import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Skeleton } from '../../components/ui';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Award,
  TrendingUp,
  FileText,
  RefreshCw,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { fetchCountryDetailData, type CountryDetailData } from '../lib/api';
import { supabase } from '../../lib/supabase';
import { getPerformanceLevel } from '../lib/scoring';
import type {
  ScorecardPillar as Pillar,
  ScorecardIndicator as Indicator,
  ScorecardIndicatorScore as IndicatorScore,
  ScorecardPillarResultRow as PillarResult,
} from '../types/database';

const TIER_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  Progressive: 'success',
  Emergent: 'warning',
  Regressive: 'danger',
};

function ScoreBar({ score }: { score: number }) {
  const level = getPerformanceLevel(score);
  const barColor =
    level === 'high'
      ? 'bg-green-500'
      : level === 'medium'
      ? 'bg-yellow-500'
      : 'bg-primary-600';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-12 text-right">
        {score.toFixed(1)}%
      </span>
    </div>
  );
}

function RawScoreDots({ score, max = 4 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${
            i < score ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        />
      ))}
      <span className="ml-1.5 text-xs font-medium text-gray-500">
        {score}/{max}
      </span>
    </div>
  );
}

interface PillarSectionProps {
  pillar: Pillar;
  pillarResult: PillarResult | undefined;
  indicators: Indicator[];
  indicatorScores: IndicatorScore[];
}

function PillarSection({ pillar, pillarResult, indicators, indicatorScores }: PillarSectionProps) {
  const { t } = useTranslation('scorecard');
  const [expanded, setExpanded] = useState(false);
  const score = pillarResult?.average_score ?? 0;
  const level = getPerformanceLevel(score);

  const levelBadge =
    level === 'high'
      ? 'bg-green-50 text-green-700 border-green-200'
      : level === 'medium'
      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
      : 'bg-primary-50 text-primary-700 border-primary-200';

  const levelLabel = t(`countryDetail.pillarLevel.${level}`);

  const completedIndicators = indicators.filter((ind) => {
    const s = indicatorScores.find((sc) => sc.indicator_id === ind.id);
    return s && s.evidence_complete;
  }).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center">
          <span className="text-sm font-bold text-primary-700">{pillar.code}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{pillar.title}</h3>
            {pillarResult && (
              <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${levelBadge}`}>
                {levelLabel}
              </span>
            )}
          </div>
          {pillarResult ? (
            <ScoreBar score={score} />
          ) : (
            <span className="text-xs text-gray-400">{t('countryDetail.noDataAvailable')}</span>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {t('countryDetail.evidencedCount', { completed: completedIndicators, total: indicators.length })}
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
          {indicators.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">{t('countryDetail.noIndicatorsInPillar')}</p>
          ) : (
            indicators.map((indicator) => {
              const indScore = indicatorScores.find((s) => s.indicator_id === indicator.id);
              const normalised = indScore?.normalized_score ?? null;

              return (
                <div key={indicator.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {indScore?.evidence_complete ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                          {indicator.code}
                        </span>
                        {indScore && (
                          <RawScoreDots score={indScore.score} max={indicator.max_score} />
                        )}
                        {!indScore && (
                          <span className="text-xs text-gray-400">{t('countryDetail.notScored')}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 mb-1">{indicator.title}</p>

                      {normalised !== null && (
                        <div className="mt-2 mb-2">
                          <ScoreBar score={normalised} />
                        </div>
                      )}

                      {indScore?.evidence_notes && (
                        <div className="mt-2 p-2.5 bg-white rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 font-medium mb-0.5">{t('countryDetail.evidenceNotes')}</p>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {indScore.evidence_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function CountryDetailPage() {
  const { t } = useTranslation('scorecard');
  const { countryId } = useParams<{ countryId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CountryDetailData | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);

  const loadData = useCallback(async () => {
    if (!countryId) return;
    try {
      setError(null);
      const result = await fetchCountryDetailData(countryId);
      if (!result) {
        setError(t('countryDetail.errorNotFound'));
        return;
      }
      setData(result);
    } catch (err) {
      console.error('Failed to load country detail:', err);
      setError(t('countryDetail.errorLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [countryId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!countryId || !data?.submission?.id) return;

    const submissionId = data.submission.id;

    const channel = supabase
      .channel(`scorecard-country-detail-${countryId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scorecard_indicator_scores', filter: `submission_id=eq.${submissionId}` },
        () => {
          setLiveIndicator(true);
          loadData().then(() => setTimeout(() => setLiveIndicator(false), 2000));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scorecard_pillar_results', filter: `submission_id=eq.${submissionId}` },
        () => {
          setLiveIndicator(true);
          loadData().then(() => setTimeout(() => setLiveIndicator(false), 2000));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scorecard_submissions', filter: `id=eq.${submissionId}` },
        () => {
          setLiveIndicator(true);
          loadData().then(() => setTimeout(() => setLiveIndicator(false), 2000));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [countryId, data?.submission?.id, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('countryDetail.unableToLoad')}</h2>
          <p className="text-gray-600 mb-6">{error || t('countryDetail.errorNotFound')}</p>
          <Button onClick={() => navigate('/scorecard/analysis')}>
            {t('countryDetail.backToAnalysis')}
          </Button>
        </div>
      </div>
    );
  }

  const { country, submission, pillarResults, indicatorScores, pillars, indicators } = data;

  const totalIndicators = indicators.length;
  const scoredIndicators = indicatorScores.filter((s) => s.score > 0).length;
  const evidencedIndicators = indicatorScores.filter((s) => s.evidence_complete).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/scorecard/analysis')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('countryDetail.backToAnalysis')}
          </button>

          {liveIndicator && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {t('countryDetail.liveUpdate')}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{country.region}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{country.name}</h1>
              <p className="text-sm text-gray-400 mt-1">{t('countryDetail.countryCode', { code: country.code })}</p>
            </div>

            {submission && (
              <div className="flex items-center gap-3">
                <div className="text-center px-5 py-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">{t('countryDetail.compositeScore')}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {submission.composite_score?.toFixed(1) ?? t('countryDetail.notAvailable')}
                  </p>
                </div>
                {submission.tier && (
                  <div className="text-center px-5 py-3 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">{t('countryDetail.tier')}</p>
                    <Badge tone={TIER_TONE[submission.tier] ?? 'neutral'} className="text-sm px-3 py-1">
                      {t(`tier.${submission.tier.toLowerCase()}`)}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {submission?.equity_penalty_applied && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {t('countryDetail.equityPenaltyNote')}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('countryDetail.indicatorsScored')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{scoredIndicators}</p>
            <p className="text-xs text-gray-400">{t('countryDetail.ofTotal', { total: totalIndicators })}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('countryDetail.evidenceComplete')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{evidencedIndicators}</p>
            <p className="text-xs text-gray-400">{t('countryDetail.ofIndicators', { total: totalIndicators })}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('countryDetail.pillarsAssessed')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pillarResults.length}</p>
            <p className="text-xs text-gray-400">{t('countryDetail.ofPillars', { total: pillars.length })}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/cases?country=${countryId}`)}
          className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Scale className="w-5 h-5 text-primary-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{t('countryDetail.relatedLitigation')}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('countryDetail.relatedLitigationDescription', { country: country.name })}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('countryDetail.pillarBreakdown')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('countryDetail.pillarBreakdownHint')}
          </p>
        </div>

        <div className="space-y-3">
          {pillars.map((pillar) => {
            const pillarResult = pillarResults.find((pr) => pr.pillar_id === pillar.id);
            const pillarIndicators = indicators
              .filter((ind) => ind.pillar_id === pillar.id)
              .sort((a, b) => a.order_index - b.order_index);

            return (
              <PillarSection
                key={pillar.id}
                pillar={pillar}
                pillarResult={pillarResult}
                indicators={pillarIndicators}
                indicatorScores={indicatorScores}
              />
            );
          })}
        </div>

        {!submission && (
          <div className="mt-8 text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">{t('countryDetail.noScorecardData')}</h3>
            <p className="text-sm text-gray-400">
              {t('countryDetail.noSubmissionYet', { country: country.name })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
