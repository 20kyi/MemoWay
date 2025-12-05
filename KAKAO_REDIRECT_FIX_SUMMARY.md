# 카카오 로그인 무한 리디렉션 문제 해결 요약

## 🔴 문제 원인

**무한 리디렉션 발생:**
- `/api/kakao/callback` GET 엔드포인트가 자기 자신으로 리다이렉트
- `res.redirect('/api/kakao/callback?${queryString}')` → 무한 루프

## ✅ 해결 방법

### 1. 서버의 `/api/kakao/callback` GET 엔드포인트 제거
- 자기 자신으로 리다이렉트하는 코드 제거
- 프런트엔드 라우터가 직접 처리하도록 변경

### 2. `serveStatic` fallback 수정
- `/api/kakao/callback`은 예외로 처리하여 `index.html` 반환
- 프런트엔드 라우터가 경로를 처리할 수 있도록 함

### 3. 디버깅 로그 추가
- 모든 카카오 로그인 관련 라우트에 `[KAKAO LOGIN FLOW]` 태그 추가
- 리디렉션 흐름 추적 가능

## 📋 변경된 파일

### server/kakaoAuth.ts
1. `/api/kakao/login` - 디버깅 로그 추가
2. `/api/kakao/callback` GET 엔드포인트 제거 (주석으로 대체)
3. `/api/kakao/callback-server` - 디버깅 로그 추가
4. `/api/kakao/redirect` - 디버깅 로그 추가
5. `/api/kakao/callback-server`의 리디렉션 로그 추가

### server/vite.ts
- `serveStatic` fallback에서 `/api/kakao/callback` 예외 처리 추가

### client/src/pages/kakao-callback.tsx
- 디버깅 로그 추가 (`[KAKAO LOGIN FLOW]` 태그)

## 🔄 정상 플로우

### Android WebView에서:
1. 사용자가 카카오 로그인 버튼 클릭
2. `/api/kakao/login?lang=ko&platform=web` 요청
3. 서버가 카카오 인증 URL로 리다이렉트 (302)
4. 카카오 로그인 완료 후 `/api/kakao/callback?code=...&state=...`로 리다이렉트
5. 서버의 `serveStatic`이 `index.html` 반환 (서버 엔드포인트 없음)
6. 프런트엔드 라우터가 `/api/kakao/callback` 경로 처리
7. `KakaoCallback` 컴포넌트가 인가 코드를 받아서 `/api/kakao/exchange-code`로 전달
8. 서버가 토큰 교환 및 세션 생성
9. 프런트엔드가 딥링크로 앱으로 리다이렉트

## 🎯 핵심 변경사항

**Before:**
```typescript
app.get("/api/kakao/callback", (req, res) => {
  res.redirect(`/api/kakao/callback?${queryString}`); // 무한 루프!
});
```

**After:**
```typescript
// 서버 엔드포인트 제거
// serveStatic에서 /api/kakao/callback은 index.html 반환
// 프런트엔드 라우터가 직접 처리
```

## 📊 리디렉션 흐름

```
Android WebView
  ↓
/api/kakao/login?lang=ko&platform=web
  ↓ (302 redirect)
https://kauth.kakao.com/oauth/authorize?...
  ↓ (사용자 로그인)
/api/kakao/callback?code=...&state=...
  ↓ (serveStatic → index.html)
프런트엔드 라우터 (/api/kakao/callback)
  ↓
KakaoCallback 컴포넌트
  ↓ (POST)
/api/kakao/exchange-code
  ↓ (세션 생성)
딥링크로 앱으로 리다이렉트
```

## ✅ 확인 사항

- [x] 서버의 `/api/kakao/callback` GET 엔드포인트 제거
- [x] `serveStatic`에서 `/api/kakao/callback` 예외 처리
- [x] 디버깅 로그 추가
- [x] 플로우 정리 및 문서화

이제 무한 리디렉션이 발생하지 않고 정상적으로 동작합니다!
