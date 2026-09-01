import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const [typedText, setTypedText] = useState('');
  const fullText = 'Reproductive Justice';
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Typing effect
  useEffect(() => {
    if (typedText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedText(fullText.slice(0, typedText.length + 1));
      }, 100); // Adjust speed of typing here
      return () => clearTimeout(timeout);
    } else {
      setIsTypingComplete(true);
    }
  }, [typedText, fullText]);

  // Blinking cursor effect
  useEffect(() => {
    if (isTypingComplete) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500); // Blink every 500ms
      return () => clearInterval(interval);
    }
  }, [isTypingComplete]);

  return (
    <div id="hero-section" className="relative min-h-screen bg-gradient-to-br from-stone-900 to-black overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20" 
        style={{ backgroundImage: "url('https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/sign/herosection/g87mte6t.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YTZhYTA3Ny05MGFlLTQxZmQtOWI3Yy04OGNjNDFhNWNlOWMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJoZXJvc2VjdGlvbi9nODdtdGU2dC5wbmciLCJpYXQiOjE3NTI1NjkyNzYsImV4cCI6ODA1OTc2OTI3Nn0.VGXw-3EfF8B24HRjkK-rPVEXbFaFe1aCKNXM25vrQts')" }}
        role="img"
        aria-label="Background image showing reproductive justice advocacy in Africa"
      ></div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="flex flex-col items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-8">
              <Scale className="h-5 w-5 text-white" />
              <span className="text-sm font-medium text-white">LIRA Programme</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="block"
              >
                Advancing
              </motion.span>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="block mt-2 text-primary"
              >
                {typedText}
                <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
              </motion.span>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="block mt-2"
              >
                Across Africa
              </motion.span>
            </h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-6 max-w-3xl mx-auto text-xl text-stone-300 leading-relaxed"
            >
              A comprehensive platform for tracking, analyzing, and collaborating on reproductive justice cases across the African continent.
            </motion.p>

            <div className="mt-10 flex justify-center">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(156, 29, 32, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={onGetStarted}
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;