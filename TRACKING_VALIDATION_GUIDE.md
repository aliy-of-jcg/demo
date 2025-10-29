# 🔒 Tracking Validation Guide

## Overview

This guide explains the tracking validation system that ensures only legitimate visitors (those who came via UTM tracking links) are tracked in your analytics.

---

## ✅ What Was Fixed

### Problem
Previously, the tracking script was loaded on ALL pages including the CosMos AI dashboard itself. This meant:
- Your own visits to the dashboard were being tracked ❌
- Any random visitor to the CosMos AI app was tracked ❌
- Environment analysis showed YOUR devices/browsers instead of actual campaign visitors ❌

### Solution
Implemented **two-layer validation** to ensure only UTM link visitors are tracked:

1. **Domain Validation** - Only track on authorized external landing pages
2. **UTM Parameter Validation** - Only track visitors who came via UTM links

---

## 🎯 How It Works Now

### 1. Domain Validation

The tracking script checks if it's running on an **authorized domain**:

```javascript
// Allowed domains (external landing pages only)
allowedDomains: [
  'aptdecor.uz',
  'www.aptdecor.uz',
  'jcg.asia',
  'www.jcg.asia',
  'localhost:3001', // For testing external sites locally
]
```

**Behavior:**
- ✅ **aptdecor.uz** → Tracking ENABLED
- ✅ **jcg.asia** → Tracking ENABLED
- ❌ **cosmos.kr** (or any other domain) → Tracking DISABLED
- ⚠️ **localhost:3000** → Uses internal testing endpoint

### 2. UTM Parameter Validation

For visitors on authorized domains, the script checks if they have **UTM parameters**:

```javascript
// Only tracks if visitor has UTM parameters on landing page
requireUTMParams: true
```

**Behavior:**
- ✅ Visitor arrives with `?utm_campaign=summer-sale` → TRACKED
- ❌ Visitor types URL directly (no UTM) → NOT TRACKED
- ✅ Visitor navigates to 2nd page (UTM stored in session) → TRACKED

**Session Persistence:**
UTM parameters are stored in `sessionStorage` so subsequent page views in the same session are also tracked, even if the URL doesn't have UTM params anymore.

---

## 🚀 Usage

### For Production (External Landing Pages)

**1. Add tracking script to your landing page:**

```html
<!-- Add to aptdecor.uz, jcg.asia, etc. -->
<script src="https://your-cosmos-domain.com/cosmos-track.js"></script>
```

**2. Create a tracking link:**
1. Go to CosMos AI dashboard
2. Create campaign and tracking link
3. Share the tracking link: `https://cosmos.kr/t/ABC123`

**3. User clicks tracking link:**
```
User clicks: https://cosmos.kr/t/ABC123
       ↓
Redirects to: https://aptdecor.uz?utm_campaign=summer-sale
       ↓
cosmos-track.js runs → Checks domain ✅ → Checks UTM ✅ → TRACKS
       ↓
Analytics updated with device, browser, OS ✅
```

### For Local Testing

**Option 1: Test on localhost:3000 (Internal Endpoint)**

The tracking script automatically uses `/api/track-internal` when running on localhost:3000:

```html
<!-- In app/layout.tsx for testing only -->
<Script src="/cosmos-track.js" strategy="afterInteractive" />
```

**Note:** This is for testing the tracking functionality only. Remove before production!

**Option 2: Test External Site Locally**

Run your landing page on a different port (e.g., localhost:3001):

```bash
# Terminal 1: CosMos AI
npm run dev  # Runs on localhost:3000

# Terminal 2: Your landing page
http-server . -p 3001  # Runs on localhost:3001
```

Add script to your local landing page:
```html
<script src="http://localhost:3000/cosmos-track.js"></script>
```

---

## 🔧 Configuration Options

### Enable/Disable Validations

Edit `public/cosmos-track.js`:

```javascript
const CONFIG = {
  // Domain validation (recommended: always enabled)
  enableDomainValidation: true,  // true = only track on allowed domains
  
  // UTM validation (recommended: enabled for production)
  requireUTMParams: true,  // true = only track UTM link visitors
  
  // ... other config
};
```

### Add More Domains

To track on additional domains, edit `public/cosmos-track.js`:

```javascript
allowedDomains: [
  'aptdecor.uz',
  'www.aptdecor.uz',
  'jcg.asia',
  'www.jcg.asia',
  'yournewsite.com',        // Add new domain
  'www.yournewsite.com',    // Add www version
  'localhost:3001',
]
```

