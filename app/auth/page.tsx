"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthFooter } from "@/components/auth-footer";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

export default function AuthPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const tLogin = useTranslations("auth.login");
  const t = useTranslations("auth");

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
            // User is authenticated, redirect to dashboard
            window.location.replace("/");
            return;
          }
        } catch (error) {
          console.error("Auth check failed:", error);
        }
      }

      // Check for redirect reason code and show localized message
      const reasonCode = sessionStorage.getItem("auth_redirect_reason");
      if (reasonCode) {
        // Clear the reason code immediately to prevent showing again
        sessionStorage.removeItem("auth_redirect_reason");

        // Get translated message using the reason code as translation key
        try {
          // Remove 'auth.' prefix and split into parts (e.g., "statusChanged.blocked" or "sessionExpired")
          const translationKey = reasonCode.replace("auth.", "");
          const parts = translationKey.split(".");

          let messageData: { title: string; text: string } | null = null;

          if (parts.length === 2) {
            // Format: statusChanged.blocked, permissionDenied.roleChanged
            messageData = {
              title: t(`${parts[0]}.${parts[1]}.title`),
              text: t(`${parts[0]}.${parts[1]}.text`),
            };
          } else if (parts.length === 1) {
            // Format: sessionExpired, userNotFound
            messageData = {
              title: t(`${parts[0]}.title`),
              text: t(`${parts[0]}.text`),
            };
          }

          // Determine icon based on reason code
          let icon: "error" | "warning" | "info" = "warning";
          if (reasonCode.includes("blocked") || reasonCode.includes("stopped")) {
            icon = "error";
          } else if (reasonCode.includes("pending")) {
            icon = "info";
          }

          // Show message if we successfully got the translation
          if (messageData && messageData.title && messageData.text) {
            await Swal.fire({
              title: messageData.title,
              text: messageData.text,
              icon: icon,
              confirmButtonText: "OK",
              confirmButtonColor: "#6366f1",
              allowOutsideClick: false,
              allowEscapeKey: false,
            });
          }
        } catch (error) {
          // If translation fails, show generic message
          console.warn("Failed to get translation for reason code:", reasonCode, error);
          try {
            await Swal.fire({
              title: t("sessionExpired.title"),
              text: t("sessionExpired.text"),
              icon: "warning",
              confirmButtonText: "OK",
              confirmButtonColor: "#6366f1",
            });
          } catch (fallbackError) {
            // Last resort: show English message
            await Swal.fire({
              title: "Session Expired",
              text: "Your session has expired. Please sign in again.",
              icon: "warning",
              confirmButtonText: "OK",
              confirmButtonColor: "#6366f1",
            });
          }
        }
      }

      // Not authenticated, show login page
      setIsChecking(false);
    };

    checkAuth();
  }, [router, t]);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white text-lg font-medium">{tLogin("loading")}</p>
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
