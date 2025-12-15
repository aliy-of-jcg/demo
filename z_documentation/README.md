# CosMos AI - Marketing Analytics Platform

A comprehensive marketing analytics and campaign management platform built with Next.js 14, featuring dual database architecture (ClickHouse + MySQL) for high-performance analytics and robust data management.

## ✨ Features

### Core Features
- 📊 **Real-time Dashboard** with live campaign metrics and performance insights
- 🎯 **Campaign Management** - Create, edit, and track marketing campaigns across multiple channels
- 📈 **Advanced Analytics** - Multiple analysis modules for deep insights:
  - Campaign Performance Analysis
  - Channel Performance Tracking
  - Page Flow Analysis
  - Environment Analysis (devices, browsers, OS)
  - Time-based Visitor Patterns (KST timezone support)
  - Returning User Analysis
  - Session Journeys - Complete page-by-page user journey visualization
  - Tracked Websites Management - Domain-level tracking and statistics
- 🔗 **UTM Tools** - Link generator and tracking utilities with custom tracking codes
  - UTM Link List & Management
  - UTM Link Generator (dedicated page)
- 📱 **Device & Environment Analysis** - Comprehensive user device, browser, and OS detection
- 🌍 **Multi-Platform Support** - Track across Telegram, Kakao, Naver, Google, and more
- 📄 **PDF Export** - Export analytics dashboards and reports to PDF format
- 🌐 **Internationalization (i18n)** - Multi-language support using next-intl
- 🔗 **Short URL Tracking** - Tracking link redirection via `/t/[code]` route
- 💚 **Health Check API** - System status monitoring endpoint

### Technical Features
- ⚡ **Dual Database Architecture** - ClickHouse for analytics + MySQL for app data
- 🔐 **Advanced Authentication System** - Secure JWT-based authentication with Role-Based Access Control (RBAC)
  - Fine-grained permission matrix (resource-level action control)
  - Role hierarchy (Owner > Admin > Observer > Regular)
  - Ownership-based permission support
  - User status management (active, pending, stopped, blocked, hidden)
- 👥 **User Management** - Support for Owner, Admin, Observer, and Regular user types
- ⚙️ **System Management** - Owner-only system administration menu with user management capabilities
  - System settings management (default date range, timezone, session timeout, etc.)
  - Feature flag controls (allow new signups, enable tracking, etc.)
  - Cached settings management (24-hour TTL)
- 🛡️ **Permission Protection System** - Frontend and backend permission middleware
  - `usePermission()` and `useRole()` React hooks
  - `<ProtectedComponent>` and `<ProtectedRoute>` components
  - `withAuth()` middleware for API routes
- 📧 **Email Integration** - Automated notifications and password reset with Nodemailer
- 👤 **User Profile Management** - Profile information updates, password changes, account deletion
- 🔄 **Session Management** - Visitor tracking with cookie-based sessions
- 📍 **IP Geolocation** - Automatic country/city detection
- 🎨 **Modern UI** - Beautiful, responsive interface with shadcn/ui and Tailwind CSS
- 🐳 **Docker Support** - Containerized database setup for easy deployment
- 🎯 **Client-Side Tracking Script** - External landing page integration with `cosmos-track.js`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for full setup)
- Gmail account with app password (for email features, optional)

### Installation Steps

#### 1. Without Docker (Demo Mode)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
Open http://localhost:3000

**Note:** Without Docker, the app will run but database features will be limited.

#### 2. With Full Database Setup (Recommended)

```bash
# 1. Clone and navigate to project
cd demo

# 2. Create environment file
cp .env.example .env.local
# Edit .env.local with your configuration

# 3. Start both ClickHouse and MySQL
docker-compose up -d

# 4. Wait for databases to be ready (about 15 seconds)

# 5. Install dependencies
npm install

# 6. Initialize ClickHouse database
npm run clickhouse:init

# 7. Initialize MySQL database
npm run mysql:init

# 8. Add seed data (optional but recommended for testing)
npm run clickhouse:seed
npm run db:seed

# 9. Start the development server
npm run dev
```

#### 3. Access the Application
```
Application: http://localhost:3000
Authentication: http://localhost:3000/auth
API Documentation: http://localhost:3000/api-docs
```

