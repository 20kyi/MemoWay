# 안드로이드 카카오 로그인 후 세션 확인 및 메인 화면 이동 - 최종 변경사항 Diff

## 📋 웹 카카오 로그인 성공 후 처리 흐름 분석

### 1. kakao-callback.tsx 처리 흐름:

```
1. URL에서 인가 코드(code)와 state 추출
   ↓
2. /api/kakao/exchange-code POST 요청
   - body: { code, state, lang }
   - credentials: 'include' (쿠키 포함)
   ↓
3. 성공 응답 받음
   ↓
4. queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })
   - auth context 업데이트
   ↓
5. 웹인 경우: setLocation('/?lang=${lang}')로 홈으로 이동
   안드로이드인 경우: 딥링크(com.memoway.app://login?session_ok=true)로 앱 이동
```

### 2. useAuth 훅:

- `useQuery`로 `/api/auth/user` 자동 호출
- `queryClient.invalidateQueries` 호출 시 자동으로 재요청
- `user` 데이터가 있으면 `isAuthenticated = true`

### 3. App.tsx 라우팅:

- `isAuthenticated`가 true이면 `<Route path="/" component={Home} />` 렌더링
- `isAuthenticated`가 false이면 `<Route path="/" component={Landing} />` 렌더링

## ✅ 안드로이드에서 동일한 처리 구현

### 변경 1: App.tsx - handleDeepLink 함수 개선

**목적**: 딥링크로 앱이 열렸을 때 세션 확인 및 메인 화면으로 이동

```typescript
// 안드로이드에서 카카오 로그인 완료 후 세션 확인 및 메인 화면으로 이동
if (Capacitor.isNativePlatform() && baseUrl) {
  console.log('[DEEP LINK] Android: Checking session after Kakao login...');
  
  // /api/auth/user 호출하여 로그인 상태 확인 (여러 번 시도)
  let sessionFound = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${baseUrl}/api/auth/user`, {
      method: 'GET',
      credentials: 'include', // 쿠키 포함
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      // 200: 로그인됨
      const userData = await response.json();
      // auth context 업데이트
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // 메인 화면으로 이동
      window.location.href = '/';
      break;
    } else if (response.status === 401) {
      // 401: 비로그인 상태 - 로그인 화면 유지
      break;
    }
  }
}
```

### 변경 2: App.tsx - handleAppStateChange 함수 개선

**목적**: 앱이 포그라운드로 돌아왔을 때 세션 확인

```typescript
// 안드로이드에서만 세션 확인 (웹은 기존 로직 유지)
if (Capacitor.isNativePlatform()) {
  if (!isAuthenticated && !isLoading && !user) {
    // /api/auth/user 호출하여 로그인 상태 확인
    // ... (위와 동일한 로직)
    
    if (response.ok) {
      // 200: 로그인됨 - auth context 업데이트 및 메인 화면으로 이동
    } else if (response.status === 401) {
      // 401: 비로그인 상태 - 로그인 화면 유지
    }
  }
} else {
  // 웹: 기존 로직 유지 (세션 확인하지 않음)
}
```

### 변경 3: App.tsx - browserFinished 이벤트 리스너 개선

**목적**: 외부 브라우저가 닫혔을 때 세션 확인

```typescript
Browser.addListener('browserFinished', async () => {
  console.log('[BROWSER] Browser closed, checking session...');
  
  // 안드로이드에서만 세션 확인
  if (Capacitor.isNativePlatform()) {
    // /api/auth/user 호출하여 로그인 상태 확인
    // ... (위와 동일한 로직)
    
    if (response.ok) {
      // 200: 로그인됨 - auth context 업데이트 및 메인 화면으로 이동
    } else if (response.status === 401) {
      // 401: 비로그인 상태 - 로그인 화면 유지
    }
  }
});
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
   ↓
5. "로그인 완료! 앱으로 돌아가는 중..." 화면
   ↓
6. 딥링크로 앱으로 돌아가기 (com.memoway.app://login?session_ok=true)
   ↓
7. App.tsx의 handleDeepLink에서 /api/auth/user 호출
   ↓
8. 200 응답: auth context 업데이트 및 메인 화면(/)으로 이동
   401 응답: 로그인 화면 유지
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

## ✅ 확인 사항

- [x] 웹 카카오 로그인 성공 후 처리 흐름 분석
- [x] 안드로이드에서 딥링크 받을 때 세션 확인 로직 추가
- [x] 안드로이드에서 앱 포그라운드 복귀 시 세션 확인 로직 추가
- [x] 안드로이드에서 브라우저 종료 시 세션 확인 로직 추가
- [x] 웹과 안드로이드 구분 (Capacitor.isNativePlatform() 체크)
- [x] 200 응답 시 auth context 업데이트 및 메인 화면으로 이동
- [x] 401 응답 시 로그인 화면 유지
- [x] 빌드 성공 확인

## 🎯 주요 변경사항

1. **handleDeepLink 함수**: 안드로이드에서 딥링크 받을 때 `/api/auth/user` 호출하여 세션 확인
2. **handleAppStateChange 함수**: 안드로이드에서 앱 포그라운드 복귀 시 세션 확인
3. **browserFinished 이벤트**: 안드로이드에서 브라우저 종료 시 세션 확인
4. **플랫폼 구분**: `Capacitor.isNativePlatform()` 체크로 웹과 안드로이드 구분

## ⚠️ 주의사항

외부 브라우저(Chrome Custom Tab)에서 카카오 로그인을 완료하면, 세션 쿠키는 외부 브라우저에만 저장되고 앱의 WebView에는 전달되지 않을 수 있습니다. 

현재 구현은 `/api/auth/user`를 호출하여 세션을 확인하지만, 외부 브라우저의 쿠키가 WebView에 전달되지 않으면 세션을 확인할 수 없을 수 있습니다.

이 문제를 해결하려면 서버의 `/api/kakao/redirect` 엔드포인트에서 딥링크에 세션 토큰을 포함시켜 전달하고, 앱이 딥링크를 받으면 세션 토큰을 사용하여 서버에서 세션을 복원하는 방법을 고려해야 합니다.
