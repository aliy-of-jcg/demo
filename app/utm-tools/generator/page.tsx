"use client";

import { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageFooter } from '@/components/page-footer';
import { toast } from 'sonner';

export default function UTMGeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    landing_url: '',
    utm_campaign: '',
    utm_source: '',
    utm_medium: '',
    utm_term: '',
    utm_content: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetchUTMData();
    }
  }, [editId]);

  const fetchUTMData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/utm-codes/${editId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch UTM code');
      }

      setFormData({
        name: data.utm_code.name || '',
        landing_url: data.utm_code.landing_url || '',
        utm_campaign: data.utm_code.utm_campaign || '',
        utm_source: data.utm_code.utm_source || '',
        utm_medium: data.utm_code.utm_medium || '',
        utm_term: data.utm_code.utm_term || '',
        utm_content: data.utm_code.utm_content || ''
      });
    } catch (error: any) {
      console.error('Error fetching UTM code:', error);
      toast.error(error.message || 'Failed to load UTM code');
      router.push('/utm-tools');
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = [
    { value: '', label: 'Select source' },
    { value: 'google', label: 'Google' },
    { value: 'naver', label: 'Naver' },
    { value: 'kakao', label: 'Kakao' },
    { value: 'youtube', label: 'Youtube' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'email', label: 'Email' },
    { value: 'other', label: 'Other' }
  ];

  const mediumOptions = [
    { value: '', label: 'Select medium' },
    { value: 'cpc', label: 'CPC (Cost Per Click)' },
    { value: 'display', label: 'Display' },
    { value: 'video', label: 'Video' },
    { value: 'social', label: 'Social' },
    { value: 'email', label: 'Email' },
    { value: 'banner', label: 'Banner' },
    { value: 'referral', label: 'Referral' },
    { value: 'organic', label: 'Organic' }
  ];

  const termOptions = [
    { value: '', label: 'Select term (optional)' },
    { value: 'ai-course', label: 'AI Course' },
    { value: 'python', label: 'Python' },
    { value: 'data-science', label: 'Data Science' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'leadership', label: 'Leadership' }
  ];

  const generateUTMUrl = () => {
    const { landing_url, utm_campaign, utm_source, utm_medium, utm_term, utm_content } = formData;
    
    if (!landing_url || !utm_campaign || !utm_source || !utm_medium) {
      return landing_url || 'https://example.com';
    }

    const url = new URL(landing_url);
    
    url.searchParams.set('utm_campaign', utm_campaign);
    url.searchParams.set('utm_source', utm_source);
    url.searchParams.set('utm_medium', utm_medium);
    
    if (utm_term) {
      url.searchParams.set('utm_term', utm_term);
    }
    
    if (utm_content) {
      url.searchParams.set('utm_content', utm_content);
    }

    return url.toString();
  };

  const generatedUrl = generateUTMUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      landing_url: '',
      utm_campaign: '',
      utm_source: '',
      utm_medium: '',
      utm_term: '',
      utm_content: ''
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || !formData.landing_url) {
      toast.error('UTM name and landing URL are required');
      return;
    }

    setSaving(true);

    try {
      const url = isEditMode ? `/api/utm-codes/${editId}` : `/api/utm-codes`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} UTM code`);
      }

      toast.success(`UTM code ${isEditMode ? 'updated' : 'created'} successfully!`);
      router.push('/utm-tools');
    } catch (error: any) {
      console.error('Error saving UTM code:', error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} UTM code`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading UTM code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/utm-tools"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to UTM List</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Edit UTM Code' : 'UTM Code Generator'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode ? 'Update tracking URL with UTM parameters' : 'Create tracking URLs with UTM parameters for campaign attribution'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">UTM Parameters</h2>
            
            <div className="space-y-6">
              {/* UTM Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UTM Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., 2501_ai_education_naver_search"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">A unique identifier for this UTM code</p>
              </div>

              {/* Landing URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Landing URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.landing_url}
                  onChange={(e) => handleChange('landing_url', e.target.value)}
                  placeholder="https://www.example.com/page"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">The destination URL where users will land</p>
              </div>

              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.utm_campaign}
                  onChange={(e) => handleChange('utm_campaign', e.target.value)}
                  placeholder="e.g., spring_sale_2025"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Product, promo code, or campaign name (e.g., spring_sale)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source (매체) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_source}
                    onChange={(e) => handleChange('utm_source', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {sourceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Traffic source (e.g., google, naver, kakao)</p>
                </div>

                {/* Medium */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medium (채널) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_medium}
                    onChange={(e) => handleChange('utm_medium', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {mediumOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Marketing medium (e.g., cpc, display, email)</p>
                </div>
              </div>

              {/* Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term (키워드)
                </label>
                <select
                  value={formData.utm_term}
                  onChange={(e) => handleChange('utm_term', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {termOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Identify paid search keywords (optional)</p>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content (콘텐츠)
                </label>
                <input
                  type="text"
                  value={formData.utm_content}
                  onChange={(e) => handleChange('utm_content', e.target.value)}
                  placeholder="e.g., banner_top, sidebar_ad"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Differentiate similar content or links (optional)</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <span>{isEditMode ? 'Update UTM Code' : 'Create UTM Code'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated URL</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-600 mb-2 font-medium">Full Tracking URL:</p>
              <div className="bg-white border border-gray-200 rounded p-3 break-all text-sm text-gray-700">
                {generatedUrl}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy URL</span>
                </>
              )}
            </button>

            {/* UTM Parameters Preview */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">UTM Parameters:</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Campaign:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_campaign || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Source:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_source || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Medium:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_medium || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Term:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_term || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Content:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_content || '-'}</span>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Fill in all required fields (*) to generate a complete tracking URL. The generated URL can be used in your marketing campaigns to track performance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

