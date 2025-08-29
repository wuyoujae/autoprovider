'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Play, ExternalLink, Cpu, Users, Zap } from 'lucide-react';

export function DemoSection() {
  const t = useTranslations('demo');

  const demoFeatures = [
    {
      icon: Cpu,
      title: "AI Decision Making",
      description: "Watch as AI entities make autonomous decisions without human input",
    },
    {
      icon: Users,
      title: "Self-Organization",
      description: "See how roles are automatically assigned and teams form organically",
    },
    {
      icon: Zap,
      title: "Real-time Adaptation",
      description: "Observe continuous learning and process optimization in action",
    },
  ];

  return (
    <section id="demo" className="py-20 px-6 bg-gradient-to-b from-black to-gray-900">
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
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            {t('subtitle')}
          </p>
          <p className="text-lg text-gray-500 max-w-4xl mx-auto">
            {t('description')}
          </p>
        </motion.div>

        {/* Demo Video/Interactive Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <div className="relative group">
            {/* Demo Container */}
            <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm border border-white/10 overflow-hidden">
              {/* Placeholder for demo content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center justify-center w-24 h-24 bg-white/20 rounded-full backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300"
                >
                  <Play className="w-12 h-12 text-white ml-1" />
                </motion.button>
              </div>
              
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full"
                    initial={{
                      x: Math.random() * 100 + '%',
                      y: Math.random() * 100 + '%',
                    }}
                    animate={{
                      x: Math.random() * 100 + '%',
                      y: Math.random() * 100 + '%',
                    }}
                    transition={{
                      duration: Math.random() * 10 + 10,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                ))}
              </div>
              
              {/* Network visualization overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  {[...Array(5)].map((_, i) => (
                    <motion.circle
                      key={i}
                      cx={`${20 + i * 15}%`}
                      cy={`${30 + (i % 2) * 40}%`}
                      r="8"
                      fill="none"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="2"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.2, duration: 0.8 }}
                    />
                  ))}
                  
                  {/* Connecting lines */}
                  <motion.path
                    d="M 20% 30% Q 50% 10% 80% 30%"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </svg>
              </div>
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
            
            {/* Floating action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4"
            >
              <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all duration-300 group">
                <Play className="w-5 h-5" />
                {t('watchDemo')}
              </button>
              <button className="flex items-center gap-2 px-6 py-3 border border-white/30 text-white rounded-full hover:bg-white/10 transition-all duration-300 group">
                <ExternalLink className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                {t('tryNow')}
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Demo Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {demoFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              className="group relative"
            >
              <div className="h-full p-6 rounded-xl bg-gradient-to-br from-gray-900/30 to-black/30 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-12 h-12 mb-4 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center"
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </motion.div>
                
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
                
                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-block p-8 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Build Your Autonomous Company?
            </h3>
            <p className="text-gray-400 mb-6 max-w-2xl">
              Join the revolution of truly autonomous business operations. 
              Experience the future where AI doesn't just assist - it leads.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all duration-300"
            >
              Get Started Today
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}