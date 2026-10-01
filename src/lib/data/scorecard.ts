import { supabase } from '../supabase';
import { reportError } from '../errorReporting';

/**
 * Thin query for the case↔scorecard cross-link: given a case's country,
 * find that country's most recent
 * *published* Maputo Protocol scorecard submission, if any. Draft and
 * submitted-but-unpublished rows are deliberately excluded — this mirrors
 * the public RLS policy on `scorecard_submissions`
 * (`status IN ('submitted','published')`), but narrows further to
 * `published` only, since an unpublished tier/score isn't yet something
 * Afya na Haki has vouched for publicly.
 */

export interface LatestPublishedScorecard {
  id: string;
  country_id: string;
  composite_score: number | null;
  tier: 'Regressive' | 'Emergent' | 'Progressive' | null;
  equity_penalty_applied: boolean;
  submitted_at: string | null;
}

export async function fetchLatestPublishedScorecard(
  countryId: string | null | undefined
): Promise<LatestPublishedScorecard | null> {
  if (!countryId) return null;

  const { data, error } = await supabase
    .from('scorecard_submissions')
    .select('id, country_id, composite_score, tier, equity_penalty_applied, submitted_at')
    .eq('country_id', countryId)
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    reportError(error, { context: 'data.scorecard.fetchLatestPublishedScorecard', category: 'DATA' });
    return null;
  }

  return data;
}
