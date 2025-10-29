# Multi-Language Support Implementation Plan

## 📋 Overview

This document outlines the implementation plan for adding multi-language support to the CosMos AI Analytics & Tracking platform. The system will support **Korean (primary)** and **English** languages.

## 🎯 Objectives

- Provide seamless language switching between Korean and English
- Set Korean as the default language
- Maintain consistent user experience across all pages
- Preserve existing functionality during migration
- Use industry-standard i18n practices

## 📦 Package Selection: next-intl

### Why next-intl?

We have chosen **next-intl** as our internationalization library for the following reasons:

1. **Next.js 14 App Router Support** - Built specifically for Next.js App Router architecture
2. **TypeScript Support** - Excellent type safety for translation keys
3. **Server & Client Components** - Works seamlessly with both RSC and client components
4. **Performance** - No extra bundle overhead, minimal runtime cost
5. **Developer Experience** - Simple API, easy to implement and maintain
6. **Locale Routing** - Built-in support for locale-based URL routing
7. **Active Maintenance** - Well-maintained with regular updates and community support

### Alternative Packages Considered

- **react-i18next** - More complex setup, larger bundle size
- **next-translate** - Less active maintenance
- **formatjs** - More verbose API

## 🏗️ Project Structure

```
CosMos AI/
├── messages/                    # Translation files
│   ├── ko.json                 # Korean translations (primary)
│   └── en.json                 # English translations
│
├── app/
│   ├── [locale]/               # Locale-based routing
│   │   ├── layout.tsx         # Locale-specific layout
│   │   ├── page.tsx           # Dashboard (moved)
│   │   ├── campaigns/         # All campaign pages
│   │   ├── performance/       # Analytics pages
│   │   ├── auth/              # Authentication
│   │   └── ...                # All other pages
│   │
│   ├── middleware.ts          # i18n routing middleware
│   └── layout.tsx             # Root layout (updated)
│
├── lib/
│   └── i18n.ts                # i18n configuration
│
└── components/
    ├── language-switcher.tsx  # Language toggle component
    └── ...                    # Updated components
```

## 🔄 Implementation Phases

### Phase 1: Setup & Configuration ⚙️

**Goal:** Establish the foundation for i18n support

**Tasks:**
1. Install `next-intl` package
   ```bash
   npm install next-intl
   ```

2. Create translation files:
   - `/messages/ko.json` - Korean (primary language)
   - `/messages/en.json` - English translations

3. Create i18n configuration (`lib/i18n.ts`):
   - Define supported locales: `['ko', 'en']`
   - Set default locale: `ko`
   - Configure locale detection strategy

4. Create middleware (`app/middleware.ts`):
   - Implement locale detection from URL
   - Handle locale redirects
   - Set default locale for root path

5. Update root layout (`app/layout.tsx`):
   - Add locale support
   - Configure HTML lang attribute

6. Create locale layout (`app/[locale]/layout.tsx`):
   - Wrap with NextIntlClientProvider
   - Load locale-specific messages

**Deliverables:**
- ✅ Package installed
- ✅ Basic configuration files
- ✅ Middleware setup
- ✅ Locale routing functional

---

### Phase 2: Core Navigation & Layout Components 🧭

**Goal:** Internationalize the main navigation structure

**Components to Update:**
1. `components/sidebar.tsx`
   - Dashboard menu item
   - Campaign Management dropdown items
   - Log Analysis dropdown items
   - UTM Tools dropdown items
   - Footer text

2. `components/layout-wrapper.tsx`
   - Layout-related text and labels

3. `components/user-menu.tsx`
   - User menu items
   - Logout, settings, profile options

4. `components/page-footer.tsx`
   - Footer copyright and links

5. **New Component:** `components/language-switcher.tsx`
   - Korean/English toggle button
   - Store language preference
   - Smooth language switching

