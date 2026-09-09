import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryBuilder, fromSpy } = vi.hoisted(() => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'eq', 'contains', 'or', 'order', 'range', 'not'];
  for (const method of methods) {
    builder[method] = vi.fn(() => builder);
  }
  return { queryBuilder: builder, fromSpy: vi.fn(() => builder) };
});

vi.mock('../supabase', () => ({
  supabase: { from: fromSpy },
}));

vi.mock('../errorReporting', () => ({
  reportError: vi.fn(),
}));

import { fetchLitigationCases, fetchCaseFilterOptions } from './cases';
import { reportError } from '../errorReporting';

// The mocked query builder needs to be "thenable" so `await query` resolves
// to whatever the current test configured — set per-test via
// queryBuilder.range.mockImplementation or by making range() itself
// resolve. Since fetchLitigationCases does `await query` after chaining,
// and every chain method returns `builder`, we make `range` (the final
// chain call before await) return a resolved value directly.
beforeEach(() => {
  fromSpy.mockClear();
  for (const key of Object.keys(queryBuilder)) {
    queryBuilder[key].mockClear();
    queryBuilder[key].mockReturnValue(queryBuilder);
  }
  vi.mocked(reportError).mockClear();
});

describe('fetchLitigationCases', () => {
  it('applies only the base filters when no optional filters are set', async () => {
    queryBuilder.range.mockResolvedValue({ data: [{ id: '1' }], count: 1, error: null });
    const result = await fetchLitigationCases({}, '', 1, 9);

    expect(fromSpy).toHaveBeenCalledWith('cases');
    expect(queryBuilder.eq).toHaveBeenCalledWith('case_type', 'litigation');
    expect(queryBuilder.eq).toHaveBeenCalledWith('moderation_status', 'approved');
    expect(queryBuilder.contains).not.toHaveBeenCalled();
    expect(queryBuilder.or).not.toHaveBeenCalled();
    expect(result.data).toEqual([{ id: '1' }]);
    expect(result.count).toBe(1);
  });

  it('applies status/type/country/category/partner filters when provided', async () => {
    queryBuilder.range.mockResolvedValue({ data: [], count: 0, error: null });
    await fetchLitigationCases(
      { status: 'active', type: 'litigation', country: 'country-1', category: 'Health', partner: 'Org' },
      '',
      1,
      9
    );

    expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'active');
    expect(queryBuilder.eq).toHaveBeenCalledWith('country_id', 'country-1');
    expect(queryBuilder.contains).toHaveBeenCalledWith('case_categories', ['Health']);
    expect(queryBuilder.eq).toHaveBeenCalledWith('partner', 'Org');
  });

  it('sanitizes and applies the search term as an OR filter across two columns', async () => {
    queryBuilder.range.mockResolvedValue({ data: [], count: 0, error: null });
    await fetchLitigationCases({}, 'hello%world', 1, 9);

    expect(queryBuilder.or).toHaveBeenCalledTimes(1);
    const orArg = queryBuilder.or.mock.calls[0][0] as string;
    expect(orArg).toContain('case_filed.ilike.');
    expect(orArg).toContain('case_summary.ilike.');
    // The raw '%' from user input must not survive un-escaped into the
    // ilike pattern (LIKE-wildcard injection) — sanitizeSearchTerm handles
    // this; we just confirm it's actually being invoked here in some form.
    expect(orArg).not.toContain('hello%world%');
  });

  it('computes range() from page and pageSize', async () => {
    queryBuilder.range.mockResolvedValue({ data: [], count: 0, error: null });
    await fetchLitigationCases({}, '', 3, 9);
    expect(queryBuilder.range).toHaveBeenCalledWith(18, 26); // page 3, size 9: from=18, to=26
  });

  it('reports and returns the error on failure, without throwing', async () => {
    const dbError = new Error('query failed');
    queryBuilder.range.mockResolvedValue({ data: null, count: null, error: dbError });
    const result = await fetchLitigationCases({}, '', 1, 9);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(reportError).toHaveBeenCalledWith(dbError, expect.objectContaining({ category: 'DATA' }));
  });
});

describe('fetchCaseFilterOptions', () => {
  it('flattens and deduplicates categories and partners across cases', async () => {
    queryBuilder.not.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ case_categories: ['A', 'B'] }, { case_categories: ['B', 'C'] }], error: null })
    );
    queryBuilder.not.mockImplementationOnce(() =>
      Promise.resolve({ data: [{ partner: 'Org 1' }, { partner: 'Org 1' }, { partner: null }], error: null })
    );

    const result = await fetchCaseFilterOptions();

    expect(result.data?.categories.sort()).toEqual(['A', 'B', 'C']);
    expect(result.data?.partners).toEqual(['Org 1']);
  });

  it('reports and returns the error if the categories query fails', async () => {
    const dbError = new Error('categories query failed');
    queryBuilder.not.mockImplementationOnce(() => Promise.resolve({ data: null, error: dbError }));

    const result = await fetchCaseFilterOptions();
    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(reportError).toHaveBeenCalledWith(dbError, expect.objectContaining({ category: 'DATA' }));
  });
});
