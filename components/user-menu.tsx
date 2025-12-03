"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/useAuth";

interface UserData {
  id: number;
  uuid: string;
  email: string;
  company_name: string;
  user_type: string;
}

export function UserMenu() {
  const t = useTranslations('userMenu');
  const router = useRouter();
  const { user: authUser, refreshAuth } = useAuth(false); // Use useAuth hook to get latest user data
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Convert authUser to UserData format for compatibility
  const user: UserData | null = authUser ? {
    id: authUser.id,
    uuid: authUser.uuid,
    email: authUser.email,
    company_name: authUser.company_name,
    user_type: authUser.user_type,
  } : null;

  // Refresh auth status when user icon is clicked
  const handleIconClick = async () => {
    setIsOpen(!isOpen);
    // If opening the menu, refresh auth to get latest status/permissions
    if (!isOpen) {
      await refreshAuth();
    }
  };

  useEffect(() => {
    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      router.push("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear local storage and redirect
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      router.push("/auth");
    }
  };

  if (!user) return null;

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case "owner":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "admin":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "observer":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "regular":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUserTypeLabel = (type: string) => {
    const typeKey = type.toLowerCase() as 'owner' | 'admin' | 'observer' | 'regular';
    return t(`userTypes.${typeKey}`, { defaultValue: type.charAt(0).toUpperCase() + type.slice(1) });
  };

  return (
    <div className="relative z-50" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={handleIconClick}
        className="flex items-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 p-2 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
        aria-label={t('userMenu')}
      >
        <User className="h-5 w-5" />
      </button>

      {/* Dropdown Menu - Positioned to open downward within sidebar */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsOpen(false)} />

          {/* Dropdown - Opens below and slightly to the left to stay within sidebar */}
          <div className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-white shadow-2xl border border-gray-200 z-50 overflow-hidden">
            {/* User Info Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 text-white">
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-white/20 p-1.5 flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs truncate" title={user.email}>
                    {user.email}
                  </p>
                  <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1 truncate" title={user.company_name}>
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{user.company_name}</span>
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getUserTypeColor(
                    user.user_type
                  )}`}
                >
                  {getUserTypeLabel(user.user_type)}
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/profile");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4 text-gray-400" />
                {t('profile')}
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t('signOut')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
