# CosMos AI - Marketing Analytics Platform

A comprehensive marketing analytics and campaign management platform built with Next.js 14, featuring dual database architecture (ClickHouse + MySQL) for high-performance analytics and robust data management.

## ✨ Features

- 📊 **Real-time Dashboard** with live campaign metrics and performance insights
- 🎯 **Campaign Management** - Create, edit, and track marketing campaigns
- 📈 **Advanced Analytics** - Multiple analysis modules for deep insights
- 🔗 **UTM Tools** - Link generator and tracking utilities
- 📱 **Device & Environment Analysis** - Comprehensive user device detection
- 🌍 **Multi-Platform Support** - Track across Telegram, Kakao, Naver, Google, etc.
- ⚡ **Dual Database Architecture** - ClickHouse for analytics + MySQL for app data
- 🔐 **Authentication System** - Secure user management with JWT
- 📧 **Email Integration** - Automated notifications and password reset
- 🎨 **Modern UI** - Beautiful interface with shadcn/ui components

## 🚀 Quick Start

### Without Docker (Demo Mode)
```bash
npm install
npm run dev
```
Open http://localhost:3000

### With Full Database Setup (Recommended)
```bash
# 1. Start both ClickHouse and MySQL
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Initialize ClickHouse database
npm run clickhouse:init

# 4. Initialize MySQL database
npm run mysql:init

# 5. Add seed data (optional)
npm run clickhouse:seed
npm run db:seed

# 6. Start the app
npm run dev
```

### Database Management Commands
```bash
# Reset all databases
npm run db:reset

# Clean ClickHouse data
npm run clickhouse:clean

# Drop all tables
npm run db:drop

# Generate JWT secret
npm run generate:secret
```

## 📁 Project Structure

```
demo/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── analytics/     # Analytics endpoints
│   │   ├── auth/          # Authentication
│   │   ├── campaigns/     # Campaign management
│   │   ├── courses/       # Course management
│   │   ├── performance/   # Performance metrics
│   │   ├── tracking/      # Link tracking
│   │   └── utm-codes/     # UTM utilities
│   ├── auth/              # Authentication pages
│   ├── campaigns/         # Campaign management pages
│   ├── campaign-analysis/ # Campaign analytics
│   ├── channel-performance/ # Channel analysis
│   ├── courses/           # Course management
│   ├── environment-analysis/ # Device/browser analysis
│   ├── page-flow-analysis/ # User flow analysis
│   ├── performance/       # Performance dashboard
│   ├── returning-analysis/ # Returning user analysis
│   ├── time-analysis/     # Time-based analytics
│   ├── tracking-debug/    # Debug tools
│   └── utm-tools/         # UTM utilities
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Custom components
├── lib/                  # Utilities and database clients
│   ├── clickhouse.ts     # ClickHouse client
│   ├── mysql.ts          # MySQL client
│   ├── jwt.ts            # JWT utilities
│   ├── email.ts          # Email service
│   └── hooks/            # Custom React hooks
├── scripts/              # Database management scripts
└── docker-compose.yml    # ClickHouse + MySQL setup
```

## 🏗️ Architecture

**Frontend (Next.js 14 App Router)**
- Dashboard with real-time metrics
- Campaign management interface
- Advanced analytics modules
- UTM tools and link generator
- Authentication system

**Backend (API Routes)**
- `/api/analytics/*` - Analytics data endpoints
- `/api/campaigns/*` - Campaign CRUD operations
- `/api/auth/*` - Authentication & user management
- `/api/tracking/*` - Link tracking and generation
- `/api/performance/*` - Performance metrics

**Database Layer**
- **ClickHouse** - High-performance analytics data
- **MySQL** - Application data (users, campaigns, courses)


## 🔧 Configuration

Create `.env.local`:
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
MYSQL_PASSWORD=apppassword

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 📝 Usage

### Getting Started
1. **Authentication** - Sign up or log in to access the platform
2. **Create Campaign** - Set up your first marketing campaign
3. **Generate Tracking Links** - Use UTM tools to create trackable links
4. **Monitor Performance** - View real-time analytics on the dashboard

### Key Features
- **Campaign Management** - Create, edit, and manage marketing campaigns
- **Analytics Dashboard** - View comprehensive performance metrics
- **Advanced Analysis** - Deep dive into:
  - Channel performance analysis
  - Environment analysis (devices, browsers)
  - Time-based visitor patterns
  - Page flow analysis
  - Returning user analysis
- **UTM Tools** - Generate and manage UTM parameters
- **Debug Tools** - Track and debug link performance

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Recharts** - Data visualization
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **JWT** - Authentication and authorization
- **bcryptjs** - Password hashing
- **Nodemailer** - Email service integration

### Databases
- **ClickHouse** - High-performance analytics database
- **MySQL 8.0** - Relational database for app data

### Additional Tools
- **Docker** - Containerized database setup
- **GeoIP Lite** - IP geolocation
- **UA Parser JS** - User agent parsing
- **Query String** - URL parameter parsing
- **SweetAlert2** - Enhanced alerts
- **Swagger UI** - API documentation

## 📚 Documentation

See the full documentation for more details on setup and usage.

