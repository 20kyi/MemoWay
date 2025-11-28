# 🔧 정적 파일 서빙 오류 수정

## 문제
JavaScript 모듈 파일(`/assets/index-xxx.js`) 요청 시 HTML이 반환되어 오류 발생:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/html"
```

## 원인
SPA fallback(`app.use("*", ...)`)이 모든 요청을 잡아서 정적 파일 요청도 `index.html`로 반환하고 있었음.

## 해결 방법

`server/vite.ts` 파일을 수정하여:
1. **정적 파일 경로 명시적 체크**: `/assets/`, `/_vite/` 또는 확장자가 있는 요청은 404 반환
2. **API 경로 제외**: `/api/*` 경로는 404 JSON 반환
3. **SPA fallback**: 그 외의 경우에만 `index.html` 반환

---

## 📝 배포 방법

### 1단계: 파일 확인
`server/vite.ts` 파일의 **85-109번 라인** 확인:

```typescript
// 정적 파일 서빙 (assets, favicon 등)
app.use(express.static(distPath, {
  index: false,
  fallthrough: true,
}));

// SPA fallback: API 경로와 정적 파일 요청 제외
app.use("*", (req, res) => {
  // API 경로는 404 반환
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  
  // 정적 파일 경로 또는 확장자가 있는 요청은 404 반환
  if (req.path.startsWith("/assets/") || 
      req.path.startsWith("/_vite/") ||
      path.extname(req.path)) {
    return res.status(404).send("File not found");
  }
  
  // 그 외의 경우 (SPA 라우트 요청) index.html 반환
  res.sendFile(path.resolve(distPath, "index.html"));
});
```

### 2단계: Replit에 파일 복사
1. Cursor에서 `server/vite.ts` 전체 복사 (`Ctrl+A`, `Ctrl+C`)
2. Replit에서 `server/vite.ts` 열기
3. 전체 선택 후 붙여넣기 (`Ctrl+A`, `Delete`, `Ctrl+V`)
4. 저장 (`Ctrl+S`)

### 3단계: 서버 재시작
- Replit에서 **Stop** → **Run** 클릭
- 또는 자동 재시작 대기

### 4단계: 배포
- Replit 상단의 **Publish** 버튼 클릭
- 배포 완료 대기

---

## ✅ 확인 방법

배포 후 테스트:

1. **정적 파일 요청 확인**:
   - 브라우저 개발자 도구 → Network 탭
   - 페이지 새로고침
   - `/assets/index-xxx.js` 요청 확인
   - **Content-Type**: `application/javascript` 또는 `text/javascript` ✅
   - **Content-Type**: `text/html` ❌ (문제 있음)

2. **카카오 로그인 테스트**:
   ```
   https://memo-way.replit.app/api/kakao/login?lang=ko&platform=android
   ```
   - 즉시 카카오 로그인 페이지로 리다이렉트되어야 함 ✅

3. **SPA 라우팅 확인**:
   - 루트 경로(`/`) 접속 시 정상 로드 ✅
   - 다른 경로(`/home`, `/settings` 등) 접속 시 정상 로드 ✅

---

## 🐛 여전히 문제가 있다면

### 문제 1: 여전히 HTML이 반환됨
**확인 사항:**
1. `server/vite.ts` 파일이 올바르게 업데이트되었는지 확인
2. 서버가 재시작되었는지 확인
3. **Publish** 버튼을 눌러 배포되었는지 확인

### 문제 2: 정적 파일이 404 오류
**확인 사항:**
1. `dist/public/assets/` 폴더에 파일이 있는지 확인
2. 빌드가 최신인지 확인 (`npm run build`)
3. Replit에서 빌드 로그 확인

### 문제 3: API 엔드포인트가 404 오류
**원인:** 정상 작동입니다. 존재하지 않는 API 엔드포인트는 404를 반환합니다.

---

## 📊 변경 전/후 비교

### 변경 전 (문제)
```
요청: GET /assets/index-xxx.js
응답: 200 OK, Content-Type: text/html
내용: <!DOCTYPE html>...
```

### 변경 후 (정상)
```
요청: GET /assets/index-xxx.js
응답: 200 OK, Content-Type: application/javascript
내용: (JavaScript 코드)
```

```
요청: GET /assets/not-found.js
응답: 404 Not Found
내용: File not found
```

```
요청: GET /api/unknown
응답: 404 Not Found, Content-Type: application/json
내용: {"error":"API endpoint not found"}
```

```
요청: GET /home
응답: 200 OK, Content-Type: text/html
내용: <!DOCTYPE html>... (SPA fallback)
```

