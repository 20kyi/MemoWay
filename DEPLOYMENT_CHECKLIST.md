# 🚀 Replit 배포 체크리스트

## 📋 변경사항 요약

다음 파일들이 수정되었습니다:

1. **`server/kakaoAuth.ts`**
   - 서버 측 리다이렉트로 변경 (`res.redirect()`)
   - 즉시 카카오 로그인 페이지로 이동

2. **`server/vite.ts`**
   - API 경로 및 정적 파일 요청 제외
   - JavaScript 모듈 로드 오류 해결

3. **도메인 업데이트**
   - `memoway.replit.app` → `memo-way.replit.app`

---

## ✅ 배포 전 확인사항

### 1. Replit Secrets 설정 확인
- [ ] `KAKAO_CLIENT_ID` 설정됨
- [ ] `KAKAO_CLIENT_SECRET` 설정됨
- [ ] `DATABASE_URL` 설정됨
- [ ] `SESSION_SECRET` 설정됨

### 2. Kakao Developer Console 설정
- [ ] Redirect URI 등록: `https://memo-way.replit.app/api/kakao/callback`

---

## 📝 배포 단계

### 방법 1: 파일 직접 복사 (가장 빠름)

#### 1단계: `server/kakaoAuth.ts` 복사
1. Cursor에서 `server/kakaoAuth.ts` 열기
2. **212-217번 라인** 확인:
   ```typescript
   const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
   
   // 서버 측 리다이렉트로 직접 이동 (더 안정적)
   // 안드로이드 앱의 외부 브라우저에서도 작동
   console.log('Redirecting to Kakao OAuth:', kakaoAuthUrl);
   res.redirect(kakaoAuthUrl);
   ```
3. 전체 파일 복사 (`Ctrl+A`, `Ctrl+C`)
4. Replit에서 `server/kakaoAuth.ts` 열기
5. 전체 선택 후 붙여넣기 (`Ctrl+A`, `Delete`, `Ctrl+V`)
6. 저장 (`Ctrl+S`)

#### 2단계: `server/vite.ts` 복사
1. Cursor에서 `server/vite.ts` 열기
2. **85-103번 라인** 확인:
   ```typescript
   app.use(express.static(distPath, {
     // 정적 파일만 서빙, HTML은 제외 (SPA fallback에서 처리)
     index: false,
   }));

   // fall through to index.html if the file doesn't exist
   // 단, API 경로는 제외
   app.use("*", (req, res) => {
     // API 경로는 404 반환 (이미 처리되었거나 존재하지 않음)
     if (req.path.startsWith("/api")) {
       return res.status(404).json({ error: "API endpoint not found" });
     }
     // 정적 파일 요청 (확장자가 있는 경우)은 404 반환
     if (path.extname(req.path)) {
       return res.status(404).send("File not found");
     }
     // 그 외의 경우 SPA fallback: index.html 반환
     res.sendFile(path.resolve(distPath, "index.html"));
   });
   ```
3. 전체 파일 복사 후 Replit에 붙여넣기

#### 3단계: 서버 재시작
- Replit에서 **Stop** → **Run** 클릭
- 또는 자동 재시작 대기

#### 4단계: 배포
- Replit 상단의 **Publish** 버튼 클릭
- 배포 완료 대기 (몇 분 소요)

---

### 방법 2: Git 사용 (GitHub 연동 시)

1. Cursor에서 변경사항 커밋:
   ```bash
   git add .
   git commit -m "Fix Kakao OAuth redirect and static file serving"
   git push
   ```

2. Replit에서:
   - Git 탭 열기
   - "Pull from GitHub" 클릭
   - **Publish** 클릭

---

## 🧪 테스트 체크리스트

배포 후 테스트:

### 1. Health Check
브라우저에서 접속:
```
https://memo-way.replit.app/api/kakao/health
```

**기대 결과:**
```json
{
  "configured": true,
  "hasClientId": true,
  "hasClientSecret": true,
  "expectedRedirectUri": "https://memo-way.replit.app/api/kakao/callback"
}
```

### 2. 카카오 로그인 엔드포인트 테스트
브라우저에서 접속:
```
https://memo-way.replit.app/api/kakao/login?lang=ko&platform=android
```

**기대 결과:**
- ✅ 즉시 카카오 로그인 페이지로 리다이렉트
- ❌ HTML 페이지에서 멈추지 않음
- ❌ JavaScript 오류 없음

### 3. 안드로이드 앱 테스트
1. 앱 실행
2. 카카오 로그인 버튼 클릭
3. 외부 브라우저에서 카카오 로그인 완료
4. 앱으로 돌아오기
5. 세션 유지 확인

---

## 🔍 문제 해결

### 문제 1: 여전히 HTML 페이지에서 멈춤
**원인:** 코드가 배포되지 않음
**해결:** 
1. Replit에서 파일 내용 확인
2. 서버 재시작
3. **Publish** 클릭

### 문제 2: JavaScript 모듈 오류
**원인:** `serveStatic` 수정사항 미반영
**해결:**
1. `server/vite.ts` 파일 확인
2. API 경로 제외 로직 확인
3. 서버 재시작

### 문제 3: Redirect URI 오류 (KOE006)
**원인:** Kakao Developer Console에 URI 미등록
**해결:**
1. [Kakao Developer Console](https://developers.kakao.com/) 접속
2. Redirect URI 추가: `https://memo-way.replit.app/api/kakao/callback`
3. 저장

---

## 📊 확인 방법

### Replit 로그 확인
Replit → Logs 탭에서 확인:
```
✅ Kakao OAuth configured successfully
Redirecting to Kakao OAuth: https://kauth.kakao.com/oauth/authorize?...
```

### 서버 로그 확인
카카오 로그인 시도 시:
```
GET /api/kakao/login?lang=ko&platform=android 302
Android app detected - using production domain: memo-way.replit.app
```

---

## 🎯 최종 확인

배포 성공 시:
- ✅ `/api/kakao/login` 즉시 리다이렉트
- ✅ JavaScript 모듈 오류 없음
- ✅ 카카오 로그인 정상 작동
- ✅ 안드로이드 앱에서 세션 유지

