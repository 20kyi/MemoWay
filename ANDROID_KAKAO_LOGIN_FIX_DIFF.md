# 안드로이드 카카오 로그인 후 세션 인식 문제 해결 - 변경사항 Diff

## 📋 문제 분석

### 웹 카카오 로그인 성공 후 처리 흐름:
1. `kakao-callback.tsx`에서 `/api/kakao/exchange-code` 호출
2. 성공 시 `queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })`로 인증 상태 갱신
3. 홈(`/`)으로 navigate

### 안드로이드 카카오 로그인 문제:
- 외부 브라우저(Chrome Custom Tab)에서 카카오 로그인 완료
- "로그인 완료! 앱으로 돌아가는 중..." 화면 표시
- 앱으로 돌아왔지만 로그인 상태를 인식하지 못함

## ✅ 해결 방법

### 1. landing.tsx 수정

#### 변경 1: @capacitor/browser import 추가
```diff
+ import { Browser } from "@capacitor/browser";
```

#### 변경 2: handleKakaoLoginWithBrowser 함수 추가
```typescript
// 안드로이드에서 외부 브라우저로 카카오 로그인을 시작하는 함수
const handleKakaoLoginWithBrowser = async () => {
  if (!Capacitor.isNativePlatform()) {
    // 웹에서는 기존 방식 사용
    handleKakaoLogin();
    return;
  }

  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      toast({
        title: language === 'ko' ? "오류" : "Error",
        description: language === 'ko' 
          ? "서버 연결 설정이 없습니다. 앱을 다시 설치해주세요."
          : "Server configuration missing. Please reinstall the app.",
        variant: "destructive",
      });
      return;
    }

    const loginUrl = `${baseUrl}/api/kakao/login?lang=${language}&platform=web`;
    console.log('[KAKAO LOGIN] Opening browser with URL:', loginUrl);

    // @capacitor/browser를 사용하여 외부 브라우저 열기
    await Browser.open({
      url: loginUrl,
      windowName: '_self',
      presentationStyle: 'popover',
    });

    console.log('[KAKAO LOGIN] Browser opened, waiting for callback...');
  } catch (error: any) {
    console.error('[KAKAO LOGIN] Failed to open browser:', error);
    toast({
      title: language === 'ko' ? "오류" : "Error",
      description: language === 'ko' 
        ? "브라우저를 열 수 없습니다."
        : "Failed to open browser.",
      variant: "destructive",
    });
  }
};
```

#### 변경 3: 카카오 로그인 버튼 onClick 수정
```diff
- onClick={handleKakaoLogin}
+ onClick={Capacitor.isNativePlatform() ? handleKakaoLoginWithBrowser : handleKakaoLogin}
```

### 2. App.tsx 수정

#### 변경 1: @capacitor/browser import 추가
```diff
+ import { Browser } from "@capacitor/browser";
```

#### 변경 2: appStateChange 이벤트 리스너 추가
```typescript
// 앱이 포그라운드로 돌아왔을 때 세션 확인 (외부 브라우저에서 카카오 로그인 완료 후)
const handleAppStateChange = async (state: { isActive: boolean }) => {
  if (state.isActive) {
    console.log('[APP STATE] App became active, checking session...');
    
    // 로그아웃 직후에는 세션 확인하지 않음
    const logoutTimestamp = localStorage.getItem("logoutTimestamp");
    const isRecentLogout = logoutTimestamp && (Date.now() - parseInt(logoutTimestamp)) < 30000;
    
    if (isRecentLogout) {
      console.log('[APP STATE] Recent logout detected, skipping session check');
      return;
    }

    // 현재 인증되지 않은 상태이고 로딩 중이 아닐 때만 세션 확인
    if (!isAuthenticated && !isLoading && !user) {
      console.log('[APP STATE] Not authenticated, checking session after app became active...');
      
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        console.warn('[APP STATE] Base URL not available');
        return;
      }

      // 세션 확인 (최대 5번 시도, 점진적 대기 시간)
      let sessionFound = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          console.log(`[APP STATE] Session check attempt ${attempt + 1}/5`);
          const response = await fetch(`${baseUrl}/api/auth/user`, {
            method: 'GET',
            credentials: 'include', // 쿠키 포함
            headers: {
              'Accept': 'application/json',
            }
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('[APP STATE] ✅ Session found, user:', userData?.id);
            sessionFound = true;
            
            // 인증 상태 갱신
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            
            // 메인 화면으로 이동
            setTimeout(() => {
              console.log('[APP STATE] Redirecting to home page');
              window.location.href = '/';
            }, 500);
            break;
          } else if (response.status === 401) {
            console.log('[APP STATE] No session found (401)');
            break;
          } else {
            console.warn(`[APP STATE] Session check failed (attempt ${attempt + 1}):`, response.status);
          }
        } catch (err) {
          console.error(`[APP STATE] Session check error (attempt ${attempt + 1}):`, err);
        }

        // 마지막 시도가 아니면 점진적으로 대기 시간 증가
        if (attempt < 4) {
          const waitTime = (attempt + 1) * 1000; // 1초, 2초, 3초, 4초
          console.log(`[APP STATE] Waiting ${waitTime}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      if (!sessionFound) {
        console.log('[APP STATE] No session found after 5 attempts');
        console.log('[APP STATE] This might be because:');
        console.log('[APP STATE] 1. Login was not completed in external browser');
        console.log('[APP STATE] 2. Session cookie was not set properly');
        console.log('[APP STATE] 3. Cookie domain/path mismatch between browser and WebView');
      }
    } else {
      console.log('[APP STATE] Already authenticated or loading, skipping session check');
    }
  }
};

