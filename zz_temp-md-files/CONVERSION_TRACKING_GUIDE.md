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
            
            // Redirect to success page
            window.location.href = '/welcome';
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
                window.location.href = '/welcome';
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

            // window.location.href = '/thank-you';
            window.location.href = '/my-orders';
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

You can track different types of conversions with structured data:

```javascript
// Signup (no monetary value)
window.CosmosTracker.trackConversion({
    type: 'signup',
    value: 0
});

// Purchase with value
window.CosmosTracker.trackConversion({
    type: 'purchase',
    value: 99.99
});

// Purchase with metadata (for advanced tracking)
window.CosmosTracker.trackConversion({
    type: 'purchase',
    value: 99.99,
    metadata: {
        product: 'Premium Plan',
        quantity: 1,
        currency: 'USD'
    }
});

// Free trial with metadata
window.CosmosTracker.trackConversion({
    type: 'trial_start',
    value: 0,
    metadata: {
        plan: '14-day trial',
        features: 'all'
    }
});

// Newsletter signup
window.CosmosTracker.trackConversion({
    type: 'newsletter',
    value: 0
});

// Download with metadata
window.CosmosTracker.trackConversion({
    type: 'download',
    value: 0,
    metadata: {
        file: 'product-catalog.pdf',
        size: '2.5MB'
    }
});

// Booking with value and metadata
window.CosmosTracker.trackConversion({
    type: 'booking',
    value: 150.00,
    metadata: {
        service: 'consultation',
        duration: '60min',
        date: '2025-11-15'
    }
});
```

### Conversion Type Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | The type of conversion (e.g., 'signup', 'purchase', 'trial_start') |
| `value` | number | No | Monetary value of the conversion (default: 0) |
| `metadata` | object | No | Additional custom data about the conversion (stored as JSON) |

### Recommended Conversion Types

| Type | Description | Use Case |
|------|-------------|----------|
| `signup` | Account registration | User creates an account |
| `purchase` | Product/service purchase | User completes a transaction |
| `trial_start` | Free trial activation | User starts a trial period |
| `newsletter` | Newsletter subscription | User subscribes to mailing list |
| `download` | File/resource download | User downloads a resource |
| `booking` | Appointment/reservation | User books a service |
| `contact_form` | Contact form submission | User submits contact form |
| `demo_request` | Demo request | User requests a product demo |
| `quote_request` | Quote request | User requests a price quote |

**Note:** You can use any string value for `type` - these are recommendations for consistency.

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

### 2. Conversion Type Analysis (NEW)
- Go to **Analytics → Conversion Analysis**
- See breakdown by conversion type (signup, purchase, etc.)
- View total conversions and revenue per type
- Analyze conversion trends over time
- See which traffic sources drive which conversion types
- **Example insights:**
  - "Instagram ads drive 60% of signups but only 20% of purchases"
  - "Email campaigns have highest conversion value ($150 avg)"
  - "Mobile users prefer trial_start over direct purchase"

### 3. Environment Analysis
- Go to **Analytics → Environment Analysis**
- See conversions by device, browser, OS
- Identify which platforms convert best
- **Example insights:**
  - "Desktop users have 3x higher purchase conversion rate"
  - "iOS users spend 50% more on average"

### 4. Time Analysis
- Go to **Analytics → Time Analysis**
- See conversions by hour, day, week
- Identify best times for conversions
- **Example insights:**
  - "Most purchases happen Tuesday 2-4 PM KST"
  - "Weekend signups convert to paid 2x more"

### 5. Performance Dashboard
- Go to **Analytics → Performance**
- See overall conversion metrics
- Track conversion trends over time
- Compare conversion rates across channels

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
window.CosmosTracker.trackConversion({ 
    type: 'signup', 
    value: 0 
});

// On purchase page
window.CosmosTracker.trackConversion({ 
    type: 'purchase', 
    value: 199.99,
    metadata: {
        product: 'Annual Subscription',
        plan: 'Premium'
    }
});

// On trial start
window.CosmosTracker.trackConversion({ 
    type: 'trial_start', 
    value: 0,
    metadata: {
        duration: '14 days'
    }
});
```

All will be counted as conversions for the campaign, but you can analyze each type separately.

### Using Conversion Metadata

Metadata allows you to store additional context about conversions:

```javascript
// E-commerce purchase with detailed metadata
window.CosmosTracker.trackConversion({
    type: 'purchase',
    value: 299.99,
    metadata: {
        product_id: 'PROD-12345',
        product_name: 'Premium Subscription',
        category: 'subscription',
        quantity: 1,
        currency: 'USD',
        discount_code: 'SUMMER20',
        discount_amount: 60.00,
        payment_method: 'credit_card'
    }
});

