# 📊 Conversion Tracking Guide

## Overview

This guide explains how to track conversions (signups, purchases, etc.) on your landing pages using CosMos AI's conversion tracking feature.

---

## ✅ What is a Conversion?

A **conversion** is any valuable action a visitor takes on your landing page:
- 🔐 **Sign up** for an account
- 💰 **Purchase** a product
- 📝 **Submit** a contact form
- 🎁 **Start** a free trial
- 📥 **Download** a resource
- 📞 **Book** a consultation

---

## 🎯 How It Works

### The Flow:

```
1. User clicks UTM tracking link
   https://cosmos.kr/t/ABC123
   ↓
2. Redirected to landing page with UTM params
   https://aptdecor.uz/?utm_campaign=summer-sale&utm_source=instagram
   ↓
3. cosmos-track.js stores UTM params in sessionStorage
   ✅ cosmos_utm_campaign: "summer-sale"
   ✅ cosmos_utm_source: "instagram"
   ✅ cosmos_utm_medium: "social"
   ↓
4. User navigates through site (UTM params persist in session)
   https://aptdecor.uz/features
   https://aptdecor.uz/pricing
   https://aptdecor.uz/signup
   ↓
5. User completes signup
   ↓
6. Your code calls: window.CosmosTracker.trackConversion({ type: 'signup' })
   ↓
7. Conversion tracked with original UTM parameters ✅
   ↓
8. Shows in analytics under "summer-sale" campaign ✅
```

**Key Point:** UTM parameters are stored in `sessionStorage`, so conversions are attributed correctly even if:
- User lands on different page
- User navigates through multiple pages
- URL no longer has UTM parameters

---

## 🚀 Implementation

### Step 1: Ensure Tracking Script is Loaded

On **aptdecor.uz** (or any landing page), add the tracking script:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Aptdecor - Sign Up</title>
</head>
<body>
    <!-- Your page content -->
    
    <!-- CosMos Tracking Script - Add before </body> -->
    <script src="https://cosmos.kr/cosmos-track.js"></script>
</body>
</html>
```

### Step 2: Call Conversion Function on Success

When a user successfully completes an action, call the conversion tracking function.

---

## 📝 Implementation Examples

### Example 1: Vanilla JavaScript Form

```html
<form id="signupForm">
    <input type="email" name="email" required>
    <input type="password" name="password" required>
    <button type="submit">Sign Up</button>
</form>

<script>
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        // Your signup API call
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password')
            })
        });
        
        if (response.ok) {
            // ✅ TRACK CONVERSION - User successfully signed up
            if (window.CosmosTracker) {
                window.CosmosTracker.trackConversion({
                    type: 'signup',
                    value: 0
                });
            }
            
            // Redirect to success page or dashboard
            window.location.href = '/dashboard';
        } else {
            alert('Signup failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred. Please try again.');
    }
});
</script>
```

### Example 2: React/Next.js Component

```typescript
// SignupForm.tsx
import { useState } from 'react';

export default function SignupForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                // ✅ TRACK CONVERSION
                if ((window as any).CosmosTracker) {
                    (window as any).CosmosTracker.trackConversion({
                        type: 'signup',
                        value: 0
                    });
                }

                // Redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                alert('Signup failed');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required 
            />
            <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
            />
            <button type="submit" disabled={loading}>
                {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
        </form>
    );
}
```

### Example 3: Purchase Conversion

```javascript
async function handlePurchase(cartTotal) {
    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ /* cart data */ })
        });

        if (response.ok) {
            // ✅ TRACK PURCHASE with monetary value
            if (window.CosmosTracker) {
                window.CosmosTracker.trackConversion({
                    type: 'purchase',
                    value: cartTotal // e.g., 199.99
                });
            }

            window.location.href = '/thank-you';
        }
    } catch (error) {
        console.error(error);
    }
}
```

### Example 4: Contact Form Submission

```javascript
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const response = await fetch('/api/contact', {
        method: 'POST',
        body: new FormData(e.target)
    });

    if (response.ok) {
        // ✅ TRACK CONTACT FORM SUBMISSION
        if (window.CosmosTracker) {
            window.CosmosTracker.trackConversion({
                type: 'contact_form',
                value: 0
            });
        }

        alert('Thank you! We will contact you soon.');
    }
});
```

---

## 🎨 Conversion Types

You can track different types of conversions:

```javascript
// Signup
window.CosmosTracker.trackConversion({
    type: 'signup',
    value: 0
});

