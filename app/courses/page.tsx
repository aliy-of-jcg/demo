"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Search, Edit, Trash2, BarChart3, TrendingUp, Users, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageFooter } from '@/components/page-footer';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Course {
  id: number;
  name: string;
  code: string;
  category: string;
  duration: string;
  price: number;
  status: string;
  active_campaigns?: number;
  total_visits?: number;
}

interface Summary {
  total_courses: number;
  active_courses: number;
  total_campaigns: number;
  total_visits: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  waiting: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800',
  ended: 'bg-gray-200 text-gray-600',
  hidden: 'bg-gray-300 text-gray-500'
};

function CoursesPageContent() {
  const t = useTranslations('courses');
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { hasPermission } = usePermission();

  // Check permissions
  const canCreateCourse = hasPermission('courses:create');
  const canUpdateCourse = hasPermission('courses:update');
  const canDeleteCourse = hasPermission('courses:delete');

  // Format duration with translated month/months
  const formatDuration = (duration: string | null | undefined): string => {
    if (!duration || duration.trim() === '') return '-';
    const num = parseInt(duration);
    if (isNaN(num)) return duration; // Return as-is if not a number
    return num === 1
      ? `${num} ${t('modal.duration.month')}`
      : `${num} ${t('modal.duration.months')}`;
  };

  const statusLabels: Record<string, string> = {
    active: t('status.active'),
    waiting: t('status.waiting'),
    paused: t('status.paused'),
    ended: t('status.ended'),
    hidden: t('status.hidden')
  };
  const [courses, setCourses] = useState<Course[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from URL params (only on first render)
  const [isInitialized, setIsInitialized] = useState(false);
  const [page, setPage] = useState(() => {
    const urlPage = searchParams.get('page');
    return urlPage ? parseInt(urlPage) : 1;
  });
  const [limit, setLimit] = useState(() => {
    const urlLimit = searchParams.get('limit');
    return urlLimit && [10, 20, 50].includes(parseInt(urlLimit)) ? parseInt(urlLimit) : 10;
  });
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState(''); // Immediate input value
  const debouncedSearch = useDebounce(searchInput, 500); // Debounced search value
  const [statusFilter, setStatusFilter] = useState(''); // Status filter
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    duration: '',
    price: '',
    status: 'active'
  });
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);

  const isUpdateDisabled = useMemo(() => {
    if (!editingCourse) return false;
    if (!initialFormData) return true;
    return JSON.stringify(formData) === JSON.stringify(initialFormData);
  }, [editingCourse, formData, initialFormData]);

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCloseModal();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseModal();
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showModal]);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Update URL when page or limit changes (but not on initial render)
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());

    router.replace(`/courses?${params.toString()}`, { scroll: false });
  }, [page, limit, isInitialized, router]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Reset to page 1 when status filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Reset to page 1 when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    fetchCourses();
  }, [page, limit, debouncedSearch, statusFilter]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedSearch
      });
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      const response = await fetchWithAuth(`/api/courses?${params}`);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCourses(data.courses || []);
        setSummary(data.summary);
        setTotal(data.pagination?.total || 0);
      } else {
        toast.error(data.error || t('actions.loadFailed'));
        setCourses([]);
        setSummary(null);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      // If error is about authentication/authorization, fetchWithAuth already redirected
      // For other errors, show message
      if (error.message && !error.message.includes('Authentication failed')) {
        toast.error(t('actions.loadFailed'));
      }
      setCourses([]);
      setSummary(null);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const normalizeDuration = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const parsed = typeof value === 'number' ? value : parseInt(value, 10);
    return Number.isNaN(parsed) ? '' : parsed.toString();
  };

  const handleOpenModal = (course: Course | null = null) => {
    // Permission check for creating new course
    if (!course && !canCreateCourse) {
      toast.error(t('actions.unauthorized'));
      return;
    }

    if (course) {
      setEditingCourse(course);
      const mapped = {
        name: course.name,
        code: course.code,
        category: course.category || '',
        duration: normalizeDuration(course.duration),
        price: course.price?.toString() || '',
        status: course.status
      };
      setFormData(mapped);
      setInitialFormData(mapped);
    } else {
      setEditingCourse(null);
      setFormData({
        name: '',
        code: '',
        category: '',
        duration: '',
        price: '',
        status: 'active'
      });
      setInitialFormData(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCourse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!formData.category || formData.category.trim() === '') {
      toast.error(t('modal.validation.categoryRequired'));
      return;
    }

    if (!formData.duration || formData.duration.trim() === '') {
      toast.error(t('modal.validation.durationRequired'));
      return;
    }

    if (editingCourse && initialFormData && JSON.stringify(formData) === JSON.stringify(initialFormData)) {
      toast.info('No changes to save');
      return;
    }

    const actionKey = editingCourse ? 'updating' : 'creating';
    const actionPastKey = editingCourse ? 'updated' : 'created';
    const errorKey = editingCourse ? 'updateFailed' : 'createFailed';

    toast.promise(
      (async () => {
        const url = editingCourse
          ? `/api/courses/${editingCourse.id}`
          : '/api/courses';

        const method = editingCourse ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || t(`actions.${errorKey}`));
        }

        await fetchCourses();
        handleCloseModal();
        // reset dirty baseline after successful save
        if (editingCourse) {
          setInitialFormData(formData);
        }
        return data;
      })(),
      {
        loading: t(`actions.${actionKey}`),
        success: t('actions.success', { action: t(`actions.${actionPastKey}`) }),
        error: (err) => `${t('actions.error')}: ${err.message}`,
      }
    );
  };

  const handleDelete = async (id: number) => {
    setCourseToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (courseToDelete === null) return;

    setShowDeleteDialog(false);

    toast.promise(
      (async () => {
        const response = await fetchWithAuth(`/api/courses/${courseToDelete}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Check if error is about campaigns attached to course
          const campaignErrorMatch = data.error?.match(/Cannot delete course with (\d+) active campaign/);
          if (campaignErrorMatch) {
            const campaignCount = parseInt(campaignErrorMatch[1]);
            // For English, use plural form; Korean doesn't need plural
            const plural = campaignCount > 1 ? t('delete.hasCampaignsPlural') : t('delete.hasCampaignsSingular');
            throw new Error(t('delete.hasCampaigns', { count: campaignCount, plural }));
          }
          throw new Error(data.error || t('actions.deleteFailed'));
        }

        await fetchCourses();
        setCourseToDelete(null);
        return data;
      })(),
      {
        loading: t('actions.deleting'),
        success: t('actions.success', { action: t('actions.deleted') }),
        error: (err) => `${t('actions.error')}: ${err.message}`,
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <ProtectedComponent permission="courses:create" hideOnUnauthorized>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>+ {t('addCourse')}</span>
          </button>
        </ProtectedComponent>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 sm:mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('summary.totalCourses')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.total_courses}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('summary.activeCourses')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.active_courses}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('summary.activeCampaigns')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.total_campaigns}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{t('summary.totalVisits')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.total_visits}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('filters.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('filters.allStatus')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="waiting">{t('status.waiting')}</option>
              <option value="paused">{t('status.paused')}</option>
              <option value="ended">{t('status.ended')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('table.title')}</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{t('table.searchHint')}</p>
        </div>

        {/* Desktop Table - Hidden on mobile/tablet */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.courseName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.duration')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.price')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.activeCampaigns')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.totalVisits')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('table.action')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {t('table.noCourses')}
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{course.name}</div>
                        <div className="text-sm text-gray-500">{course.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(course.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.price ? `${course.price.toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {course.active_campaigns ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.total_visits?.toLocaleString() ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[course.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[course.status] || course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <ProtectedComponent permission="courses:update" hideOnUnauthorized>
                        <button
                          onClick={() => handleOpenModal(course)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </ProtectedComponent>
                      <ProtectedComponent permission="courses:delete" hideOnUnauthorized>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </ProtectedComponent>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View - Visible only on mobile and tablet */}
        <div className="lg:hidden divide-y divide-gray-200">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            </div>
          ) : courses.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              {t('table.noCourses')}
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-gray-900 truncate">{course.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{course.code}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[course.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[course.status] || course.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-xs text-gray-500">{t('mobile.category')}</span>
                    <p className="text-sm text-gray-900 mt-0.5">{course.category || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{t('mobile.duration')}</span>
                    <p className="text-sm text-gray-900 mt-0.5">{formatDuration(course.duration)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{t('mobile.price')}</span>
                    <p className="text-sm text-gray-900 mt-0.5">
                      {course.price ? `${course.price.toLocaleString()}원` : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">{t('mobile.campaigns')}</span>
                    <p className="text-sm text-blue-600 font-medium mt-0.5">
                      {course.active_campaigns ?? 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">{t('mobile.totalVisits')}</span> {course.total_visits?.toLocaleString() ?? 0}
                  </div>
                  <div className="flex items-center gap-2">
                    <ProtectedComponent permission="courses:update" hideOnUnauthorized>
                      <button
                        onClick={() => handleOpenModal(course)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        aria-label="Edit course"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </ProtectedComponent>
                    <ProtectedComponent permission="courses:delete" hideOnUnauthorized>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </ProtectedComponent>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 sm:px-6 py-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-gray-700">Total {total} courses</span>
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
                className={`px-3 py-1 rounded text-sm ${page === pageNum
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
              {editingCourse ? t('modal.editTitle') : t('modal.addTitle')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.courseName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity(t('modal.validation.courseNameRequired'));
                  }}
                  onInput={(e) => {
                    e.currentTarget.setCustomValidity('');
                  }}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.courseCode')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity(t('modal.validation.courseCodeRequired'));
                  }}
                  onInput={(e) => {
                    e.currentTarget.setCustomValidity('');
                  }}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.category')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity(t('modal.validation.categoryRequiredHtml'));
                  }}
                  onInput={(e) => {
                    e.currentTarget.setCustomValidity('');
                  }}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.duration')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={['1', '2', '3', '6', '12'].includes(formData.duration) ? formData.duration : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData({ ...formData, duration: e.target.value });
                      } else {
                        setFormData({ ...formData, duration: '' });
                      }
                    }}
                    className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">{t('modal.duration.select')}</option>
                    <option value="1">1 {t('modal.duration.month')}</option>
                    <option value="2">2 {t('modal.duration.months')}</option>
                    <option value="3">3 {t('modal.duration.months')}</option>
                    <option value="6">6 {t('modal.duration.months')}</option>
                    <option value="12">12 {t('modal.duration.months')}</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder={t('modal.placeholders.duration')}
                    required
                    onInvalid={(e) => {
                      e.currentTarget.setCustomValidity(t('modal.validation.durationRequiredHtml'));
                    }}
                    onInput={(e) => {
                      e.currentTarget.setCustomValidity('');
                    }}
                    className="flex-1 px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{t('modal.duration.helper')}</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.price')}
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">{t('status.active')}</option>
                  <option value="waiting">{t('status.waiting')}</option>
                  <option value="paused">{t('status.paused')}</option>
                  <option value="ended">{t('status.ended')}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 sm:gap-4 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3 sm:px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('modal.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUpdateDisabled}
                  className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCourse ? t('modal.actions.update') : t('modal.actions.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-6 sm:mt-8">
        <PageFooter />
      </div>

      {/* Delete Course Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-left">
                {t('delete.title')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              {t('delete.text')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
            >
              {t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CoursesPageContent />
    </Suspense>
  );
}