### First-Time Setup

1. **Create your first user:**
   - Navigate to http://localhost:3000
   - You'll be redirected to the authentication page
   - Click "Sign up" and create your account
   
2. **Upgrade to Owner (optional):**
   ```bash
   # Connect to MySQL
   docker exec -it mysql mysql -u appuser -pdemo_password -D appdb
   
   # Upgrade first user to owner
   UPDATE users SET user_type = 'owner' WHERE id = 1;
   SELECT id, email, company_name, user_type FROM users;
   exit;
   ```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database Management
npm run db:reset         # Reset all databases (drop, init, seed)
npm run db:init          # Initialize all database schemas
npm run db:seed          # Seed sample data
npm run db:drop          # Drop all tables (⚠️ destructive)

# ClickHouse Commands
npm run clickhouse:init     # Initialize ClickHouse schema
npm run clickhouse:clean    # Clean ClickHouse data
npm run clickhouse:seed     # Add sample tracking events
npm run clickhouse:migrate  # Run ClickHouse migrations
npm run clickhouse:migrate-phase1  # Run ClickHouse migration phase 1

# MySQL Commands
npm run mysql:init       # Initialize MySQL schema

# Utilities
npm run generate:secret  # Generate new JWT secret
```

## 📁 Project Structure

```
demo/
├── app/                    # Next.js app directory (App Router)
│   ├── api/               # API routes
│   │   ├── analytics/     # Analytics endpoints
│   │   │   ├── campaign-analysis/    # Campaign performance metrics
│   │   │   ├── channel-performance/  # Channel/source analysis
│   │   │   ├── environment-analysis/ # Device/browser/OS stats
│   │   │   ├── page-flow-analysis/   # User navigation flow
│   │   │   ├── performance/          # Dashboard metrics
│   │   │   ├── returning-analysis/   # New vs returning visitors
│   │   │   ├── session-journeys/     # Complete user session journeys
│   │   │   ├── time-analysis/        # Time-based patterns (KST)
│   │   │   ├── tracked-websites/    # Tracked websites analysis
│   │   ├── auth/          # Authentication
│   │   │   ├── signup/               # User registration
│   │   │   ├── login/                # User login
│   │   │   ├── logout/               # Session termination
│   │   │   ├── validate/             # Token validation
│   │   │   ├── forgot-password/      # Password reset request
│   │   │   └── reset-password/       # Password reset execution
│   │   ├── campaigns/     # Campaign management CRUD
│   │   ├── courses/       # Course management CRUD
│   │   ├── performance/   # Performance metrics
│   │   ├── tracking/      # Link tracking generation
│   │   ├── track/         # External tracking endpoint
│   │   ├── track-internal/# Internal testing endpoint
│   │   ├── tracked-websites/ # Tracked websites management API
│   │   ├── users/         # User management API (Owner only)
│   │   ├── profile/       # User profile management API
│   │   ├── system/        # System settings API
│   │   │   └── settings/  # System settings management
│   │   ├── health/        # Health check endpoint
│   │   └── utm-codes/     # UTM code utilities
│   ├── auth/              # Authentication pages (login/signup)
│   ├── campaigns/         # Campaign management interface
│   ├── campaign-analysis/ # Campaign analytics dashboard
│   ├── channel-performance/ # Channel analysis page
│   ├── courses/           # Course management pages
│   ├── environment-analysis/ # Device/browser analysis
│   ├── page-flow-analysis/ # User flow visualization
│   ├── performance/       # Main performance dashboard
│   ├── returning-analysis/ # Returning user analysis
│   ├── session-journeys/   # Complete user session journey visualization
│   ├── time-analysis/     # Time-based analytics (KST)
│   ├── tracked-websites/  # Tracked websites management and statistics
│   ├── user-management/   # User management page (Owner only)
│   ├── utm-tools/         # UTM tools
│   │   ├── page.tsx       # UTM link list
│   │   └── generator/     # UTM link generator
│   ├── t/                 # Short URL tracking redirection
│   │   └── [code]/        # Redirection by tracking code
│   ├── reset-password/    # Password reset page
│   ├── link-expired/      # Expired link handler
│   └── api-docs/          # Swagger API documentation
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   │   └── *.tsx         # Button, Input, Card, Dialog, etc.
│   ├── auth/             # Authentication & permission components
│   │   ├── ProtectedRoute.tsx # Permission-based route protection
│   │   └── ProtectedComponent.tsx # Permission-based component protection
│   ├── auth-form.tsx     # Login/signup form
│   ├── export-to-pdf-button.tsx # PDF export button component
│   ├── forgot-password-form.tsx # Password reset request form
│   ├── layout-wrapper.tsx # Main layout with sidebar
│   ├── sidebar.tsx       # Navigation sidebar
│   ├── user-menu.tsx     # User dropdown menu
│   └── page-footer.tsx   # Page footer component
├── lib/                  # Utilities and database clients
│   ├── clickhouse.ts     # ClickHouse client & schema
│   ├── mysql.ts          # MySQL client & connection pool
│   ├── jwt.ts            # JWT token utilities
│   ├── email.ts          # Email service (Nodemailer)
│   ├── email-templates.ts # HTML email templates
│   ├── encryption.ts     # Data encryption utilities
│   ├── rate-limit.ts     # Rate limiting for API endpoints
│   ├── user-agent.ts     # User agent parsing
│   ├── url-parser.ts     # URL parameter parsing
│   ├── clipboard.ts      # Clipboard utilities
│   ├── types.ts          # TypeScript type definitions
│   ├── utils.ts          # General utilities
│   ├── db-init.ts        # Database initialization
│   ├── api-spec.ts       # Swagger API specification
│   ├── pdf-export.ts     # PDF export utilities (html2canvas + jsPDF)
│   ├── system-settings.ts # System settings management utility
│   ├── auth/             # Authentication & permission middleware
│   │   ├── api-middleware.ts # API route auth/permission middleware
│   │   ├── route-guard.ts    # Route guard utilities
│   │   ├── status-checker.ts # User status checking
│   │   └── types.ts          # Authentication type definitions
│   ├── permissions/      # RBAC permission system
│   │   ├── types.ts      # Permission type definitions
│   │   ├── definitions.ts # Permission matrix & role definitions
│   │   └── checker.ts    # Permission checking functions
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts    # Authentication hook
│   │   ├── usePermission.ts # Permission checking hook
│   │   ├── useRole.ts    # Role checking hook
│   │   └── useDebounce.ts # Debounce hook
│   └── utils/            # Additional utilities
│       └── fetch-with-auth.ts # Authenticated fetch wrapper
├── scripts/              # Database management scripts
│   ├── init-clickhouse.js # Initialize ClickHouse schema
│   ├── init-mysql.js     # Initialize MySQL schema
│   ├── init-mysql.sql    # MySQL schema definition
│   ├── seed-data.js      # Seed ClickHouse with sample data
│   ├── seed-campaigns-courses.js # Seed MySQL with campaigns
│   ├── clean-clickhouse.js # Clean ClickHouse data
│   ├── drop-all-tables.js # Drop all tables
│   └── generate-secret.js # Generate JWT secret
├── public/               # Static files
│   ├── cosmos-track.js   # Client-side tracking script
│   └── grid.svg          # Grid background pattern
├── z_documentation/      # Project documentation
│   ├── architecture/     # System architecture docs
│   ├── features/         # Feature documentation
│   └── setup/            # Setup guides
├── docker-compose.yml    # ClickHouse + MySQL setup
├── Dockerfile            # Container build configuration
├── instrumentation.ts    # Next.js startup hook
├── next.config.mjs       # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## 🏗️ Architecture

