import React from 'react';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#0A1426] text-white" role="contentinfo">
      <div className="container mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
          {/* Logo and Copyright */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img
              src="https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/sign/logo/LIRA-PROGRAMME-LOGO-png-1536x1034.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJsb2dvL0xJUkEtUFJPR1JBTU1FLUxPR08tcG5nLTE1MzZ4MTAzNC5wbmciLCJpYXQiOjE3NDM2ODYzNDUsImV4cCI6MjA1OTA0NjM0NX0.UniOzPMgRsy6eys29GHFLZpI83txdMcWkhiTvInjGlk"
              alt="LIRA Programme Logo"
              className="h-12 w-auto"
              loading="lazy"
            />
            <p className="text-sm text-gray-400">
              © 2025, LIRA Programme Afya na Haki. All Rights Reserved.
            </p>
            <div className="flex space-x-4">
              <motion.a 
                href="#" 
                className="text-gray-400 hover:text-primary transition-colors"
                whileHover={{ scale: 1.2, color: "#9C1D20" }}
                whileTap={{ scale: 0.9 }}
                aria-label="Visit our LinkedIn page"
              >
                <Linkedin className="h-5 w-5" />
              </motion.a>
              <motion.a 
                href="#" 
                className="text-gray-400 hover:text-primary transition-colors"
                whileHover={{ scale: 1.2, color: "#9C1D20" }}
                whileTap={{ scale: 0.9 }}
                aria-label="Visit our Facebook page"
              >
                <Facebook className="h-5 w-5" />
              </motion.a>
              <motion.a 
                href="#" 
                className="text-gray-400 hover:text-primary transition-colors"
                whileHover={{ scale: 1.2, color: "#9C1D20" }}
                whileTap={{ scale: 0.9 }}
                aria-label="Visit our Twitter page"
              >
                <Twitter className="h-5 w-5" />
              </motion.a>
              <motion.a 
                href="#" 
                className="text-gray-400 hover:text-primary transition-colors"
                whileHover={{ scale: 1.2, color: "#9C1D20" }}
                whileTap={{ scale: 0.9 }}
                aria-label="Visit our Instagram page"
              >
                <Instagram className="h-5 w-5" />
              </motion.a>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-4">CONTACT US</h3>
            <ul className="space-y-3">
              <li className="text-gray-400">Plot 6105 Valley Rd, Canaan Sites, Gayaza Nakwero</li>
              <li>
                <a href="mailto:info@afyanahaki.org" className="text-gray-400 hover:text-primary transition-colors">
                  info@afyanahaki.org
                </a>
              </li>
              <li>
                <a href="tel:+256414660733" className="text-gray-400 hover:text-primary transition-colors">
                  +256 414 660 733
                </a>
              </li>
            </ul>
          </motion.div>

          {/* LIRA Partners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-primary mb-4">LIRA Partners</h3>
            <div className="mb-4">
              <motion.img 
                src="https://zvaurxgtttrgyvjzoedc.supabase.co/storage/v1/object/sign/map/Map.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJtYXAvTWFwLnBuZyIsImlhdCI6MTc0MzY4NzQwOCwiZXhwIjoyMDU5MDQ3NDA4fQ.QpAqWfEWV7A2uvVT-l4rhzXaWHWuR2r__FLfz8D9opo"
                alt="Africa Map showing LIRA Partners"
                className="w-32 h-auto opacity-80 hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.05 }}
              />
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              Powered by Afya Na Haki
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-sm text-gray-400 hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-primary transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-primary transition-colors">
                Cookie Policy
              </a>
              <a href="#" className="termly-display-preferences text-sm text-gray-400 hover:text-primary transition-colors">
                Consent Preferences
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;