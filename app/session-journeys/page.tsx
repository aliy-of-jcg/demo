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
  LogOut,
  AlertTriangle
} from "lucide-react";
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';
import { formatTimezoneForDisplay } from '@/lib/utils/timezones';

interface Page {
  page_url: string;
  page_title: string;
  page_sequence: number;
  timestamp: string;
  time_on_page: number;
  event_type: string;
  is_landing_page: number;
  is_exit_page: number;
  http_status: number;
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
  const t = useTranslations('sessionJourneys');
  const { getInitialDateRange, isLoading: settingsLoading, getDefaultTimezone } = useSystemSettings();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize date range from system defaults (GA behavior)
  // On page reload, defaults are applied automatically
  const [startDate, setStartDate] = useState(() => {
    // Fallback to 30 days initially (will be updated when settings load)
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Update date range when system settings load (GA behavior: apply defaults on page load)
  useEffect(() => {
    if (!settingsLoading) {
      try {
        const initialRange = getInitialDateRange();
        setStartDate(initialRange.start);
        setEndDate(initialRange.end);
      } catch (err) {
        // Fallback handled by useState initializer
      }
    }
  }, [settingsLoading, getInitialDateRange]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        limit: '50'
      });

      const response = await fetchWithAuth(`/api/analytics/session-journeys?${params}`);
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
    // Convert timestamp to system timezone synchronously (matches timezone name display)
    // API now returns UTC timestamps, we convert to current system timezone on client
    // This ensures timestamps update immediately when timezone changes, without page reload
    if (!timestamp) {
      return '';
    }

    if (settingsLoading) {
      // While loading, show original format
      return timestamp.split(' ')[1]?.substring(0, 5) || timestamp;
    }

    try {
      // Parse the timestamp from API (now in UTC/ISO format)
      const date = new Date(timestamp);

      if (isNaN(date.getTime())) {
        // Fallback: try parsing as space-separated format
        const parts = timestamp.split(' ');
        if (parts.length >= 2) {
          const datePart = parts[0];
          const timePart = parts[1];
          const fallbackDate = new Date(`${datePart}T${timePart}Z`); // Add Z for UTC
          if (!isNaN(fallbackDate.getTime())) {
            const timezone = getDefaultTimezone();
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: timezone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            return formatter.format(fallbackDate);
          }
        }
        return timestamp.split(' ')[1]?.substring(0, 5) || timestamp;
      }

      // Format in CURRENT system timezone (synchronously with timezone name)
      // This ensures timestamps update when timezone changes without page reload
      const timezone = getDefaultTimezone();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return formatter.format(date);
    } catch (error) {
      console.error('Error formatting time:', error);
      // Fallback to original format
      return timestamp.split(' ')[1]?.substring(0, 5) || timestamp;
    }
  };

  const formatDateTime = (timestamp: string) => {
    // Convert timestamp to system timezone synchronously (matches timezone name display)
    // API now returns UTC timestamps, we convert to current system timezone on client
    if (!timestamp) {
      return '';
    }

    if (settingsLoading) {
      return timestamp.replace('T', ' ').substring(0, 19);
    }

    try {
      // Parse the timestamp from API (now in UTC/ISO format)
      const date = new Date(timestamp);

      if (isNaN(date.getTime())) {
        // Fallback: try parsing as space-separated format
        const parts = timestamp.split(' ');
        if (parts.length >= 2) {
          const datePart = parts[0];
          const timePart = parts[1];
          const fallbackDate = new Date(`${datePart}T${timePart}Z`); // Add Z for UTC
          if (!isNaN(fallbackDate.getTime())) {
            const timezone = getDefaultTimezone();
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            });
            const parts = formatter.formatToParts(fallbackDate);
            const year = parts.find(p => p.type === 'year')?.value || '0000';
            const month = parts.find(p => p.type === 'month')?.value || '01';
            const day = parts.find(p => p.type === 'day')?.value || '01';
            const hour = parts.find(p => p.type === 'hour')?.value || '00';
            const minute = parts.find(p => p.type === 'minute')?.value || '00';
            const second = parts.find(p => p.type === 'second')?.value || '00';
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
          }
        }
        return timestamp.replace('T', ' ').substring(0, 19);
      }

