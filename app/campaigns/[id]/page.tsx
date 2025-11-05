"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit, Calendar, DollarSign, TrendingUp, Link as LinkIcon, Plus, Copy, Check, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { PageFooter } from '@/components/page-footer';
import { copyToClipboard } from '@/lib/clipboard';

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
}

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  waiting: 'bg-gray-100 text-gray-800',
  ended: 'bg-gray-200 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-800'
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  waiting: 'Waiting',
  ended: 'Ended',
  paused: 'Paused'
};

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
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

  const fetchCampaignDetails = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();
      
      if (data.success) {
        setCampaign(data.campaign);
      } else {
        toast.error('Campaign not found');
        router.push('/campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingLinks = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/tracking-links`);
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
      toast.success('Tracking link copied to clipboard!');
      setTimeout(() => setCopiedCode(null), 2000);
    } else {
      toast.error('Failed to copy tracking link');
    }
  };

  const handleOpenTrackingLink = (trackingCode: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/t/${trackingCode}`;
    window.open(shortUrl, '_blank');
  };

  const handleAddTrackingLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.utm_source || !formData.utm_medium || !formData.utm_campaign || !formData.landing_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.promise(
      (async () => {
        const response = await fetch(`/api/campaigns/${campaignId}/tracking-links`, {
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
            throw new Error('A tracking link with these exact parameters already exists. Please use different UTM parameters or landing URL.');
          }
          throw new Error(data.error || 'Failed to create tracking link');
        }

        // Show additional info if campaign budget was updated
        if (data.campaignBudgetUpdated) {
          toast.success(`Campaign budget automatically increased to $${data.newCampaignBudget}`, { duration: 5000 });
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
        loading: 'Creating tracking link...',
        success: 'Tracking link created successfully!',
        error: (err) => err.message
      }
    );
  };

  const handleDeleteTrackingLink = async (id: number) => {
    const result = await Swal.fire({
      title: 'Delete Tracking Link?',
      text: 'Are you sure you want to delete this tracking link? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    toast.promise(
      (async () => {
        // Hard delete - actually remove from database
        const response = await fetch(`/api/utm-codes/${id}`, {
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
        loading: 'Deleting tracking link...',
        success: 'Tracking link deleted successfully!',
        error: (err) => err.message
      }
    );
  };

  const handleToggleStatus = async (id: number, currentStatus: string, name: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Tracking Link?`,
      html: `
        <p>Are you sure you want to ${action} "${name}"?</p>
        ${newStatus === 'inactive' ? '<p class="text-sm text-orange-600 mt-2">⚠️ The link will show an "expired" message to visitors.</p>' : '<p class="text-sm text-green-600 mt-2">✓ The link will redirect visitors normally.</p>'}
      `,
      icon: newStatus === 'inactive' ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'inactive' ? '#f59e0b' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it`,
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    toast.promise(
      (async () => {
        const response = await fetch(`/api/utm-codes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update tracking link status');
        }

        await fetchTrackingLinks();
        return data;
      })(),
      {
        loading: `${action.charAt(0).toUpperCase() + action.slice(1)}ing tracking link...`,
        success: `Tracking link ${action}d successfully!`,
        error: (err) => err.message
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Campaign not found</p>
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
          <span>Back to Campaigns</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">Campaign Details & Tracking Links</p>
          </div>
          <Link
            href={`/campaigns/${campaign.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Campaign</span>
          </Link>
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
              {statusLabels[campaign.status]}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Campaign Period</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{campaignDays} days</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Budget</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">₩{campaign.budget.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Daily: ₩{Math.floor(campaign.budget / campaignDays).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Budget Spent</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">₩{campaign.spent.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((campaign.spent / campaign.budget) * 100).toFixed(2)}% used
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <LinkIcon className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Tracking Links</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{trackingLinks.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {trackingLinks.filter(l => l.status === 'active').length} active
          </p>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Information</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Course</p>
              <p className="text-base text-gray-900 mt-1">{campaign.course_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Course Code</p>
              <p className="text-base text-gray-900 mt-1">{campaign.course_code || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Media Sources</p>
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
              <p className="text-sm font-medium text-gray-600">Ad Types</p>
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
              <p className="text-sm font-medium text-gray-600">Description</p>
              <p className="text-base text-gray-900 mt-1">{campaign.description || 'No description provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Created At</p>
              <p className="text-base text-gray-900 mt-1">
                {new Date(campaign.created_at).toLocaleDateString()} {new Date(campaign.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(campaign?.clicks ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                From {trackingLinks.length} tracking link{trackingLinks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(campaign?.visitors ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {campaign?.clicks && campaign.visitors 
                  ? `${((campaign.visitors / campaign.clicks) * 100).toFixed(1)}% of clicks`
                  : 'No data yet'
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Used</p>
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
            <h2 className="text-xl font-semibold text-gray-900">Tracking Links</h2>
            <p className="text-sm text-gray-600 mt-1">Manage multiple tracking links for different sources and mediums</p>
          </div>
          <button
            onClick={() => {
              // Auto-fill with campaign's source, medium, and landing URL
              const firstLink = trackingLinks[0];
              setFormData({
                name: '',
                utm_source: campaign?.source || '',
                utm_medium: campaign?.medium || '',
                utm_campaign: campaign?.name || '',
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
            <span>Add Tracking Link</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Short URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media / Ad Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Landing URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget / Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trackingLinks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No tracking links yet. Create one to start tracking this campaign.
                  </td>
                </tr>
              ) : (
                trackingLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{link.name}</div>
                      <div className="text-xs text-gray-500">{link.utm_campaign}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          /t/{link.tracking_code}
                        </code>
                        <button
                          onClick={() => handleCopyTrackingLink(link.tracking_code)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Copy tracking link"
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
                          title="Test redirect"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{link.utm_source} / {link.utm_medium}</div>
                      {(link.utm_term || link.utm_content) && (
                        <div className="text-xs text-gray-500">
                          {link.utm_term && `Term: ${link.utm_term}`}
                          {link.utm_term && link.utm_content && ' | '}
                          {link.utm_content && `Content: ${link.utm_content}`}
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
                            Budget: ${link.budget.toLocaleString()}
                          </div>
                          <div className="text-gray-600">
                            Spent: ${link.spent.toLocaleString()}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                (link.spent / link.budget) * 100 > 90 
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
                        <span className="text-xs text-gray-400">No limit</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {link.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(link.id, link.status, link.name)}
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full transition-all hover:ring-2 hover:ring-offset-1 cursor-pointer ${
                          link.status === 'active' 
                            ? 'bg-green-100 text-green-800 hover:ring-green-400' 
                            : 'bg-gray-100 text-gray-800 hover:ring-gray-400'
                        }`}
                        title={`Click to ${link.status === 'active' ? 'deactivate' : 'activate'}`}
                      >
                        {link.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/utm-tools/generator?edit=${link.id}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit UTM"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteTrackingLink(link.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Tracking Link</h2>
            <p className="text-sm text-gray-600 mb-6">
              Create a new tracking link with different source, medium, or landing URL. Duplicate links are not allowed.
            </p>

            <form onSubmit={handleAddTrackingLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Google Search - Mobile Campaign"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Landing URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.landing_url}
                  onChange={(e) => setFormData({ ...formData, landing_url: e.target.value })}
                  placeholder="https://example.com/landing-page"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Media <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.utm_source}
                    onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                    placeholder="e.g., google, facebook, naver"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-filled from campaign. You can override if needed.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.utm_medium}
                    onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                    placeholder="e.g., search, banner, sns"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-filled from campaign. You can override if needed.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UTM Campaign <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.utm_campaign}
                  onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                  placeholder="e.g., spring_sale_2025"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Term (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.utm_term}
                    onChange={(e) => setFormData({ ...formData, utm_term: e.target.value })}
                    placeholder="e.g., running+shoes"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UTM Content (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.utm_content}
                    onChange={(e) => setFormData({ ...formData, utm_content: e.target.value })}
                    placeholder="e.g., logolink, textlink"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Budget Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  💰 Budget Settings (Optional)
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Allocate a specific budget for this tracking link. Leave empty for no budget limit.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Allocation ($)
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
                      Current campaign budget: ${campaign?.budget.toLocaleString() || 0}
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
                        Auto-pause when budget is reached
                      </label>
                      <p className="text-xs text-gray-500">
                        Automatically deactivate this link when its budget is fully spent
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
                        Auto-update campaign budget if needed
                      </label>
                      <p className="text-xs text-gray-500">
                        Automatically increase campaign budget if this allocation exceeds the current total
                      </p>
                    </div>
                  </div>

                  {formData.budget && parseFloat(formData.budget) > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900 font-medium mb-1">💡 Budget Impact Preview:</p>
                      <div className="text-xs text-blue-800 space-y-1">
                        <div>Current Allocated: ${
                          trackingLinks
                            .filter(l => l.budget)
                            .reduce((sum, l) => sum + (l.budget || 0), 0)
                            .toLocaleString()
                        }</div>
                        <div>New Link Budget: ${parseFloat(formData.budget).toLocaleString()}</div>
                        <div className="border-t border-blue-300 pt-1 mt-1">
                          <strong>Total After Adding: ${
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
                            ⚠️ Exceeds campaign budget by ${
                              (trackingLinks
                                .filter(l => l.budget)
                                .reduce((sum, l) => sum + (l.budget || 0), 0) + parseFloat(formData.budget) - (campaign?.budget || 0))
                                .toLocaleString()
                            }
                            {formData.auto_update_campaign_budget && " (will be auto-increased)"}
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Tracking Link
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
    </div>
  );
}

