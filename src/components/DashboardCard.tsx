import React from 'react';
import { Files, TrendingUp, TrendingDown, Gavel } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  change: string;
  type: 'cases' | 'success' | 'judgments';
  onClick?: () => void;
}

const iconByType = {
  cases: Files,
  success: TrendingUp,
  judgments: Gavel,
} as const;

/**
 * Solid brand-colored stat card. Previously relied on a hardcoded,
 * near-permanent Supabase Storage signed URL as a background image with no
 * fallback — if that URL ever broke, the card rendered white text on a
 * white background. This version has no external dependency.
 */
const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, change, type, onClick }) => {
  const isPositive = change.startsWith('+');
  const Icon = iconByType[type] ?? Files;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl p-6 bg-gradient-to-br from-primary to-primary-dark shadow-card hover:shadow-raised transition-shadow duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/90 text-sm font-medium uppercase tracking-wide">{title}</h3>
        <div className="p-2 rounded-lg bg-white/15">
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-serif font-semibold text-white">{value}</p>
        <span
          className={`inline-flex items-center gap-1 text-sm font-medium ${
            isPositive ? 'text-white' : 'text-white/70'
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {change}
        </span>
      </div>
    </button>
  );
};

export default DashboardCard;
