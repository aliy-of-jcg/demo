"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { setLocaleCookie, getLocaleFromCookies } from '@/lib/locale';
import { useState, useEffect } from 'react';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const router = useRouter();
  const [currentLocale, setCurrentLocale] = useState<'en' | 'ko'>('en');
  const pathname = usePathname();

  useEffect(() => {
    // Always derive current locale from cookies (single source of truth)
    const locale = getLocaleFromCookies();
    setCurrentLocale(locale);
  }, [pathname]);

  const switchLanguage = (newLocale: 'en' | 'ko') => {
    if (currentLocale === newLocale) return;

    // Set the cookie
    setLocaleCookie(newLocale);
    setCurrentLocale(newLocale);

    // Refresh the current route so server components re-read the updated cookie
    router.refresh();
  };

  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm ${
      isDark 
        ? 'bg-gray-800 border border-gray-700' 
        : 'bg-white border border-gray-200'
    }`}>
      <Globe className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      <button
        onClick={() => switchLanguage('en')}
        className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
          currentLocale === 'en'
            ? isDark
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700'
            : isDark
              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        EN
      </button>
      <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>|</span>
      <button
        onClick={() => switchLanguage('ko')}
        className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
          currentLocale === 'ko'
            ? isDark
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-700'
            : isDark
              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        한국어
      </button>
    </div>
  );
}

