# 🚀 Replit 배포 설정 가이드

Replit에 배포한 MemoWay 앱의 설정 방법을 안내합니다.

## 📋 1단계: Replit 앱 퍼블리시

1. Replit에서 프로젝트 열기
2. 상단 "Publish" 버튼 클릭
3. "Publish to Web" 선택
4. URL 확인 (예: `https://memoway.replit.app`)

**중요:** 이 URL을 메모해두세요. 카카오 OAuth 설정에 필요합니다.

---

## 🔐 2단계: 카카오 OAuth 설정

### 카카오 개발자 콘솔 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 → 앱 선택
3. **제품 설정 → 카카오 로그인 → Redirect URI 등록**

### Redirect URI 등록

Replit 퍼블리시 URL에 따라 다음 URI를 등록하세요:

```
https://your-app-name.replit.app/api/kakao/callback
```

**예시:**
- 앱 이름이 `memoway`인 경우: `https://memoway.replit.app/api/kakao/callback`
- 앱 이름이 `memo-way`인 경우: `https://memo-way.replit.app/api/kakao/callback`

### 여러 URI 등록 가능

개발용과 프로덕션용을 모두 등록할 수 있습니다:
```
https://memoway.replit.app/api/kakao/callback          # 프로덕션
http://localhost:5000/api/kakao/callback                # 로컬 개발용
```

---

## 🔑 3단계: 환경 변수 설정

Replit의 "Secrets" 탭에서 다음 환경 변수를 설정하세요:

### 필수 환경 변수

```bash
# 카카오 OAuth
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# 세션 (랜덤 문자열 생성)
SESSION_SECRET=your-random-secret-key-here

# 데이터베이스 (Replit이 자동으로 제공하거나 Neon 등 사용)
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### 선택적 환경 변수

```bash
# Replit Dev Domain (자동 감지되지만 명시적으로 설정 가능)
REPLIT_DEV_DOMAIN=your-app.replit.app

# Google OAuth (구글 로그인 사용 시)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### SESSION_SECRET 생성 방법

터미널에서 실행:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

또는 온라인 생성기 사용: https://randomkeygen.com/

---

## 📱 4단계: 안드로이드 앱 설정

### 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```bash
# Replit 퍼블리시 URL (실제 URL로 변경)
VITE_REPLIT_URL=https://your-app-name.replit.app
```

**중요:** 
- `https://` 포함
- 마지막에 `/` 없이
- 실제 Replit 퍼블리시 URL로 변경

### 빌드 및 동기화

```bash
# 웹 앱 빌드
npm run build

# Capacitor 동기화
npx cap sync
```

---

## ✅ 5단계: 배포 확인

### 웹 앱 확인

1. Replit 퍼블리시 URL 접속
2. 로그인 페이지 표시 확인
3. 카카오 로그인 버튼 클릭
4. 카카오 로그인 페이지로 이동하는지 확인

### 안드로이드 앱 확인

1. APK 빌드 및 설치
2. 앱 실행
3. 카카오 로그인 버튼 클릭
4. 웹뷰에서 카카오 로그인 진행
5. 로그인 완료 후 앱으로 자동 복귀 확인

---

## 🐛 문제 해결

### 카카오 로그인 오류: "redirect_uri_mismatch"

**원인:** 카카오 개발자 콘솔에 등록된 Redirect URI와 실제 URI가 일치하지 않음

**해결:**
1. Replit 퍼블리시 URL 확인
2. 카카오 개발자 콘솔에서 정확한 URI 등록
3. URI 형식: `https://your-app.replit.app/api/kakao/callback`
4. 프로토콜(`https`), 도메인, 경로가 정확히 일치해야 함

### 세션 오류

**원인:** `SESSION_SECRET`이 설정되지 않음

**해결:**
1. Replit Secrets에 `SESSION_SECRET` 추가
2. 랜덤 문자열 생성하여 설정
3. Replit 재시작

### 안드로이드 앱에서 서버 연결 실패

**원인:** `VITE_REPLIT_URL`이 설정되지 않았거나 잘못됨

**해결:**
1. `.env` 파일에 `VITE_REPLIT_URL` 설정 확인
2. 실제 Replit 퍼블리시 URL과 일치하는지 확인
3. `npm run build` 후 `npx cap sync` 실행

### WebSocket 연결 실패

**원인:** Replit URL이 올바르지 않거나 환경 변수 누락

**해결:**
1. `VITE_REPLIT_URL` 확인
2. Replit 앱이 실행 중인지 확인
3. 네트워크 연결 확인

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] Replit 앱 퍼블리시 완료
- [ ] 카카오 개발자 콘솔에 Redirect URI 등록
- [ ] Replit Secrets에 환경 변수 설정:
  - [ ] `KAKAO_CLIENT_ID`
  - [ ] `KAKAO_CLIENT_SECRET`
  - [ ] `SESSION_SECRET`
  - [ ] `DATABASE_URL`
- [ ] `.env` 파일에 `VITE_REPLIT_URL` 설정
- [ ] 웹 앱 빌드 및 테스트
- [ ] 안드로이드 앱 빌드 및 테스트

---

## 🔄 업데이트 배포

코드 변경 후 배포:

1. Replit에서 코드 수정
2. 자동으로 재배포됨 (또는 "Run" 버튼 클릭)
3. 안드로이드 앱의 경우:
   ```bash
   npm run build
   npx cap sync
   ```
4. 새 APK 빌드 및 설치

---

## 💡 팁

### 커스텀 도메인 사용

Replit Pro를 사용하면 커스텀 도메인을 연결할 수 있습니다:
1. Replit Settings → Domains
2. 커스텀 도메인 추가
3. DNS 설정 안내 따르기
4. 카카오 OAuth Redirect URI도 커스텀 도메인으로 변경

### 환경 변수 확인

Replit 터미널에서 확인:
```bash
echo $KAKAO_CLIENT_ID
echo $DATABASE_URL
```

### 로그 확인

Replit 콘솔에서 서버 로그 확인:
- 카카오 OAuth Redirect URI 로그 확인
- 에러 메시지 확인

---

## 📚 추가 자료

- [Replit 공식 문서](https://docs.replit.com)
- [카카오 OAuth 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [Capacitor 가이드](./CAPACITOR_GUIDE.md)