// Lead generation with qualification data
window.CosmosTracker.trackConversion({
    type: 'contact_form',
    value: 0,
    metadata: {
        company_size: '50-100',
        industry: 'technology',
        budget_range: '10k-50k',
        timeline: 'Q1 2026',
        lead_score: 85
    }
});

// Event registration
window.CosmosTracker.trackConversion({
    type: 'event_registration',
    value: 0,
    metadata: {
        event_name: 'Product Launch Webinar',
        event_date: '2025-12-15',
        attendee_type: 'existing_customer',
        interests: ['AI', 'automation', 'analytics']
    }
});
```

### Conditional Tracking

Only track conversions for specific campaigns:

```javascript
const campaign = sessionStorage.getItem('cosmos_utm_campaign');

if (campaign === 'special-promo') {
    // Track with special handling
    window.CosmosTracker.trackConversion({ 
        type: 'promo_signup',
        value: 0,
        metadata: {
            promo: 'black-friday-2025',
            discount: '50%'
        }
    });
} else {
    // Regular tracking
    window.CosmosTracker.trackConversion({ 
        type: 'signup',
        value: 0 
    });
}
```

### A/B Testing with Conversion Types

Track different conversion paths for A/B testing:

```javascript
// Variant A: Single-step signup
window.CosmosTracker.trackConversion({
    type: 'signup',
    value: 0,
    metadata: {
        variant: 'single_step',
        test_id: 'signup_flow_v2'
    }
});

// Variant B: Multi-step signup
window.CosmosTracker.trackConversion({
    type: 'signup',
    value: 0,
    metadata: {
        variant: 'multi_step',
        test_id: 'signup_flow_v2',
        steps_completed: 3
    }
});
```

### Conversion Value Tracking

Track revenue and lifetime value:

```javascript
// Initial purchase
window.CosmosTracker.trackConversion({
    type: 'purchase',
    value: 49.99,
    metadata: {
        plan: 'monthly',
        is_trial_conversion: true
    }
});

// Upsell
window.CosmosTracker.trackConversion({
    type: 'upsell',
    value: 199.99,
    metadata: {
        from_plan: 'monthly',
        to_plan: 'annual',
        savings: 99.89
    }
});

// Add-on purchase
window.CosmosTracker.trackConversion({
    type: 'addon_purchase',
    value: 29.99,
    metadata: {
        addon: 'premium_support',
        base_plan: 'annual'
    }
});
```

---

## 🎉 Summary

### For Aptdecor.uz Signups:

1. **Ensure tracking script is loaded on aptdecor.uz**
2. **When user successfully signs up, call:**
   ```javascript
   window.CosmosTracker.trackConversion({ 
       type: 'signup', 
       value: 0 
   });
   ```
3. **For purchases with revenue tracking:**
   ```javascript
   window.CosmosTracker.trackConversion({ 
       type: 'purchase', 
       value: 199.99,
       metadata: {
           product: 'Premium Plan',
           currency: 'USD'
       }
   });
   ```
4. **Conversion is automatically attributed to the correct campaign** based on UTM parameters
5. **View results in Campaign Analysis** → See conversion count and rate
6. **View detailed breakdown in Conversion Analysis** → See performance by conversion type

### Key Benefits:

- ✅ **Accurate attribution** - Tracks original campaign source
- ✅ **Session persistence** - Works across multiple pages
- ✅ **Easy implementation** - One line of code
- ✅ **Flexible** - Track any type of conversion
- ✅ **Structured data** - Conversion types, values, and metadata
- ✅ **Rich analytics** - Analyze by type, source, time, device
- ✅ **Revenue tracking** - Track monetary value per conversion
- ✅ **Secure** - Only tracks users from tracking links

### New Features in v2.1:

- ✨ **Conversion Types** - Structured tracking (signup, purchase, trial, etc.)
- ✨ **Conversion Values** - Track revenue and monetary value
- ✨ **Conversion Metadata** - Store custom data with each conversion
- ✨ **Conversion Analytics API** - Dedicated endpoint for conversion analysis
- ✨ **Advanced Filtering** - Analyze conversions by type, source, campaign

---

## 📚 Related Documentation

- `TRACKING_VALIDATION_GUIDE.md` - Domain and UTM validation
- `EXTERNAL_TRACKING_INSTALLATION.md` - Installing tracking script
- `public/cosmos-track.js` - Tracking script source code
- `app/api/track/route.ts` - Tracking API endpoint

---

**Version:** 2.1.0  
**Last Updated:** October 29, 2025

---

## 🤝 Support

Questions? Issues?
1. Check browser console for error messages
2. Verify tracking script is loaded
3. Test with UTM parameters in URL
4. Check Network tab for API requests

Happy tracking! 🚀

