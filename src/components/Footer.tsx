'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-black border-t border-white/10">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold mb-4"
            >
              AutoProvider
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-400"
            >
              {t('description')}
            </motion.p>
          </div>

          {/* Links */}
          <div>
            <motion.h4
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold mb-4"
            >
              Quick Links
            </motion.h4>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col space-y-2"
            >
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                {t('links.product')}
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                {t('links.docs')}
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                {t('links.support')}
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                {t('links.privacy')}
              </a>
            </motion.div>
          </div>

          {/* Contact */}
          <div>
            <motion.h4
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold mb-4"
            >
              Connect
            </motion.h4>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col space-y-2"
            >
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Twitter
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                LinkedIn
              </a>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400"
        >
          {t('copyright')}
        </motion.div>
      </div>
    </footer>
  );
}