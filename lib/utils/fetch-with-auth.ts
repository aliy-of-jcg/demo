/**
 * Fetch utility that handles authentication errors and shows popup before redirecting
 */
import Swal from 'sweetalert2';
import type { UserStatus } from '@/lib/types';

// Hardcoded Korean messages for auth popups
const AUTH_MESSAGES: Record<string, { title: string; text: string; icon: 'error' | 'warning' | 'info' }> = {
    blocked: { title: '계정 차단됨', text: '귀하의 계정이 차단되었습니다. 오류로 생각되시면 지원팀에 문의해주세요.', icon: 'error' },
    stopped: { title: '계정 중지됨', text: '귀하의 계정이 중지되었습니다. 지원팀에 문의해주세요.', icon: 'warning' },
    pending: { title: '계정 승인 대기 중', text: '귀하의 계정이 승인 대기 중입니다. 관리자에게 문의하거나 활성화를 기다려주세요.', icon: 'info' },
    session_expired: { title: '세션 만료됨', text: '세션이 만료되었습니다. 다시 로그인해주세요.', icon: 'warning' },
};

let isShowingPopup = false;

async function showAuthPopupAndRedirect(messageType: string, redirectUrl: string = '/auth') {
    if (isShowingPopup) return;
    isShowingPopup = true;

    try {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.location.pathname === '/auth') {
            isShowingPopup = false;
            return;
        }

        const message = AUTH_MESSAGES[messageType] || AUTH_MESSAGES.session_expired;
        await Swal.fire({
            title: message.title,
            text: message.text,
            icon: message.icon,
            confirmButtonText: '확인',
            confirmButtonColor: '#6366f1',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCloseButton: true,
            didClose: () => { isShowingPopup = false; },
        });

        window.location.replace(redirectUrl);
    } catch (error) {
        console.error('Error showing auth popup:', error);
        isShowingPopup = false;
        window.location.replace(redirectUrl);
    }
}

function getMessageTypeFromStatus(status: UserStatus): string {
    switch (status) {
        case 'blocked': return 'blocked';
        case 'stopped': return 'stopped';
        case 'pending': return 'pending';
        default: return 'session_expired';
    }
}

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

    // Check for authentication/authorization errors - show popup before redirecting
    if (response.status === 401 || response.status === 403) {
        // Clear auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');

        // Try to get status from response body if available
        let status: UserStatus | null = null;
        try {
            const clonedResponse = response.clone();
            const contentType = clonedResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await clonedResponse.json();
                status = data.status as UserStatus | null;
                console.log('[Fetch With Auth] Status from response:', status, 'Full data:', data);
            }
        } catch (error) {
            // If JSON parsing fails, continue with generic message
            console.warn('[Fetch With Auth] Could not parse error response:', error);
        }

        // Show popup based on status and redirect
        if (status) {
            await showAuthPopupAndRedirect(getMessageTypeFromStatus(status));
        } else {
            await showAuthPopupAndRedirect('session_expired');
        }

        // Throw error to stop further execution
        throw new Error('Authentication failed - redirecting');
    }

    return response;
}
