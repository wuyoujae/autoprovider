'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, X, ChevronRight, Book, Cog, Zap, Database, Globe } from 'lucide-react';

interface SidebarItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
  children?: SidebarItem[];
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations('docs');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const sidebarItems: SidebarItem[] = [
    {
      id: 'getting-started',
      title: t('sidebar.gettingStarted'),
      path: `/docs`,
      icon: <Book className="w-4 h-4" />,
    },
    {
      id: 'installation',
      title: t('sidebar.installation'),
      path: `/docs/installation`,
      icon: <Cog className="w-4 h-4" />,
    },
    {
      id: 'quick-start',
      title: t('sidebar.quickStart'),
      path: `/docs/quick-start`,
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'api',
      title: t('sidebar.api'),
      path: `/docs/api`,
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'architecture',
      title: t('sidebar.architecture'),
      path: `/docs/architecture`,
      icon: <Globe className="w-4 h-4" />,
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(`/${locale}${path}`);
    setSidebarOpen(false);
  };

  const isActivePath = (path: string) => {
    if (path === '/docs') {
      return pathname === `/${locale}/docs` || pathname === `/${locale}/docs/`;
    }
    return pathname.startsWith(`/${locale}${path}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h1 className="text-xl font-bold">{t('title')}</h1>
                <p className="text-gray-400 text-sm">{t('subtitle')}</p>
              </div>
            </div>
            
            {/* Breadcrumb */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-400">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="hover:text-white transition-colors"
              >
                AutoProvider
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">Documentation</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex pt-32">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            x: sidebarOpen ? 0 : -320,
          }}
          className={`fixed lg:static top-32 left-0 w-80 h-[calc(100vh-8rem)] bg-gray-900/50 backdrop-blur-lg border-r border-white/10 z-30 overflow-y-auto lg:translate-x-0`}
        >
          <div className="p-6">
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  whileHover={{ x: 4 }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-all duration-200 group ${
                    isActivePath(item.path)
                      ? 'bg-white text-black'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`${isActivePath(item.path) ? 'text-black' : 'text-gray-400 group-hover:text-white'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.title}</span>
                </motion.button>
              ))}
            </nav>

            {/* Additional Resources */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">
                Resources
              </h3>
              <div className="space-y-2">
                <a
                  href="https://github.com/autoprovider"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.530.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </a>
                <button
                  onClick={() => router.push(`/${locale}/#demo`)}
                  className="flex items-center space-x-3 px-4 py-2 text-gray-400 hover:text-white transition-colors w-full text-left"
                >
                  <Zap className="w-4 h-4" />
                  <span>Live Demo</span>
                </button>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:pl-0">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="prose prose-invert prose-lg max-w-none">
              {children}
            </div>
            
            {/* Footer Navigation */}
            <div className="mt-16 pt-8 border-t border-white/10">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {t('common.lastUpdated')}: {new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                </div>
                <a
                  href="https://github.com/autoprovider/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {t('common.edit')}
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}