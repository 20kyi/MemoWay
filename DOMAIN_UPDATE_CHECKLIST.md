# 도메인 변경 체크리스트

## ✅ 코드 업데이트 완료

다음 파일들의 도메인을 `memo-way.replit.app`으로 업데이트했습니다:
- `server/kakaoAuth.ts` - Kakao OAuth Redirect URI fallback
- `server/googleAuth.ts` - Google OAuth Redirect URI fallback
- `server/index.ts` - CORS 허용 도메인
- `scripts/validate-env.js` - 환경 변수 검증 스크립트

---

## 🔴 반드시 해야 할 작업

### 1. Kakao Developer Console에서 Redirect URI 등록

1. [Kakao Developer Console](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → MemoWay 앱 선택
3. **제품 설정** → **카카오 로그인** → **Redirect URI**
4. 다음 URI 추가:
   ```
   https://memo-way.replit.app/api/kakao/callback
   ```
5. **저장** 클릭

**중요**: 기존 `https://memoway.replit.app/api/kakao/callback`도 유지하는 것이 좋습니다.

---

### 2. 안드로이드 앱 환경 변수 업데이트 (필요시)

`.env` 파일에 다음이 설정되어 있는지 확인:
```env
VITE_REPLIT_URL=https://memo-way.replit.app
```

만약 변경되었다면:
1. `.env` 파일 수정
2. 앱 다시 빌드:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```
3. Android Studio에서 APK 재빌드

---

### 3. Replit 환경 변수 확인

Replit에서 `REPL_SLUG` 환경 변수가 자동으로 설정되어 있으면, 코드가 자동으로 올바른 도메인을 사용합니다.

확인 방법:
- Replit 프로젝트 → Settings (톱니바퀴) → Secrets
- `REPL_SLUG`가 `memo-way`로 설정되어 있는지 확인

---

### 4. 서버 재배포

코드 변경사항을 Replit에 배포:
1. Replit에서 파일 확인 (또는 Git pull)
2. **Publish** 버튼 클릭
3. 배포 완료 대기

---

## 🧪 테스트 체크리스트

배포 후 테스트:

- [ ] 웹 브라우저에서 카카오 로그인 작동 확인
- [ ] 안드로이드 앱에서 카카오 로그인 작동 확인
- [ ] 로그인 후 세션 유지 확인
- [ ] `/api/auth/user` 엔드포인트가 200 응답 반환하는지 확인

---

## 🔍 문제 발생 시 확인사항

1. **Redirect URI 오류 (KOE006)**
   - Kakao Developer Console에 새 URI가 등록되었는지 확인
   - 서버 로그에서 실제 사용된 Redirect URI 확인

2. **세션 문제**
   - 로그에서 `/api/auth/user` 응답 코드 확인
   - 쿠키가 WebView에 전달되는지 확인

3. **도메인 불일치**
   - `REPL_SLUG` 환경 변수 확인
   - 서버 로그에서 `resolvedHost` 값 확인

