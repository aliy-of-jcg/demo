# CosMos AI - Analytics & Tracking System

A modern admin panel for tracking UTM parameters with ClickHouse and Next.js 14.

## ✨ Features

- 📊 **Real-time Dashboard** with auto-refresh
- 🔗 **Tracking Link Generator** with full UTM support
- 📱 **Device Detection** (Mobile, Desktop, Tablet)
- 🌍 **Multi-Platform Support** (Telegram, Kakao, Naver, Google, etc.)
- ⚡ **ClickHouse Integration** for high-performance analytics
- 🎨 **Beautiful UI** with shadcn/ui components

## 🚀 Quick Start

### Without Docker (Demo Mode)
```bash
npm install
npm run dev
```
Open http://localhost:3000

### With ClickHouse (Full Features)
```bash
# 1. Start ClickHouse
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Initialize database
npm run clickhouse:init

# 4. Add seed data (optional)
npm run clickhouse:seed

# 5. Start the app
npm run dev
```

## 📁 Project Structure

```
demo/
├── app/               # Next.js app directory
├── components/        # React components
├── lib/              # Utilities and ClickHouse client
├── scripts/          # Database scripts
└── docker-compose.yml # ClickHouse setup
```
## 📁 Project Style

Single Next.js App
├── Frontend (Client-Side React)
│   ├── Dashboard
│   ├── Tracking Links
│   └── API Docs
│
├── Backend (API Routes)
│   ├── GET /api/analytics
│   ├── POST /api/tracking/generate
│   ├── GET /api/tracking/links
│   └── DELETE /api/tracking/links/:id
│
└── Database Layer
    └── ClickHouse (Docker container)


## 🔧 Configuration

Create `.env.local`:
```env
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📝 Usage

1. Go to "Tracking Links" page
2. Fill in campaign details and UTM parameters
3. Generate tracking link
4. Share the link via Telegram, Kakao, etc.
5. Watch dashboard update in real-time!

## 🛠 Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- ClickHouse
- Recharts
- shadcn/ui

## 📚 Documentation

See the full documentation for more details on setup and usage.

