"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit, Calendar, DollarSign, TrendingUp, Link as LinkIcon, Plus, Copy, Check, ExternalLink, Trash2, AlertTriangle, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageFooter } from '@/components/page-footer';
import { copyToClipboard } from '@/lib/clipboard';
import { useTranslations } from 'next-intl';
import { usePermission } from '@/lib/hooks/usePermission';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { fetchWithAuth } from '@/lib/utils/fetch-with-auth';
import { formatDateDDMMYY } from '@/lib/utils/date-formatter';
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

interface Campaign {
  id: number;
  name: string;
  course_id: number;
  course_name: string;
  course_code: string;
  source: string;
  medium: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  description: string;
  created_at: string;
  clicks?: number;
  visitors?: number;
  ctr?: string;
  conversion_rate?: string;
  hasLegacyData?: boolean;
  activeTrackingLinksCount?: number;
  clicksFromLegacyData?: number;
}

interface TrackingLink {
  id: number;
  name: string;
  tracking_code: string;
  utm_campaign: string;
  utm_source: string;
  utm_medium: string;
  utm_term: string;
  utm_content: string;
  landing_url: string;
  full_url: string;
  clicks: number;
  budget: number | null;
  spent: number;
  auto_pause_on_budget: boolean;
  status: string;
  created_at: string;
  landingPageTracked?: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  waiting: 'bg-gray-100 text-gray-800',
  ended: 'bg-gray-200 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-800'
};

// Status labels will use translations

