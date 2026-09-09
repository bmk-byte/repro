/**
 * Shared number/percent formatting for the chart design system. Centralized
 * so every chart displays counts and percentages the same way instead of
 * each component inventing its own `toFixed`/template-string formatting.
 */

/** Integer count formatting — never shows a trailing ".0" for whole numbers. */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * Compact formatting for large numbers (1.2K, 25K, 1.4M) — only applied
 * above the threshold, so small values like 30 are never mangled into
 * something like "30" being treated as compact-eligible when it shouldn't
 * be abbreviated at all.
 */
export function formatCompactCount(value: number, threshold = 10_000): string {
  if (Math.abs(value) < threshold) return formatCount(value);
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** Percentage formatting with consistent, non-misleading precision. */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Computes each item's share of the total as a percentage (0 when total is 0, never NaN). */
export function withPercentages<T extends { value: number }>(items: T[]): (T & { percent: number })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return items.map(item => ({ ...item, percent: total > 0 ? (item.value / total) * 100 : 0 }));
}
