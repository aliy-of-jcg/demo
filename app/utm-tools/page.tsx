"use client";

import { useState, useEffect } from 'react';
import { Search, Copy, ExternalLink, Edit, Trash2, Plus, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PageFooter } from '@/components/page-footer';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { copyToClipboard } from '@/lib/clipboard';

interface UTMCode {
  id: number;
  name: string;
  tracking_code: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term?: string;
  utm_content?: string;
  campaign_name: string;
  course_name: string;
  landing_url: string;
  full_url: string;
  created_at: string;
  clicks: number;
  status: 'active' | 'inactive';
}

interface Summary {
  total_utms: number;
  active_utms: number;
  inactive_utms: number;
  total_clicks: number;
}

export default function UTMListPage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500); // Debounce search input
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<Summary>({
    total_utms: 0,
    active_utms: 0,
    inactive_utms: 0,
    total_clicks: 0
  });
  const [utmCodes, setUtmCodes] = useState<UTMCode[]>([]);

  useEffect(() => {
    fetchUTMCodes();
  }, [debouncedSearch, page, limit]); // Use debounced value instead of raw input

  const fetchUTMCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const response = await fetch(`/api/utm-codes?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch UTM codes');
      }

      setSummary(data.summary);
      setUtmCodes(data.utm_list);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (error: any) {
      console.error('Error fetching UTM codes:', error);
      setError(error.message || 'Failed to load UTM codes');
      toast.error('Failed to load UTM codes');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    inactive: 'bg-yellow-100 text-yellow-800'
  };

  const handleCopy = async (text: string, id: number) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('URL copied to clipboard!');
    } else {
      toast.error('Failed to copy URL');
    }
  };

  const getShortUrl = (trackingCode: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/t/${trackingCode}`;
    }
    return `/t/${trackingCode}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch {
      return dateString;
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: 'Delete UTM Code?',
      text: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    toast.promise(
      (async () => {
        // Hard delete - actually remove from database
        const response = await fetch(`/api/utm-codes/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete UTM code');
        }

        await fetchUTMCodes();
        return data;
      })(),
      {
        loading: 'Deleting UTM code...',
        success: 'UTM code deleted successfully!',
        error: (err) => `Error: ${err.message}`,
      }
    );
  };

  const handleToggleStatus = async (id: number, currentStatus: string, name: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} UTM Link?`,
      html: `
        <p>Are you sure you want to ${action} "${name}"?</p>
        ${newStatus === 'inactive' ? '<p class="text-sm text-orange-600 mt-2">⚠️ The link will show an "expired" message to visitors.</p>' : '<p class="text-sm text-green-600 mt-2">✓ The link will redirect visitors normally.</p>'}
      `,
      icon: newStatus === 'inactive' ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'inactive' ? '#f59e0b' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it`,
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    toast.promise(
      (async () => {
        const response = await fetch(`/api/utm-codes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update UTM status');
        }

        await fetchUTMCodes();
        return data;
      })(),
      {
        loading: `${action.charAt(0).toUpperCase() + action.slice(1)}ing UTM link...`,
        success: `UTM link ${action}d successfully!`,
        error: (err) => `Error: ${err.message}`,
      }
    );
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1 when limit changes
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading UTM codes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 text-center">
          <p className="text-red-800 font-medium mb-2 text-sm sm:text-base">Error Loading UTM Codes</p>
          <p className="text-red-600 text-xs sm:text-sm mb-4">{error}</p>
          <button
            onClick={fetchUTMCodes}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">UTM Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and track UTM codes for campaign attribution</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchUTMCodes}
            disabled={loading}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="Refresh data"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link 
            href="/utm-tools/generator"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create UTM</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs sm:text-sm text-gray-600">Total UTMs</p>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{summary.total_utms}</p>
          <p className="text-xs sm:text-sm text-green-600 mt-1">All tracking codes</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs sm:text-sm text-gray-600">Active UTMs</p>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{summary.active_utms}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Currently in use</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs sm:text-sm text-gray-600">Inactive</p>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{summary.inactive_utms}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Not being used</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs sm:text-sm text-gray-600">Total Clicks</p>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{summary.total_clicks.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Across all UTMs</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by UTM name, campaign, or source..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* UTM Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4 sm:mb-6">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Landing URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {utmCodes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <p className="text-gray-500">No UTM codes found</p>
                    {searchInput && (
                      <button
                        onClick={() => setSearchInput('')}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                utmCodes.map((utm) => (
                  <tr key={utm.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{utm.name}</div>
                      <div className="text-xs text-gray-500">{utm.tracking_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{utm.campaign_name || '-'}</div>
                      {utm.course_name && (
                        <div className="text-xs text-gray-500 mt-1">{utm.course_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {utm.utm_source || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {utm.utm_medium || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 truncate max-w-xs font-mono">
                          {getShortUrl(utm.tracking_code)}
                        </span>
                        <button
                          onClick={() => handleCopy(getShortUrl(utm.tracking_code), utm.id)}
                          className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                          title="Copy Short URL"
                        >
                          {copiedId === utm.id ? (
                            <span className="text-green-600 text-xs">✓</span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={getShortUrl(utm.tracking_code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                          title="Open Tracking URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(utm.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {utm.clicks.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(utm.id, utm.status, utm.name)}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 ${statusColors[utm.status]} ${utm.status === 'active' ? 'hover:ring-blue-400' : 'hover:ring-yellow-400'} cursor-pointer`}
                        title={`Click to ${utm.status === 'active' ? 'deactivate' : 'activate'}`}
                      >
                        {utm.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/utm-tools/generator?edit=${utm.id}`}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(utm.id, utm.name)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden divide-y divide-gray-200">
          {utmCodes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">No UTM codes found</p>
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            utmCodes.map((utm) => (
              <div key={utm.id} className="p-4 hover:bg-gray-50">
                {/* Header with name and status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{utm.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{utm.tracking_code}</p>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(utm.id, utm.status, utm.name)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${statusColors[utm.status]}`}
                  >
                    {utm.status}
                  </button>
                </div>

                {/* Campaign & Course */}
                {utm.campaign_name && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Campaign</p>
                    <p className="text-sm font-medium text-gray-900">{utm.campaign_name}</p>
                    {utm.course_name && (
                      <p className="text-xs text-gray-500 mt-1">{utm.course_name}</p>
                    )}
                  </div>
                )}

                {/* Source & Medium */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Source</span>
                    <p className="font-medium text-gray-900 capitalize">{utm.utm_source || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Medium</span>
                    <p className="font-medium text-gray-900 capitalize">{utm.utm_medium || '-'}</p>
                  </div>
                </div>

                {/* Tracking URL */}
                <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Tracking URL</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700 font-mono truncate flex-1">
                      {getShortUrl(utm.tracking_code)}
                    </span>
                    <button
                      onClick={() => handleCopy(getShortUrl(utm.tracking_code), utm.id)}
                      className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                    >
                      {copiedId === utm.id ? (
                        <span className="text-green-600 text-xs">✓</span>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={getShortUrl(utm.tracking_code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatDate(utm.created_at)}</span>
                    <span className="font-medium text-gray-900">{utm.clicks.toLocaleString()} clicks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/utm-tools/generator?edit=${utm.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(utm.id, utm.name)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-gray-700">Total {total} UTM codes</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="40">40</option>
              </select>
              <span className="text-gray-700">per page</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 rounded text-sm ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

