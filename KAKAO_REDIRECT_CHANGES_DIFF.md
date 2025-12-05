# 카카오 로그인 무한 리디렉션 수정 - 변경사항 Diff

## 📋 주요 변경사항

### 1. 모든 redirectUri를 `/api/kakao/redirect`로 통일

#### 변경 1: `/api/kakao/exchange-code` (라인 392-393)
```diff
- const redirectUri = `${protocol}://${host}/api/kakao/callback`;
+ // ⚠️ 중요: redirectUri를 /api/kakao/redirect로 통일
+ // /api/kakao/login에서 사용한 redirectUri와 일치해야 함
+ const redirectUri = `${protocol}://${host}/api/kakao/redirect`;
```

#### 변경 2: `/api/kakao/callback-server` (라인 676)
```diff
- const redirectUri = `${protocol}://${host}/api/kakao/callback`;
+ // ⚠️ 중요: redirectUri를 /api/kakao/redirect로 통일
+ // /api/kakao/login에서 사용한 redirectUri와 일치해야 함
+ const redirectUri = `${protocol}://${host}/api/kakao/redirect`;
```

#### 변경 3: `/api/kakao/health` (라인 94)
```diff
- const expectedRedirectUri = isLocalDev 
-   ? 'http://localhost:5000/api/kakao/callback'
-   : `${useHttps ? 'https' : 'http'}://${appDomain || 'unknown'}/api/kakao/callback`;
+ // ⚠️ 중요: redirectUri를 /api/kakao/redirect로 통일
+ const expectedRedirectUri = isLocalDev 
+   ? 'http://localhost:5000/api/kakao/redirect'
+   : `${useHttps ? 'https' : 'http'}://${appDomain || 'unknown'}/api/kakao/redirect`;
```

### 2. `/api/kakao/callback` 서버 엔드포인트 추가 (라인 519-548)

**새로 추가된 코드:**
```typescript
app.get("/api/kakao/callback", (req, res) => {
  console.log('[KAKAO FLOW]', req.method, req.originalUrl);
  // ... 로그 ...
  
  // 카카오에서 받은 쿼리 파라미터를 그대로 /api/kakao/redirect로 전달
  const queryString = new URLSearchParams(req.query as any).toString();
  const redirectUrl = `/api/kakao/redirect${queryString ? `?${queryString}` : ''}`;
  
  console.log('[KAKAO FLOW] redirect to:', redirectUrl);
  
  // ⚠️ 중요: /api/kakao/redirect로 리다이렉트 (서버에서 처리)
  // 절대 /api/kakao/login으로 리다이렉트하지 않음
  res.redirect(redirectUrl);
});
```

**목적:** 카카오 개발자 콘솔에 등록된 `redirect_uri`가 `/api/kakao/callback`인 경우를 처리

### 3. `/api/kakao/callback-server` 수정 (라인 801-820)

**변경 전:**
```typescript
if (isAndroidApp) {
  const redirectUrl = `/api/kakao/redirect?lang=${lang}`;
  res.redirect(redirectUrl);
}
```

**변경 후:**
```typescript
if (isAndroidApp) {
  // HTML을 반환하여 딥링크로 이동 (서버 레벨 redirect 없음)
  const appDeepLink = `com.memoway.app://login?lang=${lang}&session_ok=true`;
  console.log('[KAKAO FLOW] redirect to (final):', appDeepLink, '(Android app - Deep Link)');
  return res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>로그인 완료</title>
        <script>
          setTimeout(() => {
            window.location.href = '${appDeepLink}';
          }, 500);
        </script>
      </head>
      <body>
        <p>로그인 완료. 앱으로 이동 중...</p>
      </body>
    </html>
  `);
}
```

### 4. `/api/kakao/redirect` 개선 (라인 891-930)

**변경:** code가 없지만 이미 세션이 있는 경우 처리 추가

```typescript
// 인가 코드가 없으면 에러
if (!code || typeof code !== "string") {
  // 이미 세션이 있는지 확인 (혹시 다른 경로로 들어온 경우)
  const isAuthenticated = req.isAuthenticated();
  if (isAuthenticated) {
    // 이미 로그인되어 있으면 딥링크로 이동
    const lang = req.query.lang || 'ko';
    const appDeepLink = `com.memoway.app://login?lang=${lang}&session_ok=true`;
    return res.send(/* HTML with deep link */);
  }
  // 세션이 없으면 에러
  // ...
}
```

### 5. serveStatic 수정 (server/vite.ts, 라인 92-104)

**변경 전:**
```typescript
if (req.path.startsWith("/api") && req.path !== "/api/kakao/callback") {
  return res.status(404).json({ error: "API endpoint not found" });
}
```

**변경 후:**
```typescript
// ⚠️ 중요: /api/kakao/callback은 이제 서버 엔드포인트가 있으므로 여기서 처리되지 않음
if (req.path.startsWith("/api")) {
  return res.status(404).json({ error: "API endpoint not found" });
}
```

### 6. 무한 루프 방지 규칙 추가

#### `/api/kakao/login` (라인 136-143)
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

## 📊 최종 Redirect 체인

### 정상 플로우:

```
1. /api/kakao/login?lang=ko&platform=web
   ↓ (302) 카카오 인증 URL
2. https://kauth.kakao.com/oauth/authorize?redirect_uri=.../api/kakao/redirect&...
   ↓ (사용자 로그인)
3. /api/kakao/redirect?code=...&state=... (또는 /api/kakao/callback?code=...&state=...)
   ↓ (만약 /api/kakao/callback이면 302 → /api/kakao/redirect)
4. /api/kakao/redirect?code=...&state=...
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

1. **권장:** `https://memoway-production.up.railway.app/api/kakao/redirect`
2. **호환성:** `https://memoway-production.up.railway.app/api/kakao/callback` (자동으로 `/api/kakao/redirect`로 리다이렉트됨)

두 가지 모두 지원하도록 코드를 수정했습니다.

## ✅ 확인 사항

- [x] 모든 redirectUri를 `/api/kakao/redirect`로 통일
- [x] `/api/kakao/callback` 서버 엔드포인트 추가
- [x] `/api/kakao/callback-server` 수정 (서버 레벨 redirect 제거)
- [x] `/api/kakao/redirect` 개선 (code 없을 때 처리)
- [x] serveStatic 수정
- [x] 무한 루프 방지 규칙 적용
- [x] 빌드 성공 확인
