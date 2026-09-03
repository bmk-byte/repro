import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Database, TrendingUp, BarChart3, Search,
  HeartPulse, Baby, UserCheck, Scale as Scales, Droplets, ShieldAlert,
  Scale, Users, Lightbulb, Quote,
} from 'lucide-react';

// Keep in sync with Navbar.tsx's `landingPageLinks` ids — that's the only
// place these panels are selected from now (see LandingPage.tsx's comment).
export type TabId = 'features' | 'thematic' | 'benefits' | 'testimonials';

const FEATURE_ICONS = [
  <Database className="h-5 w-5" />, <TrendingUp className="h-5 w-5" />,
  <BarChart3 className="h-5 w-5" />, <Search className="h-5 w-5" />,
];

const THEMATIC_ICONS = [
  <HeartPulse className="h-6 w-6" />, <Baby className="h-6 w-6" />,
  <ShieldAlert className="h-6 w-6" />, <UserCheck className="h-6 w-6" />,
  <Scales className="h-6 w-6" />, <Droplets className="h-6 w-6" />,
];

const BENEFIT_ICONS = [
  <Scale className="h-5 w-5" />, <Users className="h-5 w-5" />, <Lightbulb className="h-5 w-5" />,
];

interface TitleDescriptionItem { title: string; description: string }
interface TestimonialItem { quote: string; author: string; role: string }

const panelTransition = { duration: 0.25 };

const FeaturesPanel = () => {
  const { t } = useTranslation();
  const items = t('landing.featureItems', { returnObjects: true }) as TitleDescriptionItem[];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((f, i) => (
        <div key={i} className="enhanced-card p-4 sm:p-5">
          <div className="inline-flex p-2.5 bg-primary/10 rounded-lg mb-3 text-primary">{FEATURE_ICONS[i]}</div>
          <h3 className="text-sm sm:text-base font-semibold text-stone-900 mb-1.5">{f.title}</h3>
          <p className="text-xs sm:text-sm text-stone-500">{f.description}</p>
        </div>
      ))}
    </div>
  );
};

const ThematicPanel = () => {
  const { t } = useTranslation();
  const items = t('landing.thematicItems', { returnObjects: true }) as TitleDescriptionItem[];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((a, i) => (
        <div key={i} className="enhanced-card p-4 sm:p-5">
          <div className="inline-flex p-2.5 bg-primary/10 rounded-lg mb-3 text-primary">{THEMATIC_ICONS[i]}</div>
          <h3 className="text-sm sm:text-base font-semibold text-stone-900 mb-1.5">{a.title}</h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{a.description}</p>
        </div>
      ))}
    </div>
  );
};

const BenefitsPanel = () => {
  const { t } = useTranslation();
  const items = t('landing.benefitItems', { returnObjects: true }) as TitleDescriptionItem[];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((b, i) => (
        <div key={i} className="enhanced-card p-4 sm:p-5">
          <div className="inline-flex p-2.5 bg-primary/10 rounded-lg mb-3 text-primary">{BENEFIT_ICONS[i]}</div>
          <h3 className="text-sm sm:text-base font-semibold text-stone-900 mb-1.5">{b.title}</h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{b.description}</p>
        </div>
      ))}
    </div>
  );
};

const TestimonialsPanel = () => {
  const { t } = useTranslation();
  const items = t('landing.testimonialItems', { returnObjects: true }) as TestimonialItem[];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <div key={i} className="enhanced-card p-4 sm:p-5">
          <div className="inline-flex p-2 bg-primary/10 rounded-lg mb-3">
            <Quote className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs sm:text-sm text-stone-600 italic mb-3 leading-relaxed">"{item.quote}"</p>
          <p className="font-semibold text-stone-900 text-sm">{item.author}</p>
          <p className="text-xs text-stone-500">{item.role}</p>
        </div>
      ))}
    </div>
  );
};

const PANELS: Record<TabId, React.FC> = {
  features: FeaturesPanel,
  thematic: ThematicPanel,
  benefits: BenefitsPanel,
  testimonials: TestimonialsPanel,
};

const HEADING_KEYS: Record<TabId, string> = {
  features: 'landing.featuresHeading',
  thematic: 'landing.thematicHeading',
  benefits: 'landing.benefitsHeading',
  testimonials: 'landing.testimonialsHeading',
};

interface LandingTabsProps {
  /** Which panel to show — set by the top Navbar's landing links (App.tsx owns the state), not a second tab bar here. */
  activeTab: string;
}

// The page itself never scrolls (enforced by the overflow-hidden root in
// LandingPage.tsx); this panel gets its own overflow-y-auto so short/narrow
// viewports that can't fit every card still work, without the page growing
// past one screen.
const LandingTabs: React.FC<LandingTabsProps> = ({ activeTab }) => {
  const { t } = useTranslation();
  const tabId: TabId = activeTab in PANELS ? (activeTab as TabId) : 'features';
  const ActivePanel = PANELS[tabId];
  const heading = t(HEADING_KEYS[tabId], { returnObjects: true }) as { title: string; subtitle: string };

  return (
    // Translucent + blurred rather than opaque white, so the page-wide
    // hero-24 background (LandingPage.tsx) still shows through here too —
    // heading text is white since it now sits on a dark backdrop either way.
    <div className="flex-1 min-h-0 overflow-y-auto bg-stone-950/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tabId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={panelTransition}
          >
            <div className="mb-4 text-center">
              <h2 className="section-title !text-white">{heading.title}</h2>
              <p className="mt-1.5 text-sm text-stone-300">{heading.subtitle}</p>
            </div>
            <ActivePanel />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LandingTabs;
