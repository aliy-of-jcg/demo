# CosMos AI - 마케팅 분석 플랫폼

Next.js 14로 구축된 포괄적인 마케팅 분석 및 캠페인 관리 플랫폼으로, 고성능 분석을 위한 이중 데이터베이스 아키텍처(ClickHouse + MySQL)와 견고한 데이터 관리를 제공합니다.

## ✨ 주요 기능

### 핵심 기능
- 📊 **실시간 대시보드** - 라이브 캠페인 지표 및 성능 인사이트 제공
- 🎯 **캠페인 관리** - 여러 채널에 걸쳐 마케팅 캠페인 생성, 편집 및 추적
- 📈 **고급 분석** - 심층 인사이트를 위한 다양한 분석 모듈:
  - 캠페인 성능 분석
  - 채널 성능 추적
  - 페이지 흐름 분석
  - 환경 분석 (기기, 브라우저, OS)
  - 시간 기반 방문자 패턴 (KST 시간대 지원)
  - 재방문 사용자 분석
  - 전환 추적 및 분석
  - 세션 여정 - 페이지별 사용자 여정 시각화
  - 추적 웹사이트 관리 - 도메인별 추적 및 통계
- 🔗 **UTM 도구** - 사용자 정의 추적 코드를 사용한 링크 생성기 및 추적 유틸리티
  - UTM 링크 목록 및 관리
  - UTM 링크 생성기 (별도 페이지)
- 📱 **기기 및 환경 분석** - 포괄적인 사용자 기기, 브라우저 및 OS 감지
- 🌍 **다중 플랫폼 지원** - Telegram, Kakao, Naver, Google 등에서 추적
- 📄 **PDF 내보내기** - 분석 대시보드 및 보고서를 PDF 형식으로 내보내기
- 🌐 **다국어 지원 (i18n)** - next-intl을 사용한 국제화 지원
- 🔗 **짧은 URL 추적** - `/t/[code]` 경로를 통한 추적 링크 리디렉션
- 🐛 **디버그 도구** - 세션 디버깅 및 추적 검증 페이지
- 💚 **헬스 체크 API** - 시스템 상태 모니터링 엔드포인트

### 기술 기능
- ⚡ **이중 데이터베이스 아키텍처** - 분석용 ClickHouse + 앱 데이터용 MySQL
- 🔐 **인증 시스템** - 역할 기반 액세스 제어가 있는 안전한 JWT 기반 인증
- 👥 **사용자 관리** - Owner, Admin, Observer, Regular 사용자 유형 지원
- 📧 **이메일 통합** - Nodemailer를 사용한 자동 알림 및 비밀번호 재설정
- 🔄 **세션 관리** - 쿠키 기반 세션을 사용한 방문자 추적
- 📍 **IP 지리적 위치** - 자동 국가/도시 감지
- 🎨 **모던 UI** - shadcn/ui 및 Tailwind CSS를 사용한 아름답고 반응형 인터페이스
- 🐳 **Docker 지원** - 쉬운 배포를 위한 컨테이너화된 데이터베이스 설정
- 🎯 **클라이언트 측 추적 스크립트** - 외부 랜딩 페이지 통합을 위한 `cosmos-track.js`

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+ 및 npm
- Docker 및 Docker Compose (전체 설정용)
- Gmail 계정 및 앱 비밀번호 (이메일 기능용, 선택사항)

### 설치 단계

#### 1. Docker 없이 (데모 모드)
```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```
http://localhost:3000 열기

**참고:** Docker 없이는 앱이 실행되지만 데이터베이스 기능이 제한됩니다.

#### 2. 전체 데이터베이스 설정 포함 (권장)

```bash
# 1. 프로젝트 클론 및 이동
cd demo

# 2. 환경 변수 파일 생성
cp .env.example .env.local
# .env.local 파일을 설정에 맞게 편집

# 3. ClickHouse 및 MySQL 모두 시작
docker-compose up -d

# 4. 데이터베이스가 준비될 때까지 대기 (약 15초)

# 5. 의존성 설치
npm install

# 6. ClickHouse 데이터베이스 초기화
npm run clickhouse:init

# 7. MySQL 데이터베이스 초기화
npm run mysql:init

# 8. 시드 데이터 추가 (선택사항이지만 테스트에 권장)
npm run clickhouse:seed
npm run db:seed

# 9. 개발 서버 시작
npm run dev
```

#### 3. 애플리케이션 접근
```
애플리케이션: http://localhost:3000
인증: http://localhost:3000/auth
API 문서: http://localhost:3000/api-docs
```