### System Overview

CosMos AI uses a dual-database architecture optimized for both real-time analytics and reliable application data management:

**Frontend Layer (Next.js 14 App Router)**
- Server-side rendered pages with React 18
- Real-time dashboard with live metrics
- Campaign and course management interfaces
- Advanced analytics visualization modules
- UTM tools and link generator
- JWT-based authentication with role-based access

**Backend Layer (Next.js API Routes)**
- RESTful API endpoints
- `/api/auth/*` - User authentication & management
  - Signup/login with JWT tokens
  - Password reset with email verification
  - Token validation and session management
  - Rate limiting for security
- `/api/campaigns/*` - Campaign CRUD operations
- `/api/courses/*` - Course management
- `/api/analytics/*` - Analytics data aggregation
  - Campaign performance metrics
  - Channel and source analysis
  - Environment analysis (device/browser/OS)
  - Page flow visualization
  - Time-based patterns (KST timezone)
  - Returning visitor analysis
- `/api/tracking/*` - Tracking link generation
- `/api/track/*` - External tracking endpoint for landing pages
- `/api/performance/*` - Dashboard performance metrics
- `/api/utm-codes/*` - UTM code utilities
- `/api/tracked-websites/*` - Tracked websites management
- `/api/users/*` - User management (Owner only)
- `/api/profile` - User profile management (authenticated users)
- `/api/system/settings/*` - System settings management (Owner only)
- `/api/health` - System health check
- `/t/[code]` - Short URL tracking redirection

