# AI Agent Implementation Prompt

## Context
You are implementing a complete authentication and role-based access control system for an Admin Panel Analytics application. The application is built with Next.js 14, TypeScript, Tailwind CSS, and uses MySQL for data storage.

## Current State
The project already has:
- ✅ Basic UI components (Button, Input, Card, Label, etc.)
- ✅ Auth page UI at `/auth` with login/signup forms
- ✅ Role selection UI (Admin/Observer)
- ✅ Invite code validation (client-side only)
- ✅ Sidebar navigation
- ✅ Dashboard pages (Analytics, Tracking)
- ✅ ClickHouse integration for analytics data
- ✅ Tracking pixel implementation

## What Needs to Be Built

### 1. MySQL Database Setup
**Task**: Set up MySQL database with proper schema for user authentication and tracking link ownership.

**Requirements**:
- Create database connection using mysql2 or @planetscale/database
- Create tables: users, auth_tokens, tracking_links (modified), invite_codes
- Add user_id foreign key to existing tracking_links table
- Create database seed script for initial admin user
- Add database migration scripts

**Files to Create**:
- `lib/db/mysql.ts` - Database connection
- `lib/db/schema.sql` - Database schema
- `scripts/init-mysql.js` - Initialize database
- `scripts/seed-users.js` - Seed initial data

### 2. Backend Authentication API
**Task**: Build secure authentication APIs with JWT tokens and password hashing.

**Requirements**:
- Implement bcrypt for password hashing
- Create JWT token generation and verification
- Build refresh token logic
- Add rate limiting for auth endpoints
- Validate invite codes against database

**Files to Create**:
- `lib/auth/jwt.ts` - JWT utilities
- `lib/auth/password.ts` - Password hashing utilities
- `lib/auth/middleware.ts` - Auth middleware
- `app/api/auth/signup/route.ts` - Signup endpoint
- `app/api/auth/login/route.ts` - Login endpoint
- `app/api/auth/logout/route.ts` - Logout endpoint
- `app/api/auth/me/route.ts` - Get current user
- `app/api/auth/refresh/route.ts` - Token refresh

### 3. Frontend Authentication System
**Task**: Integrate auth form with backend and implement client-side auth state management.

**Requirements**:
- Create AuthContext for global state
- Build useAuth hook for easy access
- Implement automatic token refresh
- Add API interceptor for adding auth headers
- Handle token expiration gracefully

**Files to Create**:
- `lib/contexts/auth-context.tsx` - Auth context provider
- `lib/hooks/use-auth.ts` - Auth hook
- `lib/api/client.ts` - API client with auth interceptor

**Files to Modify**:
- `components/auth-form.tsx` - Connect to real API
- `app/layout.tsx` - Wrap with AuthProvider

### 4. Route Protection & Middleware
**Task**: Protect routes and implement role-based access control.

**Requirements**:
- Create Next.js middleware to check auth on all routes
- Redirect to /auth if no valid token
- Check user role and redirect if insufficient permissions
- Allow public access only to /auth route

**Files to Create**:
- `middleware.ts` (root level) - Route protection
- `lib/auth/permissions.ts` - Permission checking utilities
- `components/protected-route.tsx` - Client-side route guard
- `components/role-guard.tsx` - Role-based component wrapper

### 5. Role-Based UI Updates
**Task**: Update UI to show different features based on user role.

**Requirements**:
- Modify sidebar to show/hide items based on role
  - Admin: Dashboard, Analytics, Tracking, Settings
  - Observer: Dashboard, Analytics only
- Add user menu in header with logout button
- Add permission checks to all action buttons
- Show user name and role in UI

**Files to Modify**:
- `components/sidebar.tsx` - Role-based menu items
- `app/page.tsx` - Add user info display
- `app/tracking/page.tsx` - Admin only access

**Files to Create**:
- `components/user-menu.tsx` - User dropdown menu
- `components/permission-button.tsx` - Permission-aware button

### 6. Tracking Link Ownership
**Task**: Associate tracking links with users and filter by ownership.

**Requirements**:
- Add user_id to tracking link creation
- Filter tracking links by current user's ID
- Update analytics to show only user's link data
- Prevent users from accessing other users' links

**Files to Modify**:
- `app/api/tracking/route.ts` - Add user_id filtering
- `app/tracking/page.tsx` - Show only user's links
- Analytics pages - Filter by user's tracking links

### 7. Environment & Configuration
**Task**: Set up environment variables and configuration.

**Requirements**:
- Add MySQL connection variables
- Add JWT secret keys
- Configure token expiration times
- Set up CORS if needed

**Files to Modify**:
- `.env.local` - Add new environment variables

**Example .env.local**:
```env
# MySQL Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=admin_panel
MYSQL_USER=root
MYSQL_PASSWORD=your_password

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
REFRESH_TOKEN_SECRET=your-refresh-token-secret-key-32-chars
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_EXPIRES_IN=7d

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Initial Admin (for seeding)
INITIAL_ADMIN_EMAIL=admin@cosmos.kr
INITIAL_ADMIN_PASSWORD=Admin123!
INITIAL_ADMIN_CODE=ADMIN2025
```

