"use client";

import { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageFooter } from '@/components/page-footer';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';

function UTMGeneratorPageContent() {
  const t = useTranslations('utmTools.generator');
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
      const campaignsRes = await fetchWithAuth('/api/campaigns?limit=1000');
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
      const response = await fetchWithAuth(`/api/utm-codes/${editId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('error.loadFailed'));
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
      toast.error(error.message || t('error.loadFailed'));
      router.push('/utm-tools');
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = [
    { value: '', label: t('form.selectSource') },
    { value: 'google', label: t('sourceOptions.google') },
    { value: 'naver', label: t('sourceOptions.naver') },
    { value: 'kakao', label: t('sourceOptions.kakao') },
    { value: 'youtube', label: t('sourceOptions.youtube') },
    { value: 'facebook', label: t('sourceOptions.facebook') },
    { value: 'instagram', label: t('sourceOptions.instagram') },
    { value: 'saramin', label: t('sourceOptions.saramin') },
    { value: 'email', label: t('sourceOptions.email') },
    { value: 'other', label: t('sourceOptions.other') }
  ];

  const mediumOptions = [
    { value: '', label: t('form.selectMedium') },
    { value: 'search', label: t('mediumOptions.search') },
    { value: 'display', label: t('mediumOptions.display') },
    { value: 'video', label: t('mediumOptions.video') },
    { value: 'social', label: t('mediumOptions.social') },
    { value: 'email', label: t('mediumOptions.email') },
    { value: 'banner', label: t('mediumOptions.banner') },
    { value: 'sns', label: t('mediumOptions.sns') },
    { value: 'referral', label: t('mediumOptions.referral') },
    { value: 'organic', label: t('mediumOptions.organic') }
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
    const success = await copyToClipboard(generatedUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t('copy.trackingLinkCopied'));
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
      toast.error(t('validation.selectCampaign'));
      return;
    }

    if (!formData.landing_url) {
      toast.error(t('validation.landingUrlRequired'));
      return;
    }

    // Check if source and medium are selected
    if (!formData.utm_source || !formData.utm_medium) {
      toast.error(t('validation.ensureSourceMedium'));
      return;
    }

    // Check if name is filled (should be auto-filled from campaign)
    if (!formData.name) {
      toast.error(t('validation.ensureCampaign'));
      return;
    }

    setSaving(true);

    try {
      const url = isEditMode ? `/api/utm-codes/${editId}` : `/api/utm-codes`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || (isEditMode ? t('error.updateFailed') : t('error.createFailed')));
      }

      // For new creations, store the tracking code
      if (!isEditMode && data.utm_code && data.utm_code.tracking_code) {
        setTrackingCode(data.utm_code.tracking_code);
      }

      toast.success(isEditMode ? t('success.updated') : t('success.created'));

      // Redirect after a short delay to show the success message
      setTimeout(() => {
        router.push('/utm-tools');
      }, 1000);
    } catch (error: any) {
      console.error('Error saving UTM code:', error);
      toast.error(error.message || (isEditMode ? t('error.updateFailed') : t('error.createFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">{t('loading')}</p>
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
          <span>{t('backToList')}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isEditMode ? t('editTitle') : t('title')}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {isEditMode ? t('editSubtitle') : t('subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">{t('utmParameters')}</h2>

            <div className="space-y-4 sm:space-y-6">
              {/* Link to Campaign (First - Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.linkToCampaign')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.campaign_id}
                  onChange={(e) => handleChange('campaign_id', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('form.selectCampaign')}</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('form.campaignHint')}
                </p>
              </div>

              {/* UTM Name - Auto-filled from campaign */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.utmName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  readOnly
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">{t('form.utmNameHint')}</p>
              </div>

              {/* Landing URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.targetLandingUrl')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.landing_url}
                  onChange={(e) => handleChange('landing_url', e.target.value)}
                  placeholder={t('form.landingUrlPlaceholder')}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{t('form.landingUrlHint')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* UTM Source - Left side */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.utmSource')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_source}
                    onChange={(e) => handleChange('utm_source', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {sourceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('form.sourceHint')}</p>
                </div>

                {/* UTM Medium - Right side */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.utmMedium')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_medium}
                    onChange={(e) => handleChange('utm_medium', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {mediumOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('form.mediumHint')}</p>
                </div>
              </div>

              {/* Term & Content - Side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.utmTerm')}
                  </label>
                  <input
                    type="text"
                    value={formData.utm_term}
                    onChange={(e) => handleChange('utm_term', e.target.value)}
                    placeholder={t('form.termPlaceholder')}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('form.termHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.utmContent')}
                  </label>
                  <input
                    type="text"
                    value={formData.utm_content}
                    onChange={(e) => handleChange('utm_content', e.target.value)}
                    placeholder={t('form.contentPlaceholder')}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('form.contentHint')}</p>
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
                  <span>{t('actions.reset')}</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isEditMode ? t('actions.updating') : t('actions.creating')}</span>
                    </>
                  ) : (
                    <span>{isEditMode ? t('actions.update') : t('actions.create')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-8">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('generatedUrl')}</h2>

            {/* Tracking Code Display (for edit mode) */}
            {trackingCode && (
              <div className="mb-3 sm:mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-1">{t('preview.trackingCode')}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs sm:text-sm text-blue-700 font-mono break-all">/t/{trackingCode}</code>
                  <button
                    onClick={async () => {
                      const success = await copyToClipboard(`${window.location.origin}/t/${trackingCode}`);
                      if (success) {
                        toast.success(t('copy.trackingLinkCopied'));
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <p className="text-xs text-gray-600 mb-2 font-medium">{t('preview.fullTrackingUrl')}</p>
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
                  <span>{t('preview.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t('preview.copyUrl')}</span>
                </>
              )}
            </button>

            {/* UTM Parameters Preview */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">{t('preview.utmParameters')}</h3>
              <div className="space-y-2">
                {formData.campaign_id && (
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-gray-600">{t('preview.campaign')}</span>
                    <span className="text-gray-900 font-medium truncate ml-2">
                      {campaigns.find(c => c.id.toString() === formData.campaign_id)?.name || '-'}
                    </span>
                  </div>
                )}
                {formData.name && (
                  <div className="flex justify-between text-xs gap-2">
                    <span className="text-gray-600">{t('preview.name')}</span>
                    <span className="text-gray-900 font-medium truncate ml-2">{formData.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">{t('preview.utmCampaign')}</span>
                  <span className="text-gray-900 font-medium truncate">
                    {formData.campaign_id
                      ? campaigns.find(c => c.id.toString() === formData.campaign_id)?.name || '-'
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">{t('preview.utmSource')}</span>
                  <span className="text-gray-900 font-medium">{formData.utm_source || '-'}</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">{t('preview.utmMedium')}</span>
                  <span className="text-gray-900 font-medium">{formData.utm_medium || '-'}</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">{t('preview.utmTerm')}</span>
                  <span className="text-gray-900 font-medium">{formData.utm_term || '-'}</span>
                </div>
                <div className="flex justify-between text-xs gap-2">
                  <span className="text-gray-600">{t('preview.utmContent')}</span>
                  <span className="text-gray-900 font-medium truncate">{formData.utm_content || '-'}</span>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> {t('preview.tip', { action: isEditMode ? t('preview.tipEdit') : t('preview.tipCreate') })}
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

export default function UTMGeneratorPage() {
  return (
    <ProtectedRoute permission="utm_codes:create" showAccessDeniedMessage>
      <UTMGeneratorPageContent />
    </ProtectedRoute>
  );
}

