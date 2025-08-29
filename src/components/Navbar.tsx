'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, X, Globe } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    router.push(`/${newLocale}`);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-lg border-b border-white/10"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold"
          >
            AutoProvider
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('home')}
              className="hover:text-gray-300 transition-colors"
            >
              {t('home')}
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-gray-300 transition-colors"
            >
              {t('features')}
            </button>
            <button
              onClick={() => scrollToSection('comparison')}
              className="hover:text-gray-300 transition-colors"
            >
              {t('comparison')}
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className="hover:text-gray-300 transition-colors"
            >
              {t('demo')}
            </button>
            <button
              onClick={() => router.push(`/${locale}/docs`)}
              className="hover:text-gray-300 transition-colors"
            >
              {t('docs')}
            </button>

            {/* Language Toggle */}
            <div className="relative">
              <button
                onClick={() => setLanguageOpen(!languageOpen)}
                className="flex items-center space-x-2 hover:text-gray-300 transition-colors"
              >
                <Globe size={20} />
                <span>{locale.toUpperCase()}</span>
              </button>
              
              {languageOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 bg-gray-900 border border-white/20 rounded-lg py-2 min-w-[80px]"
                >
                  <button
                    onClick={() => {
                      if (locale !== 'en') toggleLanguage();
                      setLanguageOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                  >
                    EN
                  </button>
                  <button
                    onClick={() => {
                      if (locale !== 'zh') toggleLanguage();
                      setLanguageOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                  >
                    中文
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden mt-4 py-4 border-t border-white/10"
          >
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => scrollToSection('home')}
                className="text-left hover:text-gray-300 transition-colors"
              >
                {t('home')}
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-left hover:text-gray-300 transition-colors"
              >
                {t('features')}
              </button>
              <button
                onClick={() => scrollToSection('comparison')}
                className="text-left hover:text-gray-300 transition-colors"
              >
                {t('comparison')}
              </button>
              <button
                onClick={() => scrollToSection('demo')}
                className="text-left hover:text-gray-300 transition-colors"
              >
                {t('demo')}
              </button>
              <button
                onClick={() => {
                  router.push(`/${locale}/docs`);
                  setIsOpen(false);
                }}
                className="text-left hover:text-gray-300 transition-colors"
              >
                {t('docs')}
              </button>
              <button
                onClick={toggleLanguage}
                className="text-left flex items-center space-x-2 hover:text-gray-300 transition-colors"
              >
                <Globe size={20} />
                <span>{locale === 'en' ? '中文' : 'English'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}