export default function CampaignDetailsPage() {
  const t = useTranslations('campaigns');
  const tUtm = useTranslations('utmTools.generator'); // For source/medium options to match UTM generator
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { hasPermission } = usePermission();

  // Check permissions
  const canUpdateCampaign = hasPermission('campaigns:update');
  const canCreateUtm = hasPermission('utm_codes:create');
  const canUpdateUtm = hasPermission('utm_codes:update');
  const canDeleteUtm = hasPermission('utm_codes:delete');

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<number | null>(null);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [toggleDialogData, setToggleDialogData] = useState<{ id: number, currentStatus: string, name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    landing_url: '',
    budget: '',
    auto_pause_on_budget: false,
    auto_update_campaign_budget: true
  });

  useEffect(() => {
    fetchCampaignDetails();
    fetchTrackingLinks();
  }, [campaignId]);

  // Auto-fill UTM name from campaign name when campaign is loaded (like UTM generator)
  useEffect(() => {
    if (campaign?.name) {
      setFormData(prev => ({
        ...prev,
        name: campaign.name
      }));
    }
  }, [campaign?.name]);

  const fetchCampaignDetails = async () => {
    try {
      const response = await fetchWithAuth(`/api/campaigns/${campaignId}`);
      const data = await response.json();

      if (data.success) {
        setCampaign(data.campaign);
      } else {
        toast.error(t('detail.toast.campaignNotFound'));
        router.push('/campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error(t('detail.toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingLinks = async () => {
    try {
      const response = await fetchWithAuth(`/api/campaigns/${campaignId}/tracking-links`);
      const data = await response.json();

      if (data.success) {
        setTrackingLinks(data.links);
      }
    } catch (error) {
      console.error('Error fetching tracking links:', error);
    }
  };

  const handleCopyTrackingLink = async (trackingCode: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/t/${trackingCode}`;

    const success = await copyToClipboard(shortUrl);
    if (success) {
      setCopiedCode(trackingCode);
      toast.success(t('detail.toast.linkCopied'));
      setTimeout(() => setCopiedCode(null), 2000);
    } else {
      toast.error(t('detail.toast.copyFailed'));
    }
  };

  const handleOpenTrackingLink = (trackingCode: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/t/${trackingCode}`;
    window.open(shortUrl, '_blank');
  };

  const handleAddTrackingLink = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check permission before proceeding
    if (!canCreateUtm) {
      toast.error(t('detail.toast.noPermission') || 'You do not have permission to create tracking links');
      return;
    }

    // Validate required fields (name and utm_campaign are auto-filled from campaign)
    if (!campaign?.name) {
      toast.error(t('detail.toast.campaignNotFound') || 'Campaign not found');
      return;
    }
    if (!formData.utm_source || !formData.utm_medium || !formData.landing_url) {
      toast.error(t('detail.toast.fillRequired'));
      return;
    }

    toast.promise(
      (async () => {
        const response = await fetchWithAuth(`/api/campaigns/${campaignId}/tracking-links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            budget: formData.budget ? parseFloat(formData.budget) : null
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          if (data.duplicate) {
            throw new Error(t('detail.toast.duplicateLink'));
          }
          throw new Error(data.error || t('detail.toast.createFailed'));
        }

        // Show additional info if campaign budget was updated
        if (data.campaignBudgetUpdated) {
          toast.success(t('detail.toast.budgetUpdated', { amount: data.newCampaignBudget }), { duration: 5000 });
        }

        setShowAddLinkModal(false);
        setFormData({
          name: '',
          utm_source: '',
          utm_medium: '',
          utm_campaign: '',
          utm_term: '',
          utm_content: '',
          landing_url: '',
          budget: '',
          auto_pause_on_budget: false,
          auto_update_campaign_budget: true
        });
        await fetchTrackingLinks();
        await fetchCampaignDetails(); // Refresh campaign to show updated budget
        return data;
      })(),
      {
        loading: t('detail.toast.creating'),
        success: t('detail.toast.created'),
        error: (err) => err.message
      }
    );
  };

  const handleDeleteTrackingLink = async (id: number) => {
    setLinkToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (linkToDelete === null) return;

    setShowDeleteDialog(false);

    toast.promise(
      (async () => {
        // Hard delete - actually remove from database
        const response = await fetchWithAuth(`/api/utm-codes/${linkToDelete}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete tracking link');
        }

        await fetchTrackingLinks();
        return data;
      })(),
      {
        loading: t('detail.toast.deleting'),
        success: t('detail.toast.deleted'),
        error: (err) => err.message || t('detail.toast.deleteFailed')
      }
    );
  };

  const handleToggleStatus = async (id: number, currentStatus: string, name: string) => {
    setToggleDialogData({ id, currentStatus, name });
    setShowToggleDialog(true);
  };

  const handleToggleConfirm = async () => {
    if (!toggleDialogData) return;

    const { id, currentStatus, name } = toggleDialogData;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    setShowToggleDialog(false);

    toast.promise(
      (async () => {
        const response = await fetchWithAuth(`/api/utm-codes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || t('detail.toast.updateFailed'));
        }

        await fetchTrackingLinks();
        setToggleDialogData(null);
        return data;
      })(),
      {
        loading: toggleDialogData!.currentStatus === 'active' ? t('detail.toast.deactivating') : t('detail.toast.activating'),
        success: toggleDialogData!.currentStatus === 'active' ? t('detail.toast.deactivated') : t('detail.toast.activated'),
        error: (err) => err.message
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('detail.loading')}</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('detail.toast.campaignNotFound')}</p>
        </div>
      </div>
    );
  }

  const campaignDays = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/campaigns" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
          <ChevronLeft className="w-5 h-5" />
          <span>{t('detail.backToCampaigns')}</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">{t('detail.subtitle')}</p>
          </div>
          <ProtectedComponent permission="campaigns:update" hideOnUnauthorized>
            <Link
              href={`/campaigns/${campaign.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span>{t('detail.editCampaign')}</span>
            </Link>
          </ProtectedComponent>
        </div>
      </div>

      {/* Campaign Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[campaign.status]}`}>
              {t(`status.${campaign.status}`)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">{t('detail.campaignPeriod')}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{campaignDays} {t('detail.days')}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatDateDDMMYY(campaign.start_date)} - {formatDateDDMMYY(campaign.end_date)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600">{t('detail.totalBudget')}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">₩{campaign.budget.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {t('detail.daily')}: ₩{Math.floor(campaign.budget / campaignDays).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600">{t('detail.budgetSpent')}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">₩{campaign.spent.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((campaign.spent / campaign.budget) * 100).toFixed(2)}{t('detail.percentUsed')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <LinkIcon className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600">{t('detail.trackingLinks')}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{trackingLinks.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {trackingLinks.filter(l => l.status === 'active').length} {t('detail.active')}
          </p>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('detail.campaignInformation')}</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.course')}</p>
              <p className="text-base text-gray-900 mt-1">{campaign.course_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.courseCode')}</p>
              <p className="text-base text-gray-900 mt-1">{campaign.course_code || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.mediaSources')}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {trackingLinks.length > 0 ? (
                  Array.from(new Set(trackingLinks.map(link => link.utm_source))).map((source, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                      {source}
                    </span>
                  ))
                ) : (
                  <span className="text-base text-gray-900 capitalize">{campaign.source}</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.adTypes')}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {trackingLinks.length > 0 ? (
                  Array.from(new Set(trackingLinks.map(link => link.utm_medium))).map((medium, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 capitalize">
                      {medium}
                    </span>
                  ))
                ) : (
                  <span className="text-base text-gray-900 capitalize">{campaign.medium}</span>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-600">{t('detail.description')}</p>
              <p className="text-base text-gray-900 mt-1">{campaign.description || t('detail.noDescription')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.createdAt')}</p>
              <p className="text-base text-gray-900 mt-1">
                {formatDateDDMMYY(campaign.created_at)} {new Date(campaign.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('detail.performance')}</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.totalClicks')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(campaign?.clicks ?? 0).toLocaleString()}
              </p>
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                {campaign?.hasLegacyData ? (
                  <>
                    <div>
                      {t('detail.fromActiveLinks', {
                        count: campaign?.activeTrackingLinksCount || trackingLinks.length,
                        plural: (campaign?.activeTrackingLinksCount || trackingLinks.length) !== 1 ? 's' : ''
                      })}
                    </div>
                    {campaign?.clicksFromLegacyData && campaign.clicksFromLegacyData > 0 ? (
                      <div className="text-amber-600 font-medium flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{t('detail.fromDeletedLinks', {
                          count: campaign.clicksFromLegacyData.toLocaleString(),
                          plural: campaign.clicksFromLegacyData !== 1 ? 's' : ''
                        })}</span>
                      </div>
                    ) : (
                      <div className="text-amber-600 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{t('detail.includesDeletedData')}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    {t('detail.fromLinks', {
                      count: campaign?.activeTrackingLinksCount || trackingLinks.length,
                      plural: (campaign?.activeTrackingLinksCount || trackingLinks.length) !== 1 ? 's' : ''
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.uniqueVisitors')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(campaign?.visitors ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {campaign?.clicks && campaign.visitors
                  ? t('detail.percentOfClicks', { percent: ((campaign.visitors / campaign.clicks) * 100).toFixed(1) })
                  : t('noDataYet')
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('detail.budgetUsed')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {((campaign.spent / campaign.budget) * 100).toFixed(2)}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Links Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('detail.trackingLinks')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('detail.manageLinks')}</p>
          </div>
          <ProtectedComponent permission="utm_codes:create" hideOnUnauthorized>
            <button
              onClick={() => {
                // Auto-fill with campaign's source, medium, and landing URL
                const firstLink = trackingLinks[0];
                setFormData({
                  name: campaign?.name || '', // Auto-filled from campaign (not editable)
                  utm_source: campaign?.source || '',
                  utm_medium: campaign?.medium || '',
                  utm_campaign: campaign?.name || '', // Auto-filled from campaign (not editable)
                  utm_term: '',
                  utm_content: '',
                  landing_url: firstLink?.landing_url || '',
                  budget: '',
                  auto_pause_on_budget: false,
                  auto_update_campaign_budget: true
                });
                setShowAddLinkModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('detail.addTrackingLink')}</span>
            </button>
          </ProtectedComponent>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.shortUrl')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.mediaAdType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.landingUrl')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.budgetSpent')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.clicks')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('detail.tableHeaders.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trackingLinks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {t('detail.noLinksYet')}
                  </td>
                </tr>
              ) : (
                trackingLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{link.name}</div>
                          <div className="text-xs text-gray-500">{link.utm_campaign}</div>
                        </div>
                        {link.landingPageTracked === false && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded border border-yellow-300 whitespace-nowrap"
                            title={t('warning.landingPageNotTracked')}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {t('warning.notTracked')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          /t/{link.tracking_code}
                        </code>
                        <button
                          onClick={() => handleCopyTrackingLink(link.tracking_code)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title={t('detail.copyLink')}
                        >
                          {copiedCode === link.tracking_code ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenTrackingLink(link.tracking_code)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title={t('detail.testRedirect')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{link.utm_source} / {link.utm_medium}</div>
                      {(link.utm_term || link.utm_content) && (
                        <div className="text-xs text-gray-500">
                          {link.utm_term && `${t('detail.term')}: ${link.utm_term}`}
                          {link.utm_term && link.utm_content && ' | '}
                          {link.utm_content && `${t('detail.content')}: ${link.utm_content}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate" title={link.landing_url}>
                        {link.landing_url}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {link.budget ? (
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {t('detail.budget')}: ${link.budget.toLocaleString()}
                          </div>
                          <div className="text-gray-600">
                            {t('detail.spent')}: ${link.spent.toLocaleString()}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full ${(link.spent / link.budget) * 100 > 90
                                ? 'bg-red-600'
                                : (link.spent / link.budget) * 100 > 70
                                  ? 'bg-yellow-600'
                                  : 'bg-green-600'
                                }`}
                              style={{ width: `${Math.min((link.spent / link.budget) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{t('detail.noLimit')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {link.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(link.id, link.status, link.name)}
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full transition-all hover:ring-2 hover:ring-offset-1 cursor-pointer ${link.status === 'active'
                          ? 'bg-green-100 text-green-800 hover:ring-green-400'
                          : 'bg-gray-100 text-gray-800 hover:ring-gray-400'
                          }`}
                        title={t('detail.clickToToggle', { action: link.status === 'active' ? 'deactivate' : 'activate' })}
                      >
                        {link.status === 'active' ? t('status.active') : t('detail.inactive')}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ProtectedComponent permission="utm_codes:update" hideOnUnauthorized>
                          <Link
                            href={`/utm-tools/generator?edit=${link.id}`}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title={t('detail.editUtm')}
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        </ProtectedComponent>
                        <ProtectedComponent permission="utm_codes:delete" hideOnUnauthorized>
                          <button
                            onClick={() => handleDeleteTrackingLink(link.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title={t('detail.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </ProtectedComponent>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tracking Link Modal */}
      {showAddLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('detail.modal.addTitle')}</h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('detail.modal.description')}
            </p>

            <form onSubmit={handleAddTrackingLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tUtm('form.targetLandingUrl')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.landing_url}
                  onChange={(e) => setFormData({ ...formData, landing_url: e.target.value })}
                  placeholder={tUtm('form.landingUrlPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {tUtm('form.landingUrlHint')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tUtm('form.utmSource')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_source}
                    onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">{tUtm('form.selectSource')}</option>
                    <option value="google">{tUtm('sourceOptions.google')}</option>
                    <option value="naver">{tUtm('sourceOptions.naver')}</option>
                    <option value="kakao">{tUtm('sourceOptions.kakao')}</option>
                    <option value="youtube">{tUtm('sourceOptions.youtube')}</option>
                    <option value="facebook">{tUtm('sourceOptions.facebook')}</option>
                    <option value="instagram">{tUtm('sourceOptions.instagram')}</option>
                    <option value="saramin">{tUtm('sourceOptions.saramin')}</option>
                    <option value="email">{tUtm('sourceOptions.email')}</option>
                    <option value="other">{tUtm('sourceOptions.other')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {tUtm('form.sourceHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tUtm('form.utmMedium')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.utm_medium}
                    onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">{tUtm('form.selectMedium')}</option>
                    <option value="search">{tUtm('mediumOptions.search')}</option>
                    <option value="display">{tUtm('mediumOptions.display')}</option>
                    <option value="video">{tUtm('mediumOptions.video')}</option>
                    <option value="social">{tUtm('mediumOptions.social')}</option>
                    <option value="email">{tUtm('mediumOptions.email')}</option>
                    <option value="banner">{tUtm('mediumOptions.banner')}</option>
                    <option value="sns">{tUtm('mediumOptions.sns')}</option>
                    <option value="referral">{tUtm('mediumOptions.referral')}</option>
                    <option value="organic">{tUtm('mediumOptions.organic')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {tUtm('form.mediumHint')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tUtm('form.utmTerm')}
                  </label>
                  <input
                    type="text"
                    value={formData.utm_term}
                    onChange={(e) => setFormData({ ...formData, utm_term: e.target.value })}
                    placeholder={tUtm('form.termPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {tUtm('form.termHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tUtm('form.utmContent')}
                  </label>
                  <input
                    type="text"
                    value={formData.utm_content}
                    onChange={(e) => setFormData({ ...formData, utm_content: e.target.value })}
                    placeholder={tUtm('form.contentPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {tUtm('form.contentHint')}
                  </p>
                </div>
              </div>

              {/* Budget Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  💰 {t('detail.modal.budgetSettings')}
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  {t('detail.modal.budgetDescription')}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('detail.modal.budgetAllocation')}
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="e.g., 200"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('detail.modal.currentBudget')} ${campaign?.budget.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="auto_pause"
                      checked={formData.auto_pause_on_budget}
                      onChange={(e) => setFormData({ ...formData, auto_pause_on_budget: e.target.checked })}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label htmlFor="auto_pause" className="text-sm font-medium text-gray-700 cursor-pointer">
                        {t('detail.modal.autoPause')}
                      </label>
                      <p className="text-xs text-gray-500">
                        {t('detail.modal.autoPauseDesc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="auto_update_budget"
                      checked={formData.auto_update_campaign_budget}
                      onChange={(e) => setFormData({ ...formData, auto_update_campaign_budget: e.target.checked })}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <label htmlFor="auto_update_budget" className="text-sm font-medium text-gray-700 cursor-pointer">
                        {t('detail.modal.autoUpdate')}
                      </label>
                      <p className="text-xs text-gray-500">
                        {t('detail.modal.autoUpdateDesc')}
                      </p>
                    </div>
                  </div>

                  {formData.budget && parseFloat(formData.budget) > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900 font-medium mb-1">💡 {t('detail.modal.budgetPreview')}</p>
                      <div className="text-xs text-blue-800 space-y-1">
                        <div>{t('detail.modal.currentAllocated')} ${
                          trackingLinks
                            .filter(l => l.budget)
                            .reduce((sum, l) => sum + (l.budget || 0), 0)
                            .toLocaleString()
                        }</div>
                        <div>{t('detail.modal.newLinkBudget')} ${parseFloat(formData.budget).toLocaleString()}</div>
                        <div className="border-t border-blue-300 pt-1 mt-1">
                          <strong>{t('detail.modal.totalAfterAdding')} ${
                            (trackingLinks
                              .filter(l => l.budget)
                              .reduce((sum, l) => sum + (l.budget || 0), 0) + parseFloat(formData.budget))
                              .toLocaleString()
                          }</strong>
                        </div>
                        {trackingLinks
                          .filter(l => l.budget)
                          .reduce((sum, l) => sum + (l.budget || 0), 0) + parseFloat(formData.budget) > (campaign?.budget || 0) && (
                            <div className="text-orange-700 font-medium pt-1">
                              ⚠️ {t('detail.modal.exceedsBudget', {
                                amount: (trackingLinks
                                  .filter(l => l.budget)
                                  .reduce((sum, l) => sum + (l.budget || 0), 0) + parseFloat(formData.budget) - (campaign?.budget || 0))
                                  .toLocaleString()
                              })}
                              {formData.auto_update_campaign_budget && ` ${t('detail.modal.willAutoIncrease')}`}
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddLinkModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('detail.modal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('detail.modal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer with extra spacing */}
      <div className="mt-8">
        <PageFooter />
      </div>

      {/* Delete Tracking Link Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-left">
                {t('detail.swal.deleteTitle')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              {t('detail.swal.deleteText')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('detail.swal.deleteCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
            >
              {t('detail.swal.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Dialog */}
      <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${toggleDialogData?.currentStatus === 'active' ? 'bg-orange-100' : 'bg-green-100'}`}>
                {toggleDialogData?.currentStatus === 'active' ? (
                  <Ban className="w-5 h-5 text-orange-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <AlertDialogTitle className="text-left">
                {toggleDialogData?.currentStatus === 'active'
                  ? t('utmTools.list.toggle.deactivateTitle').replace('UTM Link?', 'Tracking Link?').replace('UTM 링크?', '추적 링크?')
                  : t('utmTools.list.toggle.activateTitle').replace('UTM Link?', 'Tracking Link?').replace('UTM 링크?', '추적 링크?')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              {toggleDialogData && (
                <div className="space-y-2">
                  <p>{t('detail.swal.toggleText', {
                    action: toggleDialogData.currentStatus === 'active' ? t('detail.swal.deactivateAction') : t('detail.swal.activateAction'),
                    name: toggleDialogData.name
                  })}</p>
                  <p className={`text-sm ${toggleDialogData.currentStatus === 'active' ? 'text-orange-600' : 'text-green-600'}`}>
                    {toggleDialogData.currentStatus === 'active' ? t('detail.swal.inactiveWarning') : t('detail.swal.activeInfo')}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('detail.swal.toggleCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleConfirm}
              className={`${toggleDialogData?.currentStatus === 'active' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-600' : 'bg-green-600 hover:bg-green-700 focus:ring-green-600'} text-white`}
            >
              {toggleDialogData && t('detail.swal.toggleConfirm', {
                action: toggleDialogData.currentStatus === 'active' ? t('detail.swal.deactivateAction') : t('detail.swal.activateAction')
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

