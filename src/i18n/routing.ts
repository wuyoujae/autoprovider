import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'zh'],

  // Used when no locale matches
  defaultLocale: 'en',

  // The `pathnames` object maps internal pathnames
  // to external pathnames per locale.
  pathnames: {
    '/': '/',
    '/docs': '/docs',
    '/docs/installation': '/docs/installation',
    '/docs/api': '/docs/api',
    '/docs/architecture': '/docs/architecture',
    '/docs/quick-start': '/docs/quick-start'
  }
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);