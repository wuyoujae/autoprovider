'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export function ComparisonSection() {
  const t = useTranslations('comparison');

  const traditionalItems = [
    t('traditional.items.0'),
    t('traditional.items.1'),
    t('traditional.items.2'),
    t('traditional.items.3'),
  ];

  const autoproviderItems = [
    t('autoprovider.items.0'),
    t('autoprovider.items.1'),
    t('autoprovider.items.2'),
    t('autoprovider.items.3'),
  ];

  return (
    <section id="comparison" className="py-20 px-6 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {t('title')}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Traditional AI Column */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="p-8 rounded-2xl bg-gradient-to-br from-red-900/20 to-gray-900/50 backdrop-blur-sm border border-red-500/20">
              <h3 className="text-2xl font-bold mb-6 text-red-400 text-center">
                {t('traditional.title')}
              </h3>
              
              <div className="space-y-4">
                {traditionalItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="flex items-center gap-3"
                  >
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-8 h-8 border-2 border-red-500/30 rounded-full animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-6 h-6 border-2 border-red-500/20 rounded-full animate-pulse delay-1000" />
          </motion.div>

          {/* Arrow/VS Column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <div className="relative">
              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl font-bold text-white mb-4"
              >
                VS
              </motion.div>
              
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center mx-auto"
              >
                <ArrowRight className="w-8 h-8 text-white" />
              </motion.div>
            </div>
            
            {/* Connecting lines */}
            <div className="hidden lg:block absolute inset-0 pointer-events-none">
              <motion.div
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.8 }}
                className="absolute top-1/2 left-0 w-full h-px"
              >
                <svg className="w-full h-full">
                  <motion.line
                    x1="0"
                    y1="0"
                    x2="100%"
                    y2="0"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </svg>
              </motion.div>
            </div>
          </motion.div>

          {/* AutoProvider Column */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="p-8 rounded-2xl bg-gradient-to-br from-green-900/20 to-gray-900/50 backdrop-blur-sm border border-green-500/20">
              <h3 className="text-2xl font-bold mb-6 text-green-400 text-center">
                {t('autoprovider.title')}
              </h3>
              
              <div className="space-y-4">
                {autoproviderItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-8 h-8 border-2 border-green-500/30 rounded-full animate-pulse" />
            <div className="absolute -bottom-4 -right-4 w-6 h-6 border-2 border-green-500/20 rounded-full animate-pulse delay-1000" />
          </motion.div>
        </div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 text-center"
        >
          <div className="inline-block p-6 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20">
            <p className="text-xl text-white font-semibold">
              Experience the revolutionary difference
            </p>
            <p className="text-gray-400 mt-2">
              Move from human-dependent AI to truly autonomous operations
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}