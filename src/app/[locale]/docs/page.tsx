'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Clock, Brain, Repeat, CheckCircle } from 'lucide-react';

export default function DocsPage() {
  const t = useTranslations('docs');
  const locale = useLocale();
  const router = useRouter();

  const handleQuickDemo = () => {
    router.push(`/${locale}/#demo`);
  };

  const handleInstallation = () => {
    router.push(`/${locale}/docs/installation`);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent">
          {t('gettingStarted.title')}
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          {t('gettingStarted.subtitle')}
        </p>
      </motion.div>

      {/* Overview */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-900/30 border border-white/10 rounded-xl p-8"
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Brain className="w-7 h-7 mr-3 text-blue-400" />
          {t('gettingStarted.overview.title')}
        </h2>
        <p className="text-gray-300 text-lg leading-relaxed">
          {t('gettingStarted.overview.description')}
        </p>
      </motion.section>

      {/* Key Features */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-8 text-center">
          {t('gettingStarted.keyFeatures.title')}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  {t('gettingStarted.keyFeatures.autonomous').split(':')[0]}
                </h3>
                <p className="text-gray-300">
                  {t('gettingStarted.keyFeatures.autonomous').split(':')[1]}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">
                  {t('gettingStarted.keyFeatures.continuous').split(':')[0]}
                </h3>
                <p className="text-gray-300">
                  {t('gettingStarted.keyFeatures.continuous').split(':')[1]}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Repeat className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">
                  {t('gettingStarted.keyFeatures.adaptive').split(':')[0]}
                </h3>
                <p className="text-gray-300">
                  {t('gettingStarted.keyFeatures.adaptive').split(':')[1]}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">
                  {t('gettingStarted.keyFeatures.scalable').split(':')[0]}
                </h3>
                <p className="text-gray-300">
                  {t('gettingStarted.keyFeatures.scalable').split(':')[1]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick Start Steps */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-3xl font-bold mb-8 text-center">Quick Start</h2>
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start space-x-6 p-6 bg-gray-900/30 border border-white/10 rounded-xl">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Installation</h3>
              <p className="text-gray-300 mb-4">
                Install AutoProvider CLI and set up your development environment
              </p>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm border border-white/10">
                <code className="text-green-400">npm install -g @autoprovider/cli</code>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-6 p-6 bg-gray-900/30 border border-white/10 rounded-xl">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Create Company</h3>
              <p className="text-gray-300 mb-4">
                Initialize your first autonomous company project
              </p>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm border border-white/10">
                <code className="text-green-400">autoprovider create my-company</code>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-6 p-6 bg-gray-900/30 border border-white/10 rounded-xl">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Deploy & Run</h3>
              <p className="text-gray-300 mb-4">
                Start your autonomous company and watch it operate
              </p>
              <div className="bg-black/50 rounded-lg p-4 font-mono text-sm border border-white/10 space-y-2">
                <div><code className="text-green-400">cd my-company</code></div>
                <div><code className="text-green-400">autoprovider deploy</code></div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick Demo CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/20 rounded-xl p-8 text-center"
      >
        <h2 className="text-2xl font-bold mb-4">
          {t('gettingStarted.quickDemo.title')}
        </h2>
        <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
          {t('gettingStarted.quickDemo.description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            onClick={handleQuickDemo}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-black px-8 py-3 rounded-full font-semibold flex items-center justify-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <Zap className="w-5 h-5" />
            <span>{t('gettingStarted.quickDemo.button')}</span>
          </motion.button>
          <motion.button
            onClick={handleInstallation}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="border border-white/30 text-white px-8 py-3 rounded-full font-semibold flex items-center justify-center space-x-2 hover:bg-white/10 transition-colors"
          >
            <span>Installation Guide</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.section>

      {/* Next Steps */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-8 text-center">Next Steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(`/${locale}/docs/installation`)}>
            <CheckCircle className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
              Installation Guide
            </h3>
            <p className="text-gray-400 text-sm">
              Complete installation and setup instructions
            </p>
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(`/${locale}/docs/api`)}>
            <CheckCircle className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
              API Reference
            </h3>
            <p className="text-gray-400 text-sm">
              Comprehensive API documentation and examples
            </p>
          </div>

          <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6 hover:bg-gray-900/50 transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(`/${locale}/docs/architecture`)}>
            <CheckCircle className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
              Architecture
            </h3>
            <p className="text-gray-400 text-sm">
              Understanding AutoProvider's technical architecture
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}