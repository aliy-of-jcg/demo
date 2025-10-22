"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, TrendingUp, BarChart3, Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Performance", href: "/performance", icon: TrendingUp },
  { name: "Tracking Links", href: "/tracking", icon: Link2 },
];

const campaignManagementItems = [
  { name: "Campaign List", href: "/campaigns" },
  { name: "Create New Campaign", href: "/campaigns/new" },
  { name: "Course Management", href: "/courses" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCampaignManagementOpen, setIsCampaignManagementOpen] = useState(false);

  return (
    <div className="flex flex-col w-64 bg-gray-900 relative">
      <div className="flex items-center justify-between h-16 bg-gray-800 px-4 relative z-10">
        <div className="flex items-center min-w-0 flex-1 mr-2">
          <BarChart3 className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <span className="ml-2 text-lg font-bold text-white truncate">CosMos AI</span>
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
        
        {/* Campaign Management Dropdown */}
        <div className="space-y-1">
          <button
            onClick={() => setIsCampaignManagementOpen(!isCampaignManagementOpen)}
            className={cn(
              "flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors",
              "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <div className="flex items-center">
              <Megaphone className="w-5 h-5 mr-3" />
              Campaign Management
            </div>
            {isCampaignManagementOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {isCampaignManagementOpen && (
            <div className="ml-4 space-y-1">
              {campaignManagementItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-gray-700 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-400">
          Analytics & Tracking System
        </p>
      </div>
    </div>
  );
}
