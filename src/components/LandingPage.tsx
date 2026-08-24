import React from 'react';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import ThematicFocusSection from './ThematicFocusSection';
import BenefitsSection from './BenefitsSection';
import TestimonialSection from './TestimonialSection';
import CTASection from './CTASection';
import Footer from './Footer';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <>
      {/* SEO-optimized page structure */}
      <main role="main">
        <HeroSection onGetStarted={onGetStarted} />
        <FeaturesSection />
        <ThematicFocusSection />
        <BenefitsSection />
        <TestimonialSection />
        <CTASection onGetStarted={onGetStarted} />
      </main>
      <Footer />
    </>
  );
};

export default LandingPage;