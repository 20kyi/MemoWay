# OAuth 인증 설정 가이드

구글과 카카오 로그인을 사용하기 위해 필요한 환경 변수 설정 방법입니다.

## 1. 환경 변수 파일 생성

프로젝트 루트에 `.env` 파일을 생성하고 아래 내용을 추가하세요:

```env
# 서버 포트 설정 (기본값: 5000)
PORT=5000

# 데이터베이스 연결 URL
DATABASE_URL=your_database_url_here

# 세션 시크릿 (랜덤 문자열 생성 권장)
SESSION_SECRET=your_session_secret_here

# 카카오 OAuth 설정
KAKAO_CLIENT_ID=your_kakao_client_id_here
KAKAO_CLIENT_SECRET=your_kakao_client_secret_here

# 구글 OAuth 설정
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# 로컬 개발 환경 설정
NODE_ENV=development
HOST=localhost:5000
```

## 2. 카카오 OAuth 설정

### 2.1 카카오 개발자 콘솔 접속
1. [카카오 개발자 콘솔](https://developers.kakao.com)에 접속
2. 내 애플리케이션 > 애플리케이션 추가하기

### 2.2 플랫폼 설정
1. **플랫폼 설정** 메뉴로 이동
2. **Web 플랫폼 등록** 클릭
3. 사이트 도메인 등록:
   - 로컬 개발: `http://localhost:5000`
   - 프로덕션: 실제 도메인

### 2.3 Redirect URI 설정
1. **제품 설정 > 카카오 로그인** 메뉴로 이동
2. **Redirect URI** 등록:
   - 로컬 개발: `http://localhost:5000/api/kakao/callback`
   - 프로덕션: `https://your-domain.com/api/kakao/callback`

### 2.4 Client ID와 Secret 발급
1. **제품 설정 > 카카오 로그인 > 활성화** 설정
2. **앱 키** 메뉴에서 **REST API 키** 확인 (이것이 CLIENT_ID)
3. **제품 설정 > 카카오 로그인 > 보안** 메뉴에서 **Client Secret** 생성

### 2.5 환경 변수에 추가
```env
KAKAO_CLIENT_ID=your_rest_api_key_here
KAKAO_CLIENT_SECRET=your_client_secret_here
```

## 3. 구글 OAuth 설정

### 3.1 Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com)에 접속
2. 프로젝트 선택 또는 새 프로젝트 생성

### 3.2 OAuth 동의 화면 설정
1. **API 및 서비스 > OAuth 동의 화면** 메뉴로 이동
2. 사용자 유형 선택 (외부 또는 내부)
3. 앱 정보 입력:
   - 앱 이름
   - 사용자 지원 이메일
   - 개발자 연락처 정보
4. 범위(Scopes) 추가:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. 테스트 사용자 추가 (테스트 모드인 경우)

### 3.3 OAuth 2.0 클라이언트 ID 생성
1. **API 및 서비스 > 사용자 인증 정보** 메뉴로 이동
2. **+ 사용자 인증 정보 만들기 > OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름 입력
5. 승인된 리디렉션 URI 추가:
   - 로컬 개발: `http://localhost:5000/api/google/callback`
   - 프로덕션: `https://your-domain.com/api/google/callback`
6. **만들기** 클릭

### 3.4 Client ID와 Secret 확인
1. 생성된 클라이언트 ID의 **편집** 클릭
2. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

### 3.5 환경 변수에 추가
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## 4. 세션 시크릿 생성

세션 시크릿은 랜덤 문자열을 사용하세요. Node.js로 생성할 수 있습니다:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

생성된 값을 `.env` 파일의 `SESSION_SECRET`에 추가하세요.

## 5. 서버 재시작

환경 변수를 설정한 후 서버를 재시작하세요:

```bash
npm run dev
```

## 6. 확인

서버가 정상적으로 시작되면:
- 카카오 로그인: `http://localhost:5000/api/kakao/login`
- 구글 로그인: `http://localhost:5000/api/google/login`

각 엔드포인트로 접속하여 로그인이 정상적으로 작동하는지 확인하세요.

## 주의사항

1. **`.env` 파일은 절대 Git에 커밋하지 마세요!** (이미 `.gitignore`에 포함되어 있을 것입니다)
2. 로컬 개발과 프로덕션 환경의 Redirect URI가 다르므로 각각 등록해야 합니다
3. 카카오의 경우 Client Secret을 생성한 후 약간의 시간이 걸릴 수 있습니다
4. 구글의 경우 테스트 모드에서는 등록된 테스트 사용자만 로그인할 수 있습니다