**Translation Keys Example:**
```json
{
  "navigation": {
    "dashboard": "대시보드",
    "campaignManagement": "캠페인 관리",
    "campaignList": "캠페인 목록",
    "createCampaign": "새 캠페인 만들기",
    "logAnalysis": "로그 분석"
  }
}
```

**Deliverables:**
- ✅ All navigation items translated
- ✅ Language switcher component
- ✅ Layout maintains structure in both languages

---

### Phase 3: Dashboard & Landing Page 🏠

**Goal:** Translate the main entry point and dashboard

**Pages to Update:**
1. `app/[locale]/page.tsx` (main landing page)
   - Hero section text
   - Stats cards labels
   - Feature grid cards
   - Call-to-action buttons
   - Recent campaigns section

**Translation Sections:**
- Hero headline and description
- Stats: "Active Campaigns", "Total Clicks", "Unique Visitors", "Total Budget"
- Features: All 6 feature cards with titles and descriptions
- CTAs: "Create Campaign", "View All Campaigns"

**Metadata:**
- Page titles (SEO)
- Meta descriptions

**Deliverables:**
- ✅ Landing page fully translated
- ✅ Dynamic content properly localized
- ✅ Metadata internationalized

---

### Phase 4: Campaign Management Section 📊

**Goal:** Internationalize all campaign-related functionality

**Pages to Update:**
1. `app/[locale]/campaigns/page.tsx` - Campaign List
   - Page title and description
   - Summary cards labels
   - Filter labels and options
   - Table headers
   - Status labels
   - Action menu items
   - Pagination text

2. `app/[locale]/campaigns/new/page.tsx` - Create Campaign
   - Form labels and placeholders
   - Validation messages
   - Submit button text
   - Help text and tooltips

3. `app/[locale]/campaigns/[id]/page.tsx` - Campaign Details
   - Section titles
   - Data labels
   - Analytics labels
   - Action buttons

4. `app/[locale]/campaigns/[id]/edit/page.tsx` - Edit Campaign
   - Form labels
   - Update button text
   - Confirmation messages

5. `app/[locale]/courses/page.tsx` - Course Management
   - Page title
   - Table headers
   - Action buttons

**Status Translations:**
```json
{
  "status": {
    "active": "진행중",
    "waiting": "대기중",
    "ended": "종료됨",
    "paused": "일시정지",
    "hidden": "숨김"
  }
}
```

**Deliverables:**
- ✅ All campaign pages translated
- ✅ Forms properly localized
- ✅ Status labels consistent

---

### Phase 5: Analytics & Reporting Pages 📈

**Goal:** Translate all analytics and reporting interfaces

**Pages to Update:**
1. `app/[locale]/performance/page.tsx` - Performance Dashboard
2. `app/[locale]/source-analysis/page.tsx` - Source & Media Analysis
3. `app/[locale]/campaign-analysis/page.tsx` - Campaign Analytics
4. `app/[locale]/environment-analysis/page.tsx` - Environment Analysis
5. `app/[locale]/time-analysis/page.tsx` - Time-based Analysis
6. `app/[locale]/returning-analysis/page.tsx` - Returning Visitor Analysis
7. `app/[locale]/page-flow-analysis/page.tsx` - Page Flow Analysis

**Common Elements:**
- Chart titles and labels
- Filter options
- Date range selectors
- Export buttons
- Metric labels
- Table headers

**Chart Library Considerations:**
- Configure Recharts for Korean number formatting
- Locale-specific date formatting on axes
- Tooltip translations

**Deliverables:**
- ✅ All analytics pages translated
- ✅ Charts display localized content
- ✅ Filters work in both languages

---

### Phase 6: Tracking & UTM Tools 🔗

**Goal:** Internationalize tracking and UTM management

**Pages to Update:**
1. `app/[locale]/tracking/page.tsx` - Tracking Links Management
   - Page title and description
   - Table headers
   - Action buttons
   - Link status labels