### 최초 설정

1. **첫 번째 사용자 생성:**
   - http://localhost:3000 으로 이동
   - 인증 페이지로 자동 리디렉션됩니다
   - "Sign up"을 클릭하고 계정을 생성하세요
   
2. **Owner로 업그레이드 (선택사항):**
   ```bash
   # MySQL에 연결
   docker exec -it mysql mysql -u appuser -papppassword -D appdb
   
   # 첫 번째 사용자를 owner로 업그레이드
   UPDATE users SET user_type = 'owner' WHERE id = 1;
   SELECT id, email, company_name, user_type FROM users;
   exit;
   ```

### 사용 가능한 스크립트

```bash
# 개발
npm run dev              # 개발 서버 시작
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버 시작
npm run lint             # ESLint 실행

# 데이터베이스 관리
npm run db:reset         # 모든 데이터베이스 재설정 (삭제, 초기화, 시드)
npm run db:init          # 모든 데이터베이스 스키마 초기화
npm run db:seed          # 샘플 데이터 시드
npm run db:drop          # 모든 테이블 삭제 (⚠️ 파괴적 작업)

# ClickHouse 명령어
npm run clickhouse:init     # ClickHouse 스키마 초기화
npm run clickhouse:clean    # ClickHouse 데이터 정리
npm run clickhouse:seed     # 샘플 추적 이벤트 추가
npm run clickhouse:migrate  # ClickHouse 마이그레이션 실행
npm run clickhouse:migrate-phase1  # ClickHouse 마이그레이션 1단계

# MySQL 명령어
npm run mysql:init       # MySQL 스키마 초기화

# 유틸리티
npm run generate:secret  # 새 JWT 시크릿 생성
```

## 📁 프로젝트 구조

