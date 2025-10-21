"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Loader2 } from "lucide-react";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith("/auth");
  const isResetPasswordPage = pathname?.startsWith("/reset-password");
  const isPublicPage = isAuthPage || isResetPasswordPage;
  const [isAuthenticating, setIsAuthenticating] = useState(!isPublicPage);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Skip auth check for public pages (auth and reset password)
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
          window.location.replace("/auth");
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
          window.location.replace("/auth");
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
        window.location.replace("/auth");
      }
    };

    // Small delay to prevent chunk loading race condition
    const timeout = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timeout);
  }, [isPublicPage]);

  // Public pages (auth and reset password): no sidebar, full screen
  if (isPublicPage) {
    return <>{children}</>;
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
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}
