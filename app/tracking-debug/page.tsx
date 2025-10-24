"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";

interface TrackingEvent {
  timestamp: string;
  session_id: string;
  user_id: string;
  page_url: string;
  page_title: string;
  device_type: string;
  utm_source: string;
  utm_campaign: string;
  event_type: string;
  visit_count: number;
  is_new_visitor: number;
}

export default function TrackingDebugPage() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecentEvents = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/tracking/debug');
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events || []);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentEvents();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchRecentEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tracking Debug</h1>
          <p className="text-gray-600 mt-1">Monitor real-time pageview events from tracking script</p>
        </div>
        <Button onClick={fetchRecentEvents} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Installation Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📋 Installation Instructions</CardTitle>
          <CardDescription>Add this script to your website (aptdecor.uz)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>{`<!-- Add this before closing </head> tag -->
<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/cosmos-track.js" async></script>`}</pre>
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p><strong>Step 1:</strong> Copy the script tag above</p>
            <p><strong>Step 2:</strong> Paste it in your website's &lt;head&gt; section (all pages)</p>
            <p><strong>Step 3:</strong> Visit your website with UTM parameters</p>
            <p><strong>Step 4:</strong> Check this page for incoming events</p>
          </div>
        </CardContent>
      </Card>

      {/* Test URL Example */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔗 Test URL Example</CardTitle>
          <CardDescription>Use this URL format to test tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 text-blue-900 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre>http://aptdecor.uz/?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign</pre>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {events.length > 0 ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Tracking Active ✅</p>
                  <p className="text-sm text-gray-600">{events.length} events received in last 24 hours</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-600">No Events Yet</p>
                  <p className="text-sm text-gray-500">Install the tracking script and visit your website</p>
                </div>
              </>
            )}
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events (Last 24 Hours)</CardTitle>
          <CardDescription>Showing pageview and page_exit events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No tracking events yet</p>
              <p className="text-sm mt-2">Events will appear here once you install the script and visit your website</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Page</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">UTM Source</th>
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Visitor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((event, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.event_type === 'pageview' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate" title={event.page_url}>
                        {event.page_title || event.page_url}
                      </td>
                      <td className="py-3 px-4 capitalize">{event.device_type}</td>
                      <td className="py-3 px-4">{event.utm_source || '-'}</td>
                      <td className="py-3 px-4">{event.utm_campaign || '-'}</td>
                      <td className="py-3 px-4">
                        {event.is_new_visitor === 1 ? (
                          <span className="text-green-600 font-medium">New</span>
                        ) : (
                          <span className="text-gray-600">Returning ({event.visit_count}x)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

