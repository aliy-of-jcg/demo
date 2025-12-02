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
    const locale = localeCookie.split('=')[1]?.trim();
    if (locale === 'ko' || locale === 'en') {
      return locale as 'en' | 'ko';
    }
  }

  return 'en';
}