**Database Layer**

1. **ClickHouse (Analytics Database)**
   - High-performance columnar database
   - Optimized for OLAP queries
   - Stores tracking events and visit logs
   - Partitioned by month for efficient querying
   - Tables:
     - `tracking_events` - Click tracking and UTM data
     - `visit_logs` - Detailed pageview and session data

2. **MySQL 8.0 (Application Database)**
   - ACID-compliant relational database
   - Stores structured application data
   - Connection pooling for performance
   - Tables:
     - `users` - User accounts with role-based access
     - `sessions` - Active user sessions
     - `password_reset_tokens` - Password reset tokens
     - `courses` - Course catalog
     - `campaigns` - Marketing campaigns
     - `utm_codes` - Tracking links with UTM parameters

**External Integration**
- Client-side tracking script (`cosmos-track.js`)
- Integrates with external landing pages
- Automatic session and visitor tracking
- UTM parameter preservation
- Device and browser detection

### Data Flow

1. **User Creates Campaign** → Stored in MySQL
2. **Generate Tracking Link** → Creates UTM code in MySQL
3. **User Clicks Link** → `cosmos-track.js` sends data to `/api/track`
4. **Tracking Data Saved** → ClickHouse stores event
5. **Dashboard Queries** → Aggregates data from ClickHouse
6. **Real-time Display** → Shows metrics to user

### Key Features by Layer

**Authentication & Security**
- JWT-based authentication with 7-day expiry
- bcrypt password hashing (10 rounds)
- Rate limiting on sensitive endpoints
- Advanced Role-Based Access Control (RBAC)
  - Fine-grained permission matrix (resource-level action control)
  - Role hierarchy (Owner > Admin > Observer > Regular)
  - Ownership-based permission support (`own` vs `all`)
  - Frontend and backend permission protection
  - User status-based access control (active, pending, stopped, blocked, hidden)
- Session management with automatic cleanup
- Password reset with email verification
- `withAuth()` middleware for API routes
- `usePermission()` and `useRole()` React hooks

**Analytics Engine**
- Real-time event tracking
- Session-based visitor identification
- Device and environment detection
- Geographic IP location tracking
- Referrer source analysis


## 🔧 Configuration

### Environment Variables

Create `.env.local` in the project root:

