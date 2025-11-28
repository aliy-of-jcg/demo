"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

interface Course {
  id: number;
  name: string;
  code: string;
}

interface Campaign {
  id: number;
  name: string;
  course_id: number;
  source: string;
  medium: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  description: string;
  daily_budget: number;
}

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCampaign, setFetchingCampaign] = useState(true);

  // Refs for scrolling to error fields
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    course_id: useRef<HTMLSelectElement>(null),
    source: useRef<HTMLSelectElement>(null),
    medium: useRef<HTMLSelectElement>(null),
    start_date: useRef<HTMLInputElement>(null),
    end_date: useRef<HTMLInputElement>(null),
    budget: useRef<HTMLInputElement>(null)
  };

  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    source: 'select',
    medium: 'select',
    status: 'waiting',
    start_date: '',
    end_date: '',
    budget: '',
    daily_budget: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [campaignPeriod, setCampaignPeriod] = useState(0);

  useEffect(() => {
    fetchCourses();
    fetchCampaign();
  }, []);

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

  const fetchCampaign = async () => {
    try {
      setFetchingCampaign(true);
      const response = await fetchWithAuth(`/api/campaigns/${campaignId}`);
      const data = await response.json();

      if (data.success && data.campaign) {
        const campaign = data.campaign;
        setFormData({
          name: campaign.name || '',
          course_id: campaign.course_id?.toString() || '',
          source: campaign.source || 'select',
          medium: campaign.medium || 'select',
          status: campaign.status || 'waiting',
          start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
          end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
          budget: campaign.budget?.toString() || '',
          daily_budget: campaign.daily_budget?.toString() || '',
          description: campaign.description || ''
        });
      } else {
        toast.error('Campaign not found');
        router.push('/campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
      router.push('/campaigns');
    } finally {
      setFetchingCampaign(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = 'Campaign name is required';
    }

    if (!formData.course_id) {
      newErrors.course_id = 'Please select a course';
    }

    if (formData.source === 'select') {
      newErrors.source = 'Please select a media source';
    }

    if (formData.medium === 'select') {
      newErrors.medium = 'Please select an ad type';
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

    const updatePromise = (async () => {
      try {
        const response = await fetchWithAuth(`/api/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update campaign');
        }

        // Redirect after short delay to show success message
        setTimeout(() => {
          router.push('/campaigns');
        }, 1000);

        return data;
      } finally {
        setLoading(false);
      }
    })();

    toast.promise(
      updatePromise,
      {
        loading: 'Updating campaign...',
        success: 'Campaign updated successfully!',
        error: (err) => err.message || 'Failed to update campaign',
      }
    );
  };

  const selectedCourse = courses.find(c => c.id === parseInt(formData.course_id));

  if (fetchingCampaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Campaign List
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
        <p className="text-gray-600 mt-2">Update campaign information</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.name}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter campaign name (letters, numbers, underscores only)"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={fieldRefs.course_id}
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.course_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                  {errors.course_id && <p className="text-red-500 text-sm mt-1">{errors.course_id}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="waiting">Waiting</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter campaign description"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Media & Ad Type */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Media & Ad Type</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Media <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={fieldRefs.source}
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.source ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="select">Select media</option>
                    <option value="naver">Naver</option>
                    <option value="kakao">Kakao</option>
                    <option value="google">Google</option>
                    <option value="youtube">YouTube</option>
                    <option value="saramin">Saramin</option>
                  </select>
                  {errors.source && <p className="text-red-500 text-sm mt-1">{errors.source}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={fieldRefs.medium}
                    value={formData.medium}
                    onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.medium ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="select">Select ad type</option>
                    <option value="search">Search</option>
                    <option value="banner">Banner</option>
                    <option value="sns">SNS</option>
                    <option value="video">Video</option>
                  </select>
                  {errors.medium && <p className="text-red-500 text-sm mt-1">{errors.medium}</p>}
                </div>
              </div>
            </div>

            {/* Period & Budget */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Period & Budget</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.start_date}
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.start_date ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.end_date}
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.end_date ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Budget (₩) <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.budget}
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="Enter total budget"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.budget ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.budget && <p className="text-red-500 text-sm mt-1">{errors.budget}</p>}
                  {formData.budget && (
                    <p className="text-sm text-gray-600 mt-1">
                      Daily budget: ₩{formData.daily_budget ? parseInt(formData.daily_budget).toLocaleString() : '0'}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Campaign Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Summary</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Media</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formData.source !== 'select' ? formData.source.charAt(0).toUpperCase() + formData.source.slice(1) : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Course</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {selectedCourse ? selectedCourse.name : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Ad Type</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formData.medium !== 'select' ? formData.medium.charAt(0).toUpperCase() + formData.medium.slice(1) : '-'}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formData.start_date ? new Date(formData.start_date).toLocaleDateString('en-CA').replace(/-/g, '.') : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formData.end_date ? new Date(formData.end_date).toLocaleDateString('en-CA').replace(/-/g, '.') : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Campaign Period</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {campaignPeriod > 0 ? `${campaignPeriod} days` : '-'}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formData.budget ? `${parseInt(formData.budget).toLocaleString()}₩` : '0₩'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Daily Budget</p>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {formData.daily_budget ? `${parseInt(formData.daily_budget).toLocaleString()}₩` : '0₩'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/campaigns')}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

