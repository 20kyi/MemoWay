# 🚀 배포 가이드

MemoWay 앱을 다양한 플랫폼에 배포하는 방법을 안내합니다.

## ⭐ 추천 배포 플랫폼

### 🥇 **1순위: Railway** (강력 추천)
**이유:**
- ✅ WebSocket 완벽 지원 (실시간 통신 필수)
- ✅ PostgreSQL 내장 데이터베이스 제공
- ✅ 지속적인 서버 실행 (Serverless 아님)
- ✅ 파일 업로드 완벽 지원
- ✅ 무료 티어 제공 ($5 크레딧/월)
- ✅ GitHub 연동으로 자동 배포
- ✅ 환경 변수 관리 간편
- ✅ 로그 확인 용이

**단점:**
- 무료 티어는 제한적 (개인 프로젝트에는 충분)

### 🥈 **2순위: Render**
**이유:**
- ✅ WebSocket 지원
- ✅ PostgreSQL 내장
- ✅ 무료 티어 제공
- ✅ 간단한 설정

**단점:**
- 무료 티어는 15분 비활성 시 슬립 모드 (첫 요청 지연)

### 🥉 **3순위: Replit** (현재 사용 중)
**이유:**
- ✅ 초기 설정 간단
- ✅ WebSocket 지원
- ✅ 데이터베이스 포함

**단점:**
- 무료 티어 제한적
- 항상 실행 유지 어려움

### ❌ **비추천: Vercel / Netlify**
**이유:**
- ❌ Serverless Functions만 지원
- ❌ WebSocket 제한적 또는 미지원
- ❌ 파일 업로드 제한
- ❌ Express 앱에 부적합

---

## 📋 지원하는 배포 플랫폼

### 1. **Railway** (추천) ⭐⭐⭐⭐⭐
- WebSocket 완벽 지원
- PostgreSQL 내장
- 지속적인 서버 실행

### 2. **Render** ⭐⭐⭐⭐
- WebSocket 지원
- PostgreSQL 내장
- 무료 티어 제공

### 3. **Replit** (기본) ⭐⭐⭐
- 자동 HTTPS, 데이터베이스 포함
- 가장 간단한 배포 방법

### 4. **자체 서버 (VPS, AWS, GCP 등)** ⭐⭐⭐⭐
- 완전한 제어 가능
- 도메인 연결 가능
- WebSocket 완벽 지원

---

## 🔧 환경 변수 설정

### 필수 환경 변수

```bash
# 데이터베이스
DATABASE_URL=postgresql://user:password@host:5432/dbname

# 세션
SESSION_SECRET=your-random-secret-key-here

# 카카오 OAuth (카카오 로그인 사용 시)
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Google OAuth (구글 로그인 사용 시)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 배포 플랫폼별 추가 설정

#### **Replit 배포**
```bash
# Replit은 자동으로 설정됨
REPLIT_DEV_DOMAIN=your-app.replit.dev  # 선택사항
```

#### **다른 플랫폼 배포 (Vercel, Netlify, Railway 등)**
```bash
# 앱 도메인 설정 (카카오 OAuth Redirect URI에 사용)
APP_DOMAIN=your-app.vercel.app
# 또는
APP_DOMAIN=yourdomain.com

# HTTPS 사용 여부 (기본값: true)
APP_USE_HTTPS=true

# 포트 (대부분의 플랫폼은 자동 설정)
PORT=5000
```

#### **자체 서버 배포**
```bash
# 도메인이 있는 경우
APP_DOMAIN=yourdomain.com
APP_USE_HTTPS=true

# 또는 IP 주소 사용
HOST=your-server-ip:5000
APP_USE_HTTPS=false
```

---

## 🔐 카카오 OAuth 설정

### 1. 카카오 개발자 콘솔 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 → 앱 선택
3. **제품 설정 → 카카오 로그인 → Redirect URI 등록**

### 2. Redirect URI 등록

배포한 도메인에 따라 다음 URI를 등록하세요:

#### **Replit 배포**
```
https://your-app-name.replit.app/api/kakao/callback
```

#### **Vercel 배포**
```
https://your-app.vercel.app/api/kakao/callback
```

#### **커스텀 도메인**
```
https://yourdomain.com/api/kakao/callback
```

#### **로컬 개발**
```
http://localhost:5000/api/kakao/callback
```

**중요:** 여러 URI를 등록할 수 있습니다. 프로덕션과 개발용을 모두 등록하세요.

---

## 🌐 Google OAuth 설정

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. API 및 서비스 → 사용자 인증 정보
3. OAuth 2.0 클라이언트 ID 생성 또는 수정

### 2. 승인된 리디렉션 URI 등록

배포한 도메인에 따라 다음 URI를 등록하세요:

```
https://your-app.vercel.app/api/google/callback
https://yourdomain.com/api/google/callback
http://localhost:5000/api/google/callback  # 개발용
```

---

## 📱 안드로이드 앱 설정

### 환경 변수 설정

`.env` 파일에 배포된 웹 URL을 설정하세요:

```bash
# 안드로이드 앱이 연결할 백엔드 URL
VITE_REPLIT_URL=https://your-app.vercel.app
# 또는
VITE_REPLIT_URL=https://yourdomain.com
```

### 빌드

```bash
npm run build
npx cap sync
```

---

## 🚀 배포 단계

### Railway 배포 (추천) ⭐

Railway는 이 프로젝트에 가장 적합한 플랫폼입니다.

#### 1. Railway 프로젝트 생성

**방법 1: GitHub 연동 (추천)**
1. [Railway](https://railway.app) 접속
2. "Start a New Project" → "Deploy from GitHub repo"
3. GitHub 저장소 선택
4. 자동으로 배포 시작

**방법 2: Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

#### 2. PostgreSQL 데이터베이스 추가

1. Railway 대시보드에서 프로젝트 선택
2. "+ New" → "Database" → "Add PostgreSQL"
3. 자동으로 `DATABASE_URL` 환경 변수 생성됨

#### 3. 환경 변수 설정

Railway 대시보드 → Variables 탭에서 추가:

```bash
# 세션
SESSION_SECRET=your-random-secret-key-here

