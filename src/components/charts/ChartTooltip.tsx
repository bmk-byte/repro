import React from 'react';

export interface ChartTooltipRow {
  label: string;
  value: string;
}

export interface ChartTooltipContentProps {
  title: string;
  rows: ChartTooltipRow[];
}

/**
 * Shared tooltip card — white background, subtle border, soft shadow,
 * rounded corners. Recharts' <Tooltip content={...}> prop accepts any
 * component; wrap this with a small adapter per chart type (see
 * RankedBarChart's internal renderTooltip) rather than reusing recharts'
 * default tooltip, which renders as an unstyled dark box.
 */
export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({ title, rows }) => (
  <div className="rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 shadow-raised">
    <p className="text-sm font-semibold text-stone-900">{title}</p>
    <dl className="mt-1.5 space-y-1">
      {rows.map(row => (
        <div key={row.label} className="flex items-center justify-between gap-6 text-xs">
          <dt className="text-stone-500">{row.label}</dt>
          <dd className="font-medium text-stone-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  </div>
);
