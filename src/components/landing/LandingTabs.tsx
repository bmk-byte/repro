import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Database, TrendingUp, BarChart3, Search,
  HeartPulse, Baby, UserCheck, Scale as Scales, Droplets, ShieldAlert,
  Scale, Users, Lightbulb, Quote,
} from 'lucide-react';

// Keep in sync with Navbar.tsx's `landingPageLinks` ids — that's the only
// place these panels are selected from now (see LandingPage.tsx's comment).
export type TabId = 'features' | 'thematic' | 'benefits' | 'testimonials';

const features = [
  { icon: <Database className="h-5 w-5" />, title: 'Searchable Case Database', description: 'Access a comprehensive database of reproductive justice cases across Africa.' },
  { icon: <TrendingUp className="h-5 w-5" />, title: 'AI-Powered Analysis', description: 'Leverage advanced AI to identify legal trends and patterns.' },
  { icon: <BarChart3 className="h-5 w-5" />, title: 'Interactive Visualizations', description: 'Explore data through dynamic charts and visual representations.' },
  { icon: <Search className="h-5 w-5" />, title: 'Advanced Search', description: 'Find relevant cases and documents with powerful search capabilities.' },
];

const thematicAreas = [
  { icon: <HeartPulse className="h-6 w-6" />, title: 'Access to Safe Abortion', description: 'Legal frameworks, barriers, and advancements in ensuring access to safe abortion services across Africa.' },
  { icon: <Baby className="h-6 w-6" />, title: 'Maternal Health and Mortality', description: 'Cases addressing maternal healthcare access, quality of care, and accountability for preventable maternal deaths.' },
  { icon: <ShieldAlert className="h-6 w-6" />, title: 'Sexual and Gender-Based Violence', description: 'Legal responses to SGBV, including rape, domestic violence, and their impact on reproductive health and rights.' },
  { icon: <UserCheck className="h-6 w-6" />, title: 'Consent and Adolescent Rights', description: 'Legal issues surrounding consent for reproductive healthcare, particularly for adolescents and vulnerable populations.' },
  { icon: <Scales className="h-6 w-6" />, title: 'Discrimination in Healthcare', description: 'Cases challenging discriminatory practices in reproductive healthcare delivery based on gender, disability, or socioeconomic status.' },
  { icon: <Droplets className="h-6 w-6" />, title: 'Menstrual Health and Hygiene', description: 'Legal advocacy for menstrual equity, including access to products, facilities, and education.' },
];

const benefits = [
  { icon: <Scale className="h-5 w-5" />, title: 'Legal Professionals', description: 'Access comprehensive case management tools and legal resources to effectively handle reproductive justice cases.' },
  { icon: <Users className="h-5 w-5" />, title: 'Policymakers', description: 'Make informed decisions with data-driven insights and trend analysis across multiple jurisdictions.' },
  { icon: <Lightbulb className="h-5 w-5" />, title: 'Activists', description: 'Stay informed about legal developments and collaborate with stakeholders to drive meaningful change.' },
];

const testimonials = [
  { quote: 'ReproPulse has revolutionized how we manage and track reproductive justice cases across our network.', author: 'Dr. Jessica Oreoluwa Oga', role: 'Head of Regionalism, Afya Na Haki' },
  { quote: 'The data insights provided by ReproPulse have been invaluable in shaping our advocacy strategy.', author: 'Mr. Ibrahim Nsereko', role: 'Head of Advocacy Capacity Enhancement, Afya Na Haki' },
  { quote: 'A game-changer for reproductive rights activism in Africa. The collaborative features are exceptional.', author: 'Koomson Nana', role: 'Reproductive Rights Activist' },
];

const panelTransition = { duration: 0.25 };

const FeaturesPanel = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {features.map((f, i) => (
      <div key={i} className="enhanced-card p-4 sm:p-5">
        <div className="inline-flex p-2.5 bg-primary/10 rounded-lg mb-3 text-primary">{f.icon}</div>
        <h3 className="text-sm sm:text-base font-semibold text-stone-900 mb-1.5">{f.title}</h3>
        <p className="text-xs sm:text-sm text-stone-500">{f.description}</p>
      </div>
    ))}
  </div>
);

const ThematicPanel = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
    {thematicAreas.map((a, i) => (
      <div key={i} className="enhanced-card p-4 sm:p-5">
        <div className="inline-flex p-2.5 bg-primary/10 rounded-lg mb-3 text-primary">{a.icon}</div>
        <h3 className="text-sm sm:text-base font-semibold text-stone-900 mb-1.5">{a.title}</h3>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{a.description}</p>
      </div>
    ))}
  </div>
);

const BenefitsPanel = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {benefits.map((b, i) => (
      <div key={i} className="enhanced-card p-4 sm:p-5">
        <div className="inline-flex p-2.5 bg-primary/10 rounded-lg mb-3 text-primary">{b.icon}</div>
        <h3 className="text-sm sm:text-base font-semibold text-stone-900 mb-1.5">{b.title}</h3>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{b.description}</p>
      </div>
    ))}
  </div>
);

const TestimonialsPanel = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {testimonials.map((t, i) => (
      <div key={i} className="enhanced-card p-4 sm:p-5">
        <div className="inline-flex p-2 bg-primary/10 rounded-lg mb-3">
          <Quote className="h-5 w-5 text-primary" />
        </div>
        <p className="text-xs sm:text-sm text-stone-600 italic mb-3 leading-relaxed">"{t.quote}"</p>
        <p className="font-semibold text-stone-900 text-sm">{t.author}</p>
        <p className="text-xs text-stone-500">{t.role}</p>
      </div>
    ))}
  </div>
);

const PANELS: Record<TabId, React.FC> = {
  features: FeaturesPanel,
  thematic: ThematicPanel,
  benefits: BenefitsPanel,
  testimonials: TestimonialsPanel,
};

const HEADINGS: Record<TabId, { title: string; subtitle: string }> = {
  features: { title: 'Powerful Features', subtitle: 'Everything you need to manage and analyze reproductive justice cases effectively.' },
  thematic: { title: 'Our Thematic Focus', subtitle: 'Exploring key legal areas in reproductive justice across Africa.' },
  benefits: { title: 'Benefits', subtitle: 'Empowering different stakeholders in the pursuit of reproductive justice.' },
  testimonials: { title: 'What Users Say', subtitle: 'Hear from our community of legal professionals, policymakers, and activists.' },
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
  const tabId: TabId = activeTab in PANELS ? (activeTab as TabId) : 'features';
  const ActivePanel = PANELS[tabId];
  const heading = HEADINGS[tabId];

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