2. `app/[locale]/utm-tools/page.tsx` - UTM Tools List
   - Tool descriptions
   - Navigation links

3. `app/[locale]/utm-tools/generator/page.tsx` - UTM Generator
   - Form labels
   - Parameter descriptions
   - Generated URL display
   - Copy button text
   - Help text for UTM parameters

**UTM Parameter Explanations:**
- utm_source: Traffic source explanation
- utm_medium: Marketing medium explanation
- utm_campaign: Campaign identifier explanation
- utm_term: Keyword tracking explanation
- utm_content: Content differentiation explanation

**Deliverables:**
- ✅ Tracking pages translated
- ✅ UTM generator fully localized
- ✅ Help text clear in both languages

---

### Phase 7: Authentication & User Management 🔐

**Goal:** Translate authentication flows and user management

**Pages to Update:**
1. `app/[locale]/auth/page.tsx` - Login/Register
   - Form labels (Email, Password)
   - Login button
   - Register button
   - "Remember me" checkbox
   - "Forgot password?" link
   - Error messages

2. `app/[locale]/reset-password/page.tsx` - Password Reset
   - Page title
   - Form labels
   - Submit button
   - Success/error messages

**Components to Update:**
1. `components/auth-form.tsx` - Authentication Form
   - Input placeholders
   - Validation messages
   - Submit button text

2. `components/forgot-password-form.tsx` - Forgot Password Form
   - Instructions text
   - Email input label
   - Submit button

3. `components/auth-footer.tsx` - Auth Footer
   - Footer links and text

**Validation Messages:**
- Required field errors
- Email format errors
- Password strength requirements
- Login failure messages
- Registration success messages

**Deliverables:**
- ✅ Auth flows fully translated
- ✅ Error messages clear
- ✅ User-friendly validation

---

### Phase 8: API Responses & Error Messages 🔔

**Goal:** Internationalize backend messages and notifications

**Tasks:**
1. Create translation helper for API routes:
   - Function to get user's locale
   - Server-side translation utility
   - Error message formatter

2. Update API error responses:
   - Validation errors
   - Database errors
   - Authentication errors
   - Authorization errors

3. Update toast notifications:
   - Success messages
   - Error messages
   - Warning messages
   - Info messages

4. Form validation messages:
   - Required fields
   - Format validation
   - Range validation
   - Custom business rules

**Example API Error Translation:**
```json
{
  "errors": {
    "campaign": {
      "notFound": "캠페인을 찾을 수 없습니다",
      "createFailed": "캠페인 생성에 실패했습니다",
      "updateFailed": "캠페인 업데이트에 실패했습니다",
      "deleteFailed": "캠페인 삭제에 실패했습니다"
    }
  }
}
```

**Toast Notifications:**
```javascript
// Before
toast.success('Campaign created successfully!');

// After
toast.success(t('messages.campaign.created'));
```

**Deliverables:**
- ✅ API errors translated
- ✅ Toast messages localized
- ✅ Consistent error handling

---

### Phase 9: Testing & Refinement ✅

**Goal:** Ensure quality and completeness of translations

**Testing Checklist:**

1. **Functionality Testing**
   - [ ] Language switcher works on all pages
   - [ ] Page refreshes maintain selected language
   - [ ] URL routing includes locale (`/ko/`, `/en/`)
   - [ ] Default language is Korean
   - [ ] All navigation works in both languages

2. **Translation Completeness**
   - [ ] All UI text translated
   - [ ] No missing translation keys
   - [ ] Fallback to Korean for missing translations
   - [ ] Technical terms consistent across languages

3. **Formatting & Localization**
   - [ ] Date formats correct (Korean: YYYY-MM-DD, English: MM/DD/YYYY)
   - [ ] Number formats correct (Korean: 1,000,000원)
   - [ ] Currency displays properly (₩ for Korean Won)
   - [ ] Time displays in KST for Korean, user timezone for English

