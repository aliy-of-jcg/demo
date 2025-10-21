// User types
export type UserType = 'owner' | 'admin' | 'observer' | 'regular';
export type UserStatus = 'active' | 'inactive' | 'pending';

// Database user model
export interface User {
  id: number;
  uuid: string;
  company_name: string;
  email: string;
  password_hash: string;
  contact_number: string;
  user_type: UserType;
  status: UserStatus;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// API Request/Response types
export interface SignupRequest {
  company_name: string;
  email: string;
  password: string;
  contact_number: string;
  user_type: UserType; // admin, observer, or regular (owner is manual only)
}

export interface SignupResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    uuid: string;
    email: string;
    company_name: string;
    user_type: UserType;
  };
  token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    uuid: string;
    email: string;
    company_name: string;
    contact_number: string;
    user_type: UserType;
  };
  token?: string;
}

// User permissions based on type
export interface UserPermissions {
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canManageLinks: boolean;
  canManageSettings: boolean;
  canExportData: boolean;
  canDeleteAccount: boolean;
}

// Permission definitions (to be implemented later)
export const USER_PERMISSIONS: Record<UserType, UserPermissions> = {
  owner: {
    canViewAnalytics: true,
    canManageUsers: true,
    canManageLinks: true,
    canManageSettings: true,
    canExportData: true,
    canDeleteAccount: true,
  },
  admin: {
    canViewAnalytics: true,
    canManageUsers: true,
    canManageLinks: true,
    canManageSettings: true,
    canExportData: true,
    canDeleteAccount: false,
  },
  observer: {
    canViewAnalytics: true,
    canManageUsers: false,
    canManageLinks: false,
    canManageSettings: false,
    canExportData: false,
    canDeleteAccount: false,
  },
  regular: {
    canViewAnalytics: true, // observer features for now
    canManageUsers: false,
    canManageLinks: false,
    canManageSettings: false,
    canExportData: false,
    canDeleteAccount: false,
  },
};

