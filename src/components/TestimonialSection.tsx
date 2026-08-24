import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "ReproPulse has revolutionized how we manage and track reproductive justice cases across our network.",
    author: "Dr. Jessica Oreoluwa Oga",
    role: "Head of Regionalism, Afya Na Haki"
  },
  {
    quote: "The data insights provided by ReproPulse have been invaluable in shaping our advocacy strategy.",
    author: "Mr. Ibrahim Nsereko",
    role: "Head of Advocacy Capacity Enhancement, Afya Na Haki"
  },
  {
    quote: "A game-changer for reproductive rights activism in Africa. The collaborative features are exceptional.",
    author: "Koomson Nana",
    role: "Reproductive Rights Activist"
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

const TestimonialSection = () => {
  return (
    <section id="testimonial-section" className="bg-gray-50 py-12" aria-labelledby="testimonials-heading">
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
            id="testimonials-heading"
            variants={itemVariants}
          >
            What Users Say
          </motion.h2>
          <motion.p 
            className="mt-3 text-lg text-gray-500"
            variants={itemVariants}
          >
            Hear from our community of legal professionals, policymakers, and activists
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
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="enhanced-card p-8"
                variants={itemVariants}
                whileHover={{ 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(156, 29, 32, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                }}
              >
                <div className="inline-flex p-3 bg-primary/10 rounded-xl mb-6">
                  <Quote className="h-8 w-8 text-primary" />
                </div>
                <p className="text-gray-600 italic mb-6 text-lg leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialSection;