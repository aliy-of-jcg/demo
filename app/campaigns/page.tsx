"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, MoreVertical, Edit, Copy, Trash2, BarChart3, TrendingUp, Users, DollarSign, Check, ExternalLink, Eye } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { PageFooter } from '@/components/page-footer';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Campaign {
  id: number;
  name: string;
  course_name: string;
  source: string;
  medium: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  tracking_code?: string;
  tracking_codes?: string[]; // Array of all tracking codes
  platforms?: Array<{ utm_source: string; utm_medium: string }>;
  clicks?: number;
  visitors?: number;
  ctr?: string;
  conversion_rate?: string;
}

interface Summary {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  avg_conversion_rate: number;
}

const sourceColors: Record<string, string> = {
  naver: 'bg-green-100 text-green-800',
  kakao: 'bg-yellow-100 text-yellow-800',
  google: 'bg-blue-100 text-blue-800',
  youtube: 'bg-red-100 text-red-800',
  saramin: 'bg-orange-100 text-orange-800'
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  waiting: 'bg-gray-100 text-gray-800',
  ended: 'bg-gray-200 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-800',
  hidden: 'bg-gray-300 text-gray-500'
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  waiting: 'Waiting',
  ended: 'Ended',
  paused: 'Paused',
  hidden: 'Hidden'
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState(''); // Immediate input value
  const debouncedSearch = useDebounce(searchInput, 500); // Debounced search value
  const [filters, setFilters] = useState({
    source: '',
    medium: '',
    status: '',
    course_id: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [copiedTrackingCode, setCopiedTrackingCode] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id: number; name: string }[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Log page info
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[Page Info]', {
        page: window.location.pathname,
        url: window.location.href,
        title: document.title
      });
    }
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActionMenuOpen(null);
      }
    };

    if (actionMenuOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [actionMenuOpen]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit]);

  // Fetch courses for the filter dropdown
  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [page, limit, debouncedSearch, filters, sortBy, sortOrder]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch,
        ...filters,
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const response = await fetch(`/api/campaigns?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setCampaigns(data.campaigns);
        setSummary(data.summary);
        setTotal(data.pagination.total);
      } else {
        throw new Error(data.error || 'Failed to fetch campaigns');
      }
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast.error(error.message || 'Failed to load campaigns');
      setCampaigns([]);
      setSummary(null);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();

      if (data.success) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Delete Campaign?',
      text: 'Are you sure you want to delete this campaign?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6b7280',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    toast.promise(
      (async () => {
        const response = await fetch(`/api/campaigns/${id}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete campaign');
        }

        await fetchCampaigns();
        return data;
      })(),
      {
        loading: 'Deleting campaign...',
        success: 'Campaign deleted successfully!',
        error: (err) => `Error: ${err.message}`,
      }
    );
  };

  const handleDuplicate = async (id: number) => {
    // Redirect to new campaign page with duplicate data
    window.location.href = `/campaigns/new?duplicate=${id}`;
  };

  const handleCopyTrackingLink = async (trackingCode: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/t/${trackingCode}`;
    
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedTrackingCode(trackingCode);
      toast.success('Tracking link copied to clipboard!');
      setTimeout(() => setCopiedTrackingCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy tracking link');
    }
  };

  const handleOpenTrackingLink = (trackingCode: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/t/${trackingCode}`;
    window.open(shortUrl, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage ongoing campaigns and track performance</p>
        </div>
        <Link 
          href="/campaigns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <span>+ Create New Campaign</span>
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Campaigns</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.total_campaigns}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  <span className="text-blue-600 font-medium">{summary.active_campaigns}</span> Active
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Monthly Budget</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.total_budget.toLocaleString()}₩</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '66.5%' }}></div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Progress: 66.5%</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Avg Conversion Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.avg_conversion_rate}%</p>
                <p className="text-xs sm:text-sm text-green-600 mt-1">+0.5%p</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Clicks</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-green-600 mt-1">
                  {campaigns.reduce((sum, c) => sum + (c.visitors || 0), 0).toLocaleString()} visitors
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by campaign or course name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              value={filters.course_id}
              onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Media</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="naver">Naver</option>
              <option value="kakao">Kakao</option>
              <option value="google">Google</option>
              <option value="youtube">YouTube</option>
              <option value="saramin">Saramin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Desktop Table - Hidden on mobile */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup><col className="w-[18%]" /><col className="w-[12%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[10%]" /><col className="w-[8%]" /><col className="w-[7%]" /></colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Campaign Name
                    {sortBy === 'name' && (
                      sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('start_date')}
                >
                  <div className="flex items-center gap-1">
                    Period
                    {sortBy === 'start_date' && (
                      sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('budget')}
                >
                  <div className="flex items-center gap-1">
                    Budget
                    {sortBy === 'budget' && (
                      sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No campaigns found
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <Link href={`/campaigns/${campaign.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm truncate block" title={campaign.name}>
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="truncate" title={campaign.course_name}>
                      {campaign.course_name}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {campaign.platforms && campaign.platforms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {campaign.platforms.slice(0, 2).map((platform, idx) => (
                            <span 
                              key={idx}
                              className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${sourceColors[platform.utm_source] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {platform.utm_source}
                            </span>
                          ))}
                          {campaign.platforms.length > 2 && (
                            <span className="text-xs text-gray-500">+{campaign.platforms.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${sourceColors[campaign.source] || 'bg-gray-100 text-gray-800'}`}>
                          {campaign.source}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="truncate">
                      {campaign.platforms && campaign.platforms.length > 0 ? (
                          campaign.platforms[0].utm_medium
                      ) : (
                        campaign.medium
                      )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[campaign.status] || campaign.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-900">
                      <div>{new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className="text-gray-500">~ {new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="font-medium">₩{(campaign.budget / 10000).toFixed(0)}만</div>
                      <div className="text-xs text-gray-500">
                        {((campaign.spent / campaign.budget) * 100).toFixed(0)}% used
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs">
                        <div className="text-gray-900">
                          {(campaign.clicks ?? 0) > 0 ? (
                            <>{(campaign.clicks ?? 0).toLocaleString()} clicks</>
                          ) : (
                            <span className="text-gray-400">No data</span>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {(campaign.visitors ?? 0).toLocaleString()} visitors
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {campaign.tracking_codes && campaign.tracking_codes.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/t/${campaign.tracking_codes![0]}`);
                              setCopiedTrackingCode(campaign.tracking_codes![0]);
                              setTimeout(() => setCopiedTrackingCode(null), 2000);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
                            title="Copy tracking link"
                          >
                            {copiedTrackingCode === campaign.tracking_codes[0] ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={`${window.location.origin}/t/${campaign.tracking_codes[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
                            title="Open tracking link in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {campaign.tracking_codes.length > 1 && (
                            <span className="text-xs text-gray-500">+{campaign.tracking_codes.length - 1}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No links</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-gray-100"
                          title="View campaign details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(actionMenuOpen === campaign.id ? null : campaign.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                            title="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuOpen === campaign.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setActionMenuOpen(null)}
                              />
                              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `/campaigns/${campaign.id}/edit`;
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(null);
                                      handleDuplicate(campaign.id);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Duplicate
                                  </button>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setActionMenuOpen(null);
                                      handleDelete(campaign.id);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
                )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible only on mobile */}
        <div className="lg:hidden divide-y divide-gray-200">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              No campaigns found
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/campaigns/${campaign.id}`} className="text-base font-semibold text-blue-600 hover:text-blue-800 block truncate">
                      {campaign.name}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">{campaign.course_name}</p>
                  </div>
                  <div className="relative ml-2" ref={actionMenuOpen === campaign.id ? menuRef : null}>
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === campaign.id ? null : campaign.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {actionMenuOpen === campaign.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <button
                              onClick={() => {
                                window.location.href = `/campaigns/${campaign.id}/edit`;
                                setActionMenuOpen(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleDuplicate(campaign.id);
                                setActionMenuOpen(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(campaign.id);
                                setActionMenuOpen(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-gray-500 text-xs">Media:</span>
                    <div className="mt-1">
                      {campaign.platforms && campaign.platforms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {campaign.platforms.map((platform, idx) => (
                            <span 
                              key={idx}
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${sourceColors[platform.utm_source] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {platform.utm_source}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sourceColors[campaign.source] || 'bg-gray-100 text-gray-800'}`}>
                          {campaign.source}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 text-xs">Status:</span>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[campaign.status] || campaign.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-600 mb-2">
                  <span className="font-medium">Period:</span> {new Date(campaign.start_date).toLocaleDateString()} ~ {new Date(campaign.end_date).toLocaleDateString()}
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
                  <div>
                    <span className="text-gray-500">Budget:</span>
                    <span className="font-medium text-gray-900 ml-1">₩{campaign.budget.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Clicks:</span>
                    <span className="font-medium text-blue-600 ml-1">{(campaign.clicks ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Visitors:</span>
                    <span className="font-medium text-purple-600 ml-1">{(campaign.visitors ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                {(campaign.tracking_codes && campaign.tracking_codes.length > 0) || campaign.tracking_code ? (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500 block mb-2">Tracking Links:</span>
                    {campaign.tracking_codes && campaign.tracking_codes.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {campaign.tracking_codes.slice(0, 2).map((code, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex-1 truncate">
                              /t/{code}
                            </code>
                            <button
                              onClick={() => handleCopyTrackingLink(code)}
                              className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                            >
                              {copiedTrackingCode === code ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ))}
                        {campaign.tracking_codes.length > 2 && (
                          <Link 
                            href={`/campaigns/${campaign.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            +{campaign.tracking_codes.length - 2} more
                          </Link>
                        )}
                      </div>
                    ) : campaign.tracking_code ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex-1 truncate">
                          /t/{campaign.tracking_code}
                        </code>
                        <button
                          onClick={() => handleCopyTrackingLink(campaign.tracking_code!)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        >
                          {copiedTrackingCode === campaign.tracking_code ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-gray-700">Total {total} campaigns</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="text-gray-700">per page</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((pageNum) => (
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

      {/* Footer with extra spacing */}
      <div className="mt-6 sm:mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