```
demo/
├── app/                    # Next.js 앱 디렉토리 (App Router)
│   ├── api/               # API 라우트
│   │   ├── analytics/     # 분석 엔드포인트
│   │   │   ├── campaign-analysis/    # 캠페인 성능 지표
│   │   │   ├── channel-performance/  # 채널/소스 분석
│   │   │   ├── conversion-analysis/  # 전환 추적 분석
│   │   │   ├── environment-analysis/ # 기기/브라우저/OS 통계
│   │   │   ├── page-flow-analysis/   # 사용자 네비게이션 흐름
│   │   │   ├── performance/          # 대시보드 지표
│   │   │   │   ├── returning-analysis/   # 신규 vs 재방문 방문자
│   │   │   ├── session-journeys/     # 완전한 사용자 세션 여정
│   │   │   ├── time-analysis/        # 시간 기반 패턴 (KST)
│   │   │   ├── tracked-websites/    # 추적 웹사이트 분석
│   │   │   └── debug-sessions/      # 디버그 세션 분석
│   │   ├── auth/          # 인증
│   │   │   ├── signup/               # 사용자 등록
│   │   │   ├── login/                # 사용자 로그인
│   │   │   ├── logout/               # 세션 종료
│   │   │   ├── validate/             # 토큰 검증
│   │   │   ├── forgot-password/      # 비밀번호 재설정 요청
│   │   │   └── reset-password/       # 비밀번호 재설정 실행
│   │   ├── campaigns/     # 캠페인 관리 CRUD
│   │   ├── courses/       # 코스 관리 CRUD
│   │   ├── performance/   # 성능 지표
│   │   ├── tracking/      # 링크 추적 생성
│   │   ├── track/         # 외부 추적 엔드포인트
│   │   ├── track-internal/# 내부 테스트 엔드포인트
│   │   ├── tracked-websites/ # 추적 웹사이트 관리 API
│   │   ├── health/        # 헬스 체크 엔드포인트
│   │   └── utm-codes/     # UTM 코드 유틸리티
│   ├── auth/              # 인증 페이지 (로그인/회원가입)
│   ├── campaigns/         # 캠페인 관리 인터페이스
│   ├── campaign-analysis/ # 캠페인 분석 대시보드
│   ├── channel-performance/ # 채널 분석 페이지
│   ├── courses/           # 코스 관리 페이지
│   ├── environment-analysis/ # 기기/브라우저 분석
│   ├── page-flow-analysis/ # 사용자 흐름 시각화
│   ├── performance/       # 메인 성능 대시보드
│   ├── returning-analysis/ # 재방문 사용자 분석
│   ├── session-journeys/   # 완전한 사용자 세션 여정 시각화
│   ├── time-analysis/     # 시간 기반 분석 (KST)
│   ├── tracked-websites/  # 추적 웹사이트 관리 및 통계
│   ├── debug-sessions/    # 세션 디버깅 도구
│   ├── utm-tools/         # UTM 도구
│   │   ├── page.tsx       # UTM 링크 목록
│   │   └── generator/     # UTM 링크 생성기
│   ├── t/                 # 짧은 URL 추적 리디렉션
│   │   └── [code]/        # 추적 코드별 리디렉션
│   ├── reset-password/    # 비밀번호 재설정 페이지
│   ├── link-expired/      # 만료된 링크 핸들러
│   └── api-docs/          # Swagger API 문서
├── components/            # React 컴포넌트
│   ├── ui/               # shadcn/ui 기본 컴포넌트
│   │   └── *.tsx         # Button, Input, Card, Dialog 등
│   ├── auth-form.tsx     # 로그인/회원가입 폼
│   ├── export-to-pdf-button.tsx # PDF 내보내기 버튼 컴포넌트
│   ├── forgot-password-form.tsx # 비밀번호 재설정 요청 폼
│   ├── layout-wrapper.tsx # 사이드바가 있는 메인 레이아웃
│   ├── sidebar.tsx       # 네비게이션 사이드바
│   ├── user-menu.tsx     # 사용자 드롭다운 메뉴
│   └── page-footer.tsx   # 페이지 푸터 컴포넌트
├── lib/                  # 유틸리티 및 데이터베이스 클라이언트
│   ├── clickhouse.ts     # ClickHouse 클라이언트 및 스키마
│   ├── mysql.ts          # MySQL 클라이언트 및 연결 풀
│   ├── jwt.ts            # JWT 토큰 유틸리티
│   ├── email.ts          # 이메일 서비스 (Nodemailer)
│   ├── email-templates.ts # HTML 이메일 템플릿
│   ├── encryption.ts     # 데이터 암호화 유틸리티
│   ├── rate-limit.ts     # API 엔드포인트 속도 제한
│   ├── user-agent.ts     # 사용자 에이전트 파싱
│   ├── url-parser.ts     # URL 매개변수 파싱
│   ├── clipboard.ts      # 클립보드 유틸리티
│   ├── types.ts          # TypeScript 타입 정의
│   ├── utils.ts          # 일반 유틸리티
│   ├── db-init.ts        # 데이터베이스 초기화
│   ├── api-spec.ts       # Swagger API 사양
│   ├── pdf-export.ts     # PDF 내보내기 유틸리티 (html2canvas + jsPDF)
│   └── hooks/            # 커스텀 React 훅
├── scripts/              # 데이터베이스 관리 스크립트
│   ├── init-clickhouse.js # ClickHouse 스키마 초기화
│   ├── init-mysql.js     # MySQL 스키마 초기화
│   ├── init-mysql.sql    # MySQL 스키마 정의
│   ├── seed-data.js      # ClickHouse에 샘플 데이터 시드
│   ├── seed-campaigns-courses.js # MySQL에 캠페인 시드
│   ├── clean-clickhouse.js # ClickHouse 데이터 정리
│   ├── drop-all-tables.js # 모든 테이블 삭제
│   └── generate-secret.js # JWT 시크릿 생성
├── public/               # 정적 파일
│   ├── cosmos-track.js   # 클라이언트 측 추적 스크립트
│   └── grid.svg          # 그리드 배경 패턴
├── z_documentation/      # 프로젝트 문서
│   ├── architecture/     # 시스템 아키텍처 문서
│   ├── features/         # 기능 문서
│   └── setup/            # 설정 가이드
├── docker-compose.yml    # ClickHouse + MySQL 설정
├── Dockerfile            # 컨테이너 빌드 구성
├── instrumentation.ts    # Next.js 시작 훅
├── next.config.mjs       # Next.js 구성
├── tailwind.config.ts    # Tailwind CSS 구성
└── tsconfig.json         # TypeScript 구성
```

## 🏗️ 아키텍처

### 시스템 개요

CosMos AI는 실시간 분석과 안정적인 애플리케이션 데이터 관리를 위해 최적화된 이중 데이터베이스 아키텍처를 사용합니다:

**프론트엔드 레이어 (Next.js 14 App Router)**
- React 18을 사용한 서버 사이드 렌더링 페이지
- 라이브 지표가 있는 실시간 대시보드
- 캠페인 및 코스 관리 인터페이스
- 고급 분석 시각화 모듈
- UTM 도구 및 링크 생성기
- 역할 기반 액세스가 있는 JWT 기반 인증

