export function setLocaleCookie(locale: 'en' | 'ko') {
  if (typeof document !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`; // 1 year
  }
}

export function getLocaleFromCookies(): 'en' | 'ko' {
  if (typeof document === 'undefined') return 'en';

  const cookies = document.cookie.split(';');
  const localeCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='));

  if (localeCookie) {
    const locale = localeCookie.split('=')[1];
    return (locale as 'en' | 'ko') || 'en';
  }

  return 'en';
}

// Server-side function to get locale from request cookies or Accept-Language header
export function getLocaleFromRequest(
  cookieHeader: string | null,
  acceptLanguageHeader?: string | null
): 'en' | 'ko' {
  // First, try to get locale from cookie
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    const localeCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='));

    if (localeCookie) {
      const locale = localeCookie.split('=')[1]?.trim();
      if (locale === 'ko' || locale === 'en') {
        return locale as 'en' | 'ko';
      }
    }
  }

  // Fallback to Accept-Language header if no cookie
  if (acceptLanguageHeader) {
    if (acceptLanguageHeader.includes('ko')) {
      return 'ko';
    }
  }

  // Default to English
  return 'en';
}

