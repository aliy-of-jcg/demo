import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ko'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = (locale as string) || 'en';
  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default
  };
});

