"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Megaphone, ChevronDown, ChevronUp, FileText, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
];

const campaignManagementItems = [
  { name: "Campaign List", href: "/campaigns" },
  { name: "Create New Campaign", href: "/campaigns/new" },
  { name: "Course Management", href: "/courses" },

];

const utmToolsItems = [
  { name: "UTM List", href: "/utm-tools" },
  { name: "UTM Generator", href: "/utm-tools/generator" },
];

const logAnalysisItems = [
  { name: "Performance Dashboard", href: "/performance" },
  { name: "Channel Performance", href: "/channel-performance" },
  { name: "Campaign Analysis", href: "/campaign-analysis" },
  { name: "Environment Analysis", href: "/environment-analysis" },
  { name: "Time-based Analysis", href: "/time-analysis" },
  { name: "Returning Visitor Analysis", href: "/returning-analysis" },
  { name: "Page Flow Analysis", href: "/page-flow-analysis" },
  { name: "Session Journeys", href: '/session-journeys' },
  { name: "Tracked Websites", href: '/tracked-websites' },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCampaignManagementOpen, setIsCampaignManagementOpen] = useState(false);
  const [isUTMToolsOpen, setIsUTMToolsOpen] = useState(false);
  const [isLogAnalysisOpen, setIsLogAnalysisOpen] = useState(false);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between h-14 sm:h-16 bg-gray-800 px-3 sm:px-4 relative z-10">
         <Link href="/" className="flex items-center min-w-0 flex-1 mr-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={onMobileClose}>
          <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
          <span className="ml-2 text-base sm:text-lg font-bold text-white truncate">CosMos AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <UserMenu />
          </div>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 sm:py-4 space-y-1.5 sm:space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-2 sm:mr-3" />
              {item.name}
            </Link>
          );
        })}
        
        {/* Campaign Management Dropdown */}
        <div className="space-y-1">
          <button
            onClick={() => setIsCampaignManagementOpen(!isCampaignManagementOpen)}
            className={cn(
              "flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-colors",
              "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <div className="flex items-center">
              <Megaphone className="w-5 h-5 mr-2 sm:mr-3" />
              Campaign Management
            </div>
            {isCampaignManagementOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {isCampaignManagementOpen && (
            <div className="ml-2 sm:ml-4 space-y-1">
              {campaignManagementItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors",
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

             {/* Log Analysis Dropdown */}
             <div className="space-y-1">
          <button
            onClick={() => setIsLogAnalysisOpen(!isLogAnalysisOpen)}
            className={cn(
              "flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-colors",
              "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-2 sm:mr-3" />
              Log Analysis
            </div>
            {isLogAnalysisOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {isLogAnalysisOpen && (
            <div className="ml-2 sm:ml-4 space-y-1">
              {logAnalysisItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors",
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

        {/* UTM Tools Dropdown */}
        <div className="space-y-1">
          <button
            onClick={() => setIsUTMToolsOpen(!isUTMToolsOpen)}
            className={cn(
              "flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-colors",
              "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <div className="flex items-center">
              <Target className="w-5 h-5 mr-2 sm:mr-3" />
              UTM Tools
            </div>
            {isUTMToolsOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {isUTMToolsOpen && (
            <div className="ml-2 sm:ml-4 space-y-1">
              {utmToolsItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors",
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
      <div className="p-3 sm:p-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 text-center sm:text-left">
          Analytics & Tracking System
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Desktop Sidebar - Always visible on lg+ */}
      <div className="hidden lg:flex flex-col w-64 bg-gray-900 relative">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar - Slide in from left */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
