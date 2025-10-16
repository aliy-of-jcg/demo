"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink, Trash2, Check, RefreshCw } from "lucide-react";

interface TrackingLink {
  id: string;
  campaignName: string;
  trackingCode: string;
  targetUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  fullUrl: string;
  createdAt: string;
}

export default function TrackingPage() {
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    campaignName: "",
    targetUrl: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  });

  // Fetch stored links from database
  const fetchTrackingLinks = async () => {
    try {
      const response = await fetch("/api/tracking/links?limit=50");
      const data = await response.json();
      
      if (data.success && data.links) {
        setTrackingLinks(data.links);
      }
    } catch (error) {
      console.error("Error fetching tracking links:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load links on component mount
  useEffect(() => {
    fetchTrackingLinks();
  }, []);

  const generateTrackingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const response = await fetch("/api/tracking/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setTrackingLinks([data.trackingLink, ...trackingLinks]);
        setFormData({
          campaignName: "",
          targetUrl: "",
          utmSource: "",
          utmMedium: "",
          utmCampaign: "",
          utmContent: "",
          utmTerm: "",
        });
      }
    } catch (error) {
      console.error("Error generating tracking link:", error);
      alert("Failed to generate tracking link");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    try {
      // Try modern clipboard API first (works on localhost and HTTPS)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        // Fallback for non-secure contexts (HTTP with IP address)
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
          console.error('Copy failed:', err);
          alert('Failed to copy. Please copy manually.');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Clipboard error:', err);
      alert('Failed to copy. Please copy manually.');
    }
  };

  const deleteLink = async (id: string) => {
    // Optimistic update - remove from UI immediately
    setTrackingLinks(trackingLinks.filter(link => link.id !== id));
    
    try {
      // Delete from database
      const response = await fetch(`/api/tracking/links/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('Failed to delete link from database');
        // Optionally: Show error message to user
        // Optionally: Reload links from database to revert optimistic update
        alert('Failed to delete link. It may reappear on refresh.');
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Error deleting link. It may reappear on refresh.');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tracking Links</h1>
        <p className="text-gray-500 mt-2">Generate and manage UTM tracking links for your campaigns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate New Tracking Link</CardTitle>
            <CardDescription>Create a unique tracking URL with UTM parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateTrackingLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g., Summer Sale 2024"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetUrl">Target URL *</Label>
                <Input
                  id="targetUrl"
                  type="url"
                  placeholder="https://yourwebsite.com/landing"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="utmSource">UTM Source *</Label>
                  <Input
                    id="utmSource"
                    placeholder="telegram, kakao, naver"
                    value={formData.utmSource}
                    onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="utmMedium">UTM Medium *</Label>
                  <Input
                    id="utmMedium"
                    placeholder="social, email, cpc"
                    value={formData.utmMedium}
                    onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="utmCampaign">UTM Campaign *</Label>
                <Input
                  id="utmCampaign"
                  placeholder="summer_sale"
                  value={formData.utmCampaign}
                  onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utmContent">UTM Content (Optional)</Label>
                <Input
                  id="utmContent"
                  placeholder="banner_ad, text_link"
                  value={formData.utmContent}
                  onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utmTerm">UTM Term (Optional)</Label>
                <Input
                  id="utmTerm"
                  placeholder="keyword1, keyword2"
                  value={formData.utmTerm}
                  onChange={(e) => setFormData({ ...formData, utmTerm: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Tracking Link"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Links</CardTitle>
                <CardDescription>Your recently created tracking URLs (stored in ClickHouse)</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsLoading(true);
                  fetchTrackingLinks();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-gray-500">Loading tracking links...</p>
                </div>
              </div>
            ) : trackingLinks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No tracking links generated yet.</p>
                <p className="text-sm mt-2">Fill out the form to create your first tracking link.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {trackingLinks.map((link) => (
                  <div key={link.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{link.campaignName}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Code: <span className="font-mono">{link.trackingCode}</span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLink(link.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="bg-white border rounded p-2 mb-2">
                      <a 
                        href={link.fullUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs break-all font-mono text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {link.fullUrl}
                      </a>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => copyToClipboard(link.fullUrl, link.id)}
                      >
                        {copiedId === link.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(link.fullUrl, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {link.utmSource}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        {link.utmMedium}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                        {link.utmCampaign}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About UTM Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Supported Platforms</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Telegram (telegram or tg)</li>
                <li>• Kakao (kakao)</li>
                <li>• Naver (naver)</li>
                <li>• Google (google)</li>
                <li>• Facebook (facebook)</li>
                <li>• Instagram (instagram)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Common Mediums</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• social - Social media</li>
                <li>• cpc - Cost per click</li>
                <li>• email - Email campaigns</li>
                <li>• banner - Display ads</li>
                <li>• organic - Organic search</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Tracked Data</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Click timestamp</li>
                <li>• Device type</li>
                <li>• Browser & OS</li>
                <li>• IP & Location</li>
                <li>• Referrer URL</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

