"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageFooter } from '@/components/page-footer';
import { copyToClipboard } from '@/lib/clipboard';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { useSystemSettings } from '@/lib/contexts/SystemSettingsContext';

interface Course {
  id: number;
  name: string;
  code: string;
}

function NewCampaignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const t = useTranslations('campaigns.create');
  const { getDefaultCampaignStatus, isLoading: settingsLoading } = useSystemSettings();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDuplicate, setLoadingDuplicate] = useState(false);

  // Refs for scrolling to error fields
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    course_id: useRef<HTMLSelectElement>(null),
    source: useRef<HTMLSelectElement>(null),
    medium: useRef<HTMLSelectElement>(null),
    start_date: useRef<HTMLInputElement>(null),
    end_date: useRef<HTMLInputElement>(null),
    budget: useRef<HTMLInputElement>(null),
    landing_url: useRef<HTMLInputElement>(null),
  };

  // Initialize form data with system defaults (GA behavior)
  const [formData, setFormData] = useState(() => {
    try {
      const defaultStatus = getDefaultCampaignStatus();
      return {
        name: '',
        utm_name: '',
        course_id: '',
        source: 'select',
        medium: 'select',
        status: defaultStatus,
        start_date: '',
        end_date: '',
        budget: '',
        daily_budget: '',
        description: '',
        utm_campaign: '',
        utm_source: '',
        utm_medium: '',
        utm_term: '',
        utm_content: '',
        landing_url: ''
      };
    } catch {
      // Fallback if context not ready
      return {
        name: '',
        utm_name: '',
        course_id: '',
        source: 'select',
        medium: 'select',
        status: 'waiting' as const,
        start_date: '',
        end_date: '',
        budget: '',
        daily_budget: '',
        description: '',
        utm_campaign: '',
        utm_source: '',
        utm_medium: '',
        utm_term: '',
        utm_content: '',
        landing_url: ''
      };
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [campaignPeriod, setCampaignPeriod] = useState(0);

  useEffect(() => {
    fetchCourses();

    // If duplicate ID is present, fetch campaign data
    if (duplicateId) {
      fetchDuplicateCampaign(duplicateId);
    }
  }, [duplicateId]);

  // Update status when system settings load (if user hasn't changed it)
  useEffect(() => {
    if (!settingsLoading && !duplicateId) {
      // Only update if status is still the fallback value (user hasn't changed it)
      const defaultStatus = getDefaultCampaignStatus();
      setFormData(prev => {
        // If status is still 'waiting' (fallback) and default is different, update it
        if (prev.status === 'waiting' && defaultStatus !== 'waiting') {
          return { ...prev, status: defaultStatus };
        }
        return prev;
      });
    }
  }, [settingsLoading, getDefaultCampaignStatus, duplicateId]);

  const fetchDuplicateCampaign = async (id: string) => {
    setLoadingDuplicate(true);
    try {
      const response = await fetchWithAuth(`/api/campaigns/${id}`);
      const data = await response.json();

      if (data.success && data.campaign) {
        const campaign = data.campaign;
        // Populate form with campaign data except dates
        setFormData({
          name: campaign.name + ' (Copy)',
          utm_name: '', // Will be auto-filled from campaign name via useEffect
          course_id: campaign.course_id?.toString() || '',
          source: campaign.source || 'select',
          medium: campaign.medium || 'select',
          status: campaign.status || 'waiting',
          start_date: '', // Leave dates empty
          end_date: '', // Leave dates empty
          budget: campaign.budget?.toString() || '',
          daily_budget: '', // Will be recalculated when dates are set
          description: campaign.description || '',
          utm_campaign: campaign.utm_campaign || '',
          utm_source: campaign.utm_source || '',
          utm_medium: campaign.utm_medium || '',
          utm_term: campaign.utm_term || '',
          utm_content: campaign.utm_content || '',
          landing_url: campaign.landing_url || ''
        });
        toast.success(t('actions.dataLoaded'));
      }
    } catch (error) {
      console.error('Error fetching campaign for duplication:', error);
      toast.error(t('actions.loadFailed'));
    } finally {
      setLoadingDuplicate(false);
    }
  };

  useEffect(() => {
    // Auto-generate UTM campaign from name
    if (formData.name) {
      const cleanName = formData.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      setFormData(prev => ({
        ...prev,
        utm_campaign: cleanName
      }));
    }

    // Auto-fill UTM name from campaign name (read-only, like UTM generator)
    if (formData.name) {
      setFormData(prev => ({
        ...prev,
        utm_name: formData.name
      }));
    }

    // Auto-generate UTM source from dropdown selection
    if (formData.source && formData.source !== 'select') {
      setFormData(prev => ({
        ...prev,
        utm_source: formData.source
      }));
    }

    // Auto-generate UTM medium from dropdown selection
    if (formData.medium && formData.medium !== 'select') {
      setFormData(prev => ({
        ...prev,
        utm_medium: formData.medium
      }));
    }
  }, [formData.name, formData.source, formData.medium]);

  useEffect(() => {
    // Calculate campaign period and daily budget
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setCampaignPeriod(diffDays);

      if (formData.budget && diffDays > 0) {
        const daily = Math.floor(parseInt(formData.budget) / diffDays);
        setFormData(prev => ({
          ...prev,
          daily_budget: daily.toString()
        }));
      }
    }
  }, [formData.start_date, formData.end_date, formData.budget]);

  const fetchCourses = async () => {
    try {
      const response = await fetchWithAuth('/api/courses');
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = t('errors.nameRequired');
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
      newErrors.name = t('errors.nameInvalid');
    }

    // UTM name is auto-filled from campaign name, so no separate validation needed

    if (!formData.course_id) {
      newErrors.course_id = t('errors.courseRequired');
    }

    if (formData.source === 'select') {
      newErrors.source = t('errors.sourceRequired');
    }

    if (formData.medium === 'select') {
      newErrors.medium = t('errors.mediumRequired');
    }

    if (!formData.start_date) {
      newErrors.start_date = t('errors.startDateRequired');
    }

    if (!formData.end_date) {
      newErrors.end_date = t('errors.endDateRequired');
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = t('errors.endDateInvalid');
    }

    if (!formData.budget) {
      newErrors.budget = t('errors.budgetRequired');
    } else if (parseInt(formData.budget) <= 0) {
      newErrors.budget = t('errors.budgetInvalid');
    }

    if (!formData.landing_url) {
      newErrors.landing_url = t('errors.landingUrlRequired');
    }

    setErrors(newErrors);

    // Scroll to first error field
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0] as keyof typeof fieldRefs;
      if (fieldRefs[firstErrorField]?.current) {
        fieldRefs[firstErrorField].current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        fieldRefs[firstErrorField].current?.focus();
      }
      toast.error(t('errors.fillAllFields'));
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    toast.promise(
      (async () => {
        const response = await fetchWithAuth('/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || t('actions.createFailed'));
        }

        // Show tracking link if generated
        if (data.trackingLink) {
          const baseUrl = window.location.origin;
          const shortUrl = `${baseUrl}/t/${data.trackingLink.trackingCode}`;

          // Copy to clipboard
          const success = await copyToClipboard(shortUrl);
          if (success) {
            toast.success(
              t('actions.trackingLinkCopied', { url: shortUrl }),
              { duration: 5000 }
            );
          } else {
            toast.success(
              t('actions.trackingLinkCreated', { url: shortUrl }),
              { duration: 5000 }
            );
          }
        }

        // Redirect after short delay to show success message
        setTimeout(() => router.push('/campaigns'), 1500);
        return data;
      })(),
      {
        loading: t('actions.creating'),
        success: t('actions.success'),
        error: (err) => `${t('actions.error')}: ${err.message}`,
        finally: () => setLoading(false)
      }
    );
  };

  const selectedCourse = courses.find(c => c.id === parseInt(formData.course_id));

  if (loadingDuplicate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loadingDuplicate')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link href="/campaigns" className="flex items-center text-gray-600 hover:text-gray-900 mb-2 text-sm sm:text-base">
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{t('backToList')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {duplicateId ? t('duplicateTitle') : t('title')}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {duplicateId ? t('duplicateSubtitle') : t('subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left side - Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                {t('sections.basicInfo')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{t('sections.basicInfoDesc')}</p>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('fields.campaignName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.name}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('placeholders.campaignName')}
                    className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.name && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.name}</p>}
                  <p className="text-xs text-gray-500 mt-1">{t('hints.campaignNameChars')}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('fields.utmName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.utm_name}
                    readOnly
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('hints.utmNameAuto')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('fields.course')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={fieldRefs.course_id}
                      value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.course_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="">{t('placeholders.select')}</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                    {errors.course_id && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.course_id}</p>}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('fields.status')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="waiting">{t('status.waiting')}</option>
                      <option value="active">{t('status.active')}</option>
                      <option value="paused">{t('status.paused')}</option>
                      <option value="ended">{t('status.ended')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('fields.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('placeholders.description')}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Period & Budget */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                {t('sections.periodBudget')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{t('sections.periodBudgetDesc')}</p>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('fields.campaignPeriod')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <input
                      ref={fieldRefs.start_date}
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.start_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <input
                      ref={fieldRefs.end_date}
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.end_date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                  {(errors.start_date || errors.end_date) && (
                    <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.start_date || errors.end_date}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('fields.totalBudget')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.budget}
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder={t('placeholders.totalBudget')}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.budget ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <p className="text-xs text-gray-500 mt-1">₩</p>
                    {errors.budget && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.budget}</p>}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('fields.dailyBudget')}
                    </label>
                    <input
                      type="text"
                      value={formData.daily_budget ? `${parseInt(formData.daily_budget).toLocaleString()}` : t('hints.dailyBudgetAuto')}
                      readOnly
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">₩</p>
                  </div>
                </div>

                {campaignPeriod > 0 && (
                  <p className="text-xs sm:text-sm text-blue-600">{t('hints.budgetCalculation')}</p>
                )}
              </div>
            </div>

            {/* UTM Parameters */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                {t('sections.utmParams')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{t('sections.utmParamsDesc')}</p>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {t('fields.targetLandingUrl')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.landing_url}
                    type="url"
                    value={formData.landing_url}
                    onChange={(e) => setFormData({ ...formData, landing_url: e.target.value })}
                    placeholder={t('placeholders.landingUrl')}
                    className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.landing_url ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.landing_url && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.landing_url}</p>}
                  <p className="text-xs text-gray-500 mt-1">{t('hints.landingUrlDesc')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('fields.utmSource')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={fieldRefs.source}
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.source ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="select">{t('placeholders.selectSource')}</option>
                      <option value="google">{t('sources.google')}</option>
                      <option value="naver">{t('sources.naver')}</option>
                      <option value="kakao">{t('sources.kakao')}</option>
                      <option value="youtube">{t('sources.youtube')}</option>
                      <option value="facebook">{t('sources.facebook')}</option>
                      <option value="instagram">{t('sources.instagram')}</option>
                      <option value="saramin">{t('sources.saramin')}</option>
                      <option value="email">{t('sources.email')}</option>
                      <option value="other">{t('sources.other')}</option>
                    </select>
                    {errors.source && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.source}</p>}
                    <p className="text-xs text-gray-500 mt-1">{t('hints.utmSourceDesc')}</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('fields.utmMedium')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={fieldRefs.medium}
                      value={formData.medium}
                      onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.medium ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="select">{t('placeholders.selectMedium')}</option>
                      <option value="search">{t('mediums.search')}</option>
                      <option value="display">{t('mediums.display')}</option>
                      <option value="video">{t('mediums.video')}</option>
                      <option value="social">{t('mediums.social')}</option>
                      <option value="email">{t('mediums.email')}</option>
                      <option value="banner">{t('mediums.banner')}</option>
                      <option value="sns">{t('mediums.sns')}</option>
                      <option value="referral">{t('mediums.referral')}</option>
                      <option value="organic">{t('mediums.organic')}</option>
                    </select>
                    {errors.medium && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.medium}</p>}
                    <p className="text-xs text-gray-500 mt-1">{t('hints.utmMediumDesc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('fields.utmTerm')}</label>
                    <input
                      type="text"
                      value={formData.utm_term}
                      onChange={(e) => setFormData({ ...formData, utm_term: e.target.value })}
                      placeholder={t('placeholders.utmTerm')}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('hints.utmTermDesc')}</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">{t('fields.utmContent')}</label>
                    <input
                      type="text"
                      value={formData.utm_content}
                      onChange={(e) => setFormData({ ...formData, utm_content: e.target.value })}
                      placeholder={t('placeholders.utmContent')}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('hints.utmContentDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4">
              <Link
                href="/campaigns"
                className="w-full sm:w-auto px-5 sm:px-6 py-2 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                {t('actions.cancel')}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-5 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('actions.saving') : t('actions.save')}
              </button>
            </div>
          </div>

          {/* Right side - Campaign Summary */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 lg:sticky lg:top-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">{t('summary.title')}</h2>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.media')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.source !== 'select' ? t(`sources.${formData.source}`) : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.course')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {selectedCourse ? selectedCourse.name : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.adType')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.medium !== 'select' ? t(`mediums.${formData.medium}`) : '-'}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.startDate')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.start_date ? new Date(formData.start_date).toLocaleDateString('en-CA').replace(/-/g, '.') : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.endDate')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.end_date ? new Date(formData.end_date).toLocaleDateString('en-CA').replace(/-/g, '.') : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.campaignPeriod')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {campaignPeriod > 0 ? `${campaignPeriod} ${t('summary.days')}` : '-'}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.totalBudget')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.budget ? `${parseInt(formData.budget).toLocaleString()}₩` : '0₩'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">{t('summary.dailyBudget')}</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.daily_budget ? `${parseInt(formData.daily_budget).toLocaleString()}₩` : '0₩'}
                  </p>
                </div>
              </div>

              {/* Action Buttons - Hidden on mobile (form buttons are used instead) */}
              <div className="hidden lg:flex flex-col gap-3 pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      name: '',
                      utm_name: '',
                      course_id: '',
                      source: 'select',
                      medium: 'select',
                      status: 'waiting',
                      start_date: '',
                      end_date: '',
                      budget: '',
                      daily_budget: '',
                      description: '',
                      utm_campaign: '',
                      utm_source: '',
                      utm_medium: '',
                      utm_term: '',
                      utm_content: '',
                      landing_url: ''
                    });
                    setErrors({});
                  }}
                  className="w-full px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('actions.saving') : t('actions.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Footer with extra spacing */}
      <div className="mt-6 sm:mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <ProtectedRoute permission="campaigns:create" showAccessDeniedMessage>
      <NewCampaignPageContent />
    </ProtectedRoute>
  );
}

