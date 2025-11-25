# CosMos AI - Marketing Analytics Platform Summary

## Core Purpose
Track marketing campaigns, analyze user behavior, generate UTM links, and visualize performance metrics across multiple channels (Google, Facebook, Telegram, Kakao, Naver, etc.).

---

## 🎯 Main Pages & Their Functions

### 1. `/auth` - Login

**Authentication page** for user login and signup.
- Enter company name, email address, phone number, and password
- Select user type (Owner, Admin, Observer, Regular)

### 2. `/reset-password` - Reset Password
**Password recovery page** for resetting your password via email verification.

### 3. `/` - Homepage
**Main landing page** with overview information about CosMos AI functionality. 
- Redirects authenticated users to the performance dashboard
- First-time visitors are redirected to the authentication page

### 4. `/campaigns` - Campaign List
**View and manage all campaigns** in one place:
- View campaigns in list/table format
- See status at a glance (active/waiting/paused/ended)
- Track budget and spending
- Filter and search campaigns
- Edit or delete campaigns
- Access campaign details quickly

### 5. `/campaigns` - Create New Campaign
**Create and configure new marketing campaigns:**
- Define campaign name and budget
- Set start and end dates
- Link to courses/products
- Configure source and medium parameters (e.g., Google/CPC)
- Set campaign status (active/waiting/paused)
- Enable auto-pause when budget limit is reached

### 6. `/courses` - Course Management
**Manage your course/product catalog:**
- Create and edit courses or products
- Link campaigns to specific offerings
- Track performance by course
- Organize marketing by product line
- Delete courses (only if not linked to active campaigns)

**Note:** Courses linked to campaigns must have their campaigns deleted first before the course can be deleted.

### 7. `/performance` - Performance Dashboard
**Main dashboard** displaying real-time campaign metrics:
- Total clicks, visitors, and conversions
- Budget tracking across all campaigns
- Recent activity and performance trends
- Date range filtering
- Quick navigation to all analytics modules


### 8. `/channel-performance` - Channel Performance
**Analyze traffic by source and medium:**
- Traffic breakdown by source (Google, Facebook, Telegram, Kakao, etc.)
- Traffic breakdown by medium (CPC, social, email, organic)
- ROI and conversion rates per channel
- Identify best performing traffic sources
- Multi-channel attribution analysis
- Date range filtering
- Comparison charts
- Export reports to PDF



### 9. `/campaign-analysis` - Campaign Analysis
**Deep dive into individual campaign performance:**
- Campaign-specific metrics
- Click-through rates (CTR)
- ROI calculations
- Performance comparisons between campaigns
- Detailed breakdowns
- Date range filtering
- Switch between Chart and Table views
- Export reports to PDF


### 10. `/environment-analysis` - Environment Analysis
**Analyze visitor device and browser statistics:**
- Device distribution (desktop, mobile, tablet)
- Browser usage (Chrome, Safari, Firefox, Edge)
- Operating system distribution (Windows, iOS, Android, macOS)
- Screen resolution data
- Date range filtering
- Export reports to PDF


### 11. `/time-analysis` - Time-Based Analysis
**Discover visitor patterns by time:**
- Hourly and daily traffic distribution (KST timezone)
- Day-of-week analysis
- Identify peak traffic times
- Time-based conversion patterns
- Visitor activity heatmaps
- Date range filtering
- Export reports to PDF



### 12. `/returning-analysis` - Returning Analysis
**Track new vs returning visitors using Google Analytics logic:**
- New visitor acquisition metrics
- Returning visitor frequency
- User retention rates
- Visit count distribution
- Session intervals
- Customer loyalty patterns
- Date range filtering
- Export reports to PDF


### 13. `/page-flow-analysis` - Page Flow Analysis
**Visualize user navigation patterns:**
- Landing page performance
- User navigation paths through your site
- Exit pages and bounce rates
- Page-to-page transitions
- Identify drop-off points in user journeys
- Funnel analysis
- Search by domain
- Date range filtering
- Export reports to PDF



### 14. `/session-journeys` - Session Journey
**Reconstruct complete user sessions:**
- Page-by-page journey tracking
- Session timelines with timestamps
- Landing and exit page identification
- Session duration
- Page view sequences
- Device and traffic source per session
- Active vs completed session status
- Date range filtering


### 15. `/tracked-websites` - Tracked Websites
**Manage external website tracking:**
- View all tracked websites
- Manage tracking script installations
- Monitor tracking status by domain
- Validate tracking implementation
- Configure allowed domains for UTM links


### 16. `/utm-tools` - UTM List & Generator
**Create and manage UTM tracking links:**
- Generate tracked marketing links
- Auto-generate UTM parameters from campaigns
- View all generated UTM links
- Manage campaign links
- Preview link performance
- Copy links to clipboard
- Set budget per link

**Note:** Landing URLs for UTM links must be from domains configured in `/tracked-websites`.

---

## 📋 How to Use CosMos AI

### Initial Setup
1. **Install & Configure**: Run Docker containers, initialize databases, and start the development server
2. **Create Account**: Sign up at the `/auth` page
3. **Upgrade Role** (optional): Manually set your user role to 'owner' in the database for full access

### Campaign Workflow
1. **Create a Course** (`/courses`) - Define your product or service offering
2. **Create a Campaign** (`/campaigns`) - Set budget, dates, source, and medium
3. **Generate UTM Links** (`/utm-tools`) - Create tracked marketing links for distribution
4. **Install Tracking Script** - Add `cosmos-track.js` to your landing pages
5. **Share Links** - Distribute UTM links across your marketing channels
6. **Monitor Analytics** - View real-time data across all analytics pages
7. **Export Reports** - Generate PDF reports for stakeholders

### Analytics Journey
- **Start** at `/performance` for the overall dashboard view
- **Drill down** to specific campaign analysis for detailed metrics
- **Analyze** user environment, timing, and navigation patterns
- **Track** complete session journeys to understand user behavior
- **Identify** returning visitors and measure retention
- **Optimize** campaigns based on data-driven insights

---

## 🚀 Key Features Summary

### Core Capabilities
- ✅ Real-time analytics dashboard
- ✅ Multi-channel campaign management
- ✅ UTM link generation & tracking
- ✅ Session-based visitor tracking
- ✅ Device, browser, OS detection
- ✅ Time-based pattern analysis (KST)
- ✅ User journey visualization
- ✅ Conversion tracking
- ✅ PDF export for reports
- ✅ Role-based access control