```env
# ClickHouse Configuration
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=appdb
MYSQL_USER=appuser
MYSQL_PASSWORD=demo_password
MYSQL_ROOT_PASSWORD=demo_root_password

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# JWT Configuration (Security)
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# Email Configuration (for password reset - optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM="CosMos AI <noreply@cosmos-ai.com>"

# Optional: NextAuth Configuration (if using NextAuth)
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Email Setup (Optional)

For password reset functionality, configure email settings:

**Using Gmail:**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy the 16-character password to `EMAIL_PASSWORD`

**Using Other Providers:**
- SendGrid: Use API key as password
- AWS SES: Configure with SMTP credentials
- Custom SMTP: Use your server credentials

### Docker Configuration

The `docker-compose.yml` configures two services:

1. **ClickHouse** (Port 8123, 9000)
   - Analytics database
   - HTTP interface on 8123
   - Native interface on 9000
   
2. **MySQL** (Port 3306)
   - Application database
   - Default user: appuser
   - Default database: appdb
   
3. **Redis** (Port 6379)
   - Shared cache server
   - Used for analytics API caching
   - AOF persistence enabled

### Database Schemas

**ClickHouse Tables:**
- `analytics.tracking_events` - Raw tracking data
- `analytics.visit_logs` - Processed visitor logs

**MySQL Tables:**
- `users` - User accounts
- `sessions` - Active sessions
- `password_reset_tokens` - Reset tokens
- `courses` - Course catalog
- `campaigns` - Marketing campaigns
- `utm_codes` - Tracking links

## 📝 Usage Guide

### Getting Started

#### 1. Authentication
- Navigate to http://localhost:3000
- You'll be automatically redirected to the authentication page
- Create an account or log in with existing credentials

#### 2. User Roles & Permissions (RBAC)

CosMos AI implements a fine-grained Role-Based Access Control (RBAC) system for resource-level permission management.

**Role Hierarchy:**
- **Owner** (Level 4) - Highest privileges, full access to all resources
- **Admin** (Level 3) - Most resource management permissions (except user management)
- **Observer** (Level 2) - Read-only access
- **Regular** (Level 1) - Limited read access

**Permission Matrix:**

| Resource | Owner | Admin | Observer | Regular |
|----------|-------|-------|----------|---------|
| **Users (users)** | create, read, update, delete, manage | read | read | - |
| **Campaigns (campaigns)** | create, read, update, delete, manage | create, read, update, delete, manage | read | read |
| **Courses (courses)** | create, read, update, delete, manage | create, read, update, delete, manage | read | read |
| **Analytics (analytics)** | read, export | read, export | read | read |
| **UTM Codes (utm_codes)** | create, read, update, delete, manage | create, read, update, delete, manage | read | read |
| **Settings (settings)** | read, update, manage | read, update | - | - |
| **System (system)** | read, update, manage | - | - | - |

**Permission Format:**
- Permissions are defined in `resource:action` format (e.g., `campaigns:create`, `users:manage`)
- Supported actions: `create`, `read`, `update`, `delete`, `manage`, `export`
- Ownership-based permissions: Supports `resource:action:own` or `resource:action:all` format

**User Status:**
- **active** - Normal access allowed
- **pending** - Account awaiting approval
- **stopped** - Temporarily suspended (read-only)
- **blocked** - Blocked (access denied)
- **hidden** - Hidden (hidden from system)

**Frontend Permission Protection:**
- `usePermission()` hook - Check permissions in components
- `useRole()` hook - Check roles
- `<ProtectedComponent>` - Conditional rendering based on permissions
- `<ProtectedRoute>` - Permission-based route protection

**Backend Permission Protection:**
- `withAuth()` middleware - Authentication and permission checks for API routes
- `requirePermission()` - Require specific permission
- `requireRole()` - Require specific role
- Automatic status checking and permission validation

#### 3. Create Your First Campaign
1. Navigate to **Campaigns** from the sidebar
2. Click **"Create Campaign"**
3. Fill in campaign details:
   - Campaign name
   - Associated course
   - Source (e.g., "google", "facebook", "telegram")
   - Medium (e.g., "cpc", "social", "email")
   - Budget and dates
   - Status (active/waiting/paused)
4. Save the campaign

#### 4. Generate Tracking Links
1. Go to **UTM Tools** from the sidebar
2. Select a campaign
3. Configure UTM parameters:
   - Source (auto-filled from campaign)
   - Medium (auto-filled from campaign)
   - Campaign name
   - Content (optional)
   - Term (optional)
4. Enter your landing page URL
5. Click **"Generate Link"**
6. Copy the tracking link and use it in your marketing materials

#### 5. Integrate Tracking Script
Add to your external landing pages:
```html
<!-- Add before closing </body> tag -->
<script src="https://your-cosmos-ai-domain.com/cosmos-track.js"></script>
```

Configure allowed domains in `public/cosmos-track.js`:
```javascript
allowedDomains: [
  'your-landing-page.com',
  'www.your-landing-page.com',
]
```

#### 6. View Analytics
Access various analytics modules:

**Dashboard (Performance)**
- Overview of all campaigns
- Total clicks, visitors
- Budget tracking
- Recent activity

**Campaign Analysis**
- Individual campaign performance
- Click-through rates
- Campaign visitor statistics

**Channel Performance**
- Traffic by source (Google, Facebook, etc.)
- Traffic by medium (CPC, Social, Email)
- ROI by channel

**Environment Analysis**
- Device breakdown (Desktop, Mobile, Tablet)
- Browser statistics (Chrome, Safari, Firefox, etc.)
- Operating system distribution
- Screen resolutions

**Time Analysis (KST)**
- Visitor patterns by hour of day
- Day of week analysis
- Peak traffic times
- Timezone-aware analytics

**Page Flow Analysis**
- Landing page performance
- Navigation paths
- Exit pages
- Bounce rates

**Returning Analysis**
- New vs returning visitors
- Visit frequency
- User retention metrics

**Session Journeys**
- Complete page-by-page user journey visualization
- Session timeline with timestamps
- Landing page and exit page tracking
- Session duration and page sequence
- Device and source information per session
- Active vs completed session indicators

**Tracked Websites Management**
- Domain-level tracking statistics
- Website active/inactive status management
- Domain-specific sessions, visitors, pageviews
- First seen and last seen timestamp tracking
- Performance dashboard per website

**Debug Tools**
- Session debugging page
- Real-time session data validation
- Tracking link testing and verification

**System Management (Owner Only)**
- User Management page with comprehensive user administration
- View all users with filtering and search capabilities
- Update user types (Admin, Observer, Regular)
- Manage user statuses (Pending, Active, Stopped, Blocked)
- Delete users (soft delete)
- User statistics dashboard (Total, Active, Pending, Blocked)
- Last login tracking and account creation dates

#### System Settings Management

CosMos AI provides Owner-only system settings management to control global platform behavior.

**Global Tracking Control**
- **Enable/Disable Tracking**: The `allow_tracking` setting allows you to globally enable or disable all tracking functionality across the system
  - When disabled, all tracking events are ignored and the `cosmos-track.js` script will not collect any data
  - This is useful for GDPR compliance, maintenance, or testing purposes
  - Settings are applied in real-time with automatic cache invalidation

**Timezone Support**
- **Default Timezone Setting**: Configure the system's default timezone using the `default_timezone` setting
  - Default: `Asia/Seoul` (KST, UTC+9)
  - Supports IANA timezone format (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`)
  - All time-based analytics are displayed according to the configured timezone
  - Time Analysis page shows visitor patterns by timezone
  - Session timestamps are stored and displayed according to the configured timezone

