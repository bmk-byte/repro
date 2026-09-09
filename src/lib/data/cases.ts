import { supabase } from '../supabase';
import { reportError } from '../errorReporting';
import { sanitizeSearchTerm } from '../sanitize';

/**
 * Shared data-access module for the Cases domain — the second module in
 * `src/lib/data/` (see docs/DATA_ACCESS_LAYER.md for the full catalogue
 * and why Cases was picked next: it's the largest, most-used domain).
 *
 * This is intentionally a narrow, faithful extraction of CasesPage.tsx's
 * existing `fetchCases`/filter-options queries — same filters, same
 * pagination, same RLS reliance, no behavior change. It does not attempt
 * to cover every cases-related query in the app (CaseDetails, EditCaseModal,
 * CasesTable, CaseFilter still query directly) — that's future,
 * incremental work per the catalogue, not something to batch into one
 * change.
 */

export interface CaseListItem {
  id: string;
  case_filed: string;
  created_at: string;
  status: string;
  case_type: string;
  priority_level: string | null;
  rapid_response_stage: string | null;
  case_categories: string[] | null;
  partner: string | null;
  countries: { name: string } | null;
  user_id: string;
}

export interface CaseListFilters {
  status?: string;
  type?: string;
  country?: string;
  category?: string;
  partner?: string;
}

export interface DataResult<T> {
  data: T | null;
  error: unknown;
}

export interface CaseListResult extends DataResult<CaseListItem[]> {
  count: number | null;
}

/**
 * Fetches a page of approved litigation cases, applying the same filters,
 * search, and pagination CasesPage.tsx applied inline before this
 * extraction. RLS still fully governs which rows are visible — this
 * function adds no client-side access control (see this module's header
 * and src/lib/permissions.ts for why that boundary is deliberate).
 */
export async function fetchLitigationCases(
  filters: CaseListFilters,
  searchTerm: string,
  page: number,
  pageSize: number
): Promise<CaseListResult> {
  let query = supabase
    .from('cases')
    .select(
      `
      id,
      case_filed,
      created_at,
      status,
      case_type,
      priority_level,
      rapid_response_stage,
      case_categories,
      partner,
      countries (name),
      user_id
    `,
      { count: 'exact' }
    )
    .eq('case_type', 'litigation')
    .eq('moderation_status', 'approved');

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('case_type', filters.type);
  if (filters.country) query = query.eq('country_id', filters.country);
  if (filters.category) query = query.contains('case_categories', [filters.category]);
  if (filters.partner) query = query.eq('partner', filters.partner);

  if (searchTerm) {
    const sanitized = sanitizeSearchTerm(searchTerm);
    query = query.or(`case_filed.ilike.%${sanitized}%,case_summary.ilike.%${sanitized}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    reportError(error, { context: 'data.cases.fetchLitigationCases', category: 'DATA' });
    return { data: null, count: null, error };
  }

  return { data: (data as unknown as CaseListItem[]) ?? [], count, error: null };
}

/**
 * Fetches the distinct case categories and partner organizations present
 * across litigation cases, used to populate filter dropdowns. Two
 * lightweight queries, same as CasesPage.tsx ran inline.
 */
export async function fetchCaseFilterOptions(): Promise<
  DataResult<{ categories: string[]; partners: string[] }>
> {
  const { data: casesData, error: casesError } = await supabase
    .from('cases')
    .select('case_categories')
    .eq('case_type', 'litigation')
    .not('case_categories', 'is', null);

  if (casesError) {
    reportError(casesError, { context: 'data.cases.fetchCaseFilterOptions.categories', category: 'DATA' });
    return { data: null, error: casesError };
  }

  const { data: partnersData, error: partnersError } = await supabase
    .from('cases')
    .select('partner')
    .eq('case_type', 'litigation')
    .not('partner', 'is', null);

  if (partnersError) {
    reportError(partnersError, { context: 'data.cases.fetchCaseFilterOptions.partners', category: 'DATA' });
    return { data: null, error: partnersError };
  }

  const allCategories = (casesData ?? []).flatMap((c: { case_categories: string[] | null }) => c.case_categories || []);
  const categories = Array.from(new Set(allCategories));

  const allPartners = (partnersData ?? []).map((p: { partner: string | null }) => p.partner).filter(Boolean) as string[];
  const partners = Array.from(new Set(allPartners));

  return { data: { categories, partners }, error: null };
}
