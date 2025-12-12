"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserCheck, UserPlus, UserX, Search, Shield, Eye, User as UserIcon, Lock, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import type { UserType } from "@/lib/types";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { usePermission } from "@/lib/hooks/usePermission";
import { fetchWithAuth } from "@/lib/utils/fetch-with-auth";
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
    id: number;
    uuid: string;
    email: string;
    company_name: string;
    contact_number: string;
    user_type: UserType;
    status: "pending" | "active" | "stopped" | "blocked";
    created_at: string;
    last_login_at: string | null;
}

function UserManagementPageContent() {
    const t = useTranslations("userManagement");
    const router = useRouter();
    const { hasPermission } = usePermission();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState(""); // Immediate input value
    const debouncedSearch = useDebounce(searchInput, 500); // Debounced search value
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [menuOpen, setMenuOpen] = useState<{ userId: number; type: 'userType' | 'userStatus' } | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; right?: number; left?: number } | null>(null);
    const typeMenuRef = useRef<HTMLDivElement>(null);
    const statusMenuRef = useRef<HTMLDivElement>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // Check if user has update/delete permissions
    const canUpdateUsers = hasPermission('users:update');
    const canDeleteUsers = hasPermission('users:delete');

    // Fetch users on mount
    useEffect(() => {
        fetchUsers();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuOpen === null) return;

            const target = event.target as Node;
            const isOutsideTypeMenu = typeMenuRef.current && !typeMenuRef.current.contains(target);
            const isOutsideStatusMenu = statusMenuRef.current && !statusMenuRef.current.contains(target);

            if (menuOpen.type === 'userType' && isOutsideTypeMenu) {
                setMenuOpen(null);
            } else if (menuOpen.type === 'userStatus' && isOutsideStatusMenu) {
                setMenuOpen(null);
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuOpen(null);
            }
        };

        if (menuOpen !== null) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [menuOpen]);

    const fetchUsers = async () => {
        try {
            const response = await fetchWithAuth("/api/users");
            const data = await response.json();

            if (data.success) {
                setUsers(data.users);
            } else {
                toast.error(data.message || t("errors.loadFailed"));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(t("errors.loadFailed"));
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteUser = async (user: User) => {
        setUserToDelete(user);
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        setShowDeleteDialog(false);

        try {
            toast.promise(
                fetchWithAuth(`/api/users/${userToDelete.id}`, {
                    method: "DELETE",
                }).then(async (response) => {
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.message);
                    }
                    await fetchUsers();
                    setUserToDelete(null);
                    return data;
                }),
                {
                    loading: t("actions.delete.deleting"),
                    success: t("actions.delete.success"),
                    error: t("actions.delete.error"),
                }
            );
        } catch (error) {
            console.error("Error deleting user:", error);
            setUserToDelete(null);
        }
    };

    const updateUser = async (userId: number, updates: any, loadingMessage: string) => {
        try {
            toast.promise(
                fetchWithAuth(`/api/users/${userId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updates),
                }).then(async (response) => {
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.message);
                    }
                    await fetchUsers();
                    return data;
                }),
                {
                    loading: loadingMessage,
                    success: updates.status ? t("actions.changeStatus.success") : t("actions.changeType.success"),
                    error: updates.status ? t("actions.changeStatus.error") : t("actions.changeType.error"),
                }
            );
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            user.company_name.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchesType = filterType === "all" || user.user_type === filterType;
        const matchesStatus = filterStatus === "all" || user.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const stats = {
        total: users.length,
        active: users.filter((u) => u.status === "active").length,
        pending: users.filter((u) => u.status === "pending").length,
        blocked: users.filter((u) => u.status === "blocked").length,
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
            active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            stopped: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
            blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        };
        return badges[status] || badges.active;
    };

    const getUserTypeIcon = (type: UserType) => {
        switch (type) {
            case "admin":
                return <Shield className="h-4 w-4" />;
            case "observer":
                return <Eye className="h-4 w-4" />;
            default:
                return <UserIcon className="h-4 w-4" />;
        }
    };

    const getUserTypeBadge = (type: UserType) => {
        const badges: Record<string, string> = {
            admin: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
            observer: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
            regular: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
        return badges[type] || badges.regular;
    };

    const formatCreatedDate = (dateString: string): string => {
        // MySQL returns UTC timestamps (due to SET time_zone = '+00:00')
        // Parse as UTC and convert to KST (UTC+9)
        const utcDate = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
        const kstTimestamp = utcDate.getTime() + (9 * 60 * 60 * 1000);
        const kstDate = new Date(kstTimestamp);

        // Get current date in KST
        const now = new Date();
        const kstNowTimestamp = now.getTime() + (9 * 60 * 60 * 1000);
        const kstNow = new Date(kstNowTimestamp);

        // Extract date components using UTC methods to avoid browser timezone issues
        // After adding 9 hours, use UTC methods to get the KST date components
        const kstYear = kstDate.getUTCFullYear();
        const kstMonth = kstDate.getUTCMonth();
        const kstDay = kstDate.getUTCDate();

        const todayYear = kstNow.getUTCFullYear();
        const todayMonth = kstNow.getUTCMonth();
        const todayDay = kstNow.getUTCDate();

        // Compare dates
        if (kstYear === todayYear && kstMonth === todayMonth && kstDay === todayDay) {
            return "today";
        } else {
            // Calculate yesterday in KST
            const yesterdayDate = new Date(kstNowTimestamp - (24 * 60 * 60 * 1000));
            const yesterdayYear = yesterdayDate.getUTCFullYear();
            const yesterdayMonth = yesterdayDate.getUTCMonth();
            const yesterdayDay = yesterdayDate.getUTCDate();

            if (kstYear === yesterdayYear && kstMonth === yesterdayMonth && kstDay === yesterdayDay) {
                return "yesterday";
            } else {
                // Format as DD/MM/YY in KST
                const day = String(kstDay).padStart(2, '0');
                const month = String(kstMonth + 1).padStart(2, '0');
                const year = kstYear.toString().slice(-2);
                return `${day}/${month}/${year}`;
            }
        }
    };

    return (
        <div>
            {loading && (
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600"></div>
                        <p className="text-gray-600">{t("loading")}</p>
                    </div>
                </div>
            )}

            {!loading && (
                <div className="p-4 sm:p-6 lg:p-8">
                    {/* Header */}
                    <div className="mb-4 sm:mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t("title")}</h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">{t("subtitle")}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("summary.totalUsers")}</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <p className="text-xs text-muted-foreground">{t("summary.allAccounts")}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("summary.activeUsers")}</CardTitle>
                                <UserCheck className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.active}</div>
                                <p className="text-xs text-muted-foreground">{t("summary.currentlyActive")}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("summary.pendingApprovals")}</CardTitle>
                                <UserPlus className="h-4 w-4 text-yellow-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.pending}</div>
                                <p className="text-xs text-muted-foreground">{t("summary.awaitingApproval")}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t("summary.blockedUsers")}</CardTitle>
                                <UserX className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.blocked}</div>
                                <p className="text-xs text-muted-foreground">{t("summary.accessRestricted")}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters and Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-4 sm:p-6">
                            <div className="mb-6 flex flex-col gap-4 md:flex-row">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        placeholder={t("filters.searchPlaceholder")}
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="w-full md:w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                                        <SelectItem value="admin">{t("userTypes.admin")}</SelectItem>
                                        <SelectItem value="observer">{t("userTypes.observer")}</SelectItem>
                                        <SelectItem value="regular">{t("userTypes.regular")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-full md:w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                                        <SelectItem value="pending">{t("status.pending")}</SelectItem>
                                        <SelectItem value="active">{t("status.active")}</SelectItem>
                                        <SelectItem value="stopped">{t("status.stopped")}</SelectItem>
                                        <SelectItem value="blocked">{t("status.blocked")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Table (desktop) */}
                            <div className="overflow-x-auto hidden lg:block">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left text-sm font-medium text-gray-500">
                                            <th className="pb-3">{t("table.email")}</th>
                                            <th className="pb-3">{t("table.companyName")}</th>
                                            <th className="pb-3">{t("table.userType")}</th>
                                            <th className="pb-3">{t("table.status")}</th>
                                            <th className="pb-3">{t("table.lastLogin")}</th>
                                            <th className="pb-3">{t("table.createdAt")}</th>
                                            <th className="pb-3 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-gray-500">
                                                    {t("table.noUsers")}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="py-4">
                                                        <div className="font-medium">{user.email}</div>
                                                    </td>
                                                    <td className="py-4">{user.company_name}</td>
                                                    <td className="py-4">
                                                        <div className="relative" ref={menuOpen?.userId === user.id && menuOpen?.type === 'userType' ? typeMenuRef : null}>
                                                            <button
                                                                onClick={(e) => {
                                                                    if (!canUpdateUsers) return;
                                                                    e.stopPropagation();
                                                                    const button = e.currentTarget as HTMLElement;
                                                                    const rect = button.getBoundingClientRect();
                                                                    setMenuPosition({
                                                                        top: rect.bottom + 4,
                                                                        right: window.innerWidth - rect.right
                                                                    });
                                                                    setMenuOpen(menuOpen?.userId === user.id && menuOpen?.type === 'userType' ? null : { userId: user.id, type: 'userType' });
                                                                }}
                                                                disabled={!canUpdateUsers}
                                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${canUpdateUsers ? 'cursor-pointer hover:opacity-80 hover:scale-105' : 'cursor-default opacity-60'} ${getUserTypeBadge(user.user_type)}`}
                                                                title={canUpdateUsers ? t("table.changeType") : ""}
                                                            >
                                                                {getUserTypeIcon(user.user_type)}
                                                                {t(`userTypes.${user.user_type}`)}
                                                            </button>
                                                            {canUpdateUsers && menuOpen?.userId === user.id && menuOpen?.type === 'userType' && menuPosition && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-40"
                                                                        onClick={() => setMenuOpen(null)}
                                                                    />
                                                                    <div
                                                                        className="fixed w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[60] dark:bg-gray-800 dark:ring-gray-700"
                                                                        style={{
                                                                            top: `${menuPosition.top}px`,
                                                                            right: `${menuPosition.right}px`
                                                                        }}
                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMenuOpen(null);
                                                                                    if (user.user_type !== 'admin') {
                                                                                        updateUser(user.id, { user_type: 'admin' }, t("actions.changeType.updating"));
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                <Shield className="w-4 h-4 text-indigo-600" />
                                                                                {t("userTypes.admin")}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMenuOpen(null);
                                                                                    if (user.user_type !== 'observer') {
                                                                                        updateUser(user.id, { user_type: 'observer' }, t("actions.changeType.updating"));
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                <Eye className="w-4 h-4 text-purple-600" />
                                                                                {t("userTypes.observer")}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMenuOpen(null);
                                                                                    if (user.user_type !== 'regular') {
                                                                                        updateUser(user.id, { user_type: 'regular' }, t("actions.changeType.updating"));
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                <UserIcon className="w-4 h-4 text-green-600" />
                                                                                {t("userTypes.regular")}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="relative" ref={menuOpen?.userId === user.id && menuOpen?.type === 'userStatus' ? statusMenuRef : null}>
                                                            <button
                                                                onClick={(e) => {
                                                                    if (!canUpdateUsers) return;
                                                                    e.stopPropagation();
                                                                    const button = e.currentTarget as HTMLElement;
                                                                    const rect = button.getBoundingClientRect();
                                                                    setMenuPosition({
                                                                        top: rect.bottom + 4,
                                                                        right: window.innerWidth - rect.right
                                                                    });
                                                                    setMenuOpen(menuOpen?.userId === user.id && menuOpen?.type === 'userStatus' ? null : { userId: user.id, type: 'userStatus' });
                                                                }}
                                                                disabled={!canUpdateUsers}
                                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${canUpdateUsers ? 'cursor-pointer hover:opacity-80 hover:scale-105' : 'cursor-default opacity-60'} ${getStatusBadge(user.status)}`}
                                                                title={canUpdateUsers ? t("table.changeStatus") : ""}
                                                            >
                                                                {t(`status.${user.status}`)}
                                                            </button>
                                                            {canUpdateUsers && menuOpen?.userId === user.id && menuOpen?.type === 'userStatus' && menuPosition && (
                                                                <>
                                                                    <div
                                                                        className="fixed inset-0 z-40"
                                                                        onClick={() => setMenuOpen(null)}
                                                                    />
                                                                    <div
                                                                        className="fixed w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[60] dark:bg-gray-800 dark:ring-gray-700"
                                                                        style={{
                                                                            top: `${menuPosition.top}px`,
                                                                            right: `${menuPosition.right}px`
                                                                        }}
                                                                    >
                                                                        <div className="py-1">
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMenuOpen(null);
                                                                                    if (user.status !== 'pending') {
                                                                                        updateUser(user.id, { status: 'pending' }, t("actions.changeStatus.updating"));
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                {t("status.pending")}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMenuOpen(null);
                                                                                    if (user.status !== 'active') {
                                                                                        updateUser(user.id, { status: 'active' }, t("actions.changeStatus.updating"));
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                {t("status.active")}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMenuOpen(null);
                                                                                    if (user.status !== 'stopped') {
                                                                                        updateUser(user.id, { status: 'stopped' }, t("actions.changeStatus.updating"));
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                {t("status.stopped")}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setMenuOpen(null);
                                                                                    if (user.status !== 'blocked') {
                                                                                        updateUser(user.id, { status: 'blocked' }, t("actions.changeStatus.updating"));
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left dark:text-red-400 dark:hover:bg-red-900/20"
                                                                            >
                                                                                {t("status.blocked")}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-sm text-gray-600">
                                                        {user.last_login_at
                                                            ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                                                            : t("table.never")}
                                                    </td>
                                                    <td className="py-4 text-sm text-gray-600">
                                                        {formatCreatedDate(user.created_at)}
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        {canDeleteUsers && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user)}
                                                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                                                aria-label={t("table.deleteUser")}
                                                                title={t("table.deleteUser")}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Cards (mobile/tablet) */}
                            <div className="lg:hidden space-y-4">
                                {filteredUsers.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                                        {t("table.noUsers")}
                                    </div>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <div key={user.id} className="border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm bg-white hover:shadow-md transition-shadow">
                                            {/* First line: Email (full width) */}
                                            <div className="mb-3">
                                                <div className="font-semibold text-base text-gray-900 break-words">{user.email}</div>
                                            </div>

                                            {/* Second line: Status button (left) and User type (right) */}
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <div className="relative flex-shrink-0" ref={menuOpen?.userId === user.id && menuOpen?.type === 'userStatus' ? statusMenuRef : null}>
                                                    <button
                                                        onClick={(e) => {
                                                            if (!canUpdateUsers) return;
                                                            e.stopPropagation();
                                                            const button = e.currentTarget as HTMLElement;
                                                            const rect = button.getBoundingClientRect();
                                                            setMenuPosition({
                                                                top: rect.bottom + 4,
                                                                left: rect.left // Position menu to open rightwards from button's left edge
                                                            });
                                                            setMenuOpen(menuOpen?.userId === user.id && menuOpen?.type === 'userStatus' ? null : { userId: user.id, type: 'userStatus' });
                                                        }}
                                                        disabled={!canUpdateUsers}
                                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${canUpdateUsers ? 'cursor-pointer hover:opacity-80 hover:scale-105' : 'cursor-default opacity-60'} ${getStatusBadge(user.status)}`}
                                                        title={canUpdateUsers ? t("table.changeStatus") : ""}
                                                    >
                                                        {t(`status.${user.status}`)}
                                                    </button>
                                                    {canUpdateUsers && menuOpen?.userId === user.id && menuOpen?.type === 'userStatus' && menuPosition && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-40"
                                                                onClick={() => setMenuOpen(null)}
                                                            />
                                                            <div
                                                                className="fixed w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[60] dark:bg-gray-800 dark:ring-gray-700"
                                                                style={{
                                                                    top: `${menuPosition.top}px`,
                                                                    left: `${menuPosition.left}px`
                                                                }}
                                                            >
                                                                <div className="py-1">
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpen(null);
                                                                            if (user.status !== 'pending') {
                                                                                updateUser(user.id, { status: 'pending' }, t("actions.changeStatus.updating"));
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    >
                                                                        {t("status.pending")}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpen(null);
                                                                            if (user.status !== 'active') {
                                                                                updateUser(user.id, { status: 'active' }, t("actions.changeStatus.updating"));
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    >
                                                                        {t("status.active")}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpen(null);
                                                                            if (user.status !== 'stopped') {
                                                                                updateUser(user.id, { status: 'stopped' }, t("actions.changeStatus.updating"));
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    >
                                                                        {t("status.stopped")}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpen(null);
                                                                            if (user.status !== 'blocked') {
                                                                                updateUser(user.id, { status: 'blocked' }, t("actions.changeStatus.updating"));
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left dark:text-red-400 dark:hover:bg-red-900/20"
                                                                    >
                                                                        {t("status.blocked")}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="relative flex-shrink-0" ref={menuOpen?.userId === user.id && menuOpen?.type === 'userType' ? typeMenuRef : null}>
                                                    <button
                                                        onClick={(e) => {
                                                            if (!canUpdateUsers) return;
                                                            e.stopPropagation();
                                                            const button = e.currentTarget as HTMLElement;
                                                            const rect = button.getBoundingClientRect();
                                                            setMenuPosition({
                                                                top: rect.bottom + 4,
                                                                right: window.innerWidth - rect.right
                                                            });
                                                            setMenuOpen(menuOpen?.userId === user.id && menuOpen?.type === 'userType' ? null : { userId: user.id, type: 'userType' });
                                                        }}
                                                        disabled={!canUpdateUsers}
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${canUpdateUsers ? 'cursor-pointer hover:opacity-80 hover:scale-105' : 'cursor-default opacity-60'} ${getUserTypeBadge(user.user_type)}`}
                                                        title={canUpdateUsers ? t("table.changeType") : ""}
                                                    >
                                                        {getUserTypeIcon(user.user_type)}
                                                        {t(`userTypes.${user.user_type}`)}
                                                    </button>
                                                    {canUpdateUsers && menuOpen?.userId === user.id && menuOpen?.type === 'userType' && menuPosition && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-40"
                                                                onClick={() => setMenuOpen(null)}
                                                            />
                                                            <div
                                                                className="fixed w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[60] dark:bg-gray-800 dark:ring-gray-700"
                                                                style={{
                                                                    top: `${menuPosition.top}px`,
                                                                    right: `${menuPosition.right}px`
                                                                }}
                                                            >
                                                                <div className="py-1">
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpen(null);
                                                                            if (user.user_type !== 'admin') {
                                                                                updateUser(user.id, { user_type: 'admin' }, t("actions.changeType.updating"));
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    >
                                                                        <Shield className="w-4 h-4 text-indigo-600" />
                                                                        {t("userTypes.admin")}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpen(null);
                                                                            if (user.user_type !== 'observer') {
                                                                                updateUser(user.id, { user_type: 'observer' }, t("actions.changeType.updating"));
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    >
                                                                        <Eye className="w-4 h-4 text-purple-600" />
                                                                        {t("userTypes.observer")}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            setMenuOpen(null);
                                                                            if (user.user_type !== 'regular') {
                                                                                updateUser(user.id, { user_type: 'regular' }, t("actions.changeType.updating"));
                                                                            }
                                                                        }}
                                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left dark:text-gray-300 dark:hover:bg-gray-700"
                                                                    >
                                                                        <UserIcon className="w-4 h-4 text-green-600" />
                                                                        {t("userTypes.regular")}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Third line: Last login (left) and Created at (right) */}
                                            <div className="flex items-center justify-between gap-3 py-3 border-t border-gray-100">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t("table.lastLogin")}</div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.last_login_at ? (
                                                            formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
                                                        ) : (
                                                            <span className="text-gray-500">{t("table.never")}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0 text-right">
                                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t("table.createdAt")}</div>
                                                    <div className="text-sm font-medium text-gray-900">{formatCreatedDate(user.created_at)}</div>
                                                </div>
                                            </div>

                                            {/* Footer: Company name (left) and Delete user (right) */}
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                                                <div className="text-sm text-gray-600 break-words flex-1 min-w-0">{user.company_name}</div>
                                                {canDeleteUsers && (
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        {t("actions.deleteUser")}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-full">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <AlertDialogTitle className="text-left">
                                {t("actions.delete.title")}
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-left pt-2">
                            {userToDelete && t("actions.delete.text", { company_name: userToDelete.company_name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("actions.delete.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
                        >
                            {t("actions.delete.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function UserManagementPage() {
    return (
        <ProtectedRoute permission="users:read" showAccessDeniedMessage={true}>
            <UserManagementPageContent />
        </ProtectedRoute>
    );
}


