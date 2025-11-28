# Replit 환경 변수 설정 가이드

## 🚨 현재 문제

로그에서 확인된 문제:
- ❌ `KAKAO_CLIENT_ID: NOT SET`
- ❌ `KAKAO_CLIENT_SECRET: NOT SET`
- ❌ `REPL_SLUG: workspace` (실제 도메인은 `memo-way`)

---

## ✅ 해결 방법: Replit Secrets 설정

### 1단계: Replit 프로젝트에서 Secrets 열기

1. **Replit 웹사이트**에서 프로젝트 열기
2. 왼쪽 사이드바에서 **Settings (톱니바퀴 아이콘)** 클릭
3. 왼쪽 메뉴에서 **"Secrets"** 또는 **"Environment Variables"** 선택

### 2단계: 필수 환경 변수 추가

다음 변수들을 추가하세요:

#### Kakao OAuth
- **Key**: `KAKAO_CLIENT_ID`
  - **Value**: Kakao Developer Console에서 복사한 Client ID
  - **예시**: `1234567890abcdef1234567890abcdef`

- **Key**: `KAKAO_CLIENT_SECRET`
  - **Value**: Kakao Developer Console에서 복사한 Client Secret
  - **예시**: `AbCdEf1234567890AbCdEf1234567890`

#### Replit 도메인 설정 (선택사항)
- **Key**: `REPL_SLUG`
  - **Value**: `memo-way`
  - **참고**: Replit이 자동으로 설정할 수도 있음

#### 기타 필수 변수들

다른 필수 환경 변수도 설정되어 있는지 확인:

- `DATABASE_URL`: PostgreSQL 연결 URL
- `SESSION_SECRET`: 세션 암호화 키 (랜덤 문자열)
- `GOOGLE_CLIENT_ID`: (Google 로그인 사용 시)
- `GOOGLE_CLIENT_SECRET`: (Google 로그인 사용 시)

---

## 🔍 Secrets 추가 방법

Replit Secrets 탭에서:

1. **"+ New secret"** 또는 **"Add variable"** 버튼 클릭
2. **Key** 입력란에 변수 이름 입력 (예: `KAKAO_CLIENT_ID`)
3. **Value** 입력란에 실제 값 입력
4. **"Add"** 또는 **"Save"** 클릭
5. 각 변수마다 반복

---

## 📝 Kakao Client ID/Secret 찾는 방법

1. [Kakao Developer Console](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → MemoWay 앱 선택
3. **제품 설정** → **카카오 로그인** → **REST API 키** 또는 **앱 키** 탭
4. **REST API 키** = Client ID
5. **Client Secret**: **제품 설정** → **카카오 로그인** → **보안** 탭에서 확인

---

## ⚠️ 중요 참고사항

### REPL_SLUG 자동 설정

Replit은 프로젝트 URL에 따라 자동으로 `REPL_SLUG`를 설정합니다:
- URL이 `replit.com/@acho1821/MemoWay`이면 → `REPL_SLUG`는 `MemoWay`
- 배포된 도메인이 `memo-way.replit.app`이면 → 실제 `REPL_SLUG`는 `memo-way`일 수 있습니다

**확인 방법**: 
- Replit 프로젝트에서 `Settings` → `General` → 프로젝트 URL 확인
- 또는 배포된 도메인: `https://memo-way.replit.app`

### 환경 변수 적용

환경 변수를 추가한 후:
1. **서버 재시작** 필요 (Replit이 자동으로 재시작할 수 있음)
2. 로그에서 다시 확인:
   ```
   KAKAO_CLIENT_ID: [값 표시됨]
   KAKAO_CLIENT_SECRET: [값 표시됨]
   ```

---

## 🧪 확인 체크리스트

환경 변수 추가 후:

- [ ] Replit Secrets에 모든 필수 변수 추가됨
- [ ] 서버 재시작됨
- [ ] 로그에서 `KAKAO_CLIENT_ID: NOT SET` 오류 사라짐
- [ ] 로그에서 `REPL_SLUG` 값 확인
- [ ] 배포된 앱에서 카카오 로그인 테스트

---

## 🔗 관련 문서

- `DOMAIN_UPDATE_CHECKLIST.md` - 도메인 변경 체크리스트
- `KAKAO_LOGIN_ANDROID_SETUP.md` - Kakao 로그인 설정 가이드

