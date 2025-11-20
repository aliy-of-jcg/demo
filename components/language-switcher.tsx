"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { setLocaleCookie, getLocaleFromCookies } from '@/lib/locale';
import { useState, useEffect } from 'react';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentLocale, setCurrentLocale] = useState<'en' | 'ko'>('en');

  useEffect(() => {
    // Check if we're on a locale route (e.g., /en or /en/..., /ko or /ko/...)
    if (pathname === '/ko' || pathname.startsWith('/ko/')) {
      setCurrentLocale('ko');
    } else if (pathname === '/en' || pathname.startsWith('/en/')) {
      setCurrentLocale('en');
    } else {
      // For non-locale routes, check the cookie
      const locale = getLocaleFromCookies();
      setCurrentLocale(locale);
    }
  }, [pathname]);

  const switchLanguage = (newLocale: 'en' | 'ko') => {
    if (currentLocale === newLocale) return;

    // Set the cookie
    setLocaleCookie(newLocale);
    setCurrentLocale(newLocale);

    // If we're on a locale route (e.g., /en/something or /ko/something), update it
    if (
      pathname === '/en' ||
      pathname === '/ko' ||
      pathname.startsWith('/en/') ||
      pathname.startsWith('/ko/')
    ) {
      // Replace only the leading locale segment (/en or /ko), not any "en"/"ko" that
      // might appear later in the path (e.g., /environment-analysis).
      const newPathname = pathname.replace(/^\/(en|ko)(?=\/|$)/, `/${newLocale}`);
      router.push(newPathname);
    } else {
      // For non-locale routes, just refresh the page to reload with new locale
      router.refresh();
    }
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

