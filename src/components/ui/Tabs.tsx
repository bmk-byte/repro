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
export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, className = '' }) => {
  const navRef = React.useRef<HTMLElement>(null);

  // On narrow screens the strip scrolls sideways; keep the selected tab in
  // view so it never ends up hidden off the edge.
  React.useEffect(() => {
    // Scrolls the strip only (never the page), so nothing jumps on load.
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!nav || !active) return;
    const left = active.offsetLeft - nav.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < nav.scrollLeft) {
      nav.scrollTo({ left, behavior: 'smooth' });
    } else if (right > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: right - nav.clientWidth, behavior: 'smooth' });
    }
  }, [activeId]);

  return (
    <div className={`border-b border-stone-200 ${className}`}>
      <nav
        ref={navRef}
        className="flex gap-2 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]"
        role="tablist"
      >
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
};
