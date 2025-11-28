# MemoWay 배포 옵션 가이드

현재 프로젝트 구조:
- Node.js/Express 백엔드
- React 프론트엔드 (Vite)
- PostgreSQL (Neon Database)
- WebSocket 지원
- 세션 관리 (PostgreSQL 세션 저장소)
- 파일 업로드

## 추천 순위

### 1. Railway (가장 추천) ⭐⭐⭐⭐⭐

**장점:**
- ✅ 간단한 설정 및 배포
- ✅ 고정된 HTTPS 도메인 제공 (`*.up.railway.app`)
- ✅ PostgreSQL 플러그인 지원 (Neon 대신 Railway PostgreSQL 사용 가능)
- ✅ WebSocket 지원
- ✅ 환경 변수 관리 쉬움
- ✅ 자동 HTTPS
- ✅ 무료 티어: $5 크레딧/월 (충분히 사용 가능)

**단점:**
- 무료 티어는 사용량 제한 있음 (하지만 개인 프로젝트에는 충분)

**배포 방법:**
1. [Railway](https://railway.app) 가입
2. "New Project" → "Deploy from GitHub repo"
3. GitHub 저장소 연결
4. PostgreSQL 플러그인 추가
5. 환경 변수 설정:
   - `DATABASE_URL` (Railway PostgreSQL 자동 설정)
   - `SESSION_SECRET`
   - `KAKAO_CLIENT_ID`
   - `KAKAO_CLIENT_SECRET`
   - `VITE_REPLIT_URL` → `VITE_RAILWAY_URL`로 변경 필요
   - 기타 API 키들

**도메인 예시:** `memoway-production.up.railway.app`

---

### 2. Render ⭐⭐⭐⭐

**장점:**
- ✅ 완전 무료 티어 (느린 시작이지만 무료)
- ✅ 고정된 HTTPS 도메인 제공 (`*.onrender.com`)
- ✅ PostgreSQL 지원
- ✅ 자동 배포 (Git push 시)
- ✅ WebSocket 지원

**단점:**
- 무료 티어는 15분 비활성 시 슬리프 모드
- 첫 요청 시 느린 시작 (Cold Start)

**배포 방법:**
1. [Render](https://render.com) 가입
2. "New Web Service" → GitHub 저장소 연결
3. 설정:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
   - Environment: Node
4. PostgreSQL 데이터베이스 추가
5. 환경 변수 설정

**도메인 예시:** `memoway.onrender.com`

---

### 3. Fly.io ⭐⭐⭐⭐

**장점:**
- ✅ 전 세계 글로벌 배포
- ✅ 빠른 성능
- ✅ PostgreSQL 지원
- ✅ WebSocket 지원
- ✅ 무료 티어: 3개 공유 VM

**단점:**
- CLI 도구 필요
- 설정이 조금 복잡

**배포 방법:**
1. [Fly.io](https://fly.io) 가입 및 CLI 설치
2. `fly launch` 명령으로 배포
3. PostgreSQL 앱 추가
4. 환경 변수 설정

**도메인 예시:** `memoway.fly.dev`

---

### 4. Vercel (프론트엔드) + 별도 백엔드 ⭐⭐⭐

**장점:**
- ✅ 프론트엔드 배포 최적화
- ✅ CDN 자동 제공
- ✅ 무료 티어 충분

**단점:**
- 백엔드(Express)는 별도 서버 필요 (Railway, Render 등)
- 구조가 복잡해질 수 있음

---

### 5. Heroku ⭐⭐⭐

**장점:**
- ✅ 안정적이고 검증된 플랫폼
- ✅ PostgreSQL 플러그인 지원

**단점:**
- ❌ 무료 티어 없음 (유료만 가능, $7/월 이상)
- ❌ 비용이 높음

---

## 코드 수정 필요 사항

### 1. 환경 변수 이름 변경

**현재:** `VITE_REPLIT_URL`  
**변경:** `VITE_API_URL` 또는 `VITE_RAILWAY_URL` 등

**수정할 파일:**
- `client/src/lib/api-config.ts`
- `client/src/hooks/use-websocket.ts`
- `.env` 파일
- `vite.config.ts`

### 2. 도메인 설정 업데이트

**수정할 파일:**
- `server/kakaoAuth.ts` - 도메인 감지 로직
- `server/index.ts` - CORS 설정
- `capacitor.config.ts` - 안드로이드 앱 설정

### 3. Replit 특정 코드 제거 (선택)

- `server/replitAuth.ts` - Replit Auth는 다른 플랫폼에서 사용 불가
- `vite.config.ts` - Replit 플러그인 제거

---

## 추천: Railway로 마이그레이션 가이드

### 1단계: Railway 프로젝트 생성

1. [Railway](https://railway.app) 접속 및 가입
2. "New Project" → "Deploy from GitHub repo"
3. GitHub 저장소 선택 및 연결

### 2단계: PostgreSQL 추가

1. Railway 대시보드에서 "New" → "Database" → "Add PostgreSQL"
2. 데이터베이스 생성 완료 후 `DATABASE_URL` 환경 변수 자동 설정됨

### 3단계: 환경 변수 설정

Railway 대시보드에서 "Variables" 탭에서 추가:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=<Railway에서 자동 설정>
SESSION_SECRET=<랜덤 문자열>
KAKAO_CLIENT_ID=<기존 값>
KAKAO_CLIENT_SECRET=<기존 값>
VITE_REPLIT_URL=https://memoway-production.up.railway.app
VITE_KAKAO_API_KEY=<기존 값>
VITE_GOOGLE_MAPS_API_KEY=<기존 값>
```

### 4단계: 빌드 설정

Railway는 `package.json`의 `build` 스크립트를 자동 인식:
- Build Command: `npm run build`
- Start Command: `npm run start`

### 5단계: 도메인 확인

배포 후 Railway가 자동으로 도메인 생성:
- 예: `memoway-production.up.railway.app`
- 커스텀 도메인도 설정 가능

### 6단계: 코드 업데이트

Railway 도메인을 사용하도록 코드 수정 필요

---

## 비교표

| 플랫폼 | 무료 티어 | 고정 도메인 | PostgreSQL | WebSocket | 난이도 | 추천도 |
|--------|----------|------------|------------|-----------|--------|--------|
| **Railway** | $5/월 크레딧 | ✅ | ✅ | ✅ | ⭐ 쉬움 | ⭐⭐⭐⭐⭐ |
| **Render** | ✅ 무료 | ✅ | ✅ | ✅ | ⭐ 쉬움 | ⭐⭐⭐⭐ |
| **Fly.io** | ✅ 무료 | ✅ | ✅ | ✅ | ⭐⭐ 보통 | ⭐⭐⭐⭐ |
| **Vercel** | ✅ 무료 | ✅ | ❌ (별도 필요) | ❌ | ⭐⭐ 보통 | ⭐⭐⭐ |
| **Heroku** | ❌ | ✅ | ✅ | ✅ | ⭐ 쉬움 | ⭐⭐⭐ |

---

## 다음 단계

1. **Railway 선택 시:** Railway 마이그레이션 가이드 문서 작성 가능
2. **Render 선택 시:** Render 배포 가이드 작성 가능
3. **기타 플랫폼:** 추가 설정 가이드 작성 가능

원하는 플랫폼을 알려주시면 상세한 마이그레이션 가이드를 작성해드리겠습니다!

