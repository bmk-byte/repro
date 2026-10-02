import React from 'react';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  className?: string;
}

/**
 * Plain metric tile for an overview/summary strip — distinct from
 * DashboardCard (src/components/DashboardCard.tsx), which is the
 * brand-gradient clickable card specific to the main Dashboard tab. This one
 * is neutral and non-interactive, for framing a page with real summary
 * numbers before its detailed tables/charts.
 */
export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, hint, className = '' }) => (
  <div className={`rounded-xl border border-stone-200 bg-white shadow-card p-4 ${className}`}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</span>
      {icon && <span className="text-primary flex-shrink-0" aria-hidden="true">{icon}</span>}
    </div>
    <div className="text-2xl font-bold text-stone-900">{value}</div>
    {hint && <div className="text-xs text-stone-500 mt-0.5">{hint}</div>}
  </div>
);
