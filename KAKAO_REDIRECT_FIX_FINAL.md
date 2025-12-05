# 카카오 로그인 무한 리디렉션 문제 최종 해결

## 🔧 주요 변경사항

### 1. redirectUri 변경
**Before:**
```typescript
const redirectUri = `${protocol}://${host}/api/kakao/callback`;
```

**After:**
```typescript
// ⚠️ 중요: redirectUri를 /api/kakao/redirect로 설정하여 서버에서 직접 처리
// /api/kakao/callback은 프런트엔드로 넘어가면서 무한 루프가 발생할 수 있으므로
// /api/kakao/redirect로 통일하여 서버에서 모든 것을 처리
const redirectUri = `${protocol}://${host}/api/kakao/redirect`;
```

### 2. /api/kakao/redirect 라우트 완전 재작성
- **이전**: 세션이 있는지 확인하고 HTML 반환
- **현재**: 카카오 콜백(code, state)을 받아서 처리
  1. OAuth 에러 처리
  2. 인가 코드 검증
  3. CSRF state 검증
  4. 토큰 교환
  5. 사용자 정보 조회
  6. DB에 사용자 저장/업데이트
  7. 세션 생성
  8. HTML 반환 (JavaScript로 딥링크 이동)

### 3. 무한 루프 방지 규칙 추가

#### /api/kakao/login
```typescript
// ⚠️ 무한 루프 방지: 이미 code와 state가 있으면 에러 반환
if (req.query.code || req.query.state) {
  console.error('[KAKAO FLOW] ❌ /api/kakao/login called with code/state - possible redirect loop');
  return res.status(400).json({ 
    error: "Invalid request: /api/kakao/login should not be called with code or state parameters",
    hint: "If you have a code and state, use /api/kakao/redirect or /api/kakao/exchange-code"
  });
}
```

#### 모든 라우트에 무한 루프 방지 주석 추가
```typescript
console.log('[KAKAO FLOW] ⚠️  무한 루프 방지: 이 엔드포인트는 절대 /api/kakao/login으로 리다이렉트하지 않습니다.');
```

### 4. 리디렉션 체인 로깅 개선
모든 라우트에 다음 로그 추가:
```typescript
console.log('[KAKAO FLOW]', req.method, req.originalUrl);
console.log('[KAKAO FLOW] redirect to:', targetUrl);
```

## 📊 변경된 플로우

### Before (무한 루프 발생)
```
1. /api/kakao/login → 카카오 인증 URL
2. 카카오 → /api/kakao/callback?code=...&state=...
3. serveStatic → index.html 반환
4. 프런트엔드 라우터 → KakaoCallback 컴포넌트
5. (문제 발생 가능) → 다시 /api/kakao/login으로?
```

### After (정상 플로우)
```
1. /api/kakao/login → 카카오 인증 URL
2. 카카오 → /api/kakao/redirect?code=...&state=...
3. 서버에서 직접 처리:
   - 토큰 교환
   - 사용자 정보 조회
   - 세션 생성
4. HTML 반환 (JavaScript로 딥링크 이동)
5. 앱으로 이동 (무한 루프 없음)
```

## ✅ 보장 사항

1. **redirectUri는 항상 `/api/kakao/redirect`**
   - 절대 `/api/kakao/login`으로 돌아오지 않음
   - 절대 `/api/kakao/callback`으로 설정하지 않음

2. **/api/kakao/redirect는 서버에서 모든 것을 처리**
   - 카카오 콜백 받기
   - 토큰 교환
   - 세션 생성
   - HTML 반환 (서버 레벨 redirect 없음)

3. **무한 루프 방지 규칙**
   - `/api/kakao/login`에 code/state가 있으면 에러 반환
   - 모든 라우트에 무한 루프 방지 주석 추가
   - 서버 레벨에서 절대 `/api/kakao/login`으로 redirect하지 않음

4. **상세한 로깅**
   - 모든 리디렉션 대상 URL 로깅
   - `[KAKAO FLOW]` 태그로 쉽게 추적 가능

## 🎯 결과

이제 Android WebView에서:
1. `/api/kakao/login?lang=ko&platform=web` 요청
2. 카카오 인증 URL로 리다이렉트
3. 카카오 로그인 후 `/api/kakao/redirect?code=...&state=...`로 리다이렉트
4. 서버에서 모든 것을 처리하고 HTML 반환
5. JavaScript로 딥링크 이동
6. **무한 루프 없음!**