**Other System Settings**
- **Default Date Range**: Default date range for analytics pages (default: 7 days)
- **Default Campaign Status**: Default status for newly created campaigns (default: `waiting`)
- **Default User Role**: Default role for newly registered users (default: `regular`)
- **Session Timeout**: User session timeout duration in minutes (default: 120 minutes)
  - This setting is automatically fetched by the `cosmos-track.js` script
  - When a session times out, a new session begins
- **Allow New Signups**: The `allow_new_signups` setting allows you to enable or disable new user registrations
  - When disabled, the signup page becomes inaccessible

**Settings Management Features**
- **Cache System**: Settings are cached for 24 hours for performance optimization
- **Real-time Updates**: Cache is automatically invalidated when settings are changed, ensuring immediate effect
- **Owner Only**: System settings can only be modified by users with Owner role
- **API Endpoints**: Settings can be queried and updated via `/api/system/settings` endpoint

**User Profile Management**
- View and update profile information
- Change email address (duplicate checking)
- Change contact number (duplicate checking)
- Change company name
- Change password (current password verification required)
- Delete account (soft delete, password verification required)

**PDF Export**
- Export any analytics dashboard to PDF
- High-quality image rendering
- Customizable export options
- Available on Performance and Environment Analysis pages

### Key Features

#### Campaign Management
- Create and manage multiple campaigns
- Track budget and spending
- Auto-pause campaigns when budget is reached
- Campaign status management (active/paused/ended)
- Link campaigns to courses

