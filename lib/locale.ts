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

// Server-side function to get locale from request cookies
export function getLocaleFromRequest(cookieHeader: string | null): 'en' | 'ko' {
  if (!cookieHeader) return 'en';
  
  const cookies = cookieHeader.split(';');
  const localeCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='));
  
  if (localeCookie) {
    const locale = localeCookie.split('=')[1];
    return (locale as 'en' | 'ko') || 'en';
  }
  
  return 'en';
}

