import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

// A compact, always-visible footer band (not a tab) — condensed to a single
// row so it fits permanently within the one-viewport budget alongside the
// hero and tab panel above it.
const LandingFooter: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="flex-shrink-0 bg-[#0A1426] text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5">
        <div className="flex items-center gap-4 text-xs text-stone-400">
          <span>{t('footer.copyright')}</span>
          <a href="mailto:info@afyanahaki.org" className="hover:text-primary transition-colors">info@afyanahaki.org</a>
          <a href="tel:+256414660733" className="hidden sm:inline hover:text-primary transition-colors">+256 414 660 733</a>
          <Link to="/terms-of-use" className="hover:text-primary transition-colors">Terms of Use</Link>
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label={t('footer.linkedinAria')}>
              <Linkedin className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label={t('footer.facebookAria')}>
              <Facebook className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label={t('footer.twitterAria')}>
              <Twitter className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="text-stone-400 hover:text-primary transition-colors" aria-label={t('footer.instagramAria')}>
              <Instagram className="h-3.5 w-3.5" />
            </a>
          </div>

          {/*
            A "Consent Preferences" link was removed separately: it
            referenced a Termly widget that was never actually loaded, and
            there is no cookie/analytics consent to manage now that
            third-party tracking has been removed.
          */}
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
