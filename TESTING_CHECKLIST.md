# 🧪 테스트 체크리스트

## ✅ 완료된 작업
- [x] 코드 도메인 업데이트: `memo-way.replit.app`
- [x] Replit Secrets에 환경 변수 설정 (`KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`)

---

## 🔍 현재 확인 사항

### 1. Replit 로그 확인

Replit 웹사이트에서 로그를 확인하세요:

**정상 작동 시 표시될 내용:**
```
✅ Kakao OAuth configured successfully
KAKAO_CLIENT_ID: [8자리]...
KAKAO_CLIENT_SECRET: SET
REPL_SLUG: [값]
```

**문제가 있으면:**
- 여전히 `KAKAO_CLIENT_ID: NOT SET` 표시
- → Secrets 저장 후 서버 재시작 필요

---

### 2. Kakao Developer Console Redirect URI 확인

다음 Redirect URI가 등록되어 있는지 확인:

```
https://memo-way.replit.app/api/kakao/callback
```

**등록 방법:**
1. [Kakao Developer Console](https://developers.kakao.com/) 접속
2. 내 애플리케이션 → MemoWay 선택
3. 제품 설정 → 카카오 로그인 → Redirect URI
4. 위 URI 추가 (없으면)
5. 저장

---

### 3. 안드로이드 앱 테스트

#### 3-1. 앱 빌드 확인
- [ ] `.env` 파일에 `VITE_REPLIT_URL=https://memo-way.replit.app` 설정됨
- [ ] 앱이 최신 코드로 빌드됨

#### 3-2. 카카오 로그인 테스트
1. 안드로이드 앱 실행
2. 카카오 로그인 버튼 클릭
3. 외부 브라우저에서 카카오 로그인 완료
4. 앱으로 돌아오기

**기대 결과:**
- ✅ 로그인 성공
- ✅ 홈 화면으로 이동
- ✅ 세션이 유지되어 로그아웃되지 않음

**문제 발생 시:**
- ❌ 로그인 화면으로 다시 돌아옴
- ❌ `/api/auth/user` 401 오류

---

### 4. 서버 로그에서 확인할 내용

카카오 로그인 시도 시 로그에서 확인:

#### 정상 플로우:
```
GET /api/kakao/login?platform=android
Android app detected - using production domain: memo-way.replit.app
Redirect URI: https://memo-way.replit.app/api/kakao/callback

GET /api/kakao/callback?code=...
Kakao login successful
User ID: ...

GET /api/kakao/redirect
Kakao redirect page - Auth status: { isAuthenticated: true, userId: ... }

GET /api/auth/user 200 OK
```

#### 문제 발생 시:
```
GET /api/auth/user 401 Unauthorized  (반복)
→ 세션 쿠키 문제
```

---

## 🐛 문제 해결 가이드

### 문제 1: 여전히 "KAKAO_CLIENT_ID: NOT SET"
**해결:**
1. Replit Secrets에 정확히 저장되었는지 확인
2. 변수 이름이 정확한지 확인 (대소문자 구분)
3. 서버 재시작 (Stop → Run)

### 문제 2: Redirect URI 오류 (KOE006)
**해결:**
1. Kakao Developer Console에 정확한 URI 등록:
   ```
   https://memo-way.replit.app/api/kakao/callback
   ```
2. 서버 로그에서 실제 사용된 Redirect URI 확인
3. 일치하는지 확인

### 문제 3: 로그인 후 세션 유지 안 됨
**해결:**
- 코드에 이미 세션 동기화 로직 추가됨
- 서버가 최신 코드로 배포되었는지 확인
- 로그에서 `/api/kakao/redirect`에서 세션 확인 메시지 확인

---

## 📝 다음 단계

1. **Replit 로그 확인** → 환경 변수가 올바르게 로드되었는지
2. **Kakao Developer Console** → Redirect URI 등록 확인
3. **안드로이드 앱 테스트** → 카카오 로그인 시도
4. **로그 분석** → 문제 발생 시 로그 확인

---

## 🆘 도움이 필요하면

문제 발생 시:
1. Replit 로그 전체 복사
2. 안드로이드 로그캣 출력 (필요 시)
3. 문제 상황 설명

