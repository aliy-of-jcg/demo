/**
 * Fetch utility that handles authentication errors and redirects with reason code
 */
import type { UserStatus } from '@/lib/types';

export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = localStorage.getItem('auth_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Check for authentication/authorization errors - store reason code and redirect
    if (response.status === 401 || response.status === 403) {
        // Clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');

        // Try to get reason code from response body
        let reasonCode: string | null = null;
        try {
            const clonedResponse = response.clone();
            const contentType = clonedResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await clonedResponse.json();
                reasonCode = data.reasonCode || null;

                // Fallback: generate reason code from status if not provided
                if (!reasonCode && data.status) {
                    const status = data.status as UserStatus;
                    switch (status) {
                        case 'blocked':
                            reasonCode = 'auth.statusChanged.blocked';
                            break;
                        case 'stopped':
                            reasonCode = 'auth.statusChanged.stopped';
                            break;
                        case 'pending':
                            reasonCode = 'auth.statusChanged.pending';
                            break;
                        default:
                            reasonCode = 'auth.sessionExpired';
                    }
                }
            }
        } catch (error) {
            // If JSON parsing fails, use default reason code
            console.warn('[Fetch With Auth] Could not parse error response:', error);
        }

        // Store reason code in sessionStorage for auth page to display
        if (reasonCode) {
            sessionStorage.setItem('auth_redirect_reason', reasonCode);
        } else {
            // Default fallback reason code
            sessionStorage.setItem('auth_redirect_reason', 'auth.sessionExpired');
        }

        // Redirect to auth page
        window.location.replace('/auth');

        // Throw error to stop further execution
        throw new Error('Authentication failed - redirecting');
    }

    return response;
}
