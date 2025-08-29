import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  // Include root path and all localized paths
  matcher: [
    // Match root path
    '/',
    // Match all paths with locale prefix
    '/(zh|en)/:path*',
    // Match paths that need locale detection
    '/((?!_next|_vercel|.*\\.).*)'
  ]
};