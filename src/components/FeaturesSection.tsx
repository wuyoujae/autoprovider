'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Bot, Network, Clock, TrendingUp } from 'lucide-react';

export function FeaturesSection() {
  const t = useTranslations('features');

  const features = [
    {
      icon: Bot,
      title: t('autonomous.title'),
      description: t('autonomous.description'),
      delay: 0.1,
    },
    {
      icon: Network,
      title: t('selfOrganizing.title'),
      description: t('selfOrganizing.description'),
      delay: 0.2,
    },
    {
      icon: Clock,
      title: t('continuous.title'),
      description: t('continuous.description'),
      delay: 0.3,
    },
    {
      icon: TrendingUp,
      title: t('adaptive.title'),
      description: t('adaptive.description'),
      delay: 0.4,
    },
  ];

  return (
    <section id="features" className="py-20 px-6 bg-gradient-to-b from-black to-gray-900">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: feature.delay }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group relative"
            >
              <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300">
                {/* Animated background */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="relative z-10 w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center"
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                
                {/* Animated particles */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full opacity-30"
                      initial={{
                        x: Math.random() * 100 + '%',
                        y: Math.random() * 100 + '%',
                      }}
                      animate={{
                        y: ['-10%', '110%'],
                        opacity: [0, 0.6, 0],
                      }}
                      transition={{
                        duration: Math.random() * 3 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Central connecting animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex justify-center mt-16"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-32 h-32 border border-white/20 rounded-full flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border border-white/30 rounded-full flex items-center justify-center"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-full flex items-center justify-center">
                  <Network className="w-6 h-6 text-white" />
                </div>
              </motion.div>
            </motion.div>
            
            {/* Connecting lines */}
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                  className="absolute w-1 h-20 bg-gradient-to-t from-transparent via-white/30 to-transparent"
                  style={{
                    transform: `rotate(${i * 90}deg)`,
                    transformOrigin: 'center bottom',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}