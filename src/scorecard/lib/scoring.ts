import type { ScorecardIndicatorScore, ScorecardPillar, ScorecardPillarResultRow } from '../types/database';

export function normalizeScore(score: number, maxScore: number = 4): number {
  if (maxScore === 0) return 0;
  return (score / maxScore) * 100;
}

export function calculatePillarAverage(scores: ScorecardIndicatorScore[]): number {
  if (scores.length === 0) return 0;

  const sum = scores.reduce((acc, score) => acc + score.normalized_score, 0);
  return sum / scores.length;
}

export function calculateWeightedContribution(
  pillarAverage: number,
  pillarWeight: number
): number {
  return (pillarAverage * pillarWeight) / 100;
}

export function calculateCompositeScore(pillarResults: ScorecardPillarResultRow[]): number {
  return pillarResults.reduce(
    (sum, result) => sum + result.weighted_contribution,
    0
  );
}

export function applyEquityPenalty(
  compositeScore: number,
  equityPillarAverage: number
): { finalScore: number; penaltyApplied: boolean } {
  const penaltyApplied = equityPillarAverage < 40;
  const finalScore = penaltyApplied ? compositeScore - 5 : compositeScore;

  return { finalScore, penaltyApplied };
}

export function classifyTier(score: number): 'Regressive' | 'Emergent' | 'Progressive' {
  if (score >= 80) return 'Progressive';
  if (score >= 60) return 'Emergent';
  return 'Regressive';
}

export function getPerformanceLevel(percentage: number): 'low' | 'medium' | 'high' {
  if (percentage >= 70) return 'high';
  if (percentage >= 40) return 'medium';
  return 'low';
}

export function getPerformanceColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'medium':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-primary-700 bg-primary-50 border-primary-200';
  }
}

export function getTierColor(tier: string): string {
  switch (tier) {
    case 'Progressive':
      return 'bg-green-600 text-white';
    case 'Emergent':
      return 'bg-primary-600 text-white';
    case 'Regressive':
      return 'bg-primary-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
}

export interface ScoringResult {
  pillarResults: Array<{
    pillarId: string;
    pillarCode: string;
    pillarTitle: string;
    pillarWeight: number;
    average: number;
    weightedContribution: number;
    performanceLevel: 'low' | 'medium' | 'high';
  }>;
  compositeScore: number;
  finalScore: number;
  equityPenaltyApplied: boolean;
  tier: 'Regressive' | 'Emergent' | 'Progressive';
}

export function calculateFullScorecard(
  pillars: ScorecardPillar[],
  indicatorScoresByPillar: Map<string, ScorecardIndicatorScore[]>
): ScoringResult {
  const pillarResults = pillars.map((pillar) => {
    const scores = indicatorScoresByPillar.get(pillar.id) || [];
    const average = calculatePillarAverage(scores);
    const weightedContribution = calculateWeightedContribution(average, pillar.weight);
    const performanceLevel = getPerformanceLevel(average);

    return {
      pillarId: pillar.id,
      pillarCode: pillar.code,
      pillarTitle: pillar.title,
      pillarWeight: pillar.weight,
      average,
      weightedContribution,
      performanceLevel,
    };
  });

  const compositeScore = pillarResults.reduce(
    (sum, result) => sum + result.weightedContribution,
    0
  );

  const equityPillar = pillarResults.find((p) => p.pillarCode === 'P7');
  const equityAverage = equityPillar?.average || 0;

  const { finalScore, penaltyApplied } = applyEquityPenalty(compositeScore, equityAverage);
  const tier = classifyTier(finalScore);

  return {
    pillarResults,
    compositeScore,
    finalScore,
    equityPenaltyApplied: penaltyApplied,
    tier,
  };
}

/** Translate function shape compatible with react-i18next's `t`, passed in
 * by the caller rather than imported here so this module stays
 * framework-agnostic (see the module header). */
type Translate = (key: string, params?: Record<string, unknown>) => string;

export function generateInsights(result: ScoringResult, t: Translate): string[] {
  const insights: string[] = [];

  const weakPillars = result.pillarResults
    .filter((p) => p.performanceLevel === 'low')
    .sort((a, b) => a.average - b.average);

  const strongPillars = result.pillarResults
    .filter((p) => p.performanceLevel === 'high')
    .sort((a, b) => b.average - a.average);

  if (weakPillars.length > 0) {
    const weakest = weakPillars[0];
    insights.push(
      t('insights.weakest', { pillar: weakest.pillarTitle, score: weakest.average.toFixed(1) })
    );
  }

  if (strongPillars.length > 0) {
    const strongest = strongPillars[0];
    insights.push(
      t('insights.strongest', { pillar: strongest.pillarTitle, score: strongest.average.toFixed(1) })
    );
  }

  if (result.equityPenaltyApplied) {
    insights.push(t('insights.equityPenaltyApplied'));
  }

  const midPerformers = result.pillarResults.filter((p) => p.performanceLevel === 'medium');
  if (midPerformers.length > 0) {
    insights.push(t('insights.moderatePerformers', { count: midPerformers.length }));
  }

  if (result.tier === 'Regressive') {
    insights.push(t('insights.tierRegressive'));
  } else if (result.tier === 'Emergent') {
    insights.push(t('insights.tierEmergent'));
  } else {
    insights.push(t('insights.tierProgressive'));
  }

  return insights;
}