**백엔드 레이어 (Next.js API Routes)**
- RESTful API 엔드포인트
- `/api/auth/*` - 사용자 인증 및 관리
  - JWT 토큰을 사용한 회원가입/로그인
  - 이메일 검증을 통한 비밀번호 재설정
  - 토큰 검증 및 세션 관리
  - 보안을 위한 속도 제한
- `/api/campaigns/*` - 캠페인 CRUD 작업
- `/api/courses/*` - 코스 관리
- `/api/analytics/*` - 분석 데이터 집계
  - 캠페인 성능 지표
  - 채널 및 소스 분석
  - 전환 추적
  - 환경 분석 (기기/브라우저/OS)
  - 페이지 흐름 시각화
  - 시간 기반 패턴 (KST 시간대)
  - 재방문 방문자 분석
- `/api/tracking/*` - 추적 링크 생성
- `/api/track/*` - 랜딩 페이지용 외부 추적 엔드포인트
- `/api/performance/*` - 대시보드 성능 지표
- `/api/utm-codes/*` - UTM 코드 유틸리티
- `/api/tracked-websites/*` - 추적 웹사이트 관리
- `/api/health` - 시스템 헬스 체크
- `/t/[code]` - 짧은 URL 추적 리디렉션

**데이터베이스 레이어**

1. **ClickHouse (분석 데이터베이스)**
   - 고성능 컬럼형 데이터베이스
   - OLAP 쿼리에 최적화
   - 추적 이벤트 및 방문 로그 저장
   - 효율적인 쿼리를 위해 월별로 파티션
   - 테이블:
     - `tracking_events` - 클릭 추적 및 UTM 데이터
     - `visit_logs` - 상세 페이지뷰 및 세션 데이터

2. **MySQL 8.0 (애플리케이션 데이터베이스)**
   - ACID 준수 관계형 데이터베이스
   - 구조화된 애플리케이션 데이터 저장
   - 성능을 위한 연결 풀링
   - 테이블:
     - `users` - 역할 기반 액세스가 있는 사용자 계정
     - `sessions` - 활성 사용자 세션
     - `password_reset_tokens` - 비밀번호 재설정 토큰
     - `courses` - 코스 카탈로그
     - `campaigns` - 마케팅 캠페인
     - `utm_codes` - UTM 매개변수가 있는 추적 링크

**외부 통합**
- 클라이언트 측 추적 스크립트 (`cosmos-track.js`)
- 외부 랜딩 페이지와 통합
- 자동 세션 및 방문자 추적
- UTM 매개변수 보존
- 기기 및 브라우저 감지
- 전환 이벤트 추적

### 데이터 흐름

1. **사용자가 캠페인 생성** → MySQL에 저장
2. **추적 링크 생성** → MySQL에 UTM 코드 생성
3. **사용자가 링크 클릭** → `cosmos-track.js`가 `/api/track`로 데이터 전송
4. **추적 데이터 저장** → ClickHouse가 이벤트 저장
5. **대시보드 쿼리** → ClickHouse에서 데이터 집계
6. **실시간 표시** → 사용자에게 지표 표시

### 레이어별 주요 기능

**인증 및 보안**
- 7일 만료가 있는 JWT 기반 인증
- bcrypt 비밀번호 해싱
- 민감한 엔드포인트에 대한 속도 제한
- 역할 기반 액세스 제어 (Owner, Admin, Observer, Regular)
- 자동 정리가 있는 세션 관리
- 이메일 검증을 통한 비밀번호 재설정

**분석 엔진**
- 실시간 이벤트 추적
- 세션 기반 방문자 식별
- 기기 및 환경 감지
- 지리적 IP 위치 추적
- 리퍼러 소스 분석
- 전환 추적 및 속성

## 🔧 구성

### 환경 변수

프로젝트 루트에 `.env.local` 생성:

