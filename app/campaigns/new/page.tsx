"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageFooter } from '@/components/page-footer';
import { copyToClipboard } from '@/lib/clipboard';

interface Course {
  id: number;
  name: string;
  code: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  
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
  
  const [formData, setFormData] = useState({
    name: '',
    utm_name: '',  // Added: Name for the tracking link/UTM code
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [campaignPeriod, setCampaignPeriod] = useState(0);

  useEffect(() => {
    fetchCourses();
    
    // If duplicate ID is present, fetch campaign data
    if (duplicateId) {
      fetchDuplicateCampaign(duplicateId);
    }
  }, [duplicateId]);

  const fetchDuplicateCampaign = async (id: string) => {
    setLoadingDuplicate(true);
    try {
      const response = await fetch(`/api/campaigns/${id}`);
      const data = await response.json();
      
      if (data.success && data.campaign) {
        const campaign = data.campaign;
        // Populate form with campaign data except dates
        setFormData({
          name: campaign.name + ' (Copy)',
          utm_name: '', // Leave empty for user to set
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
        toast.success('Campaign data loaded for duplication');
      }
    } catch (error) {
      console.error('Error fetching campaign for duplication:', error);
      toast.error('Failed to load campaign data');
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
      const response = await fetch('/api/courses');
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
      newErrors.name = 'Campaign name is required';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
      newErrors.name = 'Only letters, numbers, and underscores are allowed';
    }

    // UTM name is optional - will be auto-generated if not provided
    if (formData.utm_name && !/^[a-zA-Z0-9_]+$/.test(formData.utm_name)) {
      newErrors.utm_name = 'Only letters, numbers, and underscores are allowed';
    }

    if (!formData.course_id) {
      newErrors.course_id = 'Please select a course';
    }

    if (formData.source === 'select') {
      newErrors.source = 'Please select a UTM source';
    }

    if (formData.medium === 'select') {
      newErrors.medium = 'Please select a UTM medium';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Please select a start date';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'Please select an end date';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (!formData.budget) {
      newErrors.budget = 'Please enter total budget';
    } else if (parseInt(formData.budget) <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }

    if (!formData.landing_url) {
      newErrors.landing_url = 'Target landing URL is required';
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
      toast.error('Please fill in all required fields correctly');
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
        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create campaign');
        }

        // Show tracking link if generated
        if (data.trackingLink) {
          const baseUrl = window.location.origin;
          const shortUrl = `${baseUrl}/t/${data.trackingLink.trackingCode}`;
          
          // Copy to clipboard
          const success = await copyToClipboard(shortUrl);
          if (success) {
            toast.success(
              `Tracking link copied: ${shortUrl}`,
              { duration: 5000 }
            );
          } else {
            toast.success(
              `Tracking link created: ${shortUrl}`,
              { duration: 5000 }
            );
          }
        }

        // Redirect after short delay to show success message
        setTimeout(() => router.push('/campaigns'), 1500);
        return data;
      })(),
      {
        loading: 'Creating campaign...',
        success: 'Campaign created successfully!',
        error: (err) => `Error: ${err.message}`,
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
          <p className="mt-4 text-gray-600">Loading campaign data for duplication...</p>
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
          <span>Back to List</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {duplicateId ? 'Duplicate Campaign' : 'Create New Campaign'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {duplicateId ? 'Review and update the campaign details below' : 'Please register a new campaign'}
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
                Basic Information
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Enter the basic information for the campaign</p>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.name}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g: 2501_ai_education"
                    className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.name && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.name}</p>}
                  <p className="text-xs text-gray-500 mt-1">Only letters, numbers, and underscores allowed</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    UTM Tracking Link Name
                  </label>
                  <input
                    type="text"
                    value={formData.utm_name}
                    onChange={(e) => setFormData({ ...formData, utm_name: e.target.value })}
                    placeholder="e.g: 2501_ai_education_naver_search"
                    className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.utm_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.utm_name && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.utm_name}</p>}
                  <p className="text-xs text-gray-500 mt-1">Unique identifier for the tracking link (will be auto-generated if left empty)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={fieldRefs.course_id}
                      value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.course_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="">Select</option>
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
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="waiting">Waiting</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="ended">Ended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter a brief description of the campaign"
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
                Period & Budget
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Set the campaign period and budget</p>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Campaign Period <span className="text-red-500">*</span>
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
                      Total Budget <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.budget}
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="5000000"
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.budget ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <p className="text-xs text-gray-500 mt-1">₩</p>
                    {errors.budget && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.budget}</p>}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Daily Budget (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.daily_budget ? `${parseInt(formData.daily_budget).toLocaleString()}` : 'Auto-calculated'}
                      readOnly
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">₩</p>
                  </div>
                </div>

                {campaignPeriod > 0 && (
                  <p className="text-xs sm:text-sm text-blue-600">Total Budget ÷ Campaign Days</p>
                )}
              </div>
            </div>

            {/* UTM Parameters */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                UTM Parameters
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Configure UTM tracking parameters for this campaign</p>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Target Landing URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.landing_url}
                    type="url"
                    value={formData.landing_url}
                    onChange={(e) => setFormData({ ...formData, landing_url: e.target.value })}
                    placeholder="https://www.example.com/page"
                    className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.landing_url ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {errors.landing_url && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.landing_url}</p>}
                  <p className="text-xs text-gray-500 mt-1">The destination URL where users will land</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      UTM Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={fieldRefs.source}
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.source ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="select">Select source</option>
                      <option value="google">Google</option>
                      <option value="naver">Naver</option>
                      <option value="kakao">Kakao</option>
                      <option value="youtube">Youtube</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="saramin">Saramin</option>
                      <option value="email">Email</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.source && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.source}</p>}
                    <p className="text-xs text-gray-500 mt-1">Platform where the ad will run (e.g., Google, Naver, Kakao)</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      UTM Medium <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={fieldRefs.medium}
                      value={formData.medium}
                      onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                      className={`w-full px-3 sm:px-4 py-2 text-sm border ${errors.medium ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    >
                      <option value="select">Select medium</option>
                      <option value="search">Search</option>
                      <option value="display">Display</option>
                      <option value="video">Video</option>
                      <option value="social">Social</option>
                      <option value="email">Email</option>
                      <option value="banner">Banner</option>
                      <option value="sns">SNS</option>
                      <option value="referral">Referral</option>
                      <option value="organic">Organic</option>
                    </select>
                    {errors.medium && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.medium}</p>}
                    <p className="text-xs text-gray-500 mt-1">Ad format type (e.g., Search, Banner, Video, SNS)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">UTM Term</label>
                    <input
                      type="text"
                      value={formData.utm_term}
                      onChange={(e) => setFormData({ ...formData, utm_term: e.target.value })}
                      placeholder="e.g., running+shoes"
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Identify paid search keywords (optional)</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">UTM Content</label>
                    <input
                      type="text"
                      value={formData.utm_content}
                      onChange={(e) => setFormData({ ...formData, utm_content: e.target.value })}
                      placeholder="e.g., banner_top, sidebar_ad"
                      className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Differentiate similar content or links (optional)</p>
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
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-5 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Right side - Campaign Summary */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 lg:sticky lg:top-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Campaign Summary</h2>
              
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Media</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.source !== 'select' ? formData.source.charAt(0).toUpperCase() + formData.source.slice(1) : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Course</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {selectedCourse ? selectedCourse.name : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Ad Type</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.medium !== 'select' ? formData.medium.charAt(0).toUpperCase() + formData.medium.slice(1) : '-'}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <p className="text-xs sm:text-sm text-gray-600">Start Date</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.start_date ? new Date(formData.start_date).toLocaleDateString('en-CA').replace(/-/g, '.') : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">End Date</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.end_date ? new Date(formData.end_date).toLocaleDateString('en-CA').replace(/-/g, '.') : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Campaign Period</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {campaignPeriod > 0 ? `${campaignPeriod} days` : '-'}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <p className="text-xs sm:text-sm text-gray-600">Total Budget</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900 mt-1">
                    {formData.budget ? `${parseInt(formData.budget).toLocaleString()}₩` : '0₩'}
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Daily Budget</p>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
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

