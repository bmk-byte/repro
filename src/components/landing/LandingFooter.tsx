import React from 'react';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

// A compact, always-visible footer band (not a tab) — condensed to a single
// row so it fits permanently within the one-viewport budget alongside the
// hero and tab panel above it.
const LandingFooter: React.FC = () => {
  return (
    <footer className="flex-shrink-0 bg-[#0A1426] text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5">
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span>© 2025 LIRA Programme, Afya na Haki</span>
          <a href="mailto:info@afyanahaki.org" className="hover:text-primary transition-colors">info@afyanahaki.org</a>
          <a href="tel:+256414660733" className="hidden sm:inline hover:text-primary transition-colors">+256 414 660 733</a>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label="Visit our LinkedIn page">
              <Linkedin className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label="Visit our Facebook page">
              <Facebook className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label="Visit our Twitter page">
              <Twitter className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label="Visit our Instagram page">
              <Instagram className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs text-stone-400">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
            <a href="#" className="termly-display-preferences hover:text-primary transition-colors">Consent Preferences</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
