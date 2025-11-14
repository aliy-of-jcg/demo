# CosMos Tracking Script Integration Guide

## Quick Integration by Framework

### 📦 Traditional HTML
**File:** Any `.html` file
```html
<head>
  <script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>
</head>
```

---

### ⚛️ Next.js (App Router)
**File:** `app/layout.tsx`
```tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script src="https://dev.cosmosai.co.kr/cosmos-track.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
```

---

### ⚛️ Next.js (Pages Router)
**File:** `pages/_document.tsx`
```tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

---

### 🟢 Vue 3 / Vite
**File:** `index.html`
```html
<head>
  <script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>
</head>
```

---

### 💚 Nuxt 3
**File:** `nuxt.config.ts`
```typescript
export default defineNuxtConfig({
  app: {
    head: {
      script: [{ src: 'https://dev.cosmosai.co.kr/cosmos-track.js', defer: true }]
    }
  }
})
```

---

### ⚛️ React (CRA / Vite)
**File:** `public/index.html`
```html
<head>
  <script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>
</head>
```

---

### 🔷 WordPress
**File:** `functions.php`
```php
function add_cosmos_tracking() {
    wp_enqueue_script('cosmos-tracker', 'https://dev.cosmosai.co.kr/cosmos-track.js', [], null, false);
}
add_action('wp_enqueue_scripts', 'add_cosmos_tracking');
```

---

## Important Notes

- ✅ Always use `defer` attribute for optimal performance
- ✅ Script loads asynchronously and doesn't block page rendering
- ✅ Tracking starts automatically on page load
- ✅ No additional configuration needed

## Testing

After integration, verify tracking works:
1. Open browser DevTools → Network tab
2. Load your page
3. Look for requests to `dev.cosmosai.co.kr/api/track`
4. Check console for `[CosMos]` logs

## Support

For issues or questions, contact your CosMos AI representative.

