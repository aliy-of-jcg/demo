# Quick Start Guide - Authentication System

## Overview
This document provides a quick reference for implementing the authentication and role-based access control system.

## Current Status: ✅ UI Complete, 🔨 Backend Needed

### What's Done
- [x] Login/Signup UI at `/auth`
- [x] Role selection (Admin/Observer)
- [x] Client-side invite code validation
- [x] Footer with company info
- [x] Dashboard layout with sidebar
- [x] Analytics pages
- [x] Tracking pages UI
- [x] ClickHouse integration

### What's Needed
- [ ] MySQL database setup
- [ ] User authentication API
- [ ] JWT token management
- [ ] Route protection middleware
- [ ] Role-based UI rendering
- [ ] Tracking link ownership
- [ ] Data filtering by user

## Architecture Summary

```
Route Flow:
cosmos.kr (/) → Check Token → Valid? → Dashboard : Redirect to /auth

User Roles:
- Admin: Full access (create tracking links + view analytics)
- Observer: Read-only (view analytics only)

Database:
- MySQL: User data, auth tokens, tracking ownership
- ClickHouse: Analytics events (existing)
```

## File Structure

```
z_documentation/
├── AUTHENTICATION_PLAN.md      ← Complete technical plan (READ FIRST)
├── IMPLEMENTATION_PROMPT.md    ← AI agent instructions (USE THIS TO BUILD)
└── QUICK_START.md             ← This file (quick reference)
```

## How to Use These Documents

### For Planning & Review
**Read**: `AUTHENTICATION_PLAN.md`
- Complete architecture
- Database schema
- API specifications
- Security considerations
- Implementation phases

### For Implementation
**Use**: `IMPLEMENTATION_PROMPT.md`
- Step-by-step instructions
- File-by-file guide
- Code examples
- Testing checklist
- Common pitfalls

### For Quick Reference
**Use**: This file (`QUICK_START.md`)
- Current status
- Next steps
- Key decisions

## Next Steps (When Ready to Build)

1. **Read the Plan**
   ```bash
   Open: z_documentation/AUTHENTICATION_PLAN.md
   Review: Database schema, API endpoints, auth flow
   ```

2. **Prepare Environment**
   ```bash
   # Install dependencies
   npm install mysql2 jsonwebtoken bcryptjs
   npm install @types/jsonwebtoken @types/bcryptjs --save-dev
   
   # Set up MySQL database
   # Create .env.local with credentials
   ```

3. **Use the Implementation Prompt**
   ```bash
   Open: z_documentation/IMPLEMENTATION_PROMPT.md
   
   # Give this prompt to AI agent:
   "Implement the authentication system following the plan in 
   IMPLEMENTATION_PROMPT.md. Start with Phase 1: Database Setup."
   ```

4. **Follow Implementation Order**
   - Day 1: Database + Auth utilities
   - Day 2: Auth API + Frontend state
   - Day 3: Route protection + UI updates
   - Day 4: Data ownership + Testing

## Key Decisions Made

| Decision | Choice | Reason |
|----------|--------|--------|
| Database for users | MySQL | ACID compliance, relational data |
| Database for analytics | ClickHouse | High-performance analytics (existing) |
| Token storage | localStorage (dev) / httpOnly cookies (prod) | Security vs debugging |
| Token expiration | 30min access, 7d refresh | Balance security and UX |
| Route structure | / → dashboard, /auth → login | Clean, standard pattern |
| Admin restrictions | See only own links | Multi-tenant data isolation |

## Environment Variables Needed

```env
# MySQL
MYSQL_HOST=localhost
MYSQL_DATABASE=admin_panel
MYSQL_USER=root
MYSQL_PASSWORD=your_password

# JWT
JWT_SECRET=generate-with-openssl-rand-base64-32
REFRESH_TOKEN_SECRET=generate-with-openssl-rand-base64-32

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Quick Commands

```bash
# Initialize MySQL database
npm run mysql:init

# Seed initial admin user
npm run mysql:seed

# Start dev server
npm run dev

# Test auth flow
# 1. Go to http://localhost:3000
# 2. Should redirect to /auth
# 3. Sign up with invite code: ADMIN2025
# 4. Should redirect back to /
```

## Contact & Support

- Project: Admin Panel Analytics
- Company: jcglobeway
- Website: https://jcg.asia
- Email: jcg@gmail.com
- Phone: 01012345678

## Useful Prompts for AI Agent

### Start Implementation
```
"I want to implement the authentication system documented in 
z_documentation/IMPLEMENTATION_PROMPT.md. Let's start with Phase 1: 
Database Setup. Create the MySQL connection file and schema."
```

### Continue Implementation
```
"Continue with Phase 2 of the authentication implementation. 
Build the JWT utilities and auth API endpoints as specified 
in IMPLEMENTATION_PROMPT.md."
```

### Debug Issues
```
"I'm having issues with [specific issue]. Refer to 
AUTHENTICATION_PLAN.md section on [relevant section] and help 
me debug this."
```

### Test Implementation
```
"Test the authentication system against the checklist in 
IMPLEMENTATION_PROMPT.md. Verify all success criteria are met."
```

---

**Note**: Always refer back to `AUTHENTICATION_PLAN.md` for detailed specifications and `IMPLEMENTATION_PROMPT.md` for step-by-step implementation guidance.

Last Updated: 2025-10-17