## Implementation Order

Follow this exact order to avoid dependency issues:

1. **Database Layer** (Day 1)
   - Set up MySQL connection
   - Create database schema
   - Write migration scripts
   - Seed initial data

2. **Auth Utilities** (Day 1)
   - JWT token generation/verification
   - Password hashing utilities
   - Middleware functions

3. **Auth API Endpoints** (Day 2)
   - Signup endpoint
   - Login endpoint
   - Logout endpoint
   - Me endpoint (get current user)
   - Refresh token endpoint

4. **Frontend Auth State** (Day 2)
   - AuthContext provider
   - useAuth hook
   - API client with interceptor
   - Update auth form to use API

5. **Route Protection** (Day 3)
   - Next.js middleware
   - Protected route components
   - Role guards
   - Redirect logic

6. **UI Updates** (Day 3)
   - Sidebar role-based rendering
   - User menu component
   - Logout functionality
   - Permission-based buttons

7. **Data Ownership** (Day 4)
   - Update tracking link creation
   - Filter queries by user_id
   - Update analytics filtering
   - Test permission boundaries

8. **Testing & Polish** (Day 4)
   - Test all auth flows
   - Test role permissions
   - Handle edge cases
   - Add loading states
   - Improve error messages

## Key Technical Decisions

### Token Storage
- **Development**: Use localStorage for easier debugging
- **Production**: Use httpOnly cookies for better security
- Implement automatic token refresh before expiration

### Database Choice
- Using MySQL (not ClickHouse) for user data because:
  - Better for transactional data
  - ACID compliance needed for auth
  - Better suited for relational user data
- ClickHouse remains for analytics events only

### Password Requirements
- Minimum 6 characters (as currently implemented)
- Consider adding: uppercase, lowercase, number requirements
- Hash with bcrypt (cost factor: 10)

### Token Expiration
- Access token: 30 minutes (short-lived)
- Refresh token: 7 days
- Auto-refresh when < 5 minutes remaining

### Error Handling
- Return user-friendly messages
- Log detailed errors server-side
- Never expose sensitive info in errors
- Use proper HTTP status codes

## Dependencies to Install

```bash
npm install mysql2 jsonwebtoken bcryptjs
npm install @types/jsonwebtoken @types/bcryptjs --save-dev
```

Or if using PlanetScale:
```bash
npm install @planetscale/database
```

## Testing Checklist

After implementation, verify:

- [ ] Can sign up with valid invite code
- [ ] Cannot sign up with invalid invite code
- [ ] Can log in with correct credentials
- [ ] Cannot log in with wrong password
- [ ] Token refreshes automatically
- [ ] Logout clears token and redirects
- [ ] Protected routes redirect when not authenticated
- [ ] Admin can access tracking pages
- [ ] Observer cannot access tracking pages
- [ ] Admin sees only their tracking links
- [ ] Analytics filtered by user's links
- [ ] Sidebar shows correct items per role
- [ ] User menu displays correct info
- [ ] Invalid tokens handled gracefully
- [ ] Expired tokens trigger re-login

## Common Pitfalls to Avoid

1. **Don't** store JWT secret in code - use environment variables
2. **Don't** trust client-side role checks - always verify server-side
3. **Don't** forget to hash passwords - never store plain text
4. **Don't** use localStorage in production - prefer httpOnly cookies
5. **Don't** expose user_id in URL parameters - use token claims
6. **Don't** forget to validate invite codes server-side
7. **Don't** skip SQL injection prevention - use parameterized queries
8. **Don't** forget to add indexes to frequently queried columns
9. **Don't** return detailed error messages to client - log them instead
10. **Don't** forget to implement rate limiting on auth endpoints

## Success Criteria

The implementation is complete when:

1. ✅ New users can sign up with invite code
2. ✅ Users can log in and stay authenticated
3. ✅ Main page (/) redirects to /auth when not logged in
4. ✅ Authenticated users see their dashboard
5. ✅ Admin users can create tracking links
6. ✅ Observer users cannot access tracking pages
7. ✅ Each admin sees only their own tracking links
8. ✅ Analytics shows data only for user's links
9. ✅ Logout works and clears session
10. ✅ Token refresh happens automatically
11. ✅ Invalid/expired tokens handled properly
12. ✅ All routes properly protected
13. ✅ No console errors or warnings
14. ✅ All TypeScript types properly defined

## Reference Documentation

Refer to `AUTHENTICATION_PLAN.md` for:
- Complete database schema
- API endpoint specifications
- Detailed authentication flow
- Security considerations
- Architecture diagrams

## Questions to Ask Before Starting

1. Do you have MySQL access credentials?
2. Should we use PlanetScale or regular MySQL?
3. What should be the initial admin credentials?
4. Do you want email verification (future feature)?
5. Should observers see all analytics or filtered data?

## Final Notes

- Follow the existing code style and patterns
- Use TypeScript strictly - no `any` types
- Add proper error handling everywhere
- Write clear comments for complex logic
- Test each feature as you build it
- Commit after each major milestone
- Keep security as top priority

Good luck! 🚀

