import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  onGetStarted: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onGetStarted }) => {
  return (
    <section id="cta-section" aria-labelledby="cta-heading">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2 
            className="section-title mb-4"
            id="cta-heading"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Ready to Make an Impact?
          </motion.h2>
          <motion.p 
            className="text-lg text-stone-600 mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Join our community of legal professionals, policymakers, and activists working towards reproductive justice in Africa.
          </motion.p>
          <motion.button
            onClick={onGetStarted}
            className="inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-primary hover:bg-primary-dark shadow-lg hover:shadow-xl md:py-5 md:text-xl md:px-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 20px 25px -5px rgba(156, 29, 32, 0.4), 0 10px 15px -3px rgba(156, 29, 32, 0.2)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            Join us
            <ArrowRight className="ml-2 h-5 w-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;