import React from 'react';
import CondensedHero from './landing/CondensedHero';
import LandingTabs from './landing/LandingTabs';
import LandingFooter from './landing/LandingFooter';
import GhostBackground from './landing/GhostBackground';

interface LandingPageProps {
  onGetStarted: () => void;
  /** Which panel to show — driven by the top Navbar's landing links (see App.tsx), not a second in-page tab bar. */
  activeTab: string;
}

// Single-viewport page: no vertical scroll on the page itself. The parent
// chain (App.tsx) sizes this to exactly fill the space below the Navbar
// (h-full at every level), so this only needs to fill 100% of that and
// never grow past it — CondensedHero and LandingFooter are fixed-size
// bands, LandingTabs takes the remaining height and owns its own internal
// scroll for content that can't fit on short viewports.
//
// Background: Originkit's "hero-24" background image (public/originkit/
// hero-24/bg-desktop.png), applied here at the page root so it shows behind
// the hero, tab panel, and footer alike — not just the hero band. Pulled in
// as a plain image (not hero-24's own React component), since importing
// that required a Tailwind v4 migration this app isn't on; see
// src/components/landing/CondensedHero.tsx for why the old photo background
// was dropped from just the hero band specifically. GhostBackground layers
// the org's own "Reproductive Justice" artwork on top of that, almost
// invisibly, brightening under the cursor — see that component for why.
const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, activeTab }) => {
  return (
    <main
      role="main"
      className="relative h-full w-full overflow-hidden flex flex-col bg-stone-950 bg-cover bg-center"
      style={{ backgroundImage: "url('/originkit/hero-24/bg-desktop.png')" }}
    >
      <GhostBackground />
      <div className="relative z-10 flex flex-col h-full">
        <CondensedHero onGetStarted={onGetStarted} />
        <LandingTabs activeTab={activeTab} />
        <LandingFooter />
      </div>
    </main>
  );
};

export default LandingPage;
