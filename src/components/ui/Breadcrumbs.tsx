import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Location trail, not a second navigation system — only the non-final
 * items are interactive. Shared across the app rather than hand-rolled per
 * page (previously Scorecard's only "way back" affordance was a plain
 * "Back to Analysis" link with no sense of hierarchy).
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => (
  <nav aria-label="Breadcrumb" className={`flex items-center flex-wrap gap-1 text-sm ${className}`}>
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" aria-hidden="true" />}
          {isLast || !item.onClick ? (
            <span className="text-stone-700 font-medium" aria-current={isLast ? 'page' : undefined}>
              {item.label}
            </span>
          ) : (
            <button
              type="button"
              onClick={item.onClick}
              className="text-stone-500 hover:text-primary transition-colors"
            >
              {item.label}
            </button>
          )}
        </span>
      );
    })}
  </nav>
);