// Purchase with value
window.CosmosTracker.trackConversion({
    type: 'purchase',
    value: 99.99
});

// Free trial
window.CosmosTracker.trackConversion({
    type: 'trial_start',
    value: 0
});

// Newsletter signup
window.CosmosTracker.trackConversion({
    type: 'newsletter',
    value: 0
});

// Download
window.CosmosTracker.trackConversion({
    type: 'download',
    value: 0
});

// Booking
window.CosmosTracker.trackConversion({
    type: 'booking',
    value: 0
});
```

**Note:** The `type` and `value` parameters are optional and for your own tracking purposes. CosMos AI tracks all conversions with `event_type = 'conversion'` in the database.

---

## 🔍 Conversion Attribution

### How Conversions are Attributed to Campaigns

Conversions are **automatically attributed** to the correct campaign based on the UTM parameters stored in the session:

```
User Flow Example:

Day 1, 10:00 AM - Click tracking link from Instagram ad
  → Campaign: "summer-sale"
  → Source: "instagram"
  → Medium: "social"
  → UTM params stored in sessionStorage ✅

Day 1, 10:05 AM - Browse products
  → aptdecor.uz/products
  → Still has UTM params in session ✅

Day 1, 10:15 AM - Sign up
  → aptdecor.uz/signup
  → Conversion tracked ✅
  → Attributed to "summer-sale" campaign ✅
```

### Session Persistence

UTM parameters persist throughout the entire browser session:
- ✅ Valid for same tab/window
- ✅ Valid across multiple page views
- ✅ Valid even if user closes and reopens tab (within 30 min session timeout)
- ❌ Lost when browser/tab is completely closed
- ❌ Lost when user clears cookies/storage

### What Doesn't Get Tracked

Conversions will **NOT** be tracked if:
- ❌ User visited the site directly (didn't use tracking link)
- ❌ User has no UTM parameters in session
- ❌ User cleared their sessionStorage
- ❌ Tracking script is not loaded on the page

When this happens, you'll see this warning in console:
```
[CosMos] Conversion not tracked - no UTM parameters found. User did not come via tracking link.
```

---

## 📊 Viewing Conversion Data

After implementing conversion tracking, you can view the data in several places:

### 1. Campaign Analysis
- Go to **Analytics → Campaigns**
- See conversion count and conversion rate per campaign
- Formula: `Conversion Rate = (Conversions / Unique Visitors) × 100%`

### 2. Environment Analysis
- Go to **Analytics → Environment Analysis**
- See conversions by device, browser, OS
- Identify which platforms convert best

### 3. Time Analysis
- Go to **Analytics → Time Analysis**
- See conversions by hour, day, week
- Identify best times for conversions

### 4. Performance Dashboard
- Go to **Analytics → Performance**
- See overall conversion metrics
- Track conversion trends over time

---

## 🧪 Testing Conversion Tracking

### Test Checklist:

1. **Create a Tracking Link**
   - Go to Campaigns → Create tracking link
   - Copy the short URL

2. **Click the Tracking Link**
   - Open link in new incognito/private window
   - Should redirect to landing page with UTM params

3. **Check Console**
   - Open DevTools → Console
   - Should see: `[CosMos] Using production endpoint: /api/track`
   - Should see: Pageview tracked

4. **Trigger Conversion**
   - Complete signup/purchase/form
   - Should see: `[CosMos] ✅ Conversion tracked: { type: 'signup', campaign: 'your-campaign' }`

5. **Verify in Database**
   - Go to Campaign Analysis
   - Click on your campaign
   - Should see: Conversions count increased ✅

### Quick Test on Localhost

For testing, you can temporarily add the tracking script to your CosMos AI app:

```typescript
// app/layout.tsx (TEMPORARY - for testing only)
<Script src="/cosmos-track.js" strategy="afterInteractive" />
```

Then visit with UTM params:
```
http://localhost:3000/?utm_campaign=test&utm_source=testing
```

And test conversion in browser console:
```javascript
window.CosmosTracker.trackConversion({ type: 'signup' })
```

**Remember to remove the script after testing!**

---

## 🔒 Security & Best Practices

### ✅ Do's

1. **Call after successful action**
   - Only track conversions AFTER API confirms success
   - Don't track on form submission (track on success response)

2. **Validate on server-side**
   - Always validate conversions on your backend
   - Don't rely solely on client-side tracking

3. **Handle errors gracefully**
   - Wrap conversion tracking in try-catch
   - Don't let tracking errors break user experience

4. **Test thoroughly**
   - Test in incognito/private mode
   - Test different conversion types
   - Verify data in analytics

### ❌ Don'ts

1. **Don't track before success**
   ```javascript
   // ❌ BAD - tracks before API confirms
   window.CosmosTracker.trackConversion({ type: 'signup' });
   await fetch('/api/signup', { ... });
   
   // ✅ GOOD - tracks after confirmation
   const response = await fetch('/api/signup', { ... });
   if (response.ok) {
       window.CosmosTracker.trackConversion({ type: 'signup' });
   }
   ```

2. **Don't track multiple times**
   - Each conversion should only be tracked once
   - Avoid tracking in loops or repeated calls

3. **Don't track test conversions**
   - Use separate test environment
   - Or filter out test data in analytics

---

## 🐛 Troubleshooting

### Issue: "Conversion not tracked - no UTM parameters"

**Cause:** User didn't come via tracking link or sessionStorage was cleared

**Solution:**
- Make sure user clicks a tracking link with UTM parameters
- Check if tracking script is loaded on landing page
- Verify UTM params in browser console: `sessionStorage.getItem('cosmos_utm_campaign')`

### Issue: Conversions not showing in analytics

**Check:**
1. Is tracking script loaded? (Check Network tab for `cosmos-track.js`)
2. Did conversion tracking call succeed? (Check console for success message)
3. Was there a network request to `/api/track`? (Check Network tab)
4. Is the campaign ID correct in the database?

### Issue: Wrong campaign attribution

**Cause:** User might have clicked multiple tracking links in same session

**Solution:**
- This is expected behavior - last clicked link wins
- Consider clearing sessionStorage between campaigns
- Use unique tracking links for each campaign

---

## 📈 Advanced Usage

### Multiple Conversion Types

Track different conversion types in the same campaign:

```javascript
// On signup page
window.CosmosTracker.trackConversion({ type: 'signup', value: 0 });