4. **Layout & UI**
   - [ ] No text overflow or truncation
   - [ ] Buttons maintain size in both languages
   - [ ] Tables render properly
   - [ ] Responsive design works

5. **User Experience**
   - [ ] Language preference persists
   - [ ] Smooth language switching (no flash)
   - [ ] SEO meta tags in correct language
   - [ ] Error messages clear and helpful

**Performance Testing:**
- Check initial page load times
- Verify translation file sizes
- Test with slow connections

**Deliverables:**
- ✅ All tests passing
- ✅ Bug-free language switching
- ✅ Documentation complete

---

## 🌍 Localization Considerations

### Currency Formatting

**Korean:**
```javascript
// Full format
₩1,000,000

// Short format (만 = 10,000)
₩100만
```

**English:**
```javascript
// Full format
$1,000

// or keep Won
₩1,000,000
```

### Date & Time Formatting

**Korean:**
```javascript
// Long format
2025년 10월 27일

// Short format
2025-10-27

// Time
오후 3:30 (KST)
```

**English:**
```javascript
// Long format
October 27, 2025

// Short format
10/27/2025

// Time
3:30 PM (KST)
```

### Number Formatting

**Korean:**
```javascript
// Thousands separator
1,234,567

// Percentage
85.5%

// Decimal
3.14
```

**English:**
```javascript
// Same conventions
1,234,567
85.5%
3.14
```

### Technical Terms

Keep consistent across languages:
- UTM (do not translate)
- CTR (Click-Through Rate) - show as "CTR"
- API (do not translate)
- Dashboard - can be "대시보드" in Korean
- Analytics - "분석" in Korean

---

## 📝 Translation File Structure

### Example: `messages/ko.json`

```json
{
  "navigation": {
    "dashboard": "대시보드",
    "campaigns": "캠페인 관리",
    "analytics": "분석"
  },
  "common": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "edit": "수정",
    "create": "생성",
    "search": "검색",
    "filter": "필터",
    "export": "내보내기"
  },
  "campaign": {
    "title": "캠페인",
    "create": "새 캠페인 만들기",
    "list": "캠페인 목록",
    "details": "캠페인 상세",
    "status": {
      "active": "진행중",
      "waiting": "대기중",
      "ended": "종료됨"
    }
  },
  "messages": {
    "success": {
      "created": "성공적으로 생성되었습니다",
      "updated": "성공적으로 업데이트되었습니다",
      "deleted": "성공적으로 삭제되었습니다"
    },
    "error": {
      "generic": "오류가 발생했습니다",
      "notFound": "찾을 수 없습니다",
      "unauthorized": "권한이 없습니다"
    }
  }
}
```

### Example: `messages/en.json`

```json
{
  "navigation": {
    "dashboard": "Dashboard",
    "campaigns": "Campaign Management",
    "analytics": "Analytics"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "export": "Export"
  },
  "campaign": {
    "title": "Campaign",
    "create": "Create New Campaign",
    "list": "Campaign List",
    "details": "Campaign Details",
    "status": {
      "active": "Active",
      "waiting": "Waiting",
      "ended": "Ended"
    }
  },
  "messages": {
    "success": {
      "created": "Successfully created",
      "updated": "Successfully updated",
      "deleted": "Successfully deleted"
    },
    "error": {
      "generic": "An error occurred",
      "notFound": "Not found",
      "unauthorized": "Unauthorized"
    }
  }
}
```

---

## 🔧 Implementation Guidelines

### Using Translations in Components

**Client Components:**
```typescript
'use client';

import { useTranslations } from 'next-intl';

export function CampaignList() {
  const t = useTranslations('campaign');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('create')}</button>
    </div>
  );
}
```

**Server Components:**
```typescript
import { useTranslations } from 'next-intl';

export default function CampaignPage() {
  const t = useTranslations('campaign');
  
  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  );
}
```

