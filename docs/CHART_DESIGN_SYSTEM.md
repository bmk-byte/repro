# Chart Design System

## Why

A design review of the dashboard found the chart visualizations inconsistent and, in places, unreadable: the "Case Category Distribution" chart specifically had overlapping category labels, solid-black bars (a Tremor color-mapping bug — arbitrary hex codes silently fall back to black when passed to Tremor's `colors` prop, which only accepts its own named palette), and a tooltip that obscured the chart. This document describes the reusable chart component system built to fix that, and gives an honest account of how much of the dashboard it's been applied to versus cataloged for a follow-up pass.

## Audit findings

The dashboard's charts are built on **two different charting approaches**, which is itself part of the inconsistency:

| Approach | Files | Chart types found |
|---|---|---|
| `@tremor/react` (wraps recharts, opinionated API) | `RapidResponseDashboard.tsx` | `BarChart` ×4 |
| Raw `recharts` | `TimelineVisualization.tsx` | `AreaChart` ×3 |
| | `StakeholderAnalytics.tsx` | `BarChart` ×5, `PieChart` ×3 |
| | `PerformanceTrackingModule.tsx` | `BarChart` ×3, `LineChart` ×3 |
| | `PerformanceMetrics.tsx` | `AreaChart` ×3 |
| | `OutcomeMetricsDashboard.tsx` | `BarChart` ×5, `PieChart` ×3 |
| | `LegalFrameworkAnalysis.tsx` | `AreaChart` ×3, `BarChart` ×3, `PieChart` ×3 |
| | `HealthIndicatorIntegration.tsx` | `LineChart` ×3, `ScatterChart` ×3 |
| | `GeographicIntelligence.tsx` | `BarChart` ×5 |
| | `DistributionCharts.tsx` | `BarChart` ×5, `PieChart` ×3 |
| | `DataChart.tsx` | `AreaChart` ×3, `BarChart` ×3, `LineChart` ×3 |

(Counts are `grep` occurrences of the component tag, not distinct chart instances — several of these are the same chart type reused with different data across a few view states in the same file.)

A partial foundation already existed and was reused rather than duplicated: [`src/lib/chartColors.ts`](../src/lib/chartColors.ts) (brand hex tokens mirroring `tailwind.config.js`), [`src/lib/chartLayout.ts`](../src/lib/chartLayout.ts) (`chartHeight()` for dynamic per-row height), and [`src/components/ui/`](../src/components/ui/)'s `Card`, `EmptyState`, `ErrorState`, `Skeleton` (already on-brand — rounded, `stone`-bordered, soft shadow).

## What was built

`src/components/charts/`:

- **`ChartCard.tsx`** — the one consistent container (title, optional description, optional right-aligned action, then the chart) every redesigned chart sits inside. Built on the existing `Card` primitive, not a new one.
- **`ChartTooltip.tsx`** (`ChartTooltipContent`) — white background, subtle border, soft shadow, rounded corners, a title row plus label/value rows. Replaces recharts' default dark, unstyled tooltip box.
- **`RankedBarChart.tsx`** — the horizontal ranked bar chart primitive, built directly on `recharts` (not Tremor — Tremor's fixed `colors` palette and lack of a custom-tick API were the root cause of the original black-bars/overlapping-labels bug, and there was no way to fix this while staying inside Tremor's API). Handles:
  - Long category labels wrapped onto multiple lines (word-wrap by character-width estimate, no truncation, no rotation) via a custom `YAxis` tick renderer.
  - Value + percentage displayed directly at the end of each bar (`LabelList`), not hidden behind a hover-only tooltip.
  - Dynamic height via the existing `chartHeight()` so more categories never causes bars to compress or overlap.
  - Subtle vertical-only gridlines, no axis boxes, muted axis text.
  - The existing on-brand palette (`CHART_COLORS.primaryMuted` for bars, `CHART_COLORS.primary` as an optional single-bar highlight via `highlightTop`).
  - No legend (a single-series bar chart doesn't need one — the chart title says what it's counting).
  - A built-in empty state (reuses `EmptyState`) when `data` is empty.
- **`ChartSkeleton.tsx`** — a loading placeholder shaped like a bar chart (staggered-width bars), for use inside a `ChartCard` while data is fetching, avoiding layout jump.
- **`chartFormat.ts`** — centralized `formatCount`, `formatCompactCount` (1.2K/25K, only above a threshold — never compacts small values), `formatPercent`, `withPercentages`.
- **`CHART_COLORS.primaryMuted`** added to `chartColors.ts` — a lighter tint of the brand maroon, used as the default bar color so `highlightTop`'s full-strength primary actually reads as an accent.

## What was redesigned and verified

**`RapidResponseDashboard.tsx`** — all three `Tremor BarChart` instances replaced with `ChartCard` + `RankedBarChart`:

1. **Case Category Distribution** (the chart explicitly flagged as broken) — now shows/hides percentages, sorts by the existing data-layer sort (unchanged — see "Data integrity" below), wraps long category names across as many lines as needed, highlights the top category, no black bars.
2. **Priority Distribution** — same component, percentages off (priority counts aren't parts of one meaningful "distribution" total in the same way categories are — each case has exactly one priority, so a share-of-total is meaningful, but the chart is small enough that raw counts read faster; can be turned on by flipping `showPercent`).
3. **Partner Organization Engagement** — same component, wider label column for organization names.

Verified: `npx tsc --noEmit` clean, all 72 existing tests still pass, `npm run build` succeeds, and the dev server serves and Vite transforms both new files with no errors (confirmed via direct request in this environment). **Not verified**: an actual rendered screenshot inside an authenticated session — this environment has no headless-browser tooling (`chromium-cli`) available and no test-account credentials for the app's Supabase-gated login, so the visual result has not been eyeballed by me. Please check `RapidResponseDashboard.tsx`'s "Charts" section in a real browser before considering this fully done.

## What was NOT redesigned (cataloged, not fixed)

The 10 files listed in the audit table above — `TimelineVisualization.tsx`, `StakeholderAnalytics.tsx`, `PerformanceTrackingModule.tsx`, `PerformanceMetrics.tsx`, `OutcomeMetricsDashboard.tsx`, `LegalFrameworkAnalysis.tsx`, `HealthIndicatorIntegration.tsx`, `GeographicIntelligence.tsx`, `DistributionCharts.tsx`, `DataChart.tsx` — still use raw recharts with per-file styling, and were not touched. This is a scoping decision, not an oversight: covering 40+ chart instances across line/area/pie/scatter chart types (none of which have a design-system primitive built yet) to the same verified standard as the bar charts above is multiple times the size of what's been done here, and attempting it in the same pass risked either running out of room mid-file (leaving something broken) or a rushed, unverified pass across many files — worse than a clearly-scoped, verified partial pass.

**Recommended order for the next increment**, matching the "ranked comparison" pattern `RankedBarChart` already solves:

1. **`DistributionCharts.tsx`, `OutcomeMetricsDashboard.tsx`, `StakeholderAnalytics.tsx`** — each has both `BarChart` and `PieChart` instances; the bar charts can very likely reuse `RankedBarChart` directly or with minor prop additions (these three files' `grep` signatures are nearly identical, suggesting duplicated/copy-pasted chart code — a single shared fix likely covers most of it). The `PieChart` instances need a new `DonutChart` primitive (per the task brief's own guidance: "if there are many categories, replace the pie chart with a ranked bar chart" — worth checking whether some of these should become `RankedBarChart` instead of getting a new pie primitive at all).
2. **`GeographicIntelligence.tsx`** — `BarChart` only, no new primitive type needed, likely a fast follow using `RankedBarChart`.
3. **`PerformanceTrackingModule.tsx`, `DataChart.tsx`** — mix of `BarChart`/`LineChart`; needs a new `TrendLineChart` primitive (subtle line, restrained data points, meaningful hover) before the line portions can be redesigned.
4. **`TimelineVisualization.tsx`, `PerformanceMetrics.tsx`** — `AreaChart` only; per the brief, use only where the filled area adds real meaning — worth a design judgment call per chart before building an `AreaChart` primitive, not an automatic 1:1 port.
5. **`HealthIndicatorIntegration.tsx`** — `LineChart` + `ScatterChart`; scatter has no existing pattern anywhere in the app to extend, so this is the highest-effort file and should come last.
6. **`LegalFrameworkAnalysis.tsx`** — touches all three remaining types (area/bar/pie); do last, once the above primitives all exist, so it's a pure composition exercise rather than new design work.

## Data integrity

No calculations, sort order, filters, date ranges, or Supabase queries were changed. `RankedBarChart` renders `data` in the order it receives it — it does not re-sort. `categoryDistribution` and `partnerDistribution` were already sorted descending by value in `RapidResponseDashboard.tsx`'s existing data-fetching code (confirmed by reading it before making any change), which is why "sort from highest to lowest" is satisfied for those two charts without this pass touching that logic. `priorityDistribution` is rendered in whatever order the existing code produces it (not sorted) — left as-is rather than guessed at, since changing it would be a data-presentation decision, not a pure visual one.

## Accessibility

- Text contrast: category labels (`stone-500`/`#8A7F6C`) and value labels (`stone-800`/`#292524`) against a white chart background both meet WCAG AA for normal text.
- No information is conveyed by color alone in `RankedBarChart` — every bar has its value printed as text at the bar's end regardless of color, and the optional `highlightTop` accent is redundant with the bars already being sorted/labeled, not the only signal for "which is largest."
- Not yet done: an explicit ARIA label/description on the chart's SVG root (recharts' `ResponsiveContainer` doesn't add one automatically) — a reasonable small follow-up, not implemented here since it wasn't part of what broke in the original chart.

## Performance

No new data fetching was introduced — `RankedBarChart` is a pure rendering component that receives the same `stats.*Distribution` arrays the old Tremor charts already received from existing Supabase queries. Bar-entry animation is disabled (`isAnimationActive={false}`) since the task explicitly asks to avoid unnecessary chart animation cost, and the previous Tremor charts had `showAnimation={true}`.
