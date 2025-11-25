# 카카오 로그인 ERR_CONNECTION_REFUSED 문제 해결 가이드

## 문제 진단

ERR_CONNECTION_REFUSED 에러는 카카오가 콜백을 시도할 때 서버에 연결할 수 없을 때 발생합니다.

## 필수 확인 사항

### 1. 환경 변수 설정 확인

`.env` 파일에 다음이 설정되어 있어야 합니다:

```env
# 카카오 OAuth 설정 (필수)
KAKAO_CLIENT_ID=df2f728fe87e139b768e5fa00da2cd42
KAKAO_CLIENT_SECRET=cYBp1pGPOAKPwex6AQbMf98n2mdNx0jx

# 로컬 개발 환경 설정
NODE_ENV=development
PORT=5000
HOST=localhost:5000
```

### 2. 서버 실행 상태 확인

서버가 포트 5000에서 실행 중인지 확인:
```bash
netstat -ano | findstr :5000 | findstr LISTENING
```

### 3. 카카오 개발자 콘솔 설정 확인

#### Redirect URI 확인
다음 URI가 정확히 등록되어 있어야 합니다:
- `http://localhost:5000/api/kakao/callback` ✅ (로컬 개발용)

#### 사이트 도메인 확인
다음 도메인이 등록되어 있어야 합니다:
- `http://localhost:5000` ✅

### 4. 서버 로그 확인

서버 시작 시 다음 로그가 출력되어야 합니다:
```
=== Kakao OAuth Configuration ===
KAKAO_CLIENT_ID: df2f728f...
KAKAO_CLIENT_SECRET: SET
✅ Kakao OAuth configured successfully
```

### 5. Health Check 엔드포인트

브라우저에서 다음 URL을 열어 설정 상태를 확인:
```
http://localhost:5000/api/kakao/health
```

예상 응답:
```json
{
  "configured": true,
  "hasClientId": true,
  "hasClientSecret": true,
  "isLocalDev": true,
  "expectedRedirectUri": "http://localhost:5000/api/kakao/callback",
  "nodeEnv": "development"
}
```

## 해결 단계

### Step 1: 환경 변수 확인 및 설정

1. 프로젝트 루트에 `.env` 파일이 있는지 확인
2. 다음 내용이 포함되어 있는지 확인:
   ```env
   KAKAO_CLIENT_ID=df2f728fe87e139b768e5fa00da2cd42
   KAKAO_CLIENT_SECRET=cYBp1pGPOAKPwex6AQbMf98n2mdNx0jx
   NODE_ENV=development
   PORT=5000
   ```

### Step 2: 서버 재시작

환경 변수를 수정한 후 반드시 서버를 재시작:
```bash
# 기존 프로세스 종료
taskkill /F /IM node.exe

# 서버 재시작
npm run dev
```

### Step 3: 카카오 개발자 콘솔 확인

1. [카카오 개발자 콘솔](https://developers.kakao.com) 접속
2. **제품 설정 > 카카오 로그인 > Redirect URI** 확인
   - `http://localhost:5000/api/kakao/callback`이 정확히 등록되어 있는지 확인
3. **플랫폼 설정 > Web 플랫폼** 확인
   - `http://localhost:5000`이 등록되어 있는지 확인

### Step 4: 로그인 테스트

1. 브라우저에서 `http://localhost:5000/api/kakao/login` 접속
2. 서버 콘솔에서 다음 로그 확인:
   ```
   Kakao OAuth Redirect URI: http://localhost:5000/api/kakao/callback
   ```
3. 카카오 로그인 완료 후 콜백 로그 확인:
   ```
   === Kakao OAuth Callback Received ===
   ```

## 일반적인 문제 및 해결책

### 문제 1: 환경 변수가 로드되지 않음
**증상**: 서버 시작 시 "Kakao OAuth credentials not configured" 경고
**해결**: 
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 정확한지 확인 (대소문자 구분)
- 서버 재시작

### 문제 2: Redirect URI 불일치
**증상**: "Failed to exchange authorization code" 에러
**해결**:
- 카카오 개발자 콘솔의 Redirect URI와 서버 로그의 URI가 정확히 일치하는지 확인
- 로컬 개발 환경에서는 반드시 `http://localhost:5000/api/kakao/callback` 사용

### 문제 3: 세션 문제
**증상**: "Invalid state parameter" 에러
**해결**:
- 브라우저 쿠키/세션 삭제 후 재시도
- SESSION_SECRET이 `.env`에 설정되어 있는지 확인

### 문제 4: 서버가 실행되지 않음
**증상**: ERR_CONNECTION_REFUSED
**해결**:
- 서버가 실행 중인지 확인: `netstat -ano | findstr :5000 | findstr LISTENING`
- 서버 재시작: `npm run dev`

## 디버깅 팁

1. **서버 콘솔 로그 확인**: 서버를 포그라운드로 실행하여 실시간 로그 확인
2. **Health Check 사용**: `/api/kakao/health` 엔드포인트로 설정 상태 확인
3. **브라우저 개발자 도구**: Network 탭에서 요청/응답 확인
4. **카카오 개발자 콘솔**: 로그인 이력 및 에러 확인

## 참고 정보

- REST API 키: `df2f728fe87e139b768e5fa00da2cd42`
- Client Secret: `cYBp1pGPOAKPwex6AQbMf98n2mdNx0jx`
- 패키지명: `com.memoway.app`
- 키 해시: `ay6itsMdega2x/3PIJla3IkTjoY=`





