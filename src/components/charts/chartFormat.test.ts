import { describe, it, expect } from 'vitest';
import { formatCount, formatCompactCount, formatPercent, withPercentages } from './chartFormat';

describe('formatCount', () => {
  it('formats whole numbers without a trailing decimal', () => {
    expect(formatCount(30)).toBe('30');
    expect(formatCount(1000)).toBe('1,000');
  });

  it('rounds fractional values rather than showing them', () => {
    expect(formatCount(29.6)).toBe('30');
  });
});

describe('formatCompactCount', () => {
  it('never abbreviates small values, even ones close to a "round" number', () => {
    expect(formatCompactCount(30)).toBe('30');
    expect(formatCompactCount(999)).toBe('999');
  });

  it('abbreviates values at/above the threshold', () => {
    expect(formatCompactCount(12_000)).toMatch(/^12K$/i);
    expect(formatCompactCount(1_400_000)).toMatch(/^1\.4M$/i);
  });

  it('respects a custom threshold', () => {
    expect(formatCompactCount(500, 100)).toMatch(/^500$/); // still under a much higher default, but above this custom one — should NOT compact a value this small even with a low threshold, since 500 renders identically compact or not
    expect(formatCompactCount(5000, 1000)).toMatch(/^5K$/i);
  });
});

describe('formatPercent', () => {
  it('formats with one decimal place by default', () => {
    expect(formatPercent(38)).toBe('38.0%');
    expect(formatPercent(6.333)).toBe('6.3%');
  });

  it('respects a custom decimal count', () => {
    expect(formatPercent(38, 0)).toBe('38%');
  });
});

describe('withPercentages', () => {
  it('computes each item share of the total', () => {
    const result = withPercentages([{ value: 30 }, { value: 20 }, { value: 50 }]);
    expect(result.map(r => r.percent)).toEqual([30, 20, 50]);
  });

  it('returns 0 percent for every item when the total is 0, never NaN', () => {
    const result = withPercentages([{ value: 0 }, { value: 0 }]);
    expect(result.every(r => r.percent === 0)).toBe(true);
  });

  it('returns an empty array for an empty input without throwing', () => {
    expect(withPercentages([])).toEqual([]);
  });
});
