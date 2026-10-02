import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, ChevronDown, ChevronUp, Eye, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button, LoadingState, Breadcrumbs } from '../../components/ui';
import { CountrySelector } from '../components/CountrySelector';
import { PillarCard } from '../components/PillarCard';
import { ScoreInputTable } from '../components/ScoreInputTable';
import { CompositeResults } from '../components/CompositeResults';
import { ScorecardGuide } from '../components/ScorecardGuide';
import { IndicatorDetailModal } from '../components/IndicatorDetailModal';
import { EvidenceModal } from '../components/EvidenceModal';
import { PillarDetailModal } from '../components/PillarDetailModal';
import { ScoreVisualization } from '../components/ScoreVisualization';
import { PublishConfirmationModal } from '../components/PublishConfirmationModal';
import { StatusBadge } from '../components/StatusBadge';
import type {
  ScorecardCountry as Country,
  ScorecardPillar as Pillar,
  ScorecardIndicator as Indicator,
  ScorecardSubmission,
  ScorecardIndicatorScore as IndicatorScore,
} from '../types/database';
import {
  fetchScorecardCountries,
  fetchPillars,
  fetchIndicators,
  createSubmission,
  fetchLatestSubmission,
  fetchIndicatorScores,
  upsertIndicatorScore,
  updateEvidenceNotes,
  calculateAndSavePillarResults,
  updateSubmissionResults,
  fetchPillarResults,
  updateSubmissionStatus,
} from '../lib/api';
import { calculateFullScorecard, generateInsights } from '../lib/scoring';

/**
 * Editor-only country scoring workspace, mounted as the authenticated
 * "Scorecard" dashboard tab (see App.tsx's switch(activeTab) — gated on
 * isScorecardEditor there, not inside this component, matching how other
 * tabs like moderation are gated).
 */
