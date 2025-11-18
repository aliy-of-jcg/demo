"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  Users, 
  MousePointerClick, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  Target,
  Globe,
  BarChart,
  Clock,
  PieChart,
  Activity,
  UserCheck,
  Tag
} from "lucide-react";
import { PageFooter } from "@/components/page-footer";

interface CampaignSummary {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  total_spent: number;
  total_clicks: number;
  total_visitors: number;
  total_visitors_all_channels: number;
}

interface Campaign {
  id: number;
  name: string;
  course_name: string;
  status: string;
  clicks?: number;
  visitors?: number;
}

export default function LandingPage() {
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/campaigns");
        const result = await response.json();
        
        if (result.success) {
          setSummary(result.summary);
          // Get top 3 recent campaigns
          setRecentCampaigns(result.campaigns.slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      label: "Active Campaigns",
      value: summary?.active_campaigns || 0,
      icon: Target,
      color: "bg-blue-500",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      label: "Total Clicks",
      value: summary?.total_clicks || 0,
      icon: MousePointerClick,
      color: "bg-green-500",
      gradient: "from-green-500 to-green-600"
    },
    {
      label: "Unique Visitors",
      value: summary?.total_visitors_all_channels || summary?.total_visitors || 0,
      icon: Users,
      color: "bg-purple-500",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      label: "Total Budget",
      value: `₩${((summary?.total_budget || 0) / 10000).toFixed(0)}만`,
      icon: TrendingUp,
      color: "bg-orange-500",
      gradient: "from-orange-500 to-orange-600"
    }
  ];

  const features = [
    {
      title: "Campaign Management",
      description: "Create, manage, and track marketing campaigns across multiple platforms",
      icon: Target,
      href: "/campaigns",
      color: "bg-blue-50 border-blue-200 hover:border-blue-400",
      iconColor: "text-blue-600"
    },
    {
      title: "Performance Dashboard",
      description: "Real-time analytics and insights into your campaign performance",
      icon: BarChart,
      href: "/performance",
      color: "bg-green-50 border-green-200 hover:border-green-400",
      iconColor: "text-green-600"
    },
    {
      title: "Session Journeys",
      description: "View complete page-by-page user journeys and navigation flows",
      icon: PieChart,
      href: "/session-journeys",
      color: "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
      iconColor: "text-cyan-600"
    },
    {
      title: "Channel Performance",
      description: "Analyze traffic sources and media platform effectiveness",
      icon: Globe,
      href: "/channel-performance",
      color: "bg-purple-50 border-purple-200 hover:border-purple-400",
      iconColor: "text-purple-600"
    },
    {
      title: "Campaign Analysis",
      description: "Deep dive into individual campaign metrics and performance",
      icon: BarChart3,
      href: "/campaign-analysis",
      color: "bg-pink-50 border-pink-200 hover:border-pink-400",
      iconColor: "text-pink-600"
    },
    {
      title: "Environment Analysis",
      description: "Understand user devices, browsers, and operating systems",
      icon: Activity,
      href: "/environment-analysis",
      color: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
      iconColor: "text-indigo-600"
    },
    {
      title: "Time-based Analysis",
      description: "Discover peak hours and day-of-week visitor patterns (KST)",
      icon: Clock,
      href: "/time-analysis",
      color: "bg-orange-50 border-orange-200 hover:border-orange-400",
      iconColor: "text-orange-600"
    },
    {
      title: "Returning Visitor Analysis",
      description: "Track repeat visitors and analyze user retention patterns",
      icon: UserCheck,
      href: "/returning-analysis",
      color: "bg-teal-50 border-teal-200 hover:border-teal-400",
      iconColor: "text-teal-600"
    },
    {
      title: "UTM List",
      description: "Manage and view all UTM parameters and tracking codes",
      icon: Tag,
      href: "/utm-tools",
      color: "bg-amber-50 border-amber-200 hover:border-amber-400",
      iconColor: "text-amber-600"
    }
  ];

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    waiting: 'bg-gray-100 text-gray-800',
    ended: 'bg-gray-200 text-gray-600',
    paused: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 pt-16 lg:pt-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Smart Marketing Analytics Platform</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 px-2 break-words">
              Welcome to <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CosMos AI</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-8 sm:mb-12 max-w-3xl mx-auto px-4">
              Empower your marketing campaigns with real-time tracking, intelligent analytics, 
              and actionable insights. Track every click, understand every visitor.
            </p>

            {/* Stats Overview */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
                {stats.map((stat, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 sm:mb-4 mx-auto`}>
                      <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 px-2">
              Powerful Features at Your Fingertips
            </h2>
            <p className="text-sm sm:text-base text-gray-600 px-4">
              Everything you need to track, analyze, and optimize your marketing campaigns
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href}>
                <div className={`${feature.color} border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full`}>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white flex items-center justify-center mb-3 sm:mb-4 shadow-sm`}>
                    <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-xs sm:text-sm font-medium text-blue-600">
                    Explore <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Campaigns */}
          {recentCampaigns.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Campaigns</h3>
                <Link href="/campaigns">
                  <div className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center cursor-pointer">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {recentCampaigns.map((campaign) => (
                  <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{campaign.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{campaign.course_name}</p>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
                        <div className="text-center">
                          <div className="font-bold text-blue-600 text-sm sm:text-base">{campaign.clicks || 0}</div>
                          <div className="text-xs text-gray-500">Clicks</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600 text-sm sm:text-base">{campaign.visitors || 0}</div>
                          <div className="text-xs text-gray-500">Visitors</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 sm:mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center shadow-xl">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
              Ready to Get Started?
            </h3>
            <p className="text-sm sm:text-base text-blue-100 mb-4 sm:mb-6 max-w-2xl mx-auto px-2">
              Create your first campaign and start tracking valuable insights today
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/campaigns/new" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-blue-600 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg text-sm sm:text-base">
                  Create Campaign
                </button>
              </Link>
              <Link href="/campaigns" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-700 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-blue-800 transition-colors border border-blue-500 text-sm sm:text-base">
                  View All Campaigns
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        <div className="max-w-7xl mx-auto">
          <PageFooter />
        </div>
      </div>
    </div>
  );
}

