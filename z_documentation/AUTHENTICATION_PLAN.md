# Authentication & Role-Based Access Control Plan

## Project Overview
Building a complete authentication system with role-based access control (RBAC) for the Admin Panel Analytics application at cosmos.kr.

## Architecture Summary

### Route Structure
```
cosmos.kr/
├── / (root)                    → Main dashboard (requires auth, redirects to /auth if no token)
├── /auth                       → Login/Signup page (public)
├── /admin/*                    → Admin-only routes (tracking link generation + analytics)
├── /analytics                  → Analytics dashboard (both roles, but observers are read-only)
└── /tracking                   → Tracking management (admin only)
```

### User Roles & Permissions

#### Admin Role
- Full access to all features
- Can generate tracking links
- Can view analytics for their own tracking links only
- Can manage tracking configurations
- CRUD operations allowed

#### Observer Role
- Read-only access to analytics data
- Cannot generate or manage tracking links
- Cannot modify any data
- View-only permissions

### Authentication Flow

```
User visits cosmos.kr (/)
    ↓
Check for auth token
    ↓
    ├─ No token → Redirect to /auth (login/signup)
    │       ↓
    │   User logs in with invite code
    │       ↓
    │   Validate credentials with MySQL
    │       ↓
    │   Generate JWT token
    │       ↓
    │   Store token (httpOnly cookie or localStorage)
    │       ↓
    │   Redirect to / based on role
    │
    └─ Has token → Verify token
            ↓
        ├─ Valid → Load dashboard based on role
        │     ├─ Admin: Show sidebar with all options
        │     └─ Observer: Show sidebar with analytics only
        │
        └─ Invalid/Expired → Redirect to /auth
```

## Database Schema (MySQL)

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'observer') NOT NULL,
  invite_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_email (email),
  INDEX idx_role (role)
);
```

### Auth Tokens Table
```sql
CREATE TABLE auth_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
);
```

### Tracking Links Table (Modified)
```sql
CREATE TABLE tracking_links (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,  -- Links owner (admin who created it)
  link_name VARCHAR(255) NOT NULL,
  tracking_code VARCHAR(50) UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_tracking_code (tracking_code)
);
```

### Invite Codes Table
```sql
CREATE TABLE invite_codes (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  role ENUM('admin', 'observer') NOT NULL,
  max_uses INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  expires_at TIMESTAMP NULL,
  created_by VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_code (code)
);
```

## API Endpoints Needed

### Authentication
- `POST /api/auth/signup` - Register new user with invite code
- `POST /api/auth/login` - Login and receive token
- `POST /api/auth/logout` - Invalidate token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh expired token
- `POST /api/auth/verify` - Verify invite code

### Users (Admin only)
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user details
- `PATCH /api/users/:id` - Update user info
- `DELETE /api/users/:id` - Deactivate user

### Tracking Links (Admin only)
- `POST /api/tracking/create` - Create new tracking link (admin only)
- `GET /api/tracking` - List user's tracking links (filtered by user_id)
- `GET /api/tracking/:id` - Get tracking link details
- `PATCH /api/tracking/:id` - Update tracking link (admin only)
- `DELETE /api/tracking/:id` - Delete tracking link (admin only)

### Analytics (Both roles, filtered by ownership)
- `GET /api/analytics/overview` - Dashboard overview (filtered by user's links)
- `GET /api/analytics/:linkId` - Specific link analytics
- `GET /api/analytics/export` - Export analytics data

## Frontend Implementation

### Middleware/Route Protection
Create Next.js middleware to:
1. Check for auth token on protected routes
2. Verify token validity
3. Redirect to /auth if invalid
4. Check user role and permissions
5. Redirect if insufficient permissions

### Context/State Management
- AuthContext: Store user info, role, token
- useAuth hook: Access auth state anywhere
- usePermissions hook: Check if user can perform actions

### Components to Create/Modify

#### New Components
- `ProtectedRoute` - Wrapper for authenticated pages
- `RoleGuard` - Check role permissions
- `PermissionButton` - Show/hide based on permissions
- `UserMenu` - Display user info and logout

#### Modified Components
- `Sidebar` - Show different menu items based on role
- `AuthForm` - Connect to real API
- Layout - Add auth checking

### Page Structure
```
app/
├── layout.tsx (root, with auth checking)
├── page.tsx (dashboard, protected)
├── auth/
│   └── page.tsx (login/signup, public)
├── tracking/
│   ├── page.tsx (list, admin only)
│   ├── create/
│   │   └── page.tsx (create, admin only)
│   └── [id]/
│       └── page.tsx (details, admin only)
├── analytics/
│   ├── page.tsx (overview, both roles)
│   └── [linkId]/
│       └── page.tsx (specific link, both roles)
└── api/
    ├── auth/
    │   ├── signup/route.ts
    │   ├── login/route.ts
    │   ├── logout/route.ts
    │   └── me/route.ts
    ├── tracking/
    │   ├── route.ts (GET, POST)
    │   └── [id]/route.ts (GET, PATCH, DELETE)
    └── analytics/
        └── route.ts
```

## Security Considerations

1. **Password Security**
   - Use bcrypt for password hashing (min 10 rounds)
   - Enforce strong password requirements (min 8 chars, mixed case, numbers)

2. **Token Security**
   - Use JWT with short expiration (15-30 minutes)
   - Implement refresh tokens (7-30 days)
   - Store tokens in httpOnly cookies (not localStorage for production)

3. **API Security**
   - Validate all inputs
   - Sanitize SQL queries (use parameterized queries)
   - Rate limiting on auth endpoints
   - CSRF protection

4. **Role-Based Access**
   - Always verify role on server side
   - Never trust client-side role checks
   - Log permission violations

## Environment Variables Required

```env
# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=admin_panel
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# App
NEXT_PUBLIC_APP_URL=https://cosmos.kr
NODE_ENV=production

# Initial Admin
INITIAL_ADMIN_EMAIL=admin@cosmos.kr
INITIAL_ADMIN_PASSWORD=change-this-password
```

## Implementation Phases

### Phase 1: Database Setup
1. Set up MySQL database
2. Create tables with proper indexes
3. Seed initial admin user
4. Create initial invite codes

### Phase 2: Backend API
1. Set up MySQL connection
2. Create auth API routes (signup, login, logout)
3. Implement JWT token generation/verification
4. Create middleware for route protection
5. Add role-based permission checking

### Phase 3: Frontend Auth
1. Create AuthContext and hooks
2. Build auth interceptor for API calls
3. Implement token refresh logic
4. Add protected route wrapper
5. Update auth form to call real API

### Phase 4: Role-Based UI
1. Modify sidebar based on role
2. Add permission-based component rendering
3. Update tracking pages (admin only)
4. Add user menu with logout
5. Implement data filtering by user_id

### Phase 5: Testing & Security
1. Test all auth flows
2. Test role permissions
3. Security audit
4. Add rate limiting
5. Add logging

## Success Criteria

- ✅ Users can sign up with valid invite code
- ✅ Users can log in and receive token
- ✅ Token automatically refreshes before expiration
- ✅ Admins can access all features
- ✅ Observers only see analytics (read-only)
- ✅ Admins only see their own tracking links
- ✅ Unauthorized users redirect to /auth
- ✅ Invalid/expired tokens handled gracefully
- ✅ Logout properly clears token
- ✅ All API endpoints properly secured

## Notes

- Current invite code "ADMIN2025" should be stored in database
- Create invite code management system for admins later
- Consider adding email verification in future
- Consider 2FA for admin accounts in future
- Plan for horizontal scaling with session storage (Redis)


