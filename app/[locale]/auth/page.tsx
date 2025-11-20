"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthFooter } from "@/components/auth-footer";
import { Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function AuthPage() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('auth.login');
  const [isChecking, setIsChecking] = useState(true);

  // Extract locale from pathname
  const locale = pathname?.split('/')[1] || 'en';

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const token = localStorage.getItem("auth_token");
      
      if (token) {
        try {
          const response = await fetch("/api/auth/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (data.valid) {
            // User is authenticated, redirect to dashboard with locale
            window.location.replace(`/${locale}`);
            return;
          }
        } catch (error) {
          console.error("Auth check failed:", error);
        }
      }
      
      // Not authenticated, show login page
      setIsChecking(false);
    };

    checkAuth();
  }, [router, locale]);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white text-lg font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 animate-gradient-shift">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        </div>
        
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <AuthForm />
        </div>
        
        {/* Footer */}
        <AuthFooter />
      </div>

      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 z-5">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"></div>
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>
      </div>
    </div>
  );
}


