/**
 * Shared chart color tokens, mirroring `tailwind.config.js`'s color palette,
 * for use in recharts/Tremor chart props (`fill`, `stroke`, `<Cell>`, etc.)
 * that need raw hex values rather than Tailwind classes.
 *
 * Keep in sync with `tailwind.config.js`'s `primary`/`success`/`warning`/
 * `danger`/`info` tokens.
 */
export const CHART_COLORS = {
  primary: '#9C1D20',
  success: '#15803D',
  warning: '#B45309',
  danger: '#DC2626',
  info: '#1D4ED8',
} as const;

/**
 * On-brand categorical palette for charts needing more than the 4-5 semantic
 * colors above (e.g. multi-series pie/bar charts keyed on an open-ended set
 * of categories). Ordered to maximize contrast between adjacent entries.
 */
export const CHART_CATEGORICAL_PALETTE = [
  '#9C1D20', // primary maroon
  '#1D4ED8', // info blue
  '#15803D', // success green
  '#B45309', // warning amber
  '#7C3AED', // violet (no dedicated token — used only for categorical overflow)
  '#0891B2', // teal (no dedicated token — used only for categorical overflow)
] as const;

/** `stone-200` — recharts grid line color. */
export const CHART_GRID_COLOR = '#E7E3DB';

/** `stone-500` — recharts axis tick/label color. */
export const CHART_AXIS_COLOR = '#8A7F6C';
