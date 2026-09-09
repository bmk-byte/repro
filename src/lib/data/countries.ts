import { supabase } from '../supabase';
import { reportError } from '../errorReporting';

/**
 * Shared data-access module for `countries` — the first of what should
 * become a `src/lib/data/` layer covering the ~40 components that
 * currently call `supabase.from()` directly (see
 * docs/DATA_ACCESS_LAYER.md for the full catalogue and migration plan).
 * `countries` was picked first because it is fetched independently, with
 * inconsistent error handling, in at least three components
 * (BulkCaseUpload, BulkRapidResponseUpload, RapidResponseCasesPage).
 *
 * This module centralizes the query and its error handling. It does NOT
 * change what's allowed to be read — RLS on `countries` still applies
 * exactly as before; this is a thin, testable wrapper, not a new
 * authorization layer.
 */

export interface Country {
  id: string;
  name: string;
}

export interface DataResult<T> {
  data: T | null;
  error: unknown;
}

// Countries are public, non-role-sensitive, effectively-static reference
// data queried independently by 17+ components (see
// docs/CACHING_ASSESSMENT.md for the full assessment of why this — and
// only this, for now — got a hand-rolled cache instead of a library).
// A short in-memory cache plus in-flight-request dedup removes redundant
// round trips on tab switches/remounts without touching RLS: the one real
// query per cache window is still fully subject to RLS as normal.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: Country[]; fetchedAt: number } | null = null;
let inFlight: Promise<DataResult<Country[]>> | null = null;

async function fetchCountriesFromDb(): Promise<DataResult<Country[]>> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, name')
    .order('name');

  if (error) {
    reportError(error, { context: 'data.countries.fetchCountries', category: 'DATA' });
    return { data: null, error };
  }

  const rows = data ?? [];
  cache = { data: rows, fetchedAt: Date.now() };
  return { data: rows, error: null };
}

/**
 * Fetches all countries, ordered by name. Never throws — callers get a
 * discriminated `{ data, error }` result so they can decide their own UX
 * (toast, inline message, silent fallback) without duplicating the
 * fetch-and-log boilerplate. Every failure is reported to Sentry under the
 * DATA category so repeated failures are visible in monitoring even for
 * call sites that choose not to surface an error to the user.
 *
 * Cached in memory for 5 minutes; concurrent callers while a fetch is in
 * flight share the same request. A failed fetch is never cached, so the
 * very next call retries against the database rather than repeating a
 * cached failure. Pass `{ forceRefresh: true }` to bypass the cache.
 */
export async function fetchCountries(options?: { forceRefresh?: boolean }): Promise<DataResult<Country[]>> {
  if (!options?.forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { data: cache.data, error: null };
  }

  // Join an already-in-flight request regardless of forceRefresh — the
  // point of forceRefresh is "don't serve the cache," not "never share a
  // request with a concurrent caller." Two forceRefresh calls that land at
  // the same moment should still only hit the database once.
  if (inFlight) {
    return inFlight;
  }

  const request = fetchCountriesFromDb().finally(() => {
    inFlight = null;
  });
  inFlight = request;
  return request;
}

/** Convenience for the common "name -> id, case-insensitive" lookup pattern
 * used by every CSV bulk-upload validator. */
export function toCountryIdByName(countries: Country[]): Map<string, string> {
  const map = new Map<string, string>();
  countries.forEach(c => map.set(c.name.trim().toLowerCase(), c.id));
  return map;
}
