# Gatekeeping Authorization System Implementation Plan

## Overview

Build a comprehensive RBAC (Role-Based Access Control) system that centralizes authorization logic, eliminates code duplication, and provides consistent access control across API routes, pages, and UI components.

## Current State Analysis

### Existing Infrastructure (Reuse)

- `lib/jwt.ts` - JWT token verification (`verifyToken()`)
- `lib/types.ts` - User types and `USER_PERMISSIONS` structure (defined but unused)
- Status checking logic (scattered across login/validate routes)
- Rate limiting utility (`lib/rate-limit.ts`)

### Gaps to Address

- No centralized permission checking
- Duplicate `checkAuth()` logic in multiple components
- Manual authorization checks in every API route
- No reusable authorization middleware
- No React hooks for permission checking
- Status validation not centralized

## Phase 1: Core Authorization Infrastructure (Critical)

### 1.1 Permission System Foundation

**Files to Create:**

- `lib/permissions/types.ts` - Permission types and interfaces
- `lib/permissions/definitions.ts` - Permission matrix (resource + action)
- `lib/permissions/checker.ts` - Core permission checking functions

**Key Components:**

- Resource-action permission model (e.g., `campaigns:create`, `users:manage`)
- Permission inheritance based on role hierarchy
- Support for status-based access restrictions

### 1.2 Authorization Utilities

**Files to Create:**

- `lib/auth/status-checker.ts` - Centralized user status validation
- `lib/auth/api-middleware.ts` - Reusable API route authorization wrapper
- `lib/auth/types.ts` - Authorization-related types

**Key Functions:**

- `isUserActive(user)` - Check if user status allows access
- `requireAuth()` - Higher-order function for API route protection
- `requirePermission(permission)` - Permission-based route protection
- `requireRole(roles[])` - Role-based route protection

### 1.3 React Hooks for Client-Side

**Files to Create:**

- `lib/hooks/useAuth.ts` - Authentication state hook (consolidates existing `checkAuth()` logic)
- `lib/hooks/usePermission.ts` - Permission checking hook for components
- `lib/hooks/useRole.ts` - Role checking hook

**Consolidation:**

- Merge duplicate `checkAuth()` functions from `layout-wrapper.tsx` and `auth/page.tsx`
- Provide consistent authentication state across components

### 1.4 Route Protection

**Files to Modify:**

- `middleware.ts` - Add route-level authorization checks
- Create `lib/auth/route-guard.ts` - Page-level protection utilities

**Implementation:**

- Protect routes based on authentication status
- Optional permission-based route protection
- Redirect unauthorized users appropriately

## Phase 2: Integration & Enhanced Features

### 2.1 API Route Migration

**Strategy:**

- Migrate all API routes to use new authorization middleware
- Replace manual `verifyToken()` + role checks with centralized functions
- Ensure consistent error responses

**Key Routes to Update:**

- `/api/users/*` (already has owner checks - standardize)
- `/api/campaigns/*` (add permission checks)
- `/api/courses/*` (add permission checks)
- `/api/analytics/*` (add permission checks)
- All other protected routes

### 2.2 Component Authorization

**Files to Create:**

- `components/auth/ProtectedComponent.tsx` - Wrapper for permission-based UI rendering
- `components/auth/ProtectedRoute.tsx` - Page-level protection component

**Files to Update:**

- `components/sidebar.tsx` - Use `usePermission()` hook instead of manual checks
- `app/user-management/page.tsx` - Use centralized authorization

### 2.3 Resource Ownership

**Implementation:**

- Add ownership checks to permission system
- Support for "own" vs "all" resource access (e.g., `campaigns:update:own`)
- Database-level ownership validation

### 2.4 Audit Logging

**Files to Create:**

- `lib/auth/audit-logger.ts` - Authorization event logging

**Features:**

- Log successful/failed authorization attempts
- Track permission checks
- Log user status changes

## Phase 3: Advanced Features (Optional)

### 3.1 Dynamic Permissions

- Support for custom role permissions
- Runtime permission assignment

### 3.2 Feature Flags Integration

- Integrate with feature flag system
- Permission-based feature gating

### 3.3 Enhanced RBAC

- Team-based permissions
- Custom role creation
- Permission inheritance rules

## Permission Matrix Structure

### Resources

- `users` - User management
- `campaigns` - Campaign CRUD operations
- `courses` - Course management
- `analytics` - Analytics viewing
- `utm_codes` - UTM link management
- `settings` - System settings
- `system` - System administration

### Actions

- `create` - Create new resource
- `read` - View resource
- `update` - Modify resource
- `delete` - Remove resource
- `manage` - Full CRUD access
- `export` - Export data

### Role Permissions (Initial)

- **Owner**: All permissions on all resources
- **Admin**: All except user management, limited settings
- **Observer**: Read-only on analytics, campaigns, courses
- **Regular**: Limited read access (define scope)

## Status-Based Access Control

### Status Hierarchy

1. Check user status BEFORE permissions
2. Status rules:

   - `active` - Full access based on permissions
   - `pending` - No access (awaiting approval)
   - `stopped` - Read-only access
   - `blocked` - No access (security restriction)
   - `hidden` - No access (soft-deleted)

## Implementation Priority

### Must-Have (Phase 1)

1. Permission checking library
2. Authorization middleware for API routes
3. Status validation utility
4. React authentication hook (consolidate existing)

### Should-Have (Phase 2)

1. Permission-based UI components
2. Route protection enhancements
3. Resource ownership checks
4. Audit logging foundation

### Nice-to-Have (Phase 3)

1. Dynamic permissions
2. Feature flag integration
3. Advanced RBAC features

## Migration Strategy

### Backward Compatibility

- Keep existing JWT verification working
- Gradual migration of routes (one at a time)
- Maintain existing user types and statuses
- No breaking changes to current authentication flow

### Testing Approach

- Unit tests for permission checking logic
- Integration tests for authorization middleware
- Component tests for permission hooks
- E2E tests for protected routes

## File Structure

```
lib/
├── permissions/
│   ├── types.ts
│   ├── definitions.ts
│   └── checker.ts
├── auth/
│   ├── types.ts
│   ├── status-checker.ts
│   ├── api-middleware.ts
│   ├── route-guard.ts
│   └── audit-logger.ts
└── hooks/
    ├── useAuth.ts
    ├── usePermission.ts
    └── useRole.ts

components/
└── auth/
    ├── ProtectedComponent.tsx
    └── ProtectedRoute.tsx
```

## Success Criteria

1. All API routes use centralized authorization
2. No duplicate authorization logic in codebase
3. Consistent permission checking across frontend/backend
4. Clear separation of authentication vs authorization
5. Status checks happen before permission checks
6. Audit trail for authorization events
7. Type-safe permission system
8. Reusable hooks and utilities

## To-dos

- [ ] Create permission system foundation: types.ts, definitions.ts, checker.ts with resource-action model
- [ ] Create authorization utilities: status-checker.ts, api-middleware.ts for centralized auth
- [ ] Create React hooks: useAuth.ts (consolidate checkAuth), usePermission.ts, useRole.ts
- [ ] Enhance middleware.ts and create route-guard.ts for route-level protection
- [ ] Migrate API routes to use new authorization middleware (starting with /api/users, /api/campaigns)
- [ ] Create ProtectedComponent and ProtectedRoute components, update sidebar.tsx to use hooks
- [ ] Add resource ownership checks (own vs all access patterns)
- [ ] Implement audit logging for authorization events