      // Format in CURRENT system timezone (synchronously with timezone name)
      const timezone = getDefaultTimezone();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Format: YYYY-MM-DD HH:mm:ss
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value || '0000';
      const month = parts.find(p => p.type === 'month')?.value || '01';
      const day = parts.find(p => p.type === 'day')?.value || '01';
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const second = parts.find(p => p.type === 'second')?.value || '00';

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return timestamp.replace('T', ' ').substring(0, 19);
    }
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Route className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{t('title')}</h1>
            </div>
            <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium rounded-full self-start sm:self-auto">
              {!settingsLoading ? formatTimezoneForDisplay(getDefaultTimezone()) : 'Loading...'}
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 w-full sm:min-w-[200px]">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                {t('filters.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 w-full sm:min-w-[200px]">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                {t('filters.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? t('filters.loading') : t('filters.refresh')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{sessions.length}</div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">{t('stats.totalSessions')}</div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {sessions.reduce((sum, s) => sum + s.pages.length, 0)}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">{t('stats.totalPageviews')}</div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {sessions.length > 0
                  ? formatDuration(Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length))
                  : '0s'}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">{t('stats.avgSessionDuration')}</div>
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg sm:rounded-xl p-8 sm:p-12 text-center shadow-sm border border-gray-200">
            <Globe className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-gray-600">{t('empty.noSessions')}</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Session Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        {t('session.sessionStart')} {!settingsLoading && `(${formatTimezoneForDisplay(getDefaultTimezone()).split(' ')[0]})`}
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                        <span className="break-all">{formatDateTime(session.session_start)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-2 flex-wrap">
                        {t('session.duration')}
                        {session.has_exit_event ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            {t('session.completed')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {t('session.active')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        {formatDuration(session.duration)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{t('session.device')}</div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                        <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                        <span className="break-words">{session.device_type} • {session.browser} • {session.os}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{t('session.source')}</div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                        <span className="break-words">
                          {session.utm_source}
                          {session.utm_medium && ` / ${session.utm_medium}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page Journey */}
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                      {t('session.pageJourney')} ({session.pages.length} {session.pages.length === 1 ? t('session.page') : t('session.pages')})
                    </h3>
                  </div>

                  <div className="relative">
                    {session.pages.map((page, index) => (
                      <div key={index} className="relative">
                        {/* Page Block */}
                        <div className={`flex items-start gap-2 sm:gap-4 ${session.has_exit_event ? 'pb-6 sm:pb-8' : ''} ${(index !== session.pages.length - 1 || session.has_exit_event) ? 'border-l-2 border-gray-200 ml-2.5 sm:ml-3' : ''}`}>
                          {/* Sequence Number with Icon Overlay */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold z-10 ${page.http_status === 404
                              ? 'bg-yellow-500 text-yellow-900'
                              : page.is_landing_page === 1
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white'
                              }`}>
                              {page.page_sequence}
                            </div>
                            {/* Landing Icon */}
                            {page.is_landing_page === 1 && (
                              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-green-600 rounded-full p-0.5">
                                <LogIn className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Page Details */}
                          <div className={`flex-1 rounded-lg p-3 sm:p-4 transition-colors ${page.http_status === 404
                            ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                            }`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                  <h4 className={`text-sm sm:text-base font-medium break-words ${page.http_status === 404 ? 'text-yellow-900' : 'text-gray-900'
                                    }`}>
                                    {getPageName(page.page_url)}
                                  </h4>
                                  {page.is_landing_page === 1 && (
                                    <span className="px-1.5 sm:px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1 flex-shrink-0">
                                      <LogIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      {t('session.landing')}
                                    </span>
                                  )}
                                  {page.http_status === 404 && (
                                    <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1 flex-shrink-0">
                                      <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      404
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs break-all ${page.http_status === 404 ? 'text-yellow-700' : 'text-gray-500'
                                  }`}>{page.page_url}</p>
                              </div>
                              <div className="text-left sm:text-right flex-shrink-0">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">
                                  {formatTime(page.timestamp)} <span className="text-xs text-gray-500">{!settingsLoading ? formatTimezoneForDisplay(getDefaultTimezone()).split(' ')[0] : ''}</span>
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
                          <div className="absolute left-2.5 sm:left-3 bottom-3 sm:bottom-4 z-10 bg-white rounded-full p-0.5">
                            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 transform rotate-90" />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Session End Marker - Show if session has ended, even for single-page sessions */}
                    {session.has_exit_event && (
                      <div className="flex items-start gap-2 sm:gap-4 border-l-2 border-gray-200 ml-2.5 sm:ml-3 pb-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-red-500 text-white z-10">
                            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                        </div>

                        <div className="flex-1 bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                <h4 className="text-sm sm:text-base font-medium text-red-900">{t('session.sessionEnded')}</h4>
                                <span className="px-1.5 sm:px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full flex-shrink-0">
                                  {t('session.completed')}
                                </span>
                              </div>
                              <p className="text-xs text-red-700 break-words">
                                {session.pages.length === 1 ? (
                                  <>{t('session.userLeftAfterViewing')} {getPageName(session.exit_page_url || session.pages[0].page_url)}</>
                                ) : (
                                  <>{t('session.lastPageViewed')} {getPageName(session.exit_page_url || session.pages[session.pages.length - 1].page_url)}</>
                                )}
                              </p>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                              <div className="text-xs sm:text-sm font-medium text-red-900">
                                {formatTime(session.session_end)} <span className="text-xs text-red-700">{!settingsLoading ? formatTimezoneForDisplay(getDefaultTimezone()).split(' ')[0] : ''}</span>
                              </div>
                              <div className="text-xs text-red-700">
                                {formatDuration(session.duration)} {t('session.total')}
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

