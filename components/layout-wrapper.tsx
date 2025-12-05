"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Loader2, Menu } from "lucide-react";
import { showAuthDialog } from "@/lib/utils/auth-dialog";
import type { UserStatus } from "@/lib/types";
import { SystemSettingsProvider } from "@/lib/contexts/SystemSettingsContext";

// Hardcoded Korean messages for auth popups
const AUTH_MESSAGES: Record<string, { title: string; text: string; icon: 'error' | 'warning' | 'info' }> = {
  blocked: { title: '계정 차단됨', text: '귀하의 계정이 차단되었습니다. 오류로 생각되시면 지원팀에 문의해주세요.', icon: 'error' },
  stopped: { title: '계정 중지됨', text: '귀하의 계정이 중지되었습니다. 지원팀에 문의해주세요.', icon: 'warning' },
  pending: { title: '계정 승인 대기 중', text: '귀하의 계정이 승인 대기 중입니다. 관리자에게 문의하거나 활성화를 기다려주세요.', icon: 'info' },
  session_expired: { title: '세션 만료됨', text: '세션이 만료되었습니다. 다시 로그인해주세요.', icon: 'warning' },
};

let isShowingPopup = false;

async function showAuthPopupAndRedirect(messageType: string, redirectUrl: string = '/auth') {
  if (isShowingPopup) return;
  isShowingPopup = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (window.location.pathname === '/auth') {
      isShowingPopup = false;
      return;
    }

    const message = AUTH_MESSAGES[messageType] || AUTH_MESSAGES.session_expired;
    await showAuthDialog(message.title, message.text, message.icon);

    window.location.replace(redirectUrl);
  } catch (error) {
    console.error('Error showing auth popup:', error);
    isShowingPopup = false;
    window.location.replace(redirectUrl);
  }
}

function getMessageTypeFromStatus(status: UserStatus): string {
  switch (status) {
    case 'blocked': return 'blocked';
    case 'stopped': return 'stopped';
    case 'pending': return 'pending';
    default: return 'session_expired';
  }
}

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
          await showAuthPopupAndRedirect('session_expired');
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

          // Show popup based on status and redirect
          if (result.status) {
            await showAuthPopupAndRedirect(getMessageTypeFromStatus(result.status as UserStatus));
          } else {
            await showAuthPopupAndRedirect('session_expired');
          }
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

        await showAuthPopupAndRedirect('session_expired');
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
      <SystemSettingsProvider>
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
      </SystemSettingsProvider>
    );
  }

  // Fallback (shouldn't reach here)
  return null;
}