#### UTM Link Generation & Management
- Automatic UTM parameter generation
- Unique tracking codes
- Link click tracking
- Budget allocation per link
- Link status management (active/inactive/ended/hidden)
- UTM link list and filtering
- Dedicated generator page (`/utm-tools/generator`)
- Short URL redirection (`/t/[code]`)
- Expired link handling page

#### Advanced Analytics
- Real-time data updates
- Customizable date ranges
- PDF export functionality for dashboards and reports
- Multi-dimensional analysis
- Visual charts and graphs

#### Debugging Tools
- Tracking Debug page for testing links
- Real-time event monitoring
- Session and visitor ID tracking
- UTM parameter validation

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router and Server Components
- **React 18** - UI library with latest features
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **shadcn/ui** - Modern, accessible UI component library
- **Recharts 2.12** - Composable charting library for data visualization
- **Lucide React** - Beautiful, consistent icon library
- **Sonner** - Toast notifications

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Node.js 18+** - JavaScript runtime
- **JWT (jsonwebtoken 9.0)** - Secure token-based authentication
- **bcryptjs 3.0** - Password hashing and verification
- **Nodemailer 7.0** - Email service integration (SMTP)

### Databases
- **ClickHouse** - High-performance columnar analytics database
  - Optimized for OLAP queries
  - Petabyte-scale data processing
  - Real-time data ingestion
- **MySQL 8.0** - Reliable relational database for application data
  - ACID compliance
  - Connection pooling
  - Foreign key constraints

### Data & Analytics
- **@clickhouse/client 1.5** - Official ClickHouse client for Node.js
- **mysql2 3.15** - Fast MySQL client with Promise support
- **GeoIP Lite 1.4** - IP-based geolocation (country/city detection)
- **UA Parser JS 2.0** - User agent parsing (device/browser/OS detection)
- **Query String 9.3** - URL parameter parsing and manipulation

### Export & Reporting
- **html2canvas 1.4** - Convert HTML elements to canvas for PDF export
- **jsPDF 3.0** - Client-side PDF generation library

### Developer Tools
- **Docker & Docker Compose** - Containerized development environment
- **ESLint** - Code linting and formatting
- **Autoprefixer** - CSS vendor prefixing
- **PostCSS** - CSS transformation

### Additional Libraries
- **nanoid 5.0** - Unique ID generation for tracking codes
- **uuid 13.0** - UUID generation for sessions and users
- **next-intl 4.5** - Internationalization (i18n) and multi-language support
- **next-swagger-doc 0.4** - API documentation with Swagger UI
- **swagger-ui-react 5.29** - Interactive API documentation interface
- **Radix UI Alert Dialog** - Beautiful, accessible modal dialogs
- **class-variance-authority 0.7** - CVA for component variants
- **clsx 2.1** - Conditional className utility
- **tailwind-merge 2.4** - Merge Tailwind classes without conflicts
- **dotenv 16.4** - Environment variable management

### Performance Optimizations
- Server-side rendering (SSR) with Next.js
- Static generation for public pages
- API route caching
- Database connection pooling
- ClickHouse partitioning by month
- Indexed database queries
- Image optimization with Next.js Image
- Code splitting and lazy loading

## 📚 Documentation

Additional documentation is available in the `z_documentation/` directory:

### Architecture Documentation
- **`architecture/SYSTEM_ARCHITECTURE.md`** - Complete system architecture overview
- **`architecture/API_ENDPOINTS.md`** - Detailed API endpoint documentation

### Feature Documentation
- **`AUTHENTICATION_COMPLETE.md`** - Authentication system implementation guide
- **`PASSWORD_RESET.md`** - Password reset flow and email configuration
- **`JWT_IMPLEMENTATION.md`** - JWT token implementation details
- **`GMAIL_SETUP.md`** - Gmail SMTP configuration guide
- **`CLIPBOARD_FALLBACK_IMPLEMENTATION.md`** - Clipboard functionality

### Implementation Guides
- **`zz_temp-md-files/EXTERNAL_TRACKING_INSTALLATION.md`** - External script integration
- **`zz_temp-md-files/TRACKING_VALIDATION_GUIDE.md`** - Testing and validation

### API Documentation
Access interactive API documentation at: **http://localhost:3000/api-docs**

## 🚢 Deployment

### Production Deployment

#### Using Docker