// On purchase page
window.CosmosTracker.trackConversion({ type: 'purchase', value: 199.99 });

// On trial start
window.CosmosTracker.trackConversion({ type: 'trial', value: 0 });
```

All will be counted as conversions for the campaign.

### Conditional Tracking

Only track conversions for specific campaigns:

```javascript
const campaign = sessionStorage.getItem('cosmos_utm_campaign');

if (campaign === 'special-promo') {
    // Track with special handling
    window.CosmosTracker.trackConversion({ 
        type: 'promo_signup',
        value: 0 
    });
} else {
    // Regular tracking
    window.CosmosTracker.trackConversion({ 
        type: 'signup',
        value: 0 
    });
}
```

---

## 🎉 Summary

### For Aptdecor.uz Signups:

1. **Ensure tracking script is loaded on aptdecor.uz**
2. **When user successfully signs up, call:**
   ```javascript
   window.CosmosTracker.trackConversion({ type: 'signup', value: 0 });
   ```
3. **Conversion is automatically attributed to the correct campaign** based on UTM parameters
4. **View results in Campaign Analysis** → See conversion count and rate

### Key Benefits:

- ✅ **Accurate attribution** - Tracks original campaign source
- ✅ **Session persistence** - Works across multiple pages
- ✅ **Easy implementation** - One line of code
- ✅ **Flexible** - Track any type of conversion
- ✅ **Secure** - Only tracks users from tracking links

---

## 📚 Related Documentation

- `TRACKING_VALIDATION_GUIDE.md` - Domain and UTM validation
- `EXTERNAL_TRACKING_INSTALLATION.md` - Installing tracking script
- `public/cosmos-track.js` - Tracking script source code
- `app/api/track/route.ts` - Tracking API endpoint

---

**Version:** 2.0.0  
**Last Updated:** October 29, 2025

---

## 🤝 Support

Questions? Issues?
1. Check browser console for error messages
2. Verify tracking script is loaded
3. Test with UTM parameters in URL
4. Check Network tab for API requests

Happy tracking! 🚀

