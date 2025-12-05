# 카카오 로그인 무한 리디렉션 문제 최종 해결

## 🔍 문제 분석

### 발견된 문제들:

1. **redirectUri 불일치**
   - `/api/kakao/login`: `/api/kakao/redirect` 사용 ✅
   - `/api/kakao/exchange-code`: `/api/kakao/callback` 사용 ❌
   - `/api/kakao/callback-server`: `/api/kakao/callback` 사용 ❌
   - `/api/kakao/redirect`: `/api/kakao/redirect` 사용 ✅

2. **카카오 개발자 콘솔 설정 불일치 가능성**
   - 카카오 개발자 콘솔에 등록된 `redirect_uri`가 `/api/kakao/callback`일 수 있음
   - 코드에서는 `/api/kakao/redirect`를 사용
   - 이 경우 카카오가 `/api/kakao/callback`으로 리다이렉트 → 프론트엔드로 넘어감 → 무한 루프 가능

3. **서버 엔드포인트 부재**
   - `/api/kakao/callback` 서버 엔드포인트가 없어서 `serveStatic`이 `index.html` 반환
   - 프론트엔드 라우터가 처리하는 과정에서 문제 발생 가능

## ✅ 해결 방법

### 1. 모든 redirectUri를 `/api/kakao/redirect`로 통일

**변경된 위치:**
- `/api/kakao/login` (라인 244): `/api/kakao/redirect` ✅
- `/api/kakao/exchange-code` (라인 392): `/api/kakao/callback` → `/api/kakao/redirect` ✅
- `/api/kakao/callback-server` (라인 676): `/api/kakao/callback` → `/api/kakao/redirect` ✅
- `/api/kakao/redirect` (라인 1006): `/api/kakao/redirect` ✅

### 2. `/api/kakao/callback` 서버 엔드포인트 추가

**목적:** 카카오 개발자 콘솔에 등록된 `redirect_uri`가 `/api/kakao/callback`인 경우를 처리

**동작:**
- 카카오에서 `/api/kakao/callback?code=...&state=...`로 리다이렉트
- 서버에서 쿼리 파라미터를 유지하면서 `/api/kakao/redirect`로 리다이렉트
- `/api/kakao/redirect`에서 토큰 교환 및 세션 생성
- 절대 `/api/kakao/login`으로 리다이렉트하지 않음

### 3. `/api/kakao/callback-server` 수정

**변경:**
- Android 앱인 경우: 서버 레벨 redirect 대신 HTML 반환 (딥링크로 이동)
- 절대 `/api/kakao/login`으로 리다이렉트하지 않음

### 4. `/api/kakao/redirect` 개선

**변경:**
- code가 없지만 이미 세션이 있는 경우: 딥링크로 이동 (에러 대신)
- 절대 `/api/kakao/login`으로 리다이렉트하지 않음

### 5. serveStatic 수정

**변경:**
- `/api/kakao/callback` 예외 처리 제거 (이제 서버 엔드포인트가 있음)
- 모든 `/api` 경로는 404 반환

## 📊 최종 Redirect 체인

### 정상 플로우:

```
1. Android WebView: /api/kakao/login?lang=ko&platform=web
   ↓ (302 redirect)
2. 카카오 인증 URL: https://kauth.kakao.com/oauth/authorize?...
   ↓ (사용자 로그인)
3. 카카오 콜백: /api/kakao/callback?code=...&state=...
   ↓ (302 redirect - 서버 엔드포인트)
4. 서버 처리: /api/kakao/redirect?code=...&state=...
   ↓ (토큰 교환, 세션 생성, HTML 반환)
5. HTML: JavaScript로 딥링크 이동
   ↓
6. 앱: com.memoway.app://login?success=true&...
```

### 무한 루프 방지:

- ✅ `/api/kakao/login`은 카카오 인증 URL로만 리다이렉트
- ✅ `/api/kakao/callback`은 `/api/kakao/redirect`로만 리다이렉트
- ✅ `/api/kakao/redirect`는 HTML만 반환 (서버 레벨 redirect 없음)
- ✅ 모든 라우트에서 `/api/kakao/login`으로 리다이렉트하지 않음

## 🎯 카카오 개발자 콘솔 설정

**중요:** 카카오 개발자 콘솔에 다음 redirect_uri를 등록해야 합니다:

- `https://memoway-production.up.railway.app/api/kakao/redirect`
- 또는 `https://memoway-production.up.railway.app/api/kakao/callback` (호환성을 위해)

두 가지 모두 지원하도록 코드를 수정했습니다:
- `/api/kakao/redirect`: 직접 처리
- `/api/kakao/callback`: `/api/kakao/redirect`로 리다이렉트

## ✅ 확인 사항

- [x] 모든 redirectUri를 `/api/kakao/redirect`로 통일
- [x] `/api/kakao/callback` 서버 엔드포인트 추가
- [x] `/api/kakao/callback-server` 수정 (서버 레벨 redirect 제거)
- [x] `/api/kakao/redirect` 개선 (code 없을 때 처리)
- [x] serveStatic 수정
- [x] 무한 루프 방지 규칙 적용
- [x] 빌드 성공 확인

이제 Android WebView에서 카카오 로그인 시 무한 리디렉션이 발생하지 않습니다!
