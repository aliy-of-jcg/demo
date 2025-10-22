"use client";

import { useState, useEffect } from 'react';
import { Search, Link as LinkIcon, Copy, Check, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface TrackingLink {
  id: number;
  name: string;
  campaign_id: number | null;
  campaign_name: string | null;
  tracking_code: string | null;
  utm_campaign: string;
  utm_source: string;
  utm_medium: string;
  utm_term: string;
  utm_content: string;
  landing_url: string;
  full_url: string;
  clicks: number;
  status: string;
  created_at: string;
}

export default function TrackingLinksPage() {
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    campaign_name: '',
    target_url: '',
    description: '',
    utm_campaign: '',
    utm_source: '',
    utm_medium: '',
    utm_term: '',
    utm_content: ''
  });

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    fetchTrackingLinks();
  }, [search]);

  const fetchTrackingLinks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/tracking/links?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTrackingLinks(data.links);
      }
    } catch (error) {
      console.error('Error fetching tracking links:', error);
      toast.error('Failed to load tracking links');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (trackingCode: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/t/${trackingCode}`;
    
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(trackingCode);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenLink = (trackingCode: string) => {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/t/${trackingCode}`;
    window.open(shortUrl, '_blank');
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.campaign_name || !formData.target_url) {
      toast.error('Campaign name and target URL are required');
      return;
    }

    toast.promise(
      (async () => {
        const response = await fetch('/api/tracking/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create tracking link');
        }

        setShowModal(false);
        setFormData({
          campaign_name: '',
          target_url: '',
          description: '',
          utm_campaign: '',
          utm_source: '',
          utm_medium: '',
          utm_term: '',
          utm_content: ''
        });
        await fetchTrackingLinks();
        return data;
      })(),
      {
        loading: 'Creating tracking link...',
        success: 'Tracking link created successfully!',
        error: (err) => err.message
      }
    );
  };

  const handleDelete = async (id: string) => {
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
      const response = await fetch(`/api/tracking/links/${id}`, {
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
        <h1 className="text-3xl font-bold text-gray-900">Tracking Links</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your tracking links</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Link</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by campaign name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tracking Links Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Tracking Links</h3>
          <p className="text-sm text-gray-600 mt-1">Click the copy icon to copy the short URL</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Short URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading tracking links...
                  </td>
                </tr>
              ) : trackingLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No tracking links found
                  </td>
                </tr>
              ) : (
                trackingLinks.map((link) => {
                  const shortUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/t/${link.tracking_code}`;
                  return (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{link.campaign_name || link.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            /t/{link.tracking_code}
                          </code>
                          <button
                            onClick={() => handleCopy(link.tracking_code || '')}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Copy full URL"
                          >
                            {copiedId === link.tracking_code ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenLink(link.tracking_code || '')}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={link.landing_url}>
                          {link.landing_url}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {link.utm_source && link.utm_medium ? `${link.utm_source} / ${link.utm_medium}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          link.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {link.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(link.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(link.id.toString())}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Tracking Link</h2>

            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  placeholder="Enter campaign name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="https://example.com/landing-page"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">UTM Parameters (Optional)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UTM Campaign
                    </label>
                    <input
                      type="text"
                      value={formData.utm_campaign}
                      onChange={(e) => setFormData({ ...formData, utm_campaign: e.target.value })}
                      placeholder="campaign_name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UTM Source
                    </label>
                    <input
                      type="text"
                      value={formData.utm_source}
                      onChange={(e) => setFormData({ ...formData, utm_source: e.target.value })}
                      placeholder="google, facebook, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UTM Medium
                    </label>
                    <input
                      type="text"
                      value={formData.utm_medium}
                      onChange={(e) => setFormData({ ...formData, utm_medium: e.target.value })}
                      placeholder="cpc, banner, email, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UTM Term
                    </label>
                    <input
                      type="text"
                      value={formData.utm_term}
                      onChange={(e) => setFormData({ ...formData, utm_term: e.target.value })}
                      placeholder="keyword terms"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UTM Content
                    </label>
                    <input
                      type="text"
                      value={formData.utm_content}
                      onChange={(e) => setFormData({ ...formData, utm_content: e.target.value })}
                      placeholder="ad variation"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
            </div>
                </div>
                    </div>
                    
              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