**Then update CORS in `/api/track/route.ts`** if needed (though it's currently set to allow all origins).

---

## 📊 What Gets Tracked

### Only These Visitors Are Tracked:

✅ **Scenario 1: UTM Link Click**
```
1. User clicks tracking link
2. Lands on aptdecor.uz?utm_campaign=...
3. Tracked with: device, browser, OS, screen resolution
```

✅ **Scenario 2: Session Navigation**
```
1. User already tracked (has UTM in session)
2. Navigates to another page on same site
3. Tracked with same UTM parameters
```

### NOT Tracked:

❌ **Direct visits** (user types aptdecor.uz directly)
❌ **Visits without UTM parameters**
❌ **Visits on unauthorized domains**
❌ **Your own visits to CosMos AI dashboard**

---

## 🧪 Testing Checklist

### Test 1: Domain Validation
- [ ] Visit CosMos AI dashboard → Should NOT track
- [ ] Visit aptdecor.uz with script → Should attempt to track (but fail UTM check)
- [ ] Check browser console for: `[CosMos] Tracking disabled - unauthorized domain`

### Test 2: UTM Validation
- [ ] Visit aptdecor.uz directly (no UTM) → Should NOT track
- [ ] Check console: `[CosMos] Skipping tracking - no UTM parameters`
- [ ] Click tracking link → Should TRACK ✅

### Test 3: Full Flow
1. Create tracking link in CosMos AI
2. Click the link
3. Land on external site with UTM params
4. Check browser Network tab → Should see POST to `/api/track`
5. Navigate to 2nd page → Should still track (UTM in session)
6. Check Environment Analysis → Should show your device/browser

---

## 🔒 Security Features

### 1. Domain Whitelist
Only authorized domains can send tracking data.

### 2. UTM Requirement
Prevents tracking of random visitors who didn't come via your campaigns.

### 3. Session-Based Tracking
UTM parameters are stored per session, preventing cross-session tracking.

### 4. Internal Testing Isolation
Internal testing uses separate endpoint (`/api/track-internal`) that:
- Only accepts localhost/internal domains
- Logs all attempts
- Can be disabled in production

---

## 📝 API Endpoints

### `/api/track` (Production)
- Used by external landing pages
- Accepts tracking data from authorized domains
- Stores in `visit_logs` table
- Used for all campaign analytics

### `/api/track-internal` (Testing)
- Used by CosMos AI app itself (localhost:3000)
- Only accepts localhost/internal requests
- Separate from production tracking
- For testing tracking functionality

---

## 🚨 Troubleshooting

### Issue: "Tracking disabled - unauthorized domain"
**Cause:** Script is running on a domain not in the whitelist  
**Fix:** Add domain to `allowedDomains` array in `cosmos-track.js`

### Issue: "Skipping tracking - no UTM parameters"
**Cause:** Visitor landed directly without clicking tracking link  
**This is expected behavior** ✅ - Only UTM link visitors should be tracked

### Issue: Not tracking on aptdecor.uz
**Check:**
1. Is script loaded? (Check Network tab for `cosmos-track.js`)
2. Are there JavaScript errors? (Check Console)
3. Did user click tracking link with UTM params?
4. Is domain in whitelist?

### Issue: Still tracking CosMos AI dashboard
**Fix:** Make sure you removed the script from `app/layout.tsx`:
```typescript
// REMOVE THIS LINE:
// <Script src="/cosmos-track.js" strategy="afterInteractive" />
```

---

## 🎉 Benefits

### Before Validation
- ❌ Tracked ALL visitors (including yourself)
- ❌ Environment analysis showed YOUR devices
- ❌ Inaccurate visitor counts
- ❌ Mixed data (internal + external)

### After Validation
- ✅ Only tracks UTM link visitors
- ✅ Accurate device/browser/OS data
- ✅ Clean analytics (external visitors only)
- ✅ Separate testing environment
- ✅ Better data quality

---

## 📚 Summary

**Two-Layer Validation:**
1. **Domain Check** → Is this an authorized landing page?
2. **UTM Check** → Did visitor come via tracking link?

**Result:** Only legitimate campaign visitors are tracked, giving you accurate analytics data!

---

## 🔗 Related Files

- `public/cosmos-track.js` - Main tracking script with validation
- `app/api/track/route.ts` - Production tracking endpoint
- `app/api/track-internal/route.ts` - Internal testing endpoint
- `app/layout.tsx` - Remove script from here for production
- `EXTERNAL_TRACKING_INSTALLATION.md` - Deployment guide

---

**Last Updated:** October 29, 2025  
**Version:** 2.0.0

