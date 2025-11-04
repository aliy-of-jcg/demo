"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function LinkExpiredPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [campaignName, setCampaignName] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('inactive');

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

  // Extract params and clean URL
  useEffect(() => {
    const campaign = searchParams.get('campaign');
    const reasonParam = searchParams.get('reason') || 'inactive';
    
    // Store the params in state
    setCampaignName(campaign);
    setReason(reasonParam);
    
    // Clean the URL by replacing it without the query params
    router.replace('/link-expired', { scroll: false });
  }, [searchParams, router]);

  const getMessage = () => {
    switch (reason) {
      case 'inactive':
        return {
          title: 'This Link Has Expired',
          description: 'The promotional link you clicked is no longer active. It may have been paused or replaced with a newer version.',
        };
      case 'campaign_ended':
        return {
          title: 'Campaign Has Ended',
          description: 'The campaign associated with this link has ended and is no longer accepting traffic.',
        };
      case 'campaign_paused':
        return {
          title: 'Campaign Temporarily Paused',
          description: 'The campaign associated with this link is currently paused. Please check back later.',
        };
      default:
        return {
          title: 'Link Not Available',
          description: 'The link you clicked is not currently available.',
        };
    }
  };

  const message = getMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {message.title}
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            {message.description}
          </p>

          {/* Campaign Name */}
          {campaignName && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Campaign</p>
              <p className="text-base font-medium text-gray-900">{campaignName}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/utm-tools"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              View UTM Tools
            </Link>

            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-400 mt-6">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

