// Types for the scorecard_* tables (see
// supabase/migrations/20261001075948_create_scorecard_schema.sql). Named
// distinctly from Repropulse's own types (e.g. `src/lib/data/countries.ts`'s
// `Country`) to avoid collisions where both modules are imported together.

export interface ScorecardCountry {
  id: string;
  name: string;
  code: string | null;
  region: string | null;
}

export interface ScorecardPillar {
  id: string;
  code: string;
  title: string;
  description: string;
  weight: number;
  order_index: number;
}

export interface ScorecardIndicator {
  id: string;
  pillar_id: string;
  code: string;
  title: string;
  definition: string;
  scoring_criteria: Record<string, string>;
  evidence_sources: string[];
  max_score: number;
  order_index: number;
}

export interface ScorecardSubmission {
  id: string;
  country_id: string;
  version: number;
  status: 'draft' | 'submitted' | 'published';
  composite_score: number | null;
  tier: 'Regressive' | 'Emergent' | 'Progressive' | null;
  equity_penalty_applied: boolean;
  created_by: string | null;
  created_at: string;
  submitted_at: string | null;
  notes: string | null;
}

export interface ScorecardIndicatorScore {
  id: string;
  submission_id: string;
  indicator_id: string;
  score: number;
  normalized_score: number;
  evidence_notes: string | null;
  evidence_complete: boolean;
  last_edited_by: string | null;
  updated_at: string;
}

export interface ScorecardPillarResultRow {
  id: string;
  submission_id: string;
  pillar_id: string;
  average_score: number;
  weighted_contribution: number;
  updated_at: string;
}

export interface ScorecardIndicatorWithDetails extends ScorecardIndicator {
  pillar: ScorecardPillar;
  score?: ScorecardIndicatorScore;
}

export interface ScorecardPillarWithIndicators extends ScorecardPillar {
  indicators: ScorecardIndicatorWithDetails[];
}

export interface ScorecardWithDetails extends ScorecardSubmission {
  country: ScorecardCountry;
  pillar_results: (ScorecardPillarResultRow & { pillar: ScorecardPillar })[];
  indicator_scores: ScorecardIndicatorScore[];
}
