import React from 'react';
import { Card } from '../ui';

export interface ChartCardProps {
  /** Short, sentence-case title — e.g. "Case category distribution", not an ALL-CAPS analysis label. */
  title: string;
  /** One short sentence explaining what the chart shows. */
  description?: string;
  /** Optional right-aligned control (a filter select, a time-range dropdown, etc.). */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * The single consistent container every dashboard chart sits inside:
 * title + description on the left, an optional control on the right, then
 * the chart itself. This is the shared "chart card" referenced throughout
 * docs/CHART_DESIGN_SYSTEM.md — use it instead of hand-rolling a
 * `<Card><Title>...` block per chart, so every chart shares identical
 * padding, spacing, and header layout.
 */
export const ChartCard: React.FC<ChartCardProps> = ({ title, description, action, className = '', children }) => (
  <Card className={className}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900 sm:text-lg">{title}</h3>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="mt-5">{children}</div>
  </Card>
);
