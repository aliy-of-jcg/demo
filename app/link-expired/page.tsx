"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function LinkExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-orange-600 animate-pulse" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Checking Link Status…</h1>
              <p className="text-gray-500 text-sm">
                Please hold on while we confirm the status of this link.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <LinkExpiredContent />
    </Suspense>
  );
}

function LinkExpiredContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [campaignName, setCampaignName] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('inactive');

  useEffect(() => {
    const campaign = searchParams.get('campaign');
    const reasonParam = searchParams.get('reason') || 'inactive';

    setCampaignName(campaign);
    setReason(reasonParam);

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

          {/* Additional Info */}
          <p className="text-sm text-gray-500 mt-6">
            This link is no longer active. Please contact the sender for a new link or visit their website directly.
          </p>
        </div>
      </div>
    </div>
  );
}

