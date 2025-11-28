/**
 * Fetch utility that handles authentication errors and redirects blocked users immediately
 */
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

    // Check for authentication/authorization errors - redirect immediately
    if (response.status === 401 || response.status === 403) {
        // Clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');

        // Redirect immediately (don't wait for JSON parsing)
        window.location.replace('/auth');

        // Throw error to stop further execution
        throw new Error('Authentication failed - redirecting');
    }

    return response;
}
