// Data-access layer for the Scorecard feature's scorecard_* tables (see
// supabase/migrations/20261001075948_create_scorecard_schema.sql).
// `countries` is reused directly from Repropulse's own `countries` table,
// so a case's country and a scorecard submission's country are the same
// row (see src/lib/data/scorecard.ts for the cross-link this enables).
//
// Editor-role management goes through admin_set_scorecard_editor /
// list_scorecard_editors (see ScorecardEditorAdminPanel.tsx), mirroring
// Repropulse's existing moderator-grant pattern rather than a separate
// role table.
import { supabase } from '../../lib/supabase';
import type {
  ScorecardCountry,
  ScorecardPillar,
  ScorecardIndicator,
  ScorecardSubmission,
  ScorecardIndicatorScore,
  ScorecardPillarResultRow,
} from '../types/database';
import { normalizeScore, calculatePillarAverage, calculateWeightedContribution } from './scoring';

export async function fetchScorecardCountries(): Promise<ScorecardCountry[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, name, code, region')
    .not('code', 'is', null)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function fetchPillars(): Promise<ScorecardPillar[]> {
  const { data, error } = await supabase
    .from('scorecard_pillars')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return data || [];
}

export async function fetchIndicators(): Promise<ScorecardIndicator[]> {
  const { data, error } = await supabase
    .from('scorecard_indicators')
    .select('*')
    .order('order_index');

  if (error) throw error;
  return data || [];
}

export async function fetchIndicatorsByPillar(pillarId: string): Promise<ScorecardIndicator[]> {
  const { data, error } = await supabase
    .from('scorecard_indicators')
    .select('*')
    .eq('pillar_id', pillarId)
    .order('order_index');

  if (error) throw error;
  return data || [];
}

export async function createSubmission(
  countryId: string
): Promise<ScorecardSubmission> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to create a submission');
  }

  const { data: existingSubmissions } = await supabase
    .from('scorecard_submissions')
    .select('version')
    .eq('country_id', countryId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = existingSubmissions && existingSubmissions.length > 0
    ? existingSubmissions[0].version + 1
    : 1;

  const { data, error } = await supabase
    .from('scorecard_submissions')
    .insert({
      country_id: countryId,
      version: nextVersion,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSubmission(submissionId: string): Promise<ScorecardSubmission | null> {
  const { data, error } = await supabase
    .from('scorecard_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchSubmissionsByCountry(
  countryId: string
): Promise<ScorecardSubmission[]> {
  const { data, error } = await supabase
    .from('scorecard_submissions')
    .select('*')
    .eq('country_id', countryId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchLatestSubmission(
  countryId: string
): Promise<ScorecardSubmission | null> {
  const { data, error } = await supabase
    .from('scorecard_submissions')
    .select('*')
    .eq('country_id', countryId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertIndicatorScore(
  submissionId: string,
  indicatorId: string,
  score: number,
  evidenceNotes?: string,
  lastEditedBy?: string
): Promise<ScorecardIndicatorScore> {
  const normalized = normalizeScore(score);

  const { data, error } = await supabase
    .from('scorecard_indicator_scores')
    .upsert(
      {
        submission_id: submissionId,
        indicator_id: indicatorId,
        score: score,
        normalized_score: normalized,
        evidence_notes: evidenceNotes || null,
        last_edited_by: lastEditedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id,indicator_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchIndicatorScores(
  submissionId: string
): Promise<ScorecardIndicatorScore[]> {
  const { data, error } = await supabase
    .from('scorecard_indicator_scores')
    .select('*')
    .eq('submission_id', submissionId);

  if (error) throw error;
  return data || [];
}

export async function updateEvidenceNotes(
  scoreId: string,
  evidenceNotes: string,
  evidenceComplete: boolean
): Promise<void> {
  const { error } = await supabase
    .from('scorecard_indicator_scores')
    .update({
      evidence_notes: evidenceNotes,
      evidence_complete: evidenceComplete,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scoreId);

  if (error) throw error;
}

export async function calculateAndSavePillarResults(
  submissionId: string,
  pillars: ScorecardPillar[],
  allScores: ScorecardIndicatorScore[],
  indicators: ScorecardIndicator[]
): Promise<ScorecardPillarResultRow[]> {
  const pillarResults: ScorecardPillarResultRow[] = [];

  for (const pillar of pillars) {
    const pillarIndicators = indicators.filter((i) => i.pillar_id === pillar.id);
    const pillarIndicatorIds = new Set(pillarIndicators.map((i) => i.id));
    const pillarScores = allScores.filter((s) => pillarIndicatorIds.has(s.indicator_id));

    const average = calculatePillarAverage(pillarScores);
    const weightedContribution = calculateWeightedContribution(average, pillar.weight);

    const { data, error } = await supabase
      .from('scorecard_pillar_results')
      .upsert(
        {
          submission_id: submissionId,
          pillar_id: pillar.id,
          average_score: average,
          weighted_contribution: weightedContribution,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'submission_id,pillar_id' }
      )
      .select()
      .single();

    if (error) throw error;
    pillarResults.push(data);
  }

  return pillarResults;
}

export async function fetchPillarResults(submissionId: string): Promise<ScorecardPillarResultRow[]> {
  const { data, error } = await supabase
    .from('scorecard_pillar_results')
    .select('*')
    .eq('submission_id', submissionId);

  if (error) throw error;
  return data || [];
}

export async function updateSubmissionResults(
  submissionId: string,
  compositeScore: number,
  tier: string,
  equityPenaltyApplied: boolean
): Promise<void> {
  const { error } = await supabase
    .from('scorecard_submissions')
    .update({
      composite_score: compositeScore,
      tier,
      equity_penalty_applied: equityPenaltyApplied,
    })
    .eq('id', submissionId);

  if (error) throw error;
}

export async function updateSubmissionStatus(
  submissionId: string,
  status: 'draft' | 'submitted' | 'published'
): Promise<void> {
  const update: { status: string; submitted_at?: string } = { status };

  if (status === 'submitted' || status === 'published') {
    update.submitted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('scorecard_submissions')
    .update(update)
    .eq('id', submissionId);

  if (error) throw error;
}

export async function fetchAllPublishedSubmissions(): Promise<Array<{
  submission: ScorecardSubmission;
  country: ScorecardCountry;
  pillarResults: ScorecardPillarResultRow[];
}>> {
  const { data, error } = await supabase
    .from('scorecard_submissions')
    .select('*, countries(id, name, code, region), scorecard_pillar_results(*)')
    .in('status', ['submitted', 'published'])
    .order('composite_score', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((row) => row.countries)
    .map((row) => {
      const { countries, scorecard_pillar_results, ...submission } = row as typeof row & {
        countries: ScorecardCountry;
        scorecard_pillar_results: ScorecardPillarResultRow[];
      };
      return {
        submission: submission as unknown as ScorecardSubmission,
        country: countries,
        pillarResults: scorecard_pillar_results || [],
      };
    });
}

export interface CountryAnalysisData {
  country: ScorecardCountry;
  submission: ScorecardSubmission | null;
  pillarResults: ScorecardPillarResultRow[];
  indicatorScores: ScorecardIndicatorScore[];
}

export async function fetchAllCountriesAnalysisData(): Promise<CountryAnalysisData[]> {
  const countries = await fetchScorecardCountries();
  if (countries.length === 0) return [];

  const { data: submissions, error: submissionsError } = await supabase
    .from('scorecard_submissions')
    .select('*, scorecard_pillar_results(*), scorecard_indicator_scores(*)')
    .order('version', { ascending: false });

  if (submissionsError) throw submissionsError;

  const latestSubmissionByCountry = new Map<string, typeof submissions extends (infer T)[] | null ? T : never>();
  (submissions || []).forEach((sub) => {
    if (!latestSubmissionByCountry.has(sub.country_id)) {
      latestSubmissionByCountry.set(sub.country_id, sub);
    }
  });

  return countries.map((country) => {
    const subRow = latestSubmissionByCountry.get(country.id);
    if (!subRow) {
      return { country, submission: null, pillarResults: [], indicatorScores: [] };
    }
    const { scorecard_pillar_results, scorecard_indicator_scores, ...submission } = subRow as typeof subRow & {
      scorecard_pillar_results: ScorecardPillarResultRow[];
      scorecard_indicator_scores: ScorecardIndicatorScore[];
    };
    return {
      country,
      submission: submission as unknown as ScorecardSubmission,
      pillarResults: scorecard_pillar_results || [],
      indicatorScores: scorecard_indicator_scores || [],
    };
  });
}

export interface IndicatorAnalysisData {
  indicatorId: string;
  indicator: ScorecardIndicator;
  countryScores: Array<{
    country: ScorecardCountry;
    score: ScorecardIndicatorScore | null;
  }>;
}

export async function fetchIndicatorAnalysisData(
  indicatorId: string
): Promise<IndicatorAnalysisData | null> {
  const { data: indicator, error: indicatorError } = await supabase
    .from('scorecard_indicators')
    .select('*')
    .eq('id', indicatorId)
    .maybeSingle();

  if (indicatorError) throw indicatorError;
  if (!indicator) return null;

  const [countries, submissionsResult] = await Promise.all([
    fetchScorecardCountries(),
    supabase
      .from('scorecard_submissions')
      .select('id, country_id, version')
      .order('version', { ascending: false }),
  ]);

  if (submissionsResult.error) throw submissionsResult.error;

  const allSubmissions = submissionsResult.data || [];

  const latestSubmissionIdByCountry = new Map<string, string>();
  allSubmissions.forEach((sub) => {
    if (!latestSubmissionIdByCountry.has(sub.country_id)) {
      latestSubmissionIdByCountry.set(sub.country_id, sub.id);
    }
  });

  const submissionIds = Array.from(latestSubmissionIdByCountry.values());
  const { data: indicatorScores, error: scoresError } = submissionIds.length > 0
    ? await supabase
        .from('scorecard_indicator_scores')
        .select('*')
        .in('submission_id', submissionIds)
        .eq('indicator_id', indicatorId)
    : { data: [], error: null };

  if (scoresError) throw scoresError;

  const scoreBySubmission = new Map((indicatorScores || []).map((s) => [s.submission_id, s]));

  const countryScores = countries.map((country) => {
    const subId = latestSubmissionIdByCountry.get(country.id);
    const score = subId ? (scoreBySubmission.get(subId) ?? null) : null;
    return { country, score };
  });

  return { indicatorId, indicator, countryScores };
}

export interface RegionalAnalysisData {
  region: string;
  countries: ScorecardCountry[];
  averageCompositeScore: number;
  pillarAverages: Map<string, number>;
  tierDistribution: { Regressive: number; Emergent: number; Progressive: number };
}

export async function fetchRegionalAnalysisData(): Promise<RegionalAnalysisData[]> {
  const analysisData = await fetchAllCountriesAnalysisData();

  const regionMap = new Map<string, CountryAnalysisData[]>();
  analysisData.forEach((data) => {
    const region = data.country.region ?? 'Unknown';
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }
    regionMap.get(region)!.push(data);
  });

  const regionalData: RegionalAnalysisData[] = [];

  regionMap.forEach((countriesData, region) => {
    const countries = countriesData.map((d) => d.country);
    const submissionsWithData = countriesData.filter(
      (d) => d.submission && d.submission.composite_score !== null
    );

    const averageCompositeScore =
      submissionsWithData.length > 0
        ? submissionsWithData.reduce(
            (sum, d) => sum + (d.submission!.composite_score || 0),
            0
          ) / submissionsWithData.length
        : 0;

    const pillarAverages = new Map<string, number>();
    const pillarScoresMap = new Map<string, number[]>();

    submissionsWithData.forEach((d) => {
      d.pillarResults.forEach((pr) => {
        if (!pillarScoresMap.has(pr.pillar_id)) {
          pillarScoresMap.set(pr.pillar_id, []);
        }
        pillarScoresMap.get(pr.pillar_id)!.push(pr.average_score);
      });
    });

    pillarScoresMap.forEach((scores, pillarId) => {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      pillarAverages.set(pillarId, avg);
    });

    const tierDistribution = { Regressive: 0, Emergent: 0, Progressive: 0 };
    submissionsWithData.forEach((d) => {
      const tier = d.submission!.tier;
      if (tier) {
        tierDistribution[tier]++;
      }
    });

    regionalData.push({
      region,
      countries,
      averageCompositeScore,
      pillarAverages,
      tierDistribution,
    });
  });

  return regionalData.sort((a, b) => b.averageCompositeScore - a.averageCompositeScore);
}

export async function reassignSubmission(
  submissionId: string,
  newOwnerId: string
): Promise<void> {
  const { error } = await supabase
    .from('scorecard_submissions')
    .update({ created_by: newOwnerId })
    .eq('id', submissionId);

  if (error) throw error;
}

export async function fetchAllSubmissionsWithCountry(): Promise<Array<{
  submission: ScorecardSubmission;
  country: ScorecardCountry;
}>> {
  const { data: submissions, error } = await supabase
    .from('scorecard_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!submissions) return [];

  const countries = await fetchScorecardCountries();
  const countryMap = new Map(countries.map((c) => [c.id, c]));

  return submissions.map((submission) => ({
    submission,
    country: countryMap.get(submission.country_id)!,
  })).filter((r) => r.country);
}

export interface CountryDetailData {
  country: ScorecardCountry;
  submission: ScorecardSubmission | null;
  pillarResults: ScorecardPillarResultRow[];
  indicatorScores: ScorecardIndicatorScore[];
  pillars: ScorecardPillar[];
  indicators: ScorecardIndicator[];
}

export async function fetchCountryDetailData(countryId: string): Promise<CountryDetailData | null> {
  const { data: country, error: countryError } = await supabase
    .from('countries')
    .select('id, name, code, region')
    .eq('id', countryId)
    .maybeSingle();

  if (countryError) throw countryError;
  if (!country) return null;

  const [pillarsResult, indicatorsResult, submissionResult] = await Promise.all([
    supabase.from('scorecard_pillars').select('*').order('order_index'),
    supabase.from('scorecard_indicators').select('*').order('order_index'),
    supabase
      .from('scorecard_submissions')
      .select('*, scorecard_pillar_results(*), scorecard_indicator_scores(*)')
      .eq('country_id', countryId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (pillarsResult.error) throw pillarsResult.error;
  if (indicatorsResult.error) throw indicatorsResult.error;
  if (submissionResult.error) throw submissionResult.error;

  if (!submissionResult.data) {
    return {
      country,
      submission: null,
      pillarResults: [],
      indicatorScores: [],
      pillars: pillarsResult.data || [],
      indicators: indicatorsResult.data || [],
    };
  }

  const { scorecard_pillar_results, scorecard_indicator_scores, ...submission } = submissionResult.data as typeof submissionResult.data & {
    scorecard_pillar_results: ScorecardPillarResultRow[];
    scorecard_indicator_scores: ScorecardIndicatorScore[];
  };

  return {
    country,
    submission: submission as unknown as ScorecardSubmission,
    pillarResults: scorecard_pillar_results || [],
    indicatorScores: scorecard_indicator_scores || [],
    pillars: pillarsResult.data || [],
    indicators: indicatorsResult.data || [],
  };
}
