'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global error boundary for Next.js App Router
 * Catches Server Action errors and other runtime errors
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error for debugging
    console.error('Global error caught:', error);

    // Check if this is a Server Action error
    const isServerActionError = 
      error.message?.includes('Failed to find Server Action') ||
      error.message?.includes('Server Action') ||
      error.message?.includes('Multipart: Boundary not found') ||
      error.digest?.startsWith('NEXT_');

    if (isServerActionError) {
      console.warn('⚠️ Server Action error detected - likely from cached client bundle. Hard refresh recommended.');
      // Optionally show a user-friendly message
      // You can add a toast notification here if needed
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-4">
          {error.message?.includes('Server Action') 
            ? 'This error is usually caused by a cached client bundle. Please try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R).'
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Hard refresh the page
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

