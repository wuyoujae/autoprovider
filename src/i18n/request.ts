import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale }) => {
  // Provide default locale if undefined
  const validLocale = locale || routing.defaultLocale;
  
  // Validate that the locale parameter is valid
  if (!routing.locales.includes(validLocale as any)) {
    console.warn(`Invalid locale received: ${locale}, falling back to default: ${routing.defaultLocale}`);
    // Use default locale instead of throwing error
    const fallbackLocale = routing.defaultLocale;
    return {
      locale: fallbackLocale,
      messages: (await import(`../locales/${fallbackLocale}/common.json`)).default
    };
  }

  return {
    locale: validLocale,
    messages: (await import(`../locales/${validLocale}/common.json`)).default
  };
});