# 안드로이드 카카오 로그인 후 세션 확인 및 메인 화면 이동 - 변경사항 Diff

## 📋 문제 분석

### 웹 카카오 로그인 성공 후 처리 흐름:
1. `kakao-callback.tsx`에서 `/api/kakao/exchange-code` 호출
2. 성공 시 `queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })`로 인증 상태 갱신
3. 웹인 경우 `setLocation('/?lang=${lang}')`로 홈으로 이동

### 안드로이드 카카오 로그인 문제:
- 외부 브라우저(Chrome Custom Tab)에서 카카오 로그인 완료
- "로그인 완료! 앱으로 돌아가는 중..." 화면 표시
- 앱으로 돌아왔지만 로그인 상태를 인식하지 못함

## ✅ 해결 방법

### 1. App.tsx - handleDeepLink 함수 개선

#### 변경 전:
- 세션 확인 로직이 있지만 명확하지 않음
- 웹과 안드로이드 구분이 불명확

#### 변경 후:
```typescript
// 안드로이드에서 카카오 로그인 완료 후 세션 확인 및 메인 화면으로 이동
if (Capacitor.isNativePlatform() && baseUrl) {
  console.log('[DEEP LINK] Android: Checking session after Kakao login...');
  
  // /api/auth/user 호출하여 로그인 상태 확인 (여러 번 시도)
  let sessionFound = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      console.log(`[DEEP LINK] Session check attempt ${attempt + 1}/5`);
      const response = await fetch(`${baseUrl}/api/auth/user`, {
        method: 'GET',
        credentials: 'include', // 쿠키 포함
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        // 200: 로그인됨
        const userData = await response.json();
        console.log('[DEEP LINK] ✅ Session found, user:', userData?.id);
        sessionFound = true;
        
        // auth context 업데이트 (queryClient를 통해)
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // 메인 화면으로 이동
        console.log('[DEEP LINK] Redirecting to home page (main screen)');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
        break;
      } else if (response.status === 401) {
        // 401: 비로그인 상태
        console.log('[DEEP LINK] ❌ No session found (401) - login failed or session expired');
        console.log('[DEEP LINK] Staying on login page');
        break; // 더 이상 시도하지 않음
      }
    } catch (err) {
      console.error(`[DEEP LINK] Session check error (attempt ${attempt + 1}):`, err);
    }
    
    // 마지막 시도가 아니면 점진적으로 대기 시간 증가
    if (attempt < 4) {
      const waitTime = (attempt + 1) * 500; // 0.5초, 1초, 1.5초, 2초
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  if (!sessionFound) {
    console.error('[DEEP LINK] Failed to find session after 5 attempts');
    // 세션을 찾지 못했으므로 로그인 화면 유지
    return;
  }
} else if (!Capacitor.isNativePlatform()) {
  // 웹: 기존 로직 유지
  if (baseUrl && sessionOk === 'true') {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  }
}
```

### 2. App.tsx - handleAppStateChange 함수 개선

#### 변경 전:
- 웹과 안드로이드 구분이 불명확
- 로그 메시지가 명확하지 않음

#### 변경 후:
```typescript
// 안드로이드에서만 세션 확인 (웹은 기존 로직 유지)
if (Capacitor.isNativePlatform()) {
  // 현재 인증되지 않은 상태이고 로딩 중이 아닐 때만 세션 확인
  if (!isAuthenticated && !isLoading && !user) {
    console.log('[APP STATE] Android: Not authenticated, checking session after app became active...');
    
    // /api/auth/user 호출하여 로그인 상태 확인
    // ... (위와 동일한 로직)
    
    if (response.ok) {
      // 200: 로그인됨
      // auth context 업데이트 및 메인 화면으로 이동
    } else if (response.status === 401) {
      // 401: 비로그인 상태
      // 로그인 화면 유지
    }
  }
} else {
  // 웹: 기존 로직 유지 (세션 확인하지 않음)
  console.log('[APP STATE] Web platform, skipping session check');
}
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
7. App.tsx의 handleDeepLink에서 세션 확인
   ↓
8. /api/auth/user 호출하여 세션 확인 (최대 5번 시도)
   ↓
9. 200 응답: auth context 업데이트 및 메인 화면(/)으로 이동
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
- [x] 웹과 안드로이드 구분 (Capacitor.isNativePlatform() 체크)
- [x] 200 응답 시 auth context 업데이트 및 메인 화면으로 이동
- [x] 401 응답 시 로그인 화면 유지
- [x] 빌드 성공 확인

## 🎯 주요 변경사항

1. **handleDeepLink 함수 개선**:
   - 안드로이드에서만 세션 확인 로직 실행
   - `/api/auth/user` 호출하여 로그인 상태 확인
   - 200 응답: auth context 업데이트 및 메인 화면으로 이동
   - 401 응답: 로그인 화면 유지
   - 웹은 기존 로직 유지

2. **handleAppStateChange 함수 개선**:
   - 안드로이드에서만 세션 확인 로직 실행
   - 웹은 세션 확인하지 않음 (기존 로직 유지)
   - 명확한 로그 메시지 추가

3. **플랫폼 구분**:
   - `Capacitor.isNativePlatform()` 체크로 웹과 안드로이드 구분
   - 웹 로그인 흐름은 기존대로 유지