**With Dynamic Values:**
```typescript
// Translation file
{
  "campaign": {
    "clicksCount": "{count}개의 클릭"
  }
}

// Component
t('campaign.clicksCount', { count: 150 })
// Output: "150개의 클릭"
```

### Routing with Locales

**URLs will follow this pattern:**
```
/ → /ko (redirect to Korean by default)
/ko → Korean dashboard
/en → English dashboard
/ko/campaigns → Korean campaigns page
/en/campaigns → English campaigns page
```

**Link Component Usage:**
```typescript
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function Navigation() {
  const locale = useLocale();
  
  return (
    <Link href={`/${locale}/campaigns`}>
      Campaigns
    </Link>
  );
}
```

---

## 🎨 UI Components for Language Support

### Language Switcher Component

Location: `components/language-switcher.tsx`

**Features:**
- Toggle between Korean and English
- Display current language
- Store preference in cookies/localStorage
- Smooth transition without page flash

**Design:**
```
[🇰🇷 한국어 | 🇺🇸 English]
```

**Placement:**
- Top right header
- User menu dropdown
- Footer (optional)

---

## ⚠️ Important Notes

### Migration Strategy

1. **Non-Breaking Changes:**
   - All existing URLs will redirect to `/ko/...`
   - Bookmarks will continue to work
   - External links will auto-redirect

2. **Database Considerations:**
   - No database changes required
   - Content remains in original language
   - Only UI translations needed

3. **SEO Implications:**
   - Add `hreflang` tags for language variants
   - Update sitemap to include both locales
   - Set Korean as default in `robots.txt`

### Development Workflow

1. Add new features in Korean first
2. Add English translations in same PR
3. Test both languages before merging
4. Keep translation files in sync

### Translation Management

- Use clear, consistent translation keys
- Group related translations together
- Add comments for context when needed
- Keep technical terms consistent
- Review translations with native speakers

---

## 📊 Progress Tracking

### Phase Completion Checklist

- [ ] Phase 1: Setup & Configuration
- [ ] Phase 2: Core Navigation & Layout
- [ ] Phase 3: Dashboard & Landing
- [ ] Phase 4: Campaign Management
- [ ] Phase 5: Analytics & Reporting
- [ ] Phase 6: Tracking & UTM Tools
- [ ] Phase 7: Authentication
- [ ] Phase 8: API & Messages
- [ ] Phase 9: Testing & Refinement

### Metrics

- **Total Pages:** ~23 pages
- **Total Components:** ~10+ components
- **Estimated Translation Keys:** 300-500 keys
- **Estimated Effort:** 2-3 weeks (depending on team size)

---

## 🚀 Post-Implementation

### Maintenance

1. **Adding New Features:**
   - Always add translations for both languages
   - Update translation files in same commit
   - Test in both languages

2. **Updating Translations:**
   - Track translation changes in git
   - Review updates with native speakers
   - Update documentation as needed

3. **Adding More Languages:**
   - Create new message file (e.g., `messages/ja.json`)
   - Add locale to configuration
   - Update language switcher
   - Test thoroughly

### Future Enhancements

- [ ] Add more languages (Japanese, Chinese, etc.)
- [ ] Implement translation management system (e.g., Crowdin)
- [ ] Add RTL support if needed
- [ ] Automated translation testing
- [ ] Translation coverage reports

---

## 📚 References

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Korean Localization Best Practices](https://www.w3.org/International/quicktips/)

---

## 👥 Team Responsibilities

- **Frontend Developers:** Implement translations in components
- **Backend Developers:** Internationalize API responses
- **QA Team:** Test all languages thoroughly
- **Product Manager:** Review translation accuracy
- **Native Korean Speaker:** Review Korean translations
- **Native English Speaker:** Review English translations

---

**Document Version:** 1.0  
**Last Updated:** October 27, 2025  
**Status:** Planning Phase

