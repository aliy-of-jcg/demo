'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserType, UserStatus } from '@/lib/types';

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
        try {
            setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

            const token = localStorage.getItem('auth_token');

            if (!token) {
                if (requireAuth) {
                    localStorage.removeItem('user');
                    window.location.replace('/auth');
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
                    window.location.replace('/auth');
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
                window.location.replace('/auth');
                return;
            }

            setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                error: 'Authentication check failed',
            });
        }
    }, [requireAuth]);

    /**
     * Logout user
     */
    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
        });
        window.location.replace('/auth');
    }, []);

    /**
     * Refresh authentication (re-check)
     */
    const refreshAuth = useCallback(async () => {
        await checkAuth();
    }, [checkAuth]);

    // Check auth on mount and when pathname changes
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

        // Small delay to prevent chunk loading race condition
        const timeout = setTimeout(() => {
            checkAuth();
        }, 100);

        return () => clearTimeout(timeout);
    }, [pathname, checkAuth, requireAuth]);

    // Try to load user from localStorage on mount (for faster initial render)
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser && !authState.user) {
            try {
                const user = JSON.parse(storedUser) as AuthUser;
                setAuthState((prev) => ({
                    ...prev,
                    user,
                    isAuthenticated: true,
                }));
            } catch (error) {
                console.error('Error parsing stored user:', error);
            }
        }
    }, [authState.user]);

    return {
        ...authState,
        checkAuth,
        logout,
        refreshAuth,
    };
}

