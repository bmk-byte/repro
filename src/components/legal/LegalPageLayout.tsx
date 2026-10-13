import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  effectiveDate: string;
  sections: LegalSection[];
  otherDocLabel: string;
  otherDocHref: string;
}

/**
 * Shared layout for /terms-of-use and /privacy-policy: a sticky
 * table-of-contents sidebar (collapsible to a toggle on mobile) beside
 * numbered, anchor-linked sections, built from the app's existing design
 * tokens (stone/primary) rather than a one-off legal-page style.
 */
export function LegalPageLayout({
  title,
  description,
  lastUpdated,
  effectiveDate,
  sections,
  otherDocLabel,
  otherDocHref,
}: LegalPageLayoutProps) {
  const navigate = useNavigate();
  const [tocOpen, setTocOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setTocOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold text-stone-900">{title}</h1>
          <p className="mt-3 text-stone-600">{description}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-500">
            <span>Effective: {effectiveDate}</span>
            <span>Last updated: {lastUpdated}</span>
            <button
              type="button"
              onClick={() => navigate(otherDocHref)}
              className="text-primary hover:text-primary-dark font-medium"
            >
              {otherDocLabel} →
            </button>
          </div>
        </header>

        <button
          type="button"
          onClick={() => setTocOpen(o => !o)}
          className="lg:hidden mb-4 inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700"
          aria-expanded={tocOpen}
        >
          {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Contents
        </button>

        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
          <nav
            aria-label="Table of contents"
            className={`${tocOpen ? 'block' : 'hidden'} lg:block mb-8 lg:mb-0`}
          >
            <div className="lg:sticky lg:top-6 bg-white border border-stone-200 rounded-xl p-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
                Contents
              </p>
              <ol className="space-y-1">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => { e.preventDefault(); scrollToSection(s.id); }}
                      className="block text-sm text-stone-600 hover:text-primary py-1 rounded px-1.5 -mx-1.5 hover:bg-stone-50"
                    >
                      <span className="text-stone-400 mr-1.5">{i + 1}.</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <main className="min-w-0">
            <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-6 p-6 md:p-8">
                  <h2 className="text-xl font-semibold text-stone-900 mb-3">
                    <span className="text-primary mr-2">{i + 1}.</span>
                    {s.title}
                  </h2>
                  <div className="text-stone-700 space-y-3 text-[15px] leading-relaxed">
                    {s.content}
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-6 text-sm text-stone-500">
              {otherDocLabel.startsWith('Privacy') ? 'Read our ' : 'Read our '}
              <button type="button" onClick={() => navigate(otherDocHref)} className="text-primary hover:underline">
                {otherDocLabel}
              </button>.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}

export const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-warning-light text-warning-dark px-1.5 py-0.5 rounded font-mono text-[13px]">
    {children}
  </span>
);

export const Callout = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-sm text-stone-700">
    <p className="font-medium text-primary-900 mb-1">{title}</p>
    {children}
  </div>
);