```env
# ClickHouse 구성
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# MySQL 구성
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=appdb
MYSQL_USER=appuser
MYSQL_PASSWORD=apppassword
MYSQL_ROOT_PASSWORD=rootpassword

# 애플리케이션 구성
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# JWT 구성 (보안)
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# 이메일 구성 (비밀번호 재설정용 - 선택사항)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM="CosMos AI <noreply@cosmos-ai.com>"

# 선택사항: NextAuth 구성 (NextAuth 사용 시)
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### 이메일 설정 (선택사항)

비밀번호 재설정 기능을 위해 이메일 설정 구성:

**Gmail 사용:**
1. Gmail 계정에서 2단계 인증 활성화
2. 앱 비밀번호 생성: https://myaccount.google.com/apppasswords
3. 16자 비밀번호를 `EMAIL_PASSWORD`에 복사

**다른 제공업체 사용:**
- SendGrid: API 키를 비밀번호로 사용
- AWS SES: SMTP 자격 증명으로 구성
- 사용자 정의 SMTP: 서버 자격 증명 사용

### Docker 구성

`docker-compose.yml`은 두 가지 서비스를 구성합니다:

1. **ClickHouse** (포트 8123, 9000)
   - 분석 데이터베이스
   - 8123에서 HTTP 인터페이스
   - 9000에서 네이티브 인터페이스
   
2. **MySQL** (포트 3306)
   - 애플리케이션 데이터베이스
   - 기본 사용자: appuser
   - 기본 데이터베이스: appdb

### 데이터베이스 스키마

**ClickHouse 테이블:**
- `analytics.tracking_events` - 원시 추적 데이터
- `analytics.visit_logs` - 처리된 방문자 로그

**MySQL 테이블:**
- `users` - 사용자 계정
- `sessions` - 활성 세션
- `password_reset_tokens` - 재설정 토큰
- `courses` - 코스 카탈로그
- `campaigns` - 마케팅 캠페인
- `utm_codes` - 추적 링크

## 📝 사용 가이드

### 시작하기

#### 1. 인증
- http://localhost:3000 으로 이동
- 자동으로 인증 페이지로 리디렉션됩니다
- 계정을 생성하거나 기존 자격 증명으로 로그인

#### 2. 사용자 역할 및 권한
- **Owner** - 전체 시스템 액세스 (데이터베이스를 통해 수동 할당)
- **Admin** - 캠페인 관리, 분석 보기, 데이터 내보내기
- **Observer** - 분석 및 대시보드에 대한 읽기 전용 액세스
- **Regular** - 기본 보기 액세스

#### 3. 첫 번째 캠페인 생성
1. 사이드바에서 **Campaigns**로 이동
2. **"Create Campaign"** 클릭
3. 캠페인 세부 정보 입력:
   - 캠페인 이름
   - 연결된 코스
   - 소스 (예: "google", "facebook", "telegram")
   - 미디엄 (예: "cpc", "social", "email")
   - 예산 및 날짜
   - 상태 (active/waiting/paused)
4. 캠페인 저장

#### 4. 추적 링크 생성
1. 사이드바에서 **UTM Tools**로 이동
2. 캠페인 선택
3. UTM 매개변수 구성:
   - 소스 (캠페인에서 자동 채움)
   - 미디엄 (캠페인에서 자동 채움)
   - 캠페인 이름
   - 콘텐츠 (선택사항)
   - 용어 (선택사항)
4. 랜딩 페이지 URL 입력
5. **"Generate Link"** 클릭
6. 추적 링크를 복사하여 마케팅 자료에 사용

#### 5. 추적 스크립트 통합
외부 랜딩 페이지에 추가:
```html
<!-- </body> 태그 닫기 전에 추가 -->
<script src="https://your-cosmos-ai-domain.com/cosmos-track.js"></script>
```

`public/cosmos-track.js`에서 허용된 도메인 구성:
```javascript
allowedDomains: [
  'your-landing-page.com',
  'www.your-landing-page.com',
]
```

#### 6. 전환 추적 (선택사항)
랜딩 페이지에 전환 추적 추가:
```javascript
// 사용자가 회원가입을 완료할 때
window.CosmosTracker.trackConversion({
  type: 'signup',
  value: 0
});

