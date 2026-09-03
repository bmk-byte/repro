import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

interface CondensedHeroProps {
  onGetStarted: () => void;
}

// A short, fixed-height hero band (not full-screen) so it can sit above the
// tab panel while the whole page still fits in one viewport with no scroll.
// No background image of its own — LandingPage.tsx now applies the
// Originkit "hero-24" background across the whole page (hero + tabs +
// footer), so this stays transparent and lets that show through.
const CondensedHero: React.FC<CondensedHeroProps> = ({ onGetStarted }) => {
  const [typedText, setTypedText] = useState('');
  const fullText = 'Reproductive Justice';
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (typedText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.slice(0, typedText.length + 1));
      }, 60);
      return () => clearTimeout(timeout);
    } else {
      setIsTypingComplete(true);
    }
  }, [typedText, fullText]);

  useEffect(() => {
    if (isTypingComplete) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isTypingComplete]);

  return (
    <div className="relative flex-shrink-0 overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center gap-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full">
            <Scale className="h-4 w-4 text-white" />
            <span className="text-xs font-medium text-white">LIRA Programme</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug">
            Advancing{' '}
            <span className="text-primary">
              {typedText}
              <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
            </span>{' '}
            Across Africa
          </h1>

          <p className="max-w-2xl text-sm sm:text-base text-stone-300 leading-relaxed">
            A comprehensive platform for tracking, analyzing, and collaborating on reproductive justice cases across the African continent.
          </p>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 10px 25px -5px rgba(156, 29, 32, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onGetStarted}
            className="mt-1 inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors duration-300 shadow-lg hover:shadow-xl"
          >
            Get Started
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default CondensedHero;
