"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Loader2, Menu } from "lucide-react";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.includes("/auth");
  const isResetPasswordPage = pathname?.includes("/reset-password");
  const isLinkExpiredPage = pathname?.includes("/link-expired");
  const isPublicPage = isAuthPage || isResetPasswordPage || isLinkExpiredPage;
  const [isAuthenticating, setIsAuthenticating] = useState(!isPublicPage);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Skip auth check for public pages (auth, reset password, and link expired)
    if (isPublicPage) {
      setIsAuthenticating(false);
      setIsAuthenticated(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          // Use replace to avoid adding to history
          window.location.replace(`/auth`);
          return;
        }

        const response = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (!result.valid) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
          // Use replace to avoid back button issues
          window.location.replace(`/auth`);
        } else {
          if (result.user) {
            localStorage.setItem("user", JSON.stringify(result.user));
          }
          setIsAuthenticated(true);
          setIsAuthenticating(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        window.location.replace(`/auth`);
      }
    };

    // Small delay to prevent chunk loading race condition
    const timeout = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timeout);
  }, [isPublicPage]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Public pages (auth, reset password, and link expired): no sidebar, full screen
  if (isPublicPage) {
    return (
      <>
        {/* Language Switcher - Fixed top right for public pages */}
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher />
        </div>
        {children}
      </>
    );
  }

  // Show loading screen while authenticating (prevents sidebar flash)
  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600 text-lg font-medium">Authenticating...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Authenticated: show admin panel with sidebar
  if (isAuthenticated) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {/* Mobile Menu Button - Fixed at top */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          {children}
        </main>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}