// 사용자가 구매할 때
window.CosmosTracker.trackConversion({
  type: 'purchase',
  value: 99.99,
  metadata: { product: 'premium-plan' }
});
```

#### 7. 분석 보기
다양한 분석 모듈에 액세스:

**대시보드 (성능)**
- 모든 캠페인 개요
- 총 클릭, 방문자, 전환
- 예산 추적
- 최근 활동

**캠페인 분석**
- 개별 캠페인 성능
- 클릭률
- 캠페인별 전환율

**채널 성능**
- 소스별 트래픽 (Google, Facebook 등)
- 미디엄별 트래픽 (CPC, Social, Email)
- 채널별 ROI

**환경 분석**
- 기기 분류 (데스크톱, 모바일, 태블릿)
- 브라우저 통계 (Chrome, Safari, Firefox 등)
- 운영 체제 분포
- 화면 해상도

**시간 분석 (KST)**
- 시간대별 방문자 패턴
- 요일별 분석
- 피크 트래픽 시간
- 시간대 인식 분석

**페이지 흐름 분석**
- 랜딩 페이지 성능
- 네비게이션 경로
- 종료 페이지
- 이탈률

**재방문 분석**
- 신규 vs 재방문 방문자
- 방문 빈도
- 사용자 유지 지표

**세션 여정**
- 완전한 페이지별 사용자 여정 시각화
- 타임스탬프가 있는 세션 타임라인
- 랜딩 페이지 및 종료 페이지 추적
- 세션 지속 시간 및 페이지 순서
- 세션별 기기 및 소스 정보
- 활성 vs 완료된 세션 표시기

**추적 웹사이트 관리**
- 도메인별 추적 통계
- 웹사이트 활성/비활성 상태 관리
- 도메인별 세션, 방문자, 페이지뷰, 전환 통계
- 첫 방문 및 마지막 방문 시간 추적
- 웹사이트별 성능 대시보드

**전환 분석**
- 캠페인별 전환율
- 전환 가치 추적
- 속성 분석

**디버그 도구**
- 세션 디버깅 페이지
- 실시간 세션 데이터 검증
- 추적 링크 테스트 및 검증

**PDF 내보내기**
- 모든 분석 대시보드를 PDF로 내보내기
- 고품질 이미지 렌더링
- 사용자 정의 내보내기 옵션
- 성능 및 환경 분석 페이지에서 사용 가능

### 주요 기능

#### 캠페인 관리
- 여러 캠페인 생성 및 관리
- 예산 및 지출 추적
- 예산 도달 시 캠페인 자동 일시 중지
- 캠페인 상태 관리 (active/paused/ended)
- 캠페인을 코스에 연결

#### UTM 링크 생성 및 관리
- 자동 UTM 매개변수 생성
- 고유 추적 코드
- 링크 클릭 추적
- 링크당 예산 할당
- 링크 상태 관리 (활성/비활성/종료/숨김)
- UTM 링크 목록 및 필터링
- 별도 생성기 페이지 (`/utm-tools/generator`)
- 짧은 URL 리디렉션 (`/t/[code]`)
- 만료된 링크 처리 페이지

#### 고급 분석
- 실시간 데이터 업데이트
- 사용자 정의 날짜 범위
- 대시보드 및 보고서용 PDF 내보내기 기능
- 다차원 분석
- 시각적 차트 및 그래프

#### 디버깅 도구
- 링크 테스트용 추적 디버그 페이지
- 실시간 이벤트 모니터링
- 세션 및 방문자 ID 추적
- UTM 매개변수 검증

## 🛠 기술 스택

### 프론트엔드
- **Next.js 14** - App Router 및 Server Components가 있는 React 프레임워크
- **React 18** - 최신 기능이 있는 UI 라이브러리
- **TypeScript 5** - 타입 안전 개발
- **Tailwind CSS 3.4** - 유틸리티 우선 CSS 프레임워크
- **shadcn/ui** - 현대적이고 접근 가능한 UI 컴포넌트 라이브러리
- **Recharts 2.12** - 데이터 시각화를 위한 구성 가능한 차트 라이브러리
- **Lucide React** - 아름답고 일관된 아이콘 라이브러리
- **Sonner** - 토스트 알림

### 백엔드
- **Next.js API Routes** - 서버리스 API 엔드포인트
- **Node.js 18+** - JavaScript 런타임
- **JWT (jsonwebtoken 9.0)** - 안전한 토큰 기반 인증
- **bcryptjs 3.0** - 비밀번호 해싱 및 검증
- **Nodemailer 7.0** - 이메일 서비스 통합 (SMTP)

### 데이터베이스
- **ClickHouse** - 고성능 컬럼형 분석 데이터베이스
  - OLAP 쿼리에 최적화
  - 페타바이트 규모 데이터 처리
  - 실시간 데이터 수집
- **MySQL 8.0** - 애플리케이션 데이터용 안정적인 관계형 데이터베이스
  - ACID 준수
  - 연결 풀링
  - 외래 키 제약 조건

### 데이터 및 분석
- **@clickhouse/client 1.5** - Node.js용 공식 ClickHouse 클라이언트
- **mysql2 3.15** - Promise 지원이 있는 빠른 MySQL 클라이언트
- **GeoIP Lite 1.4** - IP 기반 지리적 위치 (국가/도시 감지)
- **UA Parser JS 2.0** - 사용자 에이전트 파싱 (기기/브라우저/OS 감지)
- **Query String 9.3** - URL 매개변수 파싱 및 조작

### 내보내기 및 보고
- **html2canvas 1.4** - PDF 내보내기를 위한 HTML 요소를 캔버스로 변환
- **jsPDF 3.0** - 클라이언트 측 PDF 생성 라이브러리

### 개발자 도구
- **Docker & Docker Compose** - 컨테이너화된 개발 환경
- **ESLint** - 코드 린팅 및 포맷팅
- **Autoprefixer** - CSS 벤더 접두사
- **PostCSS** - CSS 변환

### 추가 라이브러리
- **nanoid 5.0** - 추적 코드용 고유 ID 생성
- **uuid 13.0** - 세션 및 사용자용 UUID 생성
- **next-intl 4.5** - 국제화(i18n) 및 다국어 지원
- **next-swagger-doc 0.4** - Swagger UI가 있는 API 문서
- **swagger-ui-react 5.29** - 대화형 API 문서 인터페이스
- **SweetAlert2 11.26** - 아름답고 반응형 알림 및 모달
- **class-variance-authority 0.7** - 컴포넌트 변형용 CVA
- **clsx 2.1** - 조건부 className 유틸리티
- **tailwind-merge 2.4** - 충돌 없이 Tailwind 클래스 병합
- **dotenv 16.4** - 환경 변수 관리

### 성능 최적화
- Next.js를 사용한 서버 사이드 렌더링 (SSR)
- 공개 페이지용 정적 생성
- API 라우트 캐싱
- 데이터베이스 연결 풀링
- 월별 ClickHouse 파티셔닝
- 인덱싱된 데이터베이스 쿼리
- Next.js Image를 사용한 이미지 최적화
- 코드 분할 및 지연 로딩

## 📚 문서

추가 문서는 `z_documentation/` 디렉토리에서 확인할 수 있습니다:

### 아키텍처 문서
- **`architecture/SYSTEM_ARCHITECTURE.md`** - 완전한 시스템 아키텍처 개요
- **`architecture/API_ENDPOINTS.md`** - 상세한 API 엔드포인트 문서

### 기능 문서
- **`AUTHENTICATION_COMPLETE.md`** - 인증 시스템 구현 가이드
- **`PASSWORD_RESET.md`** - 비밀번호 재설정 흐름 및 이메일 구성
- **`JWT_IMPLEMENTATION.md`** - JWT 토큰 구현 세부 사항
- **`GMAIL_SETUP.md`** - Gmail SMTP 구성 가이드
- **`CLIPBOARD_FALLBACK_IMPLEMENTATION.md`** - 클립보드 기능

### 구현 가이드
- **`zz_temp-md-files/CONVERSION_TRACKING_GUIDE.md`** - 전환 추적 설정
- **`zz_temp-md-files/EXTERNAL_TRACKING_INSTALLATION.md`** - 외부 스크립트 통합
- **`zz_temp-md-files/TRACKING_VALIDATION_GUIDE.md`** - 테스트 및 검증

### API 문서
대화형 API 문서에 액세스: **http://localhost:3000/api-docs**

## 🚢 배포

### 프로덕션 배포

#### Docker 사용

1. **프로덕션 이미지 빌드:**
```bash
docker build -t cosmos-ai:latest .
```

2. **docker-compose로 실행:**
```bash
# 프로덕션 프로필 사용
docker-compose --profile prod up -d
```

3. **환경 변수:**
프로덕션 값으로 `.env.production` 생성:
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
JWT_SECRET=your-production-jwt-secret
# ... 기타 프로덕션 값
```

