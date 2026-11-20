import React from 'react';
import { Files, TrendingUp, TrendingDown, Gavel, CheckCircle2, Activity } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  /**
   * Percentage change against an earlier period, e.g. 4.2. Omit it when
   * there is nothing real to compare against: the card then shows no
   * change line at all, rather than a meaningless "+0.0%".
   */
  changePercent?: number | null;
  /** What the change is measured against, e.g. "vs last month". */
  changeLabel?: string;
  type: 'cases' | 'judgments' | 'success' | 'active';
  onClick?: () => void;
}

const iconByType = {
  cases: Files,
  judgments: Gavel,
  success: CheckCircle2,
  active: Activity,
} as const;

/**
 * Light stat card: white surface, small brand-coloured icon, large number.
 * Replaces solid maroon gradient blocks that dominated every page they
 * appeared on.
 */
const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, changePercent, changeLabel, type, onClick }) => {
  const Icon = iconByType[type] ?? Files;
  const hasChange = typeof changePercent === 'number' && Number.isFinite(changePercent) && changePercent !== 0;
  const isUp = hasChange && (changePercent as number) > 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  const content = (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-600">{title}</h3>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-serif font-semibold text-stone-900">{value}</p>
      {hasChange && (
        <p className={`mt-1 inline-flex items-center gap-1 text-sm ${isUp ? 'text-success' : 'text-danger'}`}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {`${isUp ? '+' : ''}${(changePercent as number).toFixed(1)}%`}
          {changeLabel && <span className="text-stone-500">{changeLabel}</span>}
        </p>
      )}
    </>
  );

  const className = 'w-full text-left rounded-xl p-5 bg-white border border-stone-200 shadow-card';
  return onClick ? (
    <button onClick={onClick} className={`${className} transition-shadow hover:shadow-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
};

export default DashboardCard;
