import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // 获取路径中的语言信息
  const pathname = request.nextUrl.pathname;
  const locale = pathname.startsWith('/zh') ? 'zh' : 'en';
  
  // 调用next-intl中间件
  const response = intlMiddleware(request);
  
  // 添加语言头信息
  if (response) {
    response.headers.set('x-locale', locale);
    response.headers.set('x-pathname', pathname);
  }
  
  return response;
}

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