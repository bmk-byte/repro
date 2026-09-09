import { describe, it, expect, vi, beforeEach } from 'vitest';

const { orderSpy, selectSpy, fromSpy } = vi.hoisted(() => ({
  orderSpy: vi.fn(),
  selectSpy: vi.fn(),
  fromSpy: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: { from: fromSpy },
}));

vi.mock('../errorReporting', () => ({
  reportError: vi.fn(),
}));

import { fetchCountries, toCountryIdByName } from './countries';
import { reportError } from '../errorReporting';

beforeEach(() => {
  fromSpy.mockReset();
  selectSpy.mockReset();
  orderSpy.mockReset();
  fromSpy.mockReturnValue({ select: selectSpy });
  selectSpy.mockReturnValue({ order: orderSpy });
  vi.mocked(reportError).mockClear();
});

// Every test forces a fresh fetch — the module-level cache is deliberately
// shared across the whole app (and therefore across these tests too), so
// {forceRefresh: true} is used everywhere except the dedicated
// caching/dedup tests below, which need the cache populated on purpose.
describe('fetchCountries', () => {
  it('returns the country list on success', async () => {
    orderSpy.mockResolvedValue({ data: [{ id: '1', name: 'Kenya' }], error: null });
    const result = await fetchCountries({ forceRefresh: true });
    expect(fromSpy).toHaveBeenCalledWith('countries');
    expect(selectSpy).toHaveBeenCalledWith('id, name');
    expect(result.data).toEqual([{ id: '1', name: 'Kenya' }]);
    expect(result.error).toBeNull();
  });

  it('returns an empty array (not null) when the query succeeds with no rows', async () => {
    orderSpy.mockResolvedValue({ data: null, error: null });
    const result = await fetchCountries({ forceRefresh: true });
    expect(result.data).toEqual([]);
  });

  it('reports the error and returns null data on failure, without throwing', async () => {
    const dbError = new Error('connection refused');
    orderSpy.mockResolvedValue({ data: null, error: dbError });
    const result = await fetchCountries({ forceRefresh: true });
    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(reportError).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({ category: 'DATA' })
    );
  });
});

describe('fetchCountries — caching and request dedup', () => {
  it('serves a second call from the cache without hitting the database again', async () => {
    orderSpy.mockResolvedValue({ data: [{ id: '1', name: 'Kenya' }], error: null });
    await fetchCountries({ forceRefresh: true });
    expect(fromSpy).toHaveBeenCalledTimes(1);

    const cached = await fetchCountries();
    expect(fromSpy).toHaveBeenCalledTimes(1); // still 1 — served from cache
    expect(cached.data).toEqual([{ id: '1', name: 'Kenya' }]);
  });

  it('deduplicates concurrent calls into a single database request', async () => {
    let resolveQuery: (value: { data: unknown; error: null }) => void;
    orderSpy.mockReturnValue(
      new Promise(resolve => {
        resolveQuery = resolve;
      })
    );

    const first = fetchCountries({ forceRefresh: true });
    const second = fetchCountries({ forceRefresh: true });

    resolveQuery!({ data: [{ id: '1', name: 'Kenya' }], error: null });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(fromSpy).toHaveBeenCalledTimes(1);
    expect(firstResult.data).toEqual(secondResult.data);
  });

  it('does not cache a failed fetch — the next call retries against the database', async () => {
    orderSpy.mockResolvedValueOnce({ data: null, error: new Error('down') });
    const failed = await fetchCountries({ forceRefresh: true });
    expect(failed.error).not.toBeNull();

    orderSpy.mockResolvedValueOnce({ data: [{ id: '1', name: 'Kenya' }], error: null });
    const retried = await fetchCountries({ forceRefresh: true });
    expect(retried.data).toEqual([{ id: '1', name: 'Kenya' }]);
    expect(fromSpy).toHaveBeenCalledTimes(2);
  });
});

describe('toCountryIdByName', () => {
  it('builds a case-insensitive, trimmed lookup map', () => {
    const map = toCountryIdByName([
      { id: 'k1', name: 'Kenya' },
      { id: 'u1', name: ' Uganda ' },
    ]);
    expect(map.get('kenya')).toBe('k1');
    expect(map.get('uganda')).toBe('u1');
    expect(map.get('KENYA')).toBeUndefined(); // lookups must lowercase on the read side too
  });

  it('returns an empty map for an empty country list', () => {
    expect(toCountryIdByName([]).size).toBe(0);
  });
});
