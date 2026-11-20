import React from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { prefetchRoute } from '../lib/routePrefetch';

export interface NavMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface NavDropdownProps {
  label: string;
  icon: LucideIcon;
  items: NavMenuItem[];
  activeTab?: string;
  onSelect: (id: string) => void;
  /** Visually emphasise the trigger (used for the "New" action menu). */
  emphasis?: boolean;
}

/**
 * A top-bar menu that groups related tabs under one button. Closes on
 * outside click, Escape, or selection, and returns focus to its trigger on
 * Escape so keyboard users don't lose their place.
 */
export default function NavDropdown({ label, icon: Icon, items, activeTab, onSelect, emphasis = false }: NavDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const isSectionActive = items.some((item) => item.id === activeTab);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  const triggerTone = isSectionActive
    ? 'bg-primary text-white'
    : emphasis
      ? 'border border-primary/30 text-primary hover:bg-primary/5'
      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100';

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => items.forEach((item) => prefetchRoute(item.id))}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${triggerTone}`}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute left-0 mt-2 w-60 bg-white rounded-md shadow-raised border border-stone-100 py-1 z-50">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  isActive ? 'bg-primary text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <ItemIcon className="h-4 w-4 mr-2" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
