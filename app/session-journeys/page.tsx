"use client";

import { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Clock, 
  Globe, 
  Monitor, 
  MapPin,
  RefreshCw,
  Calendar,
  Users,
  Route,
  LogIn,
  LogOut
} from "lucide-react";

interface Page {
  page_url: string;
  page_title: string;
  page_sequence: number;
  timestamp: string;
  time_on_page: number;
  event_type: string;
  is_landing_page: number;
  is_exit_page: number;
  exit_timestamp: string | null;
}

interface Session {
  session_id: string;
  user_id: string;
  session_start: string;
  session_end: string;
  total_pages: number;
  landing_page: string;
  exit_page: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  device_type: string;
  browser: string;
  os: string;
  duration: number;
  pages: Page[];
  has_exit_event: boolean; // Flag indicating if session has ended
  exit_page_url: string | null; // URL of the exit page
}

export default function SessionJourneysPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        limit: '50'
      });

      const response = await fetch(`/api/analytics/session-journeys?${params}`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatTime = (timestamp: string) => {
    // Timestamp is already in KST from the API
    return timestamp.split(' ')[1]?.substring(0, 5) || timestamp;
  };

  const formatDateTime = (timestamp: string) => {
    // Timestamp is already in KST from the API
    return timestamp.replace('T', ' ').substring(0, 19);
  };

  const getPageName = (url: string) => {
    try {
      const path = new URL(url).pathname;
      return path === '/' ? 'Home' : path.split('/').filter(Boolean).pop() || 'Home';
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Route className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Session Journeys</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              KST (UTC+9)
            </span>
          </div>
          <p className="text-gray-600">
            Complete page-by-page journey for each user session
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="text-3xl font-bold text-gray-900">{sessions.length}</div>
            </div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-8 h-8 text-green-600" />
              <div className="text-3xl font-bold text-gray-900">
                {sessions.reduce((sum, s) => sum + s.pages.length, 0)}
              </div>
            </div>
            <div className="text-sm text-gray-600">Total Pageviews</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8 text-purple-600" />
              <div className="text-3xl font-bold text-gray-900">
                {sessions.length > 0 
                  ? formatDuration(Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length))
                  : '0s'}
              </div>
            </div>
            <div className="text-sm text-gray-600">Avg Session Duration</div>
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
            <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No sessions found for the selected date range.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Session Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Session Start (KST)</div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatDateTime(session.session_start)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                        Duration
                        {session.has_exit_event ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDuration(session.duration)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Device</div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        {session.device_type} • {session.browser} • {session.os}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Source</div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        {session.utm_source}
                        {session.utm_medium && ` / ${session.utm_medium}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page Journey */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                      Page Journey ({session.pages.length} {session.pages.length === 1 ? 'page' : 'pages'})
                    </h3>
                  </div>

                  <div className="relative">
                    {session.pages.map((page, index) => (
                      <div key={index} className="relative">
                        {/* Page Block */}
                        <div className={`flex items-start gap-4 ${session.has_exit_event ? 'pb-8' : ''} ${(index !== session.pages.length - 1 || session.has_exit_event) ? 'border-l-2 border-gray-200 ml-3' : ''}`}>
                          {/* Sequence Number with Icon Overlay */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${
                              page.is_landing_page === 1
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white'
                            }`}>
                              {page.page_sequence}
                            </div>
                            {/* Landing Icon */}
                            {page.is_landing_page === 1 && (
                              <div className="absolute -top-1 -right-1 bg-green-600 rounded-full p-0.5">
                                <LogIn className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Page Details */}
                          <div className="flex-1 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {getPageName(page.page_url)}
                                  </h4>
                                  {page.is_landing_page === 1 && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                      <LogIn className="w-3 h-3" />
                                      Landing
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{page.page_url}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatTime(page.timestamp)} <span className="text-xs text-gray-500">KST</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {page.time_on_page > 0 ? `${page.time_on_page}s` : '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Arrow between pages */}
                        {index < session.pages.length - 1 && (
                          <div className="absolute left-3 bottom-4 z-10 bg-white rounded-full p-0.5">
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 transform rotate-90" />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Session End Marker - Show if session has ended, even for single-page sessions */}
                    {session.has_exit_event && (
                      <div className="flex items-start gap-4 border-l-2 border-gray-200 ml-3 pb-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white z-10">
                            <LogOut className="w-4 h-4" />
                          </div>
                        </div>
                        
                        <div className="flex-1 bg-red-50 rounded-lg p-4 border border-red-200">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-red-900">Session Ended</h4>
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                  Completed
                                </span>
                              </div>
                              <p className="text-xs text-red-700">
                                {session.pages.length === 1 ? (
                                  <>User left after viewing: {getPageName(session.exit_page_url || session.pages[0].page_url)}</>
                                ) : (
                                  <>Last page viewed: {getPageName(session.exit_page_url || session.pages[session.pages.length - 1].page_url)}</>
                                )}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium text-red-900">
                                {formatTime(session.session_end)} <span className="text-xs text-red-700">KST</span>
                              </div>
                              <div className="text-xs text-red-700">
                                {formatDuration(session.duration)} total
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

