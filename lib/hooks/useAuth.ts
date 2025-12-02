'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserType, UserStatus } from '@/lib/types';
import Swal from 'sweetalert2';

// Hardcoded Korean messages for auth popups
const AUTH_MESSAGES: Record<string, { title: string; text: string; icon: 'error' | 'warning' | 'info' }> = {
    blocked: { title: '계정 차단됨', text: '귀하의 계정이 차단되었습니다. 오류로 생각되시면 지원팀에 문의해주세요.', icon: 'error' },
    stopped: { title: '계정 중지됨', text: '귀하의 계정이 중지되었습니다. 지원팀에 문의해주세요.', icon: 'warning' },
    pending: { title: '계정 승인 대기 중', text: '귀하의 계정이 승인 대기 중입니다. 관리자에게 문의하거나 활성화를 기다려주세요.', icon: 'info' },
    session_expired: { title: '세션 만료됨', text: '세션이 만료되었습니다. 다시 로그인해주세요.', icon: 'warning' },
    logged_out: { title: '로그아웃됨', text: '성공적으로 로그아웃되었습니다.', icon: 'info' },
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

/**
 * User interface for client-side use
 */
export interface AuthUser {
    id: number;
    uuid: string;
    email: string;
    company_name: string;
    contact_number: string;
    user_type: UserType;
    status?: UserStatus;
}

/**
 * Authentication state
 */
export interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
}

/**
 * useAuth hook return type
 */
export interface UseAuthReturn extends AuthState {
    checkAuth: () => Promise<void>;
    logout: () => void;
    refreshAuth: () => Promise<void>;
}

/**
 * Custom hook for authentication state management
 * Consolidates the duplicate checkAuth() logic from layout-wrapper.tsx and auth/page.tsx
 */
// Global flag to prevent concurrent auth checks across all instances
let isCheckingAuth = false;
let authCheckPromise: Promise<void> | null = null;

export function useAuth(requireAuth: boolean = true): UseAuthReturn {
    const router = useRouter();
    const pathname = usePathname();
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        error: null,
    });

    /**
     * Check authentication status
     */
    const checkAuth = useCallback(async () => {
        // Prevent concurrent checks - wait for existing check if in progress
        if (isCheckingAuth && authCheckPromise) {
            await authCheckPromise;
            return;
        }

        // Start new check
        isCheckingAuth = true;
        authCheckPromise = (async () => {
            try {
                setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

                const token = localStorage.getItem('auth_token');

                if (!token) {
                    if (requireAuth) {
                        localStorage.removeItem('user');
                        await showAuthPopupAndRedirect('session_expired');
                        return;
                    }
                    setAuthState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                        error: null,
                    });
                    return;
                }

                const response = await fetch('/api/auth/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const result = await response.json();

                if (!result.valid) {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user');

                    if (requireAuth) {
                        if (result.status) {
                            await showAuthPopupAndRedirect(getMessageTypeFromStatus(result.status as UserStatus));
                        } else {
                            await showAuthPopupAndRedirect('session_expired');
                        }
                        return;
                    }

                    setAuthState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                        error: result.message || 'Authentication failed',
                    });
                    return;
                }

                if (result.user) {
                    // Store user in localStorage for backward compatibility
                    localStorage.setItem('user', JSON.stringify(result.user));

                    setAuthState({
                        user: result.user as AuthUser,
                        isLoading: false,
                        isAuthenticated: true,
                        error: null,
                    });
                } else {
                    setAuthState({
                        user: null,
                        isLoading: false,
                        isAuthenticated: false,
                        error: 'User data not found',
                    });
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');

                if (requireAuth) {
                    await showAuthPopupAndRedirect('session_expired');
                    return;
                }

                setAuthState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                    error: 'Authentication check failed',
                });
            } finally {
                isCheckingAuth = false;
                authCheckPromise = null;
            }
        })();

        await authCheckPromise;
    }, [requireAuth]);

    /**
     * Logout user
     */
    const logout = useCallback(async () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
        });
        await showAuthPopupAndRedirect('logged_out');
    }, []);

    /**
     * Refresh authentication (re-check)
     */
    const refreshAuth = useCallback(async () => {
        await checkAuth();
    }, [checkAuth]);

    // Check auth on mount and when pathname changes (re-validate on every navigation)
    useEffect(() => {
        // Skip auth check for public pages
        const isPublicPage = pathname?.includes('/auth') ||
            pathname?.includes('/reset-password') ||
            pathname?.includes('/link-expired');

        if (isPublicPage && !requireAuth) {
            setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                error: null,
            });
            return;
        }

        // Re-validate auth on every route change to pick up permission/status changes
        // Small delay to prevent chunk loading race condition
        const timeout = setTimeout(() => {
            checkAuth();
        }, 100);

        return () => {
            clearTimeout(timeout);
        };
    }, [pathname, requireAuth, checkAuth]); // Include checkAuth to re-validate on navigation

    // Try to load user from localStorage on mount (for faster initial render)
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('auth_token');

        if (storedUser && token && !authState.user && authState.isLoading) {
            try {
                const user = JSON.parse(storedUser) as AuthUser;
                setAuthState((prev) => ({
                    ...prev,
                    user,
                    isAuthenticated: true,
                    isLoading: false, // Set loading to false when we have cached user
                }));
            } catch (error) {
                console.error('Error parsing stored user:', error);
                // If parsing fails, ensure loading state is cleared
                setAuthState((prev) => ({
                    ...prev,
                    isLoading: false,
                }));
            }
        } else if (!token && authState.isLoading) {
            // No token, clear loading state immediately
            setAuthState((prev) => ({
                ...prev,
                isLoading: false,
                isAuthenticated: false,
            }));
        }
    }, [authState.user, authState.isLoading]);

    return {
        ...authState,
        checkAuth,
        logout,
        refreshAuth,
    };
}

