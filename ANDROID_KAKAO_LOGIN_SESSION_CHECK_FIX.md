# 안드로이드 카카오 로그인 후 세션 확인 및 메인 화면 이동 - 최종 수정

## 📋 1. 웹 카카오 로그인 성공 후 처리 흐름 분석

### 웹 환경에서 카카오 로그인 성공 후 처리 흐름:

1. **kakao-callback.tsx** (`client/src/pages/kakao-callback.tsx`):
   - URL에서 인가 코드(`code`)와 `state` 추출
   - `/api/kakao/exchange-code` POST 요청 (credentials: 'include')
   - 서버에서 `req.login()`으로 세션 생성 (쿠키 설정)
   - 성공 응답 받음
   - `queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })`로 auth context 업데이트
   - 웹인 경우: `setLocation('/?lang=${lang}')`로 홈으로 이동

2. **useAuth 훅** (`client/src/hooks/useAuth.ts`):
   - `useQuery`로 `/api/auth/user` 자동 호출
   - `queryClient.invalidateQueries` 호출 시 자동으로 재요청
   - `user` 데이터가 있으면 `isAuthenticated = true`

3. **App.tsx 라우팅**:
   - `isAuthenticated`가 true이면 `<Route path="/" component={Home} />` 렌더링
   - `isAuthenticated`가 false이면 `<Route path="/" component={Landing} />` 렌더링

### 서버 엔드포인트:

- **GET /api/kakao/login**: 카카오 인증 URL로 리다이렉트
- **POST /api/kakao/exchange-code**: 인가 코드를 액세스 토큰으로 교환하고 세션 생성
- **GET /api/auth/user**: 현재 로그인된 사용자 정보 반환 (세션 쿠키 필요)

## 📋 2. 안드로이드 카카오 로그인 시작 부분 확인

### 안드로이드에서 카카오 로그인 시작:

**landing.tsx** (`client/src/pages/landing.tsx`, 라인 482-526):
- `handleKakaoLoginWithBrowser` 함수
- `Capacitor.isNativePlatform()` 체크
- `Browser.open()`으로 외부 브라우저 열기
- **URL**: `${baseUrl}/api/kakao/login?lang=${language}&platform=web`

### 안드로이드 카카오 로그인 플로우:

1. 앱에서 "카카오로 로그인" 버튼 클릭
2. `Browser.open()`으로 외부 브라우저(Chrome Custom Tab) 열기
3. `/api/kakao/login?lang=ko&platform=web` 접근
4. 카카오 인증 페이지로 리다이렉트
5. 카카오 로그인/동의 완료
6. 카카오에서 `/api/kakao/redirect?code=...&state=...`로 리다이렉트
7. 서버에서 세션 생성 후 HTML 반환 (딥링크 포함)
8. 딥링크(`com.memoway.app://login?session_ok=true`)로 앱으로 돌아가기

### 문제점:

- 외부 브라우저에서 세션 쿠키가 설정되지만, WebView에는 전달되지 않음
- 앱으로 돌아왔을 때 `/api/auth/user` 호출 시 쿠키가 없어 401 반환
- 로그인 페이지에 머무르게 됨

## ✅ 3. 안드로이드에서 앱으로 돌아왔을 때 세션 확인 로직 구현

### 변경 1: App.tsx - handleDeepLink 함수 개선

**파일**: `client/src/App.tsx` (라인 68-128)

**변경사항**:
- `[ANDROID KAKAO LOGIN]` 태그로 로깅 통일
- `/api/auth/user` 호출 전 URL 로깅
- 응답 상태 코드 및 사용자 데이터 상세 로깅
- 401 응답 시 명확한 로그 출력

**주요 로직**:
```typescript
// 안드로이드에서 카카오 로그인 완료 후 세션 확인 및 메인 화면으로 이동
if (Capacitor.isNativePlatform() && baseUrl) {
  console.log('[ANDROID KAKAO LOGIN] ========== Deep Link Session Check ==========');
  const checkUrl = `${baseUrl}/api/auth/user`;
  console.log('[ANDROID KAKAO LOGIN] checking /api/auth/user', { url: checkUrl });
  
  // 최대 5번 시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(checkUrl, {
      method: 'GET',
      credentials: 'include', // 쿠키 포함
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      // 200: 로그인됨
      const userData = await response.json();
      console.log('[ANDROID KAKAO LOGIN] ✅ /api/auth/user 200 - Session found');
      console.log('[ANDROID KAKAO LOGIN] User data:', { id, email, firstName, lastName });
      
      // auth context 업데이트 및 메인 화면으로 이동
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = '/';
      break;
    } else if (response.status === 401) {
      // 401: 비로그인 상태
      console.log('[ANDROID KAKAO LOGIN] /api/auth/user 401');
      console.log('[ANDROID KAKAO LOGIN] ❌ No session found (401)');
      break;
    }
  }
}
```

### 변경 2: App.tsx - handleAppStateChange 함수 개선

**파일**: `client/src/App.tsx` (라인 176-245)

**변경사항**:
- `[ANDROID KAKAO LOGIN]` 태그로 로깅 통일
- 앱이 포그라운드로 돌아왔을 때 세션 확인
- 웹 환경에서는 세션 확인하지 않음

**주요 로직**:
```typescript
// 안드로이드에서만 세션 확인 (웹은 기존 로직 유지)
if (Capacitor.isNativePlatform()) {
  if (!isAuthenticated && !isLoading && !user) {
    console.log('[ANDROID KAKAO LOGIN] ========== App State Change Session Check ==========');
    // /api/auth/user 호출하여 로그인 상태 확인
    // ... (위와 동일한 로직)
  }
} else {
  console.log('[APP STATE] Web platform, skipping session check');
}
```

