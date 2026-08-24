import React from 'react';
import { motion } from 'framer-motion';
import { Scale, Users, Lightbulb } from 'lucide-react';

const benefits = [
  {
    icon: <Scale className="h-6 w-6" />,
    title: 'Legal Professionals',
    description: 'Access comprehensive case management tools and legal resources to effectively handle reproductive justice cases.'
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Policymakers',
    description: 'Make informed decisions with data-driven insights and trend analysis across multiple jurisdictions.'
  },
  {
    icon: <Lightbulb className="h-6 w-6" />,
    title: 'Activists',
    description: 'Stay informed about legal developments and collaborate with stakeholders to drive meaningful change.'
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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6
    }
  }
};

const BenefitsSection = () => {
  return (
    <section id="benefits-section" className="bg-gradient-to-br from-primary-50 to-white py-16" aria-labelledby="benefits-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
        >
          <motion.h2 
            className="section-title"
            id="benefits-heading"
            variants={itemVariants}
          >
            Benefits
          </motion.h2>
          <motion.p 
            className="mt-3 text-lg text-gray-500"
            variants={itemVariants}
          >
            Empowering different stakeholders in the pursuit of reproductive justice
          </motion.p>
        </motion.div>

        <motion.div 
          className="mt-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="enhanced-card p-8"
                variants={itemVariants}
                whileHover={{ 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(156, 29, 32, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                }}
              >
                <div className="inline-flex p-4 bg-primary/10 rounded-xl mb-6 text-primary">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;