# 카카오 OAuth
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Google OAuth (선택사항)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 앱 도메인 (자동 생성된 Railway URL 사용)
APP_DOMAIN=your-app.up.railway.app
APP_USE_HTTPS=true
```

#### 4. 카카오 OAuth Redirect URI 등록

카카오 개발자 콘솔에 다음 URI 등록:
```
https://your-app.up.railway.app/api/kakao/callback
```

#### 5. 배포 완료

- GitHub에 푸시하면 자동 배포
- 또는 Railway 대시보드에서 "Redeploy" 클릭

#### 6. 커스텀 도메인 설정 (선택사항)

1. Railway 대시보드 → Settings → Domains
2. "Custom Domain" 추가
3. DNS 설정 안내 따르기

---

### Render 배포

#### 1. Render 프로젝트 생성

1. [Render](https://render.com) 접속
2. "New" → "Web Service"
3. GitHub 저장소 연결
4. 설정:
   - **Name**: memoway
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (또는 Starter)

#### 2. PostgreSQL 데이터베이스 추가

1. "New" → "PostgreSQL"
2. 자동으로 `DATABASE_URL` 환경 변수 생성됨

#### 3. 환경 변수 설정

Settings → Environment Variables에서 추가 (Railway와 동일)

#### 4. 배포 완료

자동 배포 또는 "Manual Deploy" 클릭

---

### Vercel 배포 예시 (비추천 - WebSocket 제한)

1. **Vercel 프로젝트 생성**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **환경 변수 설정**
   - Vercel 대시보드 → Settings → Environment Variables
   - 위의 필수 환경 변수들 추가

3. **카카오/Google OAuth Redirect URI 등록**
   - 카카오/Google 개발자 콘솔에 `https://your-app.vercel.app/api/*/callback` 등록

4. **배포**
   ```bash
   vercel --prod
   ```

### Railway 배포 예시

1. **Railway 프로젝트 생성**
   - GitHub 저장소 연결
   - 또는 Railway CLI 사용

2. **환경 변수 설정**
   - Railway 대시보드 → Variables 탭
   - 필수 환경 변수 추가

3. **배포**
   - 자동 배포 또는 `railway up`

### 자체 서버 배포 예시

1. **서버 설정**
   ```bash
   # Node.js 18+ 설치
   # PostgreSQL 설치 및 설정
   # PM2 설치 (프로세스 관리)
   npm install -g pm2
   ```

2. **환경 변수 설정**
   ```bash
   # .env 파일 생성
   nano .env
   # 위의 환경 변수들 입력
   ```

3. **배포**
   ```bash
   npm run build
   pm2 start dist/index.js --name memoway
   pm2 save
   ```

4. **Nginx 리버스 프록시 설정** (선택사항)
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## ✅ 배포 확인 체크리스트

- [ ] 환경 변수 모두 설정됨
- [ ] 데이터베이스 연결 확인
- [ ] 카카오 OAuth Redirect URI 등록됨
- [ ] Google OAuth Redirect URI 등록됨 (사용 시)
- [ ] 웹 앱 접속 확인
- [ ] 로그인 기능 테스트
- [ ] 안드로이드 앱의 `VITE_REPLIT_URL` 설정 확인

---

## 🐛 문제 해결

### OAuth 리다이렉트 오류
- Redirect URI가 카카오/Google 개발자 콘솔에 정확히 등록되어 있는지 확인
- `APP_DOMAIN` 환경 변수가 올바르게 설정되어 있는지 확인
- HTTPS/HTTP 프로토콜이 일치하는지 확인

### 데이터베이스 연결 오류
- `DATABASE_URL` 형식 확인: `postgresql://user:password@host:port/dbname`
- 데이터베이스 서버가 외부 접속을 허용하는지 확인

### 세션 오류
- `SESSION_SECRET`이 설정되어 있는지 확인
- 프로덕션에서는 `secure: true`로 설정되어 있는지 확인 (HTTPS 필요)

---

## 📚 추가 자료

- [Vercel 배포 가이드](https://vercel.com/docs)
- [Railway 배포 가이드](https://docs.railway.app)
- [카카오 OAuth 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [Google OAuth 가이드](https://developers.google.com/identity/protocols/oauth2)

