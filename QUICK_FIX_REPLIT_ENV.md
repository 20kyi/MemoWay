# 🚨 긴급: Replit 환경 변수 설정

## 문제
로그에서 확인된 오류:
- ❌ `KAKAO_CLIENT_ID: NOT SET`
- ❌ `KAKAO_CLIENT_SECRET: NOT SET`

## ✅ 해결: 3단계

### 1단계: Replit Secrets 열기
1. Replit 웹사이트에서 프로젝트 열기
2. 왼쪽 사이드바에서 **Settings (⚙️)** 클릭
3. 왼쪽 메뉴에서 **"Secrets"** 선택

### 2단계: 환경 변수 추가

**"+ New secret"** 버튼 클릭 후 다음 추가:

#### 필수 1: Kakao Client ID
- **Key**: `KAKAO_CLIENT_ID`
- **Value**: Kakao Developer Console에서 복사한 REST API 키

#### 필수 2: Kakao Client Secret  
- **Key**: `KAKAO_CLIENT_SECRET`
- **Value**: Kakao Developer Console → 제품 설정 → 카카오 로그인 → 보안 탭

### 3단계: 서버 재시작
환경 변수 추가 후 Replit이 자동으로 재시작하거나:
- **"Stop"** 버튼 클릭
- **"Run"** 버튼 클릭

---

## 📍 Kakao 인증 정보 찾는 방법

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → MemoWay 앱 선택
3. **제품 설정** → **카카오 로그인** → **REST API 키** 탭
   - **REST API 키** = `KAKAO_CLIENT_ID`
4. **제품 설정** → **카카오 로그인** → **보안** 탭
   - **Client Secret** = `KAKAO_CLIENT_SECRET`

---

## ✅ 확인

서버 재시작 후 로그에서 확인:
- `KAKAO_CLIENT_ID: [값이 보임]`
- `KAKAO_CLIENT_SECRET: SET`
- `✅ Kakao OAuth configured successfully`

---

## 💡 참고

다른 필수 환경 변수도 확인하세요:
- `DATABASE_URL`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID` (Google 로그인 사용 시)
- `GOOGLE_CLIENT_SECRET` (Google 로그인 사용 시)