1. **Build the production image:**
```bash
docker build -t cosmos-ai:latest .
```

2. **Run with docker-compose:**
```bash
# Use production profile
docker-compose --profile prod up -d
```

3. **Environment variables:**
Create `.env.production` with production values:
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
JWT_SECRET=your-production-jwt-secret
# ... other production values
```

#### Using Vercel/Netlify

1. Connect your repository
2. Set environment variables in the dashboard
3. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
4. Deploy

**Note:** You'll need to host ClickHouse and MySQL separately (e.g., cloud providers)

### Database Hosting Options

**ClickHouse:**
- ClickHouse Cloud (recommended)
- AWS (self-hosted on EC2)
- DigitalOcean Droplets
- Google Cloud Platform

**MySQL:**
- Amazon RDS
- Google Cloud SQL
- Azure Database for MySQL
- PlanetScale
- DigitalOcean Managed Databases

## 🔒 Security Considerations

### Authentication & Authorization
- ✅ JWT tokens with expiration (7 days)
- ✅ bcrypt password hashing (10 rounds)
- ✅ Role-based access control (Owner/Admin/Observer/Regular)
- ✅ Session management with automatic cleanup
- ✅ Password reset with secure tokens (10-hour expiry)
- ✅ Rate limiting on sensitive endpoints

### API Security
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ⚠️ **Recommended:** Add HTTPS in production
- ⚠️ **Recommended:** Implement CSRF tokens
- ⚠️ **Recommended:** Add API rate limiting globally

### Database Security
- ✅ Separate databases for analytics and app data
- ✅ Connection pooling with limits
- ✅ Prepared statements for all queries
- ⚠️ **Recommended:** Use read-only database users where possible
- ⚠️ **Recommended:** Enable database encryption at rest

### Privacy & GDPR
- ✅ IP address collection (can be anonymized)
- ✅ Cookie-based tracking (inform users)
- ⚠️ **Recommended:** Add cookie consent banner
- ⚠️ **Recommended:** Implement data retention policies
- ⚠️ **Recommended:** Add data export/deletion functionality

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check if containers are running
docker ps

# Restart containers
docker-compose restart

# Check logs
docker-compose logs clickhouse
docker-compose logs mysql
docker-compose logs redis
```

**2. Tables Not Found**
```bash
# Re-initialize databases
npm run db:drop
npm run clickhouse:init
npm run mysql:init
```

**3. Authentication Errors**
```bash
# Generate new JWT secret
npm run generate:secret

# Update .env.local with the new secret
# Restart the development server
```

**4. Email Not Sending**
- Verify Gmail app password is correct (16 characters)
- Check 2FA is enabled on Gmail account
- Verify EMAIL_* environment variables are set
- Check spam folder for test emails

**5. Tracking Script Not Working**
- Verify domain is in `allowedDomains` array
- Check browser console for errors
- Verify API endpoint is accessible
- Check UTM parameters are present in URL

**6. Port Already in Use**
```bash
# Change ports in docker-compose.yml
# Or kill processes using the ports:
# Windows:
netstat -ano | findstr :3306
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3306 | xargs kill -9
```

### Getting Help

- Check documentation in `z_documentation/`
- Review API docs at `/api-docs`
- Check Docker logs: `docker-compose logs`
  - ClickHouse: `docker-compose logs clickhouse`
  - MySQL: `docker-compose logs mysql`
  - Redis: `docker-compose logs redis`
- Verify environment variables are set correctly

## 📊 Performance Tips

### Optimizing ClickHouse Queries
- Use date range filters
- Partition by month for better query performance
- Use materialized views for frequently accessed aggregations
- Limit result sets with `LIMIT` clause

### Optimizing MySQL
- Add indexes on frequently queried columns
- Use connection pooling (already configured)
- Clean up old sessions regularly
- Monitor slow query log

### Frontend Performance
- Enable Next.js image optimization
- Use server components where possible
- Implement pagination for large datasets
- Add loading states for better UX

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation as needed

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions:
- Documentation: `z_documentation/` folder
- API Docs: http://localhost:3000/api-docs
- Issues: Create an issue in the repository

---

**Built with ❤️ using Next.js, ClickHouse, and MySQL**