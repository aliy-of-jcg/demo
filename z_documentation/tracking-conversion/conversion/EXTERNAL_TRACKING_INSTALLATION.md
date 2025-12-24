# 📦 Installing CosMos Tracking on External Websites

## Overview

To track visitors on external websites (aptdecor.uz, jcg.asia, etc.), you need to:
1. ✅ Deploy CosMos AI to a public domain
2. ✅ Add the tracking script to your landing pages
3. ✅ Configure CORS (already done!)

---

## Step 1: Deploy CosMos AI (Required)

### Why?
Your tracking script needs to be accessible from the internet. `localhost:3000` won't work for external sites.

### Deployment Options:

#### Option A: Vercel (Recommended - Easiest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then get your URL
# Example: https://cosmos-ai-abc123.vercel.app
```

#### Option B: Your Own Server
- Deploy to your own server (AWS, DigitalOcean, etc.)
- Make sure it's accessible via HTTPS
- Example: `https://cosmos.yourdomain.com`

---

## Step 2: Add Tracking Script to Landing Pages

### Installation Code

Add this code **before the closing `</body>` tag** on all landing pages:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Landing Page</title>
</head>
<body>
    <!-- Your page content here -->
    
    <!-- CosMos AI Tracking Script -->
    <script src="https://YOUR-COSMOS-DOMAIN.com/cosmos-track.js"></script>
</body>
</html>
```

**Replace `YOUR-COSMOS-DOMAIN.com` with your actual domain!**

### Example for aptdecor.uz

If your CosMos AI is deployed at `https://cosmos.yourdomain.com`:

```html
<!-- Add to aptdecor.uz pages -->
<script src="https://cosmos.yourdomain.com/cosmos-track.js"></script>
```

---

## Step 3: Verify Installation

### Test Checklist:

1. **Deploy CosMos AI**
   - [ ] App is accessible via public URL
   - [ ] `/cosmos-track.js` is accessible
   - [ ] Test: Visit `https://your-domain.com/cosmos-track.js` in browser

2. **Add Script to Landing Page**
   - [ ] Script tag added before `</body>`
   - [ ] Correct domain in `src` attribute
   - [ ] Page loads without errors

3. **Test Tracking**
   - [ ] Create a tracking link in UTM Tools
   - [ ] Click the tracking link
   - [ ] Land on your external site
   - [ ] Open browser DevTools → Network tab
   - [ ] Look for POST request to `/api/track` ✅
   - [ ] Check campaign stats → Visitors should increment ✅

---

## Step 4: CORS Configuration (Already Done!)

I've already configured CORS to allow requests from:
- ✅ `http://aptdecor.uz`
- ✅ `https://aptdecor.uz`
- ✅ `http://jcg.asia`
- ✅ `https://jcg.asia`
- ✅ `https://www.aptdecor.uz`
- ✅ `https://www.jcg.asia`
- ✅ `http://localhost:3000` (for testing)

### Adding More Domains

If you need to track other domains, CORS is already configured to allow all origins. The `/api/track` endpoint accepts requests from any domain by default (Google Analytics-style tracking).

---

## Common Issues & Solutions

### Issue 1: "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"
**Problem:** Script URL is wrong or domain is not accessible  
**Solution:** 
- Check if CosMos AI is deployed and accessible
- Verify script URL is correct: `https://your-domain.com/cosmos-track.js`
- Test the URL directly in browser

### Issue 2: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Problem:** CORS configuration issue (should not occur as all origins are allowed)  
**Solution:** 
- Check Nginx configuration for CORS headers
- Verify `/api/track` endpoint is accessible
- Check browser console for specific CORS error details

### Issue 3: Tracking works but URL stays messy
**Problem:** Script might not be loading completely  
**Solution:**
- Check browser console for JavaScript errors
- Verify script is loaded: DevTools → Network → look for `cosmos-track.js`
- Wait 2-3 seconds - URL should clean automatically

### Issue 4: Visitors not incrementing
**Problem:** Script might not be sending data  
**Solution:**
- Open DevTools → Network tab
- Visit the tracking link
- Look for POST request to `/api/track`
- Check if request succeeds (status 200)
- If request fails, check CORS configuration

---

## Testing Without Deployment (Local Testing)

### For Testing on aptdecor.uz with localhost:

1. **Use ngrok** (tunnels localhost to public URL):
```bash
# Install ngrok
npm i -g ngrok

# Run ngrok
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
```

2. **Add script to aptdecor.uz**:
```html
<script src="https://abc123.ngrok.io/cosmos-track.js"></script>
```

⚠️ **Note:** Ngrok URLs change each time you restart. For production, use a permanent deployment.

---

## Production Checklist

Before going live:

- [ ] CosMos AI deployed to production
- [ ] HTTPS enabled (required for external tracking)
- [ ] Tracking script added to all landing pages
- [ ] CORS configured for all domains
- [ ] Tested tracking link → visitors increment
- [ ] URL cleaning works (UTM params removed)
- [ ] No console errors on landing pages
- [ ] Database connection limits increased (done)
- [ ] ClickHouse and MySQL running smoothly

---

## What Happens After Installation

### User Journey:
```
1. User clicks tracking link (from email, ad, etc.)
   → /t/ABC123
   
2. CosMos AI logs the click
   → tracking_events table ✅
   
3. User redirected to landing page with UTM params
   → https://aptdecor.uz/?utm_campaign=...
   
4. Landing page loads cosmos-track.js
   → Script reads UTM parameters
   → Reads/creates UUID cookie
   → Sends data to /api/track
   
5. CosMos AI logs the visit
   → visit_logs table ✅
   → Links to campaign via UTM parameters
   
6. Script cleans URL
   → https://aptdecor.uz/ (clean!) ✅
   
7. Campaign stats update
   → Clicks: +1
   → Unique Visitors: +1 ✅
```

### Result:
- ✅ Clicks tracked
- ✅ Unique visitors tracked (with UUID cookies)
- ✅ Clean URLs (better UX)
- ✅ Accurate campaign analytics

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify CORS configuration
4. Test script URL directly in browser
5. Check if tracking data appears in ClickHouse:

```sql
SELECT * FROM analytics.visit_logs 
WHERE campaign_id > 0 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## Summary

**Required Steps:**
1. ✅ Deploy CosMos AI to public domain
2. ✅ Add script tag to landing pages
3. ✅ Test tracking links

**Already Configured:**
- ✅ CORS for aptdecor.uz and jcg.asia
- ✅ URL cleaning (automatic)
- ✅ UUID-based visitor tracking
- ✅ Connection pooling (50 connections)

**Once deployed, tracking will work automatically!** 🚀







