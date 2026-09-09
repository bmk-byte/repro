import React from 'react';
import { Skeleton } from '../ui';

export interface ChartSkeletonProps {
  /** Number of placeholder bars/rows to approximate the eventual chart height and avoid layout jump when real data arrives. */
  rows?: number;
}

/** Loading placeholder shaped like a horizontal bar chart, used inside a ChartCard while data is fetching. */
export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ rows = 5 }) => (
  <div className="space-y-3" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-3 w-28 shrink-0" />
        <Skeleton className="h-6 flex-1" style={{ maxWidth: `${85 - i * 8}%` }} />
      </div>
    ))}
  </div>
);
