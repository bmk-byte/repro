import React from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_COLOR } from '../../lib/chartColors';
import { chartHeight } from '../../lib/chartLayout';
import { ChartTooltipContent } from './ChartTooltip';
import { EmptyState } from '../ui';
import { formatCount, formatPercent, withPercentages } from './chartFormat';

export interface RankedBarChartDatum {
  name: string;
  value: number;
}

export interface RankedBarChartProps {
  data: RankedBarChartDatum[];
  /** Label for the tooltip's value row and the empty state — e.g. "Cases". */
  valueLabel: string;
  /**
   * Show each bar's share of the total next to its value — appropriate
   * when the values represent parts of one meaningful whole (e.g. cases
   * broken out by category). Turn off for values that aren't parts of a
   * single total (e.g. a top-5 subset).
   */
  showPercent?: boolean;
  /** Approximate available width (px) for the category-label column, used to size text wrapping. Default 220. */
  labelWidth?: number;
  /** Minimum chart height in px before per-row growth is added. */
  minHeight?: number;
  /** Empty-state copy, shown instead of the chart when `data` is empty. */
  emptyTitle: string;
  emptyDescription?: string;
  /** Highlights the single highest bar in the brand primary color; the rest use the muted tone. Off by default — turn on only where "what's the top category" is the point of the chart. */
  highlightTop?: boolean;
}

const BAR_HEIGHT = 28;
const CHARS_PER_LINE_DIVISOR = 6.4; // ~px per character at text-xs/sm for this app's font

function wrapLabel(text: string, maxWidth: number): string[] {
  const maxChars = Math.max(12, Math.floor(maxWidth / CHARS_PER_LINE_DIVISOR));
  if (text.length <= maxChars) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  // Long labels are allowed to wrap to as many lines as needed rather than
  // being truncated with an ellipsis — the per-row chart height already
  // grows to accommodate this (see chartHeight() below).
  return lines;
}

interface CategoryTickProps {
  // recharts injects x/y/payload via cloneElement at render time — they're
  // absent when this component is referenced in JSX (only `labelWidth` is
  // set explicitly there), so they're optional in the type even though
  // they're always present by the time recharts actually renders this.
  x?: number;
  y?: number;
  payload?: { value: string | number };
  labelWidth: number;
}

/** Custom YAxis tick that wraps long category names onto multiple lines instead of overlapping or truncating them. */
function WrappedCategoryTick({ x = 0, y = 0, payload, labelWidth }: CategoryTickProps) {
  const lines = wrapLabel(String(payload?.value ?? ''), labelWidth);
  const lineHeight = 14;
  const startDy = -((lines.length - 1) * lineHeight) / 2 + 4;

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fill={CHART_AXIS_COLOR} fontSize={12}>
        {lines.map((line, i) => (
          <tspan key={i} x={0} dy={i === 0 ? startDy : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

interface EndValueLabelProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  percent: number;
  showPercent: boolean;
}

function EndValueLabel({ x, y, width, height, value, percent, showPercent }: EndValueLabelProps) {
  const label = showPercent ? `${formatCount(value)} (${formatPercent(percent)})` : formatCount(value);
  return (
    <text
      x={x + width + 8}
      y={y + height / 2}
      dy={4}
      fontSize={12}
      fontWeight={600}
      fill="#292524" // stone-800
    >
      {label}
    </text>
  );
}

/**
 * The horizontal ranked bar chart — the primitive behind "Case category
 * distribution" and every other "compare categories, longest names first"
 * chart in the dashboard (see docs/CHART_DESIGN_SYSTEM.md). Renders
 * pre-sorted `data` as-is; sort before passing in if ranking matters for
 * that chart (most of this app's distribution queries already sort
 * descending at the data layer — this component doesn't re-sort so it
 * never silently changes what a chart is asserting about the data).
 */
export const RankedBarChart: React.FC<RankedBarChartProps> = ({
  data,
  valueLabel,
  showPercent = true,
  labelWidth = 220,
  minHeight = 200,
  emptyTitle,
  emptyDescription,
  highlightTop = false,
}) => {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const withPct = withPercentages(data);
  const height = chartHeight(data.length, minHeight, BAR_HEIGHT + 14);
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={withPct}
        layout="vertical"
        margin={{ top: 4, right: 64, bottom: 4, left: 4 }}
        barCategoryGap={14}
      >
        <CartesianGrid horizontal={false} stroke={CHART_GRID_COLOR} />
        <XAxis
          type="number"
          domain={[0, Math.ceil(maxValue * 1.15) || 1]}
          tick={{ fontSize: 11, fill: CHART_AXIS_COLOR }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          axisLine={false}
          tickLine={false}
          tick={<WrappedCategoryTick labelWidth={labelWidth} />}
        />
        <Tooltip
          cursor={{ fill: 'rgba(156, 29, 32, 0.06)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as (RankedBarChartDatum & { percent: number });
            const rows = [{ label: valueLabel, value: formatCount(point.value) }];
            if (showPercent) rows.push({ label: 'Share', value: formatPercent(point.percent) });
            return <ChartTooltipContent title={point.name} rows={rows} />;
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={BAR_HEIGHT} isAnimationActive={false}>
          {withPct.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={highlightTop && entry.value === maxValue && index === 0 ? CHART_COLORS.primary : CHART_COLORS.primaryMuted}
            />
          ))}
          <LabelList
            dataKey="value"
            content={(props: { x?: number; y?: number; width?: number; height?: number; value?: number; index?: number }) => (
              <EndValueLabel
                x={props.x ?? 0}
                y={props.y ?? 0}
                width={props.width ?? 0}
                height={props.height ?? 0}
                value={props.value ?? 0}
                percent={withPct[props.index ?? 0]?.percent ?? 0}
                showPercent={showPercent}
              />
            )}
          />
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
