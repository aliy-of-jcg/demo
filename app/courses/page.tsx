"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Edit, Trash2, BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { PageFooter } from '@/components/page-footer';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useTranslations } from 'next-intl';

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

export default function CoursesPage() {
  const t = useTranslations('courses');
  
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
  const modalRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchCourses();
  }, [debouncedSearch, statusFilter]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: debouncedSearch });
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      const response = await fetch(`/api/courses?${params}`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.courses);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (course: Course | null = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        name: course.name,
        code: course.code,
        category: course.category || '',
        duration: course.duration || '',
        price: course.price?.toString() || '',
        status: course.status
      });
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
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCourse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const actionKey = editingCourse ? 'updating' : 'creating';
    const actionPastKey = editingCourse ? 'updated' : 'created';
    const errorKey = editingCourse ? 'updateFailed' : 'createFailed';

    toast.promise(
      (async () => {
        const url = editingCourse
          ? `/api/courses/${editingCourse.id}`
          : '/api/courses';

        const method = editingCourse ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || t(`actions.${errorKey}`));
        }

        await fetchCourses();
        handleCloseModal();
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
    const result = await Swal.fire({
      title: t('delete.title'),
      text: t('delete.text'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6b7280',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('delete.confirm'),
      cancelButtonText: t('delete.cancel')
    });

    if (!result.isConfirmed) return;

    toast.promise(
      (async () => {
        const response = await fetch(`/api/courses/${id}`, {
          method: 'DELETE'
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
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <span>+ {t('addCourse')}</span>
        </button>
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
                      {course.duration || '-'}
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
                      <button
                        onClick={() => handleOpenModal(course)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    <p className="text-sm text-gray-900 mt-0.5">{course.duration || '-'}</p>
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
                    <button
                      onClick={() => handleOpenModal(course)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      aria-label="Edit course"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label="Delete course"
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
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.category')}
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  {t('modal.fields.duration')}
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder={t('modal.placeholders.duration')}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
    </div>
  );
}

