import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from '../../components/ui';

export interface ExportOption {
  key: string;
  label: string;
  description?: string;
  icon: ReactNode;
  onSelect: () => void | Promise<void>;
}

/**
 * One "Export" button that opens a short menu of formats, instead of a row
 * of separate Copy / JSON / CSV buttons competing for attention.
 */
export function ExportMenu({ label, options }: { label: string; options: ExportOption[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        onClick={() => setOpen((v) => !v)}
        icon={<Download className="w-4 h-4" />}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5">
          {label}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-stone-100 bg-white py-1 shadow-raised">
          {options.map((option) => (
            <button
              key={option.key}
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await option.onSelect();
              }}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100"
            >
              <span className="mt-0.5 text-stone-500">{option.icon}</span>
              <span>
                <span className="block font-medium text-stone-900">{option.label}</span>
                {option.description && <span className="block text-xs text-stone-500">{option.description}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
