import React from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Baby, UserCheck, Scale as Scales, Droplets, ShieldAlert } from 'lucide-react';

const thematicAreas = [
  {
    icon: <HeartPulse className="h-8 w-8" />,
    title: "Access to Safe Abortion",
    description: "Legal frameworks, barriers, and advancements in ensuring access to safe abortion services across Africa."
  },
  {
    icon: <Baby className="h-8 w-8" />,
    title: "Maternal Health and Mortality",
    description: "Cases addressing maternal healthcare access, quality of care, and accountability for preventable maternal deaths."
  },
  {
    icon: <ShieldAlert className="h-8 w-8" />,
    title: "Sexual and Gender-Based Violence",
    description: "Legal responses to SGBV, including rape, domestic violence, and their impact on reproductive health and rights."
  },
  {
    icon: <UserCheck className="h-8 w-8" />,
    title: "Consent and Adolescent Rights",
    description: "Legal issues surrounding consent for reproductive healthcare, particularly for adolescents and vulnerable populations."
  },
  {
    icon: <Scales className="h-8 w-8" />,
    title: "Discrimination in Healthcare",
    description: "Cases challenging discriminatory practices in reproductive healthcare delivery based on gender, disability, or socioeconomic status."
  },
  {
    icon: <Droplets className="h-8 w-8" />,
    title: "Menstrual Health and Hygiene",
    description: "Legal advocacy for menstrual equity, including access to products, facilities, and education."
  }
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
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

const ThematicFocusSection = () => {
  return (
    <section id="thematic-focus-section" className="bg-gradient-to-br from-stone-50 via-primary-50 to-stone-100 py-24" aria-labelledby="thematic-heading">
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
            id="thematic-heading"
            variants={itemVariants}
          >
            Our Thematic Focus
          </motion.h2>
          <motion.p 
            className="mt-4 text-lg text-stone-500"
            variants={itemVariants}
          >
            Exploring key legal areas in reproductive justice across Africa
          </motion.p>
        </motion.div>

        <motion.div 
          className="mt-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {thematicAreas.map((area, index) => (
              <motion.div
                key={index}
                className="relative enhanced-card p-8"
                variants={itemVariants}
                whileHover={{ 
                  y: -5,
                  boxShadow: "0 25px 50px -12px rgba(156, 29, 32, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                }}
              >
                <div className="inline-flex p-4 bg-primary/10 rounded-xl mb-6 text-primary">
                  {area.icon}
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-4">
                  {area.title}
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  {area.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ThematicFocusSection;