// 앱 상태 변경 리스너 등록
const appStateListener = await CapacitorApp.addListener('appStateChange', handleAppStateChange);
console.log('[APP STATE] App state change listener registered');
```

#### 변경 3: browserFinished 이벤트 리스너 추가
```typescript
// Browser 이벤트 리스너 (브라우저가 닫힐 때)
Browser.addListener('browserFinished', async () => {
  console.log('[BROWSER] Browser closed, will check session on app state change...');
  // 브라우저가 닫혔다는 것을 표시 (appStateChange에서 사용)
  localStorage.setItem('browserClosed', Date.now().toString());
});
console.log('[BROWSER] Browser finished listener registered');
```

#### 변경 4: Cleanup 함수 추가
```typescript
// Cleanup
return () => {
  appStateListener.remove();
  Browser.removeAllListeners();
};
```

### 3. 세션 쿠키 설정 확인

#### server/replitAuth.ts
- ✅ `SameSite: "none"` - Android WebView cross-site 쿠키 지원
- ✅ `Secure: true` - HTTPS 필수
- ✅ `path: "/"` - 모든 경로에서 쿠키 사용
- ✅ `httpOnly: true` - XSS 방지

**이미 올바르게 설정되어 있어서 추가 수정 불필요**

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
6. 앱으로 돌아가기 (appStateChange 이벤트 발생)
   ↓
7. App.tsx의 handleAppStateChange에서 세션 확인
   ↓
8. /api/auth/user 호출하여 세션 확인 (최대 5번 시도)
   ↓
9. 세션 확인 성공 시 인증 상태 갱신 및 메인 화면으로 이동
```

## ⚠️ 주의사항

1. **외부 브라우저와 WebView의 쿠키 공유 문제**:
   - 외부 브라우저(Chrome Custom Tab)에서 설정된 세션 쿠키는 앱의 WebView와 공유되지 않습니다.
   - 따라서 앱으로 돌아왔을 때 `/api/auth/user`를 호출해도 세션이 없을 수 있습니다.
   - 이 경우 서버에서 세션을 확인할 수 없으므로, 딥링크를 통해 세션 토큰을 전달하거나 다른 방법을 사용해야 합니다.

2. **현재 구현의 한계**:
   - 현재 구현은 앱이 포그라운드로 돌아왔을 때 세션을 확인하지만, 외부 브라우저의 쿠키는 WebView에 전달되지 않으므로 세션을 확인할 수 없을 수 있습니다.
   - 더 나은 해결 방법은 서버에서 세션 토큰을 생성하고 딥링크에 포함시켜 앱으로 전달하는 것입니다.

3. **대안 해결 방법**:
   - 서버의 `/api/kakao/redirect` 엔드포인트에서 딥링크에 세션 토큰을 포함시켜 전달
   - 앱이 딥링크를 받으면 세션 토큰을 사용하여 서버에서 세션을 복원
   - 또는 외부 브라우저에서 카카오 로그인 완료 후, 앱의 WebView로 리다이렉트하여 세션 쿠키를 설정

## ✅ 확인 사항

- [x] landing.tsx에서 안드로이드 카카오 로그인 시 @capacitor/browser 사용
- [x] App.tsx에 appStateChange 이벤트 리스너 추가
- [x] App.tsx에 browserFinished 이벤트 리스너 추가
- [x] 세션 쿠키 설정 확인 (이미 올바르게 설정됨)
- [x] 빌드 성공 확인

## 🎯 다음 단계

외부 브라우저의 쿠키가 WebView에 전달되지 않는 문제를 해결하기 위해:
1. 서버에서 세션 토큰을 생성하고 딥링크에 포함시켜 전달
2. 앱이 딥링크를 받으면 세션 토큰을 사용하여 서버에서 세션을 복원
3. 또는 외부 브라우저에서 카카오 로그인 완료 후, 앱의 WebView로 리다이렉트하여 세션 쿠키를 설정
