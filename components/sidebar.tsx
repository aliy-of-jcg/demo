"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, BarChart3, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tracking Links", href: "/tracking", icon: Link2 },
  { name: "API Docs", href: "/api-docs", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-gray-900 relative">
      <div className="flex items-center justify-between h-16 bg-gray-800 px-4 relative z-10">
        <div className="flex items-center min-w-0 flex-1 mr-2">
          <BarChart3 className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <span className="ml-2 text-lg font-bold text-white truncate">Admin Panel</span>
        </div>
        <div className="flex-shrink-0">
          <UserMenu />
        </div>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-400">
          Analytics & Tracking System
        </p>
      </div>
    </div>
  );
}
