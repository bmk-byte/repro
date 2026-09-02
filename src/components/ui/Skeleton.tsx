import React from 'react';

export interface SkeletonProps {
  className?: string;
}

/** A pulsing placeholder block — shows the shape of content that's still loading, instead of a centered spinner. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-stone-200 ${className}`} aria-hidden="true" />
);

/** A single list-row-shaped skeleton (e.g. a table/list item while data loads). */
export const SkeletonRow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-4 p-4 ${className}`} aria-hidden="true">
    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);

/** A card-shaped skeleton (e.g. a grid of case/judgment cards while data loads). */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-xl border border-stone-200 bg-white p-5 space-y-3 ${className}`} aria-hidden="true">
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-5/6" />
    <div className="flex gap-2 pt-1">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  </div>
);