#### Vercel/Netlify 사용

1. 저장소 연결
2. 대시보드에서 환경 변수 설정
3. 빌드 설정 구성:
   - 빌드 명령: `npm run build`
   - 출력 디렉토리: `.next`
4. 배포

**참고:** ClickHouse와 MySQL을 별도로 호스팅해야 합니다 (예: 클라우드 제공업체)

### 데이터베이스 호스팅 옵션

**ClickHouse:**
- ClickHouse Cloud (권장)
- AWS (EC2에서 자체 호스팅)
- DigitalOcean Droplets
- Google Cloud Platform

**MySQL:**
- Amazon RDS
- Google Cloud SQL
- Azure Database for MySQL
- PlanetScale
- DigitalOcean Managed Databases

## 🔒 보안 고려사항

### 인증 및 권한 부여
- ✅ 만료가 있는 JWT 토큰 (7일)
- ✅ bcrypt 비밀번호 해싱 (10 라운드)
- ✅ 역할 기반 액세스 제어 (Owner/Admin/Observer/Regular)
- ✅ 자동 정리가 있는 세션 관리
- ✅ 안전한 토큰을 사용한 비밀번호 재설정 (10시간 만료)
- ✅ 민감한 엔드포인트에 대한 속도 제한

### API 보안
- ✅ CORS 구성
- ✅ 입력 검증 및 정제
- ✅ SQL 주입 방지 (매개변수화된 쿼리)
- ✅ XSS 보호
- ⚠️ **권장:** 프로덕션에서 HTTPS 추가
- ⚠️ **권장:** CSRF 토큰 구현
- ⚠️ **권장:** 전역 API 속도 제한 추가

