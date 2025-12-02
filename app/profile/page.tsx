"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { User, Lock, Building2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { PageFooter } from '@/components/page-footer';
import { useRouter } from 'next/navigation';

// Diff function to detect changes
function diff(prev: Record<string, any>, next: Record<string, any>) {
    return Object.fromEntries(
        Object.entries(next).filter(([key, value]) => prev[key] !== value)
    );
}

export default function ProfilePage() {
    const t = useTranslations('profile');
    const { user, refreshAuth } = useAuth();
    const router = useRouter();
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);

    // Store original user data (excluding password fields)
    const [originalUser, setOriginalUser] = useState({
        email: '',
        contact_number: '',
        company_name: ''
    });

    // Personal Information Form
    const [profileForm, setProfileForm] = useState({
        email: '',
        contact_number: '',
        company_name: '',
        currentPassword: ''
    });

    // Password Change Form
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Load user data
    useEffect(() => {
        if (user) {
            const original = {
                email: user.email || '',
                contact_number: user.contact_number || '',
                company_name: user.company_name || ''
            };
            setOriginalUser(original);
            setProfileForm({
                email: original.email,
                contact_number: original.contact_number,
                company_name: original.company_name,
                currentPassword: ''
            });
        }
    }, [user]);

    // Get current profile data (excluding password)
    const currentProfile = useMemo(() => ({
        email: profileForm.email,
        contact_number: profileForm.contact_number,
        company_name: profileForm.company_name
    }), [profileForm.email, profileForm.contact_number, profileForm.company_name]);

    // Detect changes using diff
    const changedFields = useMemo(() => {
        return diff(originalUser, currentProfile);
    }, [originalUser, currentProfile]);

    // Check if there are any changes
    const hasChanges = Object.keys(changedFields).length > 0;

    // Handle profile update
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if there are any changes
        if (!hasChanges) {
            toast.error(t('validation.noChanges'));
            return;
        }

        // Validation
        if (!profileForm.currentPassword) {
            toast.error(t('validation.currentPasswordRequired'));
            return;
        }

        setIsLoadingProfile(true);

        try {
            const token = localStorage.getItem('auth_token');

            // Only send changed fields + currentPassword
            const payload = {
                ...changedFields,
                currentPassword: profileForm.currentPassword
            };

            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || t('errors.updateFailed'));
            }

            // Update original user data to reflect the changes
            setOriginalUser({
                email: profileForm.email,
                contact_number: profileForm.contact_number,
                company_name: profileForm.company_name
            });

            // Clear password field
            setProfileForm(prev => ({ ...prev, currentPassword: '' }));

            // Refresh auth to get updated user data
            await refreshAuth();

            toast.success(t('success.profileUpdated'));
        } catch (error: any) {
            console.error('Profile update error:', error);
            toast.error(error.message || t('errors.updateFailed'));
        } finally {
            setIsLoadingProfile(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!passwordForm.currentPassword) {
            toast.error(t('validation.currentPasswordRequired'));
            return;
        }

        if (!passwordForm.newPassword) {
            toast.error(t('validation.newPasswordRequired'));
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            toast.error(t('validation.passwordTooShort'));
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error(t('validation.passwordsNoMatch'));
            return;
        }

        setIsLoadingPassword(true);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || t('errors.passwordChangeFailed'));
            }

            // Clear all password fields
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            toast.success(t('success.passwordChanged'));
        } catch (error: any) {
            console.error('Password change error:', error);
            toast.error(error.message || t('errors.passwordChangeFailed'));
        } finally {
            setIsLoadingPassword(false);
        }
    };

    if (!user) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">{t('subtitle')}</p>
            </div>

            {/* User Info Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg p-6 mb-6 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">{user.email}</h2>
                        <p className="text-sm text-white/80 mt-1">{user.user_type}</p>
                    </div>
                </div>
            </div>

            {/* Personal Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{t('sections.personalInfo')}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">{t('sections.personalInfoDesc')}</p>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Mail className="inline w-4 h-4 mr-1" />
                            {t('fields.email')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Phone className="inline w-4 h-4 mr-1" />
                            {t('fields.phoneNumber')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={profileForm.contact_number}
                            onChange={(e) => setProfileForm({ ...profileForm, contact_number: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Building2 className="inline w-4 h-4 mr-1" />
                            {t('fields.companyName')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={profileForm.company_name}
                            onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Lock className="inline w-4 h-4 mr-1" />
                            {t('fields.currentPassword')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={profileForm.currentPassword}
                            onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('placeholders.currentPassword')}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('hints.confirmIdentity')}</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoadingProfile || !hasChanges}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoadingProfile ? t('buttons.updating') : t('buttons.updateProfile')}
                    </button>
                </form>
            </div>

            {/* Change Password Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{t('sections.changePassword')}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-6">{t('sections.changePasswordDesc')}</p>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('fields.currentPassword')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('placeholders.currentPassword')}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('fields.newPassword')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('placeholders.newPassword')}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('hints.passwordStrength')}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('fields.confirmPassword')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={t('placeholders.confirmPassword')}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoadingPassword}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoadingPassword ? t('buttons.updating') : t('buttons.changePassword')}
                    </button>
                </form>
            </div>

            <PageFooter />
        </div>
    );
}

