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
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string; source: string; medium: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    landing_url: '',
    utm_source: '',
    utm_medium: '',
    utm_term: '',
    utm_content: '',
    campaign_id: ''
  });

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

  // Auto-fill only UTM name when campaign is selected (NOT source/medium)
  useEffect(() => {
    if (formData.campaign_id && !isEditMode) {
      const selectedCampaign = campaigns.find(c => c.id.toString() === formData.campaign_id);
      if (selectedCampaign) {
        setFormData(prev => ({
          ...prev,
          name: selectedCampaign.name
          // Do NOT auto-fill utm_source and utm_medium
          // Users need to select different platforms for each UTM code
        }));
      }
    }
  }, [formData.campaign_id, campaigns, isEditMode]);

  useEffect(() => {
    fetchCampaigns();
    if (isEditMode) {
      fetchUTMData();
    }
  }, [editId]);

  const fetchCampaigns = async () => {
    try {
      // Fetch campaigns with source and medium
      const campaignsRes = await fetch('/api/campaigns?limit=1000');
      const campaignsData = await campaignsRes.json();
      if (campaignsData.success && campaignsData.campaigns) {
        setCampaigns(campaignsData.campaigns.map((c: any) => ({ 
          id: c.id, 
          name: c.name,
          source: c.source || '',
          medium: c.medium || ''
        })));
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

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
        utm_source: data.utm_code.utm_source || '',
        utm_medium: data.utm_code.utm_medium || '',
        utm_term: data.utm_code.utm_term || '',
        utm_content: data.utm_code.utm_content || '',
        campaign_id: data.utm_code.campaign_id?.toString() || ''
      });
      setTrackingCode(data.utm_code.tracking_code || null);
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
    { value: 'saramin', label: 'Saramin' },
    { value: 'email', label: 'Email' },
    { value: 'other', label: 'Other' }
  ];

  const mediumOptions = [
    { value: '', label: 'Select medium' },
    { value: 'search', label: 'Search' },
    { value: 'display', label: 'Display' },
    { value: 'video', label: 'Video' },
    { value: 'social', label: 'Social' },
    { value: 'email', label: 'Email' },
    { value: 'banner', label: 'Banner' },
    { value: 'sns', label: 'SNS' },
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
    const { landing_url, utm_source, utm_medium, utm_term, utm_content } = formData;
    
    // Get campaign name from selected campaign
    const selectedCampaign = campaigns.find(c => c.id.toString() === formData.campaign_id);
    const utm_campaign = selectedCampaign ? selectedCampaign.name : '';
    
    // Return early if required fields are missing
    if (!landing_url || !utm_campaign || !utm_source || !utm_medium) {
      return landing_url || 'https://example.com';
    }

    // Validate URL format before creating URL object
    try {
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
    } catch (error) {
      // If URL is invalid, return the raw landing_url
      console.warn('Invalid URL format:', landing_url);
      return landing_url;
    }
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
      name: '',
      landing_url: '',
      utm_source: '',
      utm_medium: '',
      utm_term: '',
      utm_content: '',
      campaign_id: ''
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.campaign_id) {
      toast.error('Please select a campaign first');
      return;
    }

    if (!formData.landing_url) {
      toast.error('Target landing URL is required');
      return;
    }

    // These should be auto-filled, but double-check
    if (!formData.name || !formData.utm_source || !formData.utm_medium) {
      toast.error('Please ensure a campaign is selected');
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

      // For new creations, store the tracking code
      if (!isEditMode && data.utm_code && data.utm_code.tracking_code) {
        setTrackingCode(data.utm_code.tracking_code);
      }

      toast.success(`UTM code ${isEditMode ? 'updated' : 'created'} successfully!`);
      
      // Redirect after a short delay to show the success message
      setTimeout(() => {
        router.push('/utm-tools');
      }, 1000);
    } catch (error: any) {
      console.error('Error saving UTM code:', error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} UTM code`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading UTM code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link 
          href="/utm-tools"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 sm:mb-4 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to UTM List</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isEditMode ? 'Edit UTM Code' : 'UTM Code Generator'}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {isEditMode ? 'Update tracking URL with UTM parameters' : 'Create tracking URLs with UTM parameters for campaign attribution'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">UTM Parameters</h2>
            
            <div className="space-y-4 sm:space-y-6">
              {/* Link to Campaign (First - Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Campaign <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.campaign_id}
                  onChange={(e) => handleChange('campaign_id', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select Campaign --</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a campaign - UTM parameters will be auto-filled
                </p>
              </div>

              {/* UTM Name - Auto-filled from campaign */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UTM Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  readOnly
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from selected campaign</p>
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
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">The destination URL where users will land</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* UTM Source - Left side */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Source <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_source}
                    onChange={(e) => handleChange('utm_source', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select source</option>
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
                  <p className="text-xs text-gray-500 mt-1">Platform where the ad will run (e.g., Google, Naver, Kakao)</p>
                </div>

                {/* UTM Medium - Right side */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Medium <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_medium}
                    onChange={(e) => handleChange('utm_medium', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select medium</option>
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
                  <p className="text-xs text-gray-500 mt-1">Ad format type (e.g., Search, Banner, Video, SNS)</p>
                </div>
              </div>

              {/* Term & Content - Side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Term
                  </label>
                  <input
                    type="text"
                    value={formData.utm_term}
                    onChange={(e) => handleChange('utm_term', e.target.value)}
                    placeholder="e.g., running+shoes"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Identify paid search keywords (optional)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Content
                  </label>
                  <input
                    type="text"
                    value={formData.utm_content}
                    onChange={(e) => handleChange('utm_content', e.target.value)}
                    placeholder="e.g., banner_top, sidebar_ad"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Differentiate similar content or links (optional)</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pt-4">
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-8">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Generated URL</h2>
            
            {/* Tracking Code Display (for edit mode) */}
            {trackingCode && (
              <div className="mb-3 sm:mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-1">Tracking Code</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs sm:text-sm text-blue-700 font-mono break-all">/t/{trackingCode}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/t/${trackingCode}`);
                      toast.success('Tracking link copied!');
                    }}
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <p className="text-xs text-gray-600 mb-2 font-medium">Full Tracking URL:</p>
              <div className="bg-white border border-gray-200 rounded p-2 sm:p-3 break-all text-xs sm:text-sm text-gray-700 max-h-32 sm:max-h-40 overflow-y-auto">
                {generatedUrl}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">UTM Parameters:</h3>
              <div className="space-y-2">
                {formData.campaign_id && (
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-gray-600">Campaign:</span>
                    <span className="text-gray-900 font-medium truncate ml-2">
                      {campaigns.find(c => c.id.toString() === formData.campaign_id)?.name || '-'}
                    </span>
                  </div>
                )}
                {formData.name && (
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-gray-600">Name:</span>
                    <span className="text-gray-900 font-medium truncate ml-2">{formData.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">UTM Campaign:</span>
                  <span className="text-gray-900 font-medium truncate">
                    {formData.campaign_id 
                      ? campaigns.find(c => c.id.toString() === formData.campaign_id)?.name || '-'
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">UTM Source:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_source || '-'}</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">UTM Medium:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_medium || '-'}</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">UTM Term:</span>
                  <span className="text-gray-900 font-medium">{formData.utm_term || '-'}</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">UTM Content:</span>
                  <span className="text-gray-900 font-medium truncate">{formData.utm_content || '-'}</span>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Fill in all required fields (*) to generate a complete tracking URL. 
                {isEditMode 
                  ? ' Click "Update UTM Code" to save your changes.' 
                  : ' Click "Create UTM Code" to save and generate a tracking link.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 sm:mt-8">
        <PageFooter />
      </div>
    </div>
  );
}