### 데이터베이스 보안
- ✅ 분석 및 앱 데이터용 별도 데이터베이스
- ✅ 제한이 있는 연결 풀링
- ✅ 모든 쿼리에 대한 준비된 문
- ⚠️ **권장:** 가능한 경우 읽기 전용 데이터베이스 사용자 사용
- ⚠️ **권장:** 데이터베이스 암호화 활성화

### 개인정보 보호 및 GDPR
- ✅ IP 주소 수집 (익명화 가능)
- ✅ 쿠키 기반 추적 (사용자에게 알림)
- ⚠️ **권장:** 쿠키 동의 배너 추가
- ⚠️ **권장:** 데이터 보존 정책 구현
- ⚠️ **권장:** 데이터 내보내기/삭제 기능 추가

## 🐛 문제 해결

### 일반적인 문제

**1. 데이터베이스 연결 실패**
```bash
# 컨테이너가 실행 중인지 확인
docker ps

# 컨테이너 재시작
docker-compose restart

# 로그 확인
docker-compose logs clickhouse
docker-compose logs mysql
```

**2. 테이블을 찾을 수 없음**
```bash
# 데이터베이스 재초기화
npm run db:drop
npm run clickhouse:init
npm run mysql:init
```

**3. 인증 오류**
```bash
# 새 JWT 시크릿 생성
npm run generate:secret

# .env.local을 새 시크릿으로 업데이트
# 개발 서버 재시작
```

**4. 이메일 전송 안 됨**
- Gmail 앱 비밀번호가 올바른지 확인 (16자)
- Gmail 계정에서 2FA가 활성화되어 있는지 확인
- EMAIL_* 환경 변수가 설정되어 있는지 확인
- 테스트 이메일의 스팸 폴더 확인

**5. 추적 스크립트 작동 안 함**
- 도메인이 `allowedDomains` 배열에 있는지 확인
- 브라우저 콘솔에서 오류 확인
- API 엔드포인트에 액세스할 수 있는지 확인
- URL에 UTM 매개변수가 있는지 확인

**6. 포트가 이미 사용 중**
```bash
# docker-compose.yml에서 포트 변경
# 또는 포트를 사용하는 프로세스 종료:
# Windows:
netstat -ano | findstr :3306
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3306 | xargs kill -9
```

### 도움 받기

- `z_documentation/`의 문서 확인
- `/api-docs`에서 API 문서 검토
- Docker 로그 확인: `docker-compose logs`
- 환경 변수가 올바르게 설정되어 있는지 확인

## 📊 성능 팁

### ClickHouse 쿼리 최적화
- 날짜 범위 필터 사용
- 더 나은 쿼리 성능을 위해 월별로 파티션
- 자주 액세스하는 집계에 대한 구체화된 뷰 사용
- `LIMIT` 절로 결과 집합 제한

### MySQL 최적화
- 자주 쿼리되는 열에 인덱스 추가
- 연결 풀링 사용 (이미 구성됨)
- 오래된 세션 정기적으로 정리
- 느린 쿼리 로그 모니터링

### 프론트엔드 성능
- Next.js 이미지 최적화 활성화
- 가능한 경우 서버 컴포넌트 사용
- 대용량 데이터셋에 대한 페이지네이션 구현
- 더 나은 UX를 위한 로딩 상태 추가

## 🤝 기여

기여를 환영합니다! 다음 가이드라인을 따르세요:

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경 사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 열기

### 개발 가이드라인
- TypeScript 모범 사례 따르기
- 의미 있는 커밋 메시지 작성
- 복잡한 로직에 주석 추가
- 제출 전 철저히 테스트
- 필요에 따라 문서 업데이트

## 📄 라이선스

이 프로젝트는 독점 소프트웨어입니다. 모든 권리 보유.

## 📞 지원

지원 및 질문:
- 문서: `z_documentation/` 폴더
- API 문서: http://localhost:3000/api-docs
- 이슈: 저장소에 이슈 생성

---

**Next.js, ClickHouse 및 MySQL로 ❤️를 담아 제작**

