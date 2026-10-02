import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  description?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Shared in-page ("secondary") navigation — underline-style tabs, extracted
 * from the Scorecard analysis page so it's one documented pattern instead
 * of bespoke markup repeated (and re-styled differently) in multiple
 * places. Deliberately distinct from the Navbar's own solid-pill active
 * style (primary, app-wide navigation — out of scope to change here) and
 * from filter/action controls (Select/Button), so navigation, filtering,
 * and actions stay visually separable per page.
 */
export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, className = '' }) => (
  <div className={`border-b border-stone-200 ${className}`}>
    <nav className="flex gap-2 overflow-x-auto" role="tablist">
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            <div className="flex flex-col items-start">
              <span>{tab.label}</span>
              {tab.description && (
                <span className="text-xs text-stone-500 mt-0.5">{tab.description}</span>
              )}
            </div>
          </button>
        );
      })}
    </nav>
  </div>
);
