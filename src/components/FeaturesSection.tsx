import React from 'react';
import { motion } from 'framer-motion';
import { Database, TrendingUp, BarChart3, Search } from 'lucide-react';

const features = [
  {
    icon: <Database className="h-6 w-6" />,
    title: 'Searchable Case Database',
    description: 'Access a comprehensive database of reproductive justice cases across Africa.'
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'AI-Powered Analysis',
    description: 'Leverage advanced AI to identify legal trends and patterns.'
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Interactive Visualizations',
    description: 'Explore data through dynamic charts and visual representations.'
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: 'Advanced Search',
    description: 'Find relevant cases and documents with powerful search capabilities.'
  }
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6
    }
  }
};

const FeaturesSection = () => {
  return (
    <section id="features-section" className="bg-white py-12" aria-labelledby="features-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          <motion.h2 
            className="section-title"
            id="features-heading"
            variants={itemVariants}
          >
            Powerful Features
          </motion.h2>
          <motion.p 
            className="mt-3 text-lg text-stone-500"
            variants={itemVariants}
          >
            Everything you need to manage and analyze reproductive justice cases effectively.
          </motion.p>
        </motion.div>

        <motion.div 
          className="mt-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="relative group enhanced-card p-8 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary"
                variants={itemVariants}
                whileHover={{ 
                  y: -5,
                  boxShadow: "0 25px 50px -12px rgba(156, 29, 32, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                }}
              >
                <div className="inline-flex p-4 bg-primary/10 rounded-xl mb-6 text-primary group-hover:bg-primary/20 transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-stone-500">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;