export default function ScorecardPage() {
  const { t } = useTranslation('scorecard');
  const [guideExpanded, setGuideExpanded] = useState(
    () => !localStorage.getItem('maputo-scorecard-visited')
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<ScorecardSubmission | null>(null);
  const [scores, setScores] = useState<Map<string, IndicatorScore>>(new Map());

  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [evidenceModalData, setEvidenceModalData] = useState<{
    indicator: Indicator;
    score?: IndicatorScore;
  } | null>(null);
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [countryLoadError, setCountryLoadError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const handleToggleGuide = () => {
    setGuideExpanded((prev) => !prev);
    localStorage.setItem('maputo-scorecard-visited', 'true');
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setInitError(null);
      const [countriesData, pillarsData, indicatorsData] = await Promise.all([
        fetchScorecardCountries(),
        fetchPillars(),
        fetchIndicators(),
      ]);

      setCountries(countriesData);
      setPillars(pillarsData);
      setIndicators(indicatorsData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setInitError(t('editor.errorLoadInitial'));
    } finally {
      setLoading(false);
    }
  };

  const loadCountryData = async (country: Country) => {
    try {
      setLoading(true);
      setCountryLoadError(null);
      setSelectedCountry(country);

      let submission = await fetchLatestSubmission(country.id);

      if (!submission) {
        submission = await createSubmission(country.id);
      }

      setCurrentSubmission(submission);

      const scoresData = await fetchIndicatorScores(submission.id);
      const scoresMap = new Map(scoresData.map((s) => [s.indicator_id, s]));
      setScores(scoresMap);

      setExpandedPillars(new Set(pillars.map((p) => p.id)));
    } catch (err) {
      console.error('Failed to load country data:', err);
      setCountryLoadError(t('editor.errorLoadCountry'));
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = async (indicatorId: string, score: number) => {
    if (!currentSubmission) return;

    try {
      const updatedScore = await upsertIndicatorScore(
        currentSubmission.id,
        indicatorId,
        score
      );

      setScores((prev) => {
        const newMap = new Map(prev).set(indicatorId, updatedScore);
        recalculateResults(newMap);
        return newMap;
      });
    } catch (error) {
      console.error('Failed to update score:', error);
    }
  };

  const handleEvidenceSave = async (evidenceNotes: string, evidenceComplete: boolean) => {
    if (!evidenceModalData || !currentSubmission) return;

    try {
      const indicatorId = evidenceModalData.indicator.id;
      const existingScore = evidenceModalData.score;

      if (existingScore) {
        await updateEvidenceNotes(existingScore.id, evidenceNotes, evidenceComplete);

        setScores((prev) => {
          const newMap = new Map(prev);
          const score = newMap.get(indicatorId);
          if (score) {
            newMap.set(indicatorId, {
              ...score,
              evidence_notes: evidenceNotes,
              evidence_complete: evidenceComplete,
            });
          }
          return newMap;
        });
      } else {
        const newScore = await upsertIndicatorScore(
          currentSubmission.id,
          indicatorId,
          0,
          evidenceNotes
        );
        setScores((prev) => new Map(prev).set(indicatorId, newScore));
      }
    } catch (error) {
      console.error('Failed to save evidence:', error);
      throw error;
    }
  };

  const recalculateResults = useCallback(async (overrideScores?: Map<string, IndicatorScore>) => {
    if (!currentSubmission || pillars.length === 0) return;

    try {
      setSaving(true);
      const scoresArray = Array.from((overrideScores ?? scores).values());

      await calculateAndSavePillarResults(
        currentSubmission.id,
        pillars,
        scoresArray,
        indicators
      );

      await fetchPillarResults(currentSubmission.id);

      const indicatorScoresByPillar = new Map<string, IndicatorScore[]>();
      pillars.forEach((pillar) => {
        const pillarIndicators = indicators.filter((i) => i.pillar_id === pillar.id);
        const pillarIndicatorIds = new Set(pillarIndicators.map((i) => i.id));
        const pillarScores = scoresArray.filter((s) =>
          pillarIndicatorIds.has(s.indicator_id)
        );
        indicatorScoresByPillar.set(pillar.id, pillarScores);
      });

      const result = calculateFullScorecard(pillars, indicatorScoresByPillar);

      await updateSubmissionResults(
        currentSubmission.id,
        result.compositeScore,
        result.tier,
        result.equityPenaltyApplied
      );

      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to recalculate results:', error);
    } finally {
      setSaving(false);
    }
  }, [currentSubmission, pillars, indicators, scores]);


  const handlePublish = async () => {
    if (!currentSubmission) return;

    try {
      setPublishing(true);
      await updateSubmissionStatus(currentSubmission.id, 'published');

      setCurrentSubmission({
        ...currentSubmission,
        status: 'published',
        submitted_at: new Date().toISOString(),
      });

      setShowPublishModal(false);
      setPublishSuccess(true);

      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to publish submission:', err);
      setPublishError(t('editor.errorPublish'));
    } finally {
      setPublishing(false);
    }
  };

  const calculateCompleteness = () => {
    const totalIndicators = indicators.length;
    const scoredIndicators = Array.from(scores.values()).filter(
      (score) => score.score !== null && score.score !== undefined
    ).length;

    return { totalIndicators, scoredIndicators };
  };

  const calculateCurrentResults = () => {
    const scoresArray = Array.from(scores.values());
    const indicatorScoresByPillar = new Map<string, IndicatorScore[]>();

    pillars.forEach((pillar) => {
      const pillarIndicators = indicators.filter((i) => i.pillar_id === pillar.id);
      const pillarIndicatorIds = new Set(pillarIndicators.map((i) => i.id));
      const pillarScores = scoresArray.filter((s) => pillarIndicatorIds.has(s.indicator_id));
      indicatorScoresByPillar.set(pillar.id, pillarScores);
    });

    return calculateFullScorecard(pillars, indicatorScoresByPillar);
  };

  const togglePillar = (pillarId: string) => {
    setExpandedPillars((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pillarId)) {
        newSet.delete(pillarId);
      } else {
        newSet.add(pillarId);
      }
      return newSet;
    });
  };

  const result = calculateCurrentResults();
  const insights = generateInsights(result, t);

  const pillarAverages = new Map<string, number>();
  result.pillarResults.forEach((pr) => {
    pillarAverages.set(pr.pillarId, pr.average);
  });

  if (loading && countries.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <LoadingState label={t('editor.loading')} />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-danger/60 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">{t('editor.unableToLoad')}</h2>
          <p className="text-stone-600 mb-6">{initError}</p>
          <Button onClick={loadInitialData}>{t('editor.tryAgain')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {selectedIndicator && (
        <IndicatorDetailModal
          indicator={selectedIndicator}
          onClose={() => setSelectedIndicator(null)}
        />
      )}

      {evidenceModalData && (
        <EvidenceModal
          indicator={evidenceModalData.indicator}
          score={evidenceModalData.score}
          onSave={handleEvidenceSave}
          onClose={() => setEvidenceModalData(null)}
        />
      )}

      {selectedPillar && (
        <PillarDetailModal
          pillar={selectedPillar}
          indicators={indicators.filter((i) => i.pillar_id === selectedPillar.id)}
          onClose={() => setSelectedPillar(null)}
        />
      )}

      {showPublishModal && selectedCountry && currentSubmission && (
        <PublishConfirmationModal
          countryName={selectedCountry.name}
          totalIndicators={calculateCompleteness().totalIndicators}
          scoredIndicators={calculateCompleteness().scoredIndicators}
          compositeScore={currentSubmission.composite_score}
          onConfirm={handlePublish}
          onCancel={() => setShowPublishModal(false)}
        />
      )}

      {publishSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-success-light border border-success/30 rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-in">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="font-semibold text-success-dark">{t('editor.publishedTitle')}</p>
            <p className="text-sm text-success-dark">{t('editor.publishedDescription')}</p>
          </div>
        </div>
      )}

      {publishError && (
        <div className="fixed top-4 right-4 z-50 bg-danger-light border border-danger/30 rounded-lg shadow-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-sm font-medium text-danger-dark">{publishError}</p>
          <button onClick={() => setPublishError(null)} className="ml-2 text-danger/60 hover:text-danger">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {countryLoadError && (
        <div className="fixed top-4 right-4 z-50 bg-danger-light border border-danger/30 rounded-lg shadow-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-sm font-medium text-danger-dark">{countryLoadError}</p>
          <button onClick={() => setCountryLoadError(null)} className="ml-2 text-danger/60 hover:text-danger">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs
          className="mb-4"
          items={[
            { label: t('analysisPage.breadcrumbScorecards') },
            { label: selectedCountry ? selectedCountry.name : t('editor.heading') },
          ]}
        />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              {t('editor.heading')}
            </h1>
            <p className="text-sm text-stone-600">{t('editor.subheading')}</p>
          </div>

          <div className="flex items-center gap-4">
            {currentSubmission && selectedCountry && (
              <>
                {currentSubmission.status === 'draft' ? (
                  <Button
                    onClick={() => setShowPublishModal(true)}
                    disabled={currentSubmission.composite_score === null}
                    loading={publishing}
                    className="!bg-success hover:!bg-success-dark"
                    icon={<Eye className="w-4 h-4" />}
                  >
                    {publishing ? t('editor.publishing') : t('editor.publishScorecard')}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-success-light text-success-dark font-medium rounded-lg border border-success/30">
                    <CheckCircle className="w-4 h-4" />
                    {t('status.published')}
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleToggleGuide}
              aria-pressed={guideExpanded}
              className={`p-2 rounded-lg transition-colors ${
                guideExpanded ? 'text-primary-600 bg-primary-50' : 'text-stone-600 hover:text-primary-600 hover:bg-primary-50'
              }`}
              title={t('editor.aboutThisTool')}
            >
              <Info className="w-5 h-5" />
            </button>

            {lastSaved && (
              <div className="text-xs text-stone-500">
                {t('editor.lastSaved', { time: lastSaved.toLocaleTimeString() })}
              </div>
            )}

            {saving && (
              <div className="text-xs text-primary-600 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                {t('editor.saving')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ScorecardGuide expanded={guideExpanded} onToggle={handleToggleGuide} />
        </div>

        <div className="mt-4">
          <CountrySelector
            countries={countries}
            selectedCountry={selectedCountry}
            onSelectCountry={loadCountryData}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedCountry ? (
          <div className="text-center py-16">
            <div className="text-stone-400 mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-700 mb-2">
              {t('editor.selectCountryToBegin')}
            </h2>
            <p className="text-stone-600">
              {t('editor.selectCountryHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-lg border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-stone-900">
                    {selectedCountry.name}
                  </h2>
                  <p className="text-stone-600">{selectedCountry.region}</p>
                </div>
                {currentSubmission && (
                  <div className="text-right flex flex-col items-end gap-2">
                    <StatusBadge status={currentSubmission.status} />
                    <div className="flex items-baseline gap-2">
                      <div className="text-sm text-stone-600">{t('editor.version')}</div>
                      <div className="text-2xl font-bold text-stone-900">
                        {currentSubmission.version}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {scores.size > 0 && (
              <>
                <CompositeResults
                  compositeScore={result.compositeScore}
                  finalScore={result.finalScore}
                  tier={result.tier}
                  equityPenaltyApplied={result.equityPenaltyApplied}
                  insights={insights}
                />

                <ScoreVisualization pillars={pillars} pillarAverages={pillarAverages} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {result.pillarResults.map((pr) => {
                    const pillar = pillars.find((p) => p.id === pr.pillarId);
                    if (!pillar) return null;

                    return (
                      <PillarCard
                        key={pillar.id}
                        pillar={pillar}
                        average={pr.average}
                        weightedContribution={pr.weightedContribution}
                        onClick={() => setSelectedPillar(pillar)}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-stone-900">{t('editor.scoreIndicators')}</h2>
                <button
                  onClick={() => {
                    if (expandedPillars.size === pillars.length) {
                      setExpandedPillars(new Set());
                    } else {
                      setExpandedPillars(new Set(pillars.map((p) => p.id)));
                    }
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  {expandedPillars.size === pillars.length ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      {t('editor.collapseAll')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      {t('editor.expandAll')}
                    </>
                  )}
                </button>
              </div>

              {pillars.map((pillar) => {
                const pillarIndicators = indicators.filter((i) => i.pillar_id === pillar.id);
                const isExpanded = expandedPillars.has(pillar.id);

                return (
                  <div key={pillar.id} className="border border-stone-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => togglePillar(pillar.id)}
                      className="w-full px-6 py-4 bg-stone-50 hover:bg-stone-100 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-primary-600">
                          {pillar.code}
                        </span>
                        <span className="font-bold text-stone-900">{pillar.title}</span>
                        <span className="text-sm text-stone-600">{t('editor.indicatorCount', { count: pillarIndicators.length })}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-stone-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-stone-600" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-6 bg-white">
                        <ScoreInputTable
                          pillar={pillar}
                          indicators={pillarIndicators}
                          scores={scores}
                          onScoreChange={handleScoreChange}
                          onEvidenceClick={(indicator, score) =>
                            setEvidenceModalData({ indicator, score })
                          }
                          onIndicatorInfoClick={setSelectedIndicator}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