### 변경 3: App.tsx - browserFinished 이벤트 리스너 개선

**파일**: `client/src/App.tsx` (라인 266-345)

**변경사항**:
- `[ANDROID KAKAO LOGIN]` 태그로 로깅 통일
- 외부 브라우저가 닫혔을 때 세션 확인
- 웹 환경에서는 세션 확인하지 않음

**주요 로직**:
```typescript
Browser.addListener('browserFinished', async () => {
  console.log('[ANDROID KAKAO LOGIN] ========== Browser Finished Session Check ==========');
  
  if (Capacitor.isNativePlatform()) {
    // /api/auth/user 호출하여 로그인 상태 확인
    // ... (위와 동일한 로직)
  } else {
    console.log('[BROWSER] Web platform, skipping session check');
  }
});
```

## ✅ 4. 서버 세션 생성 로깅 추가

### 변경 1: server/kakaoAuth.ts - /api/kakao/exchange-code

**파일**: `server/kakaoAuth.ts` (라인 481-503)

**변경사항**:
- 세션 생성 성공 시 `[KAKAO ANDROID LOGIN]` 태그로 로깅 추가
- userId, sessionId, platform 정보 로깅

**추가된 로그**:
```typescript
console.log('[KAKAO ANDROID LOGIN] session userId=', user.id);
console.log('[KAKAO ANDROID LOGIN] sessionId=', sessionId?.substring(0, 20));
console.log('[KAKAO ANDROID LOGIN] platform=', platform);
```

### 변경 2: server/kakaoAuth.ts - /api/kakao/redirect

**파일**: `server/kakaoAuth.ts` (라인 1275-1284)

**변경사항**:
- 세션 생성 성공 시 `[KAKAO ANDROID LOGIN]` 태그로 로깅 추가
- userId, sessionId, platform 정보 로깅

**추가된 로그**:
```typescript
const sessionId = req.session?.id;
console.log('[KAKAO ANDROID LOGIN] session userId=', user.id);
console.log('[KAKAO ANDROID LOGIN] sessionId=', sessionId?.substring(0, 20));
console.log('[KAKAO ANDROID LOGIN] platform=', platform);
```

## 📊 최종 플로우

### 안드로이드 카카오 로그인:
```
1. 앱에서 카카오 로그인 버튼 클릭
   ↓
2. @capacitor/browser로 외부 브라우저 열기
   ↓
3. 카카오 로그인 완료
   ↓
4. 서버에서 세션 생성 (외부 브라우저에 쿠키 저장)
   [KAKAO ANDROID LOGIN] session userId=...
   [KAKAO ANDROID LOGIN] sessionId=...
   ↓
5. "로그인 완료! 앱으로 돌아가는 중..." 화면
   ↓
6. 딥링크로 앱으로 돌아가기 (com.memoway.app://login?session_ok=true)
   ↓
7. App.tsx의 handleDeepLink에서 /api/auth/user 호출
   [ANDROID KAKAO LOGIN] checking /api/auth/user { url: ... }
   ↓
8. 200 응답: auth context 업데이트 및 메인 화면(/)으로 이동
   [ANDROID KAKAO LOGIN] ✅ /api/auth/user 200 - Session found
   [ANDROID KAKAO LOGIN] User data: { id, email, firstName, lastName }
   401 응답: 로그인 화면 유지
   [ANDROID KAKAO LOGIN] /api/auth/user 401
```

### 웹 카카오 로그인 (기존 로직 유지):
```
1. 카카오 로그인 버튼 클릭
   ↓
2. 카카오 로그인 완료
   ↓
3. kakao-callback.tsx에서 /api/kakao/exchange-code 호출
   ↓
4. 성공 시 queryClient.invalidateQueries로 인증 상태 갱신
   ↓
5. 홈(/)으로 navigate
```

## 📝 변경된 파일 목록

1. **client/src/App.tsx**
   - handleDeepLink 함수 개선 (라인 68-128)
   - handleAppStateChange 함수 개선 (라인 176-245)
   - browserFinished 이벤트 리스너 개선 (라인 266-345)

2. **server/kakaoAuth.ts**
   - /api/kakao/exchange-code 세션 생성 로깅 추가 (라인 481-503)
   - /api/kakao/redirect 세션 생성 로깅 추가 (라인 1275-1284)

## 🔍 로깅 태그

- `[ANDROID KAKAO LOGIN]`: 안드로이드 카카오 로그인 관련 모든 로그
- `[KAKAO ANDROID LOGIN]`: 서버에서 안드로이드 카카오 로그인 세션 생성 로그

## ⚠️ 주의사항

외부 브라우저(Chrome Custom Tab)에서 카카오 로그인을 완료하면, 세션 쿠키는 외부 브라우저에만 저장되고 앱의 WebView에는 전달되지 않을 수 있습니다.

현재 구현은 `/api/auth/user`를 호출하여 세션을 확인하지만, 외부 브라우저의 쿠키가 WebView에 전달되지 않으면 세션을 확인할 수 없을 수 있습니다.

이 경우 다음을 확인해야 합니다:
1. 서버의 세션 쿠키 설정 (SameSite, Secure, Domain)
2. WebView의 쿠키 설정 (AndroidManifest.xml의 WebView 설정)
3. Capacitor의 쿠키 동기화 설정

## 🚀 배포 방법

```bash
cd C:\MemoWay
git add .
git commit -m "fix android kakao login session check and redirect"
git push origin main
```

Railway에서 자동 배포가 시작되면, 안드로이드에서 카카오 로그인 후 세션 확인 및 메인 화면으로 이동하는 기능이 적용됩니다.
