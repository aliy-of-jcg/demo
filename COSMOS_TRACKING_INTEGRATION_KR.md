# CosMos 트래킹 스크립트 통합 가이드

## 프레임워크별 빠른 통합

### 📦 전통적인 HTML
**파일:** 모든 `.html` 파일
```html
<head>
  <script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>
</head>
```

---

### ⚛️ Next.js (App Router)
**파일:** `app/layout.tsx`
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
**파일:** `pages/_document.tsx`
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
**파일:** `index.html`
```html
<head>
  <script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>
</head>
```

---

### 💚 Nuxt 3
**파일:** `nuxt.config.ts`
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
**파일:** `public/index.html`
```html
<head>
  <script src="https://dev.cosmosai.co.kr/cosmos-track.js" defer></script>
</head>
```

---

### 🔷 WordPress
**파일:** `functions.php`
```php
function add_cosmos_tracking() {
    wp_enqueue_script('cosmos-tracker', 'https://dev.cosmosai.co.kr/cosmos-track.js', [], null, false);
}
add_action('wp_enqueue_scripts', 'add_cosmos_tracking');
```

---

## 중요 사항

- ✅ 최적의 성능을 위해 항상 `defer` 속성을 사용하세요
- ✅ 스크립트는 비동기로 로드되며 페이지 렌더링을 차단하지 않습니다
- ✅ 페이지 로드 시 자동으로 트래킹이 시작됩니다
- ✅ 추가 설정이 필요하지 않습니다

## 테스트

통합 후 트래킹이 작동하는지 확인하세요:
1. 브라우저 개발자 도구 → Network 탭 열기
2. 페이지 로드
3. `dev.cosmosai.co.kr/api/track`로의 요청 확인
4. 콘솔에서 `[CosMos]` 로그 확인

## 지원

문제가 발생하거나 질문이 있으시면 CosMos AI 담당자에게 문의하세요.



