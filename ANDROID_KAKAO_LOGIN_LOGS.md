# 안드로이드 카카오 로그인 에러 로그 확인 가이드

## 로그 출력 위치

안드로이드 카카오 로그인 관련 로그는 다음 위치에서 확인할 수 있습니다:

### 1. 서버 측 로그 (Node.js)

서버 콘솔에서 `[ANDROID LOGIN]` 태그로 시작하는 로그를 확인하세요.

**주요 로그 태그:**
- `[ANDROID LOGIN] ========== Android Kakao login request received ==========`
- `[ANDROID LOGIN] Request headers:` - 요청 헤더 정보
- `[ANDROID LOGIN] Request body (sanitized):` - 요청 본문 정보 (민감 정보 제외)
- `[ANDROID LOGIN] Validating Kakao access token...` - 토큰 검증 시작
- `[ANDROID LOGIN] ✅ Kakao user info retrieved:` - 카카오 사용자 정보 조회 성공
- `[ANDROID LOGIN] ✅ User upserted:` - 사용자 정보 저장 성공
- `[ANDROID LOGIN] ✅ Android Kakao login successful` - 로그인 성공
- `[ANDROID LOGIN] ❌` - 에러 발생 시

**에러 로그 예시:**
```
[2024-01-01T12:00:00.000Z] [ANDROID LOGIN] ❌ ========== Android Kakao login error ==========
[ANDROID LOGIN] ❌ Error type: Error
[ANDROID LOGIN] ❌ Error message: Invalid access token
[ANDROID LOGIN] ❌ Error stack: ...
```

### 2. 클라이언트 측 로그 (React/WebView)

브라우저 개발자 도구 또는 Android Logcat에서 `[KAKAO LOGIN]` 태그로 시작하는 로그를 확인하세요.

**주요 로그 태그:**
- `[KAKAO LOGIN] ========== Starting Android Kakao login with SDK ==========`
- `[KAKAO LOGIN] Platform:` - 플랫폼 정보
- `[KAKAO LOGIN] Calling Kakao SDK login...` - SDK 로그인 호출
- `[KAKAO LOGIN] ✅ Kakao SDK login successful:` - SDK 로그인 성공
- `[KAKAO LOGIN] Sending login request to server...` - 서버 요청 전송
- `[KAKAO LOGIN] ✅ Server login successful:` - 서버 로그인 성공
- `[KAKAO LOGIN] ❌` - 에러 발생 시

### 3. 안드로이드 네이티브 로그 (Java/Kotlin)

Android Logcat에서 `MainActivity` 태그로 시작하는 로그를 확인하세요.

**주요 로그 태그:**
- `MainActivity: Kakao SDK initialized successfully`
- `MainActivity: Kakao SDK initialization error` - SDK 초기화 실패
- `MainActivity: Global cookie acceptance enabled`
- `MainActivity: Error configuring global cookie settings` - 쿠키 설정 실패

## 로그 확인 방법

### 📍 서버 로그 확인 (가장 중요!)

#### 1. 로컬 개발 환경
```bash
# 터미널/PowerShell에서 서버 실행
npm run dev

# 서버가 실행되면 터미널에 모든 로그가 실시간으로 출력됩니다
# [ANDROID LOGIN] 태그로 시작하는 로그를 찾으세요
```

**예시 출력:**
```
[2024-01-01T12:00:00.000Z] [ANDROID LOGIN] ========== Android Kakao login request received ==========
[ANDROID LOGIN] Request headers: { ... }
[ANDROID LOGIN] ✅ Kakao user info retrieved: { ... }
```

#### 2. 프로덕션 환경

**Railway:**
1. Railway 대시보드 접속 (https://railway.app)
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **"Logs"** 클릭
4. `[ANDROID LOGIN]` 검색

**Replit:**
1. Replit 에디터에서 하단 **"Console"** 탭 클릭
2. 또는 왼쪽 사이드바의 **"Logs"** 아이콘 클릭
3. `[ANDROID LOGIN]` 검색

### 📱 클라이언트 로그 확인

#### 1. 웹 브라우저 (개발 중 테스트용)
1. Chrome/Edge 브라우저에서 **F12** 누르기
2. **Console** 탭 클릭
3. 검색창에 `[KAKAO LOGIN]` 입력하여 필터링
4. 카카오 로그인 버튼 클릭 후 로그 확인

#### 2. Android 앱 (실제 디바이스/에뮬레이터)

**방법 A: Android Studio Logcat (권장)**
1. Android Studio 실행
2. 앱을 디바이스/에뮬레이터에 설치
3. 하단 **"Logcat"** 탭 클릭
4. 검색창에 `KAKAO LOGIN` 또는 `MainActivity` 입력
5. 앱에서 카카오 로그인 시도

**방법 B: ADB 명령어 (터미널)**
```bash
# PowerShell에서 실행
# 1. 디바이스 연결 확인
npm run android:devices

# 2. 로그 실시간 확인 (필터링)
C:/Users/82106/AppData/Local/Android/Sdk/platform-tools/adb.exe logcat | Select-String "KAKAO LOGIN"

# 또는 MainActivity 로그만 보기
C:/Users/82106/AppData/Local/Android/Sdk/platform-tools/adb.exe logcat | Select-String "MainActivity"
```

**방법 C: Chrome Remote Debugging (WebView 디버깅)**
1. Chrome 브라우저에서 `chrome://inspect` 접속
2. **"inspect"** 아래에 앱의 WebView가 표시됨
3. 클릭하여 개발자 도구 열기
4. **Console** 탭에서 `[KAKAO LOGIN]` 로그 확인

### 🔍 빠른 로그 검색 팁

**서버 로그에서 검색:**
- `[ANDROID LOGIN]` - 모든 안드로이드 로그인 관련 로그
- `❌` - 에러만 보기
- `✅` - 성공한 요청만 보기

**클라이언트 로그에서 검색:**
- `[KAKAO LOGIN]` - 모든 카카오 로그인 관련 로그
- `KAKAO LOGIN.*❌` - 에러만 보기 (정규식)

## 주요 에러 시나리오 및 로그

### 0. 플러그인이 구현되지 않음 (가장 흔한 에러)
```
[KAKAO LOGIN] ❌ Error message: "KakaoLogin" plugin is not implemented on android
```

**원인:** 플러그인 파일은 존재하지만 Capacitor에 등록되지 않음

**해결 방법:**
1. `npm run build` 실행
2. `npx cap sync android` 실행
3. Android Studio에서 **Clean Project** → **Rebuild Project**
4. 앱 재설치

자세한 내용은 `KAKAO_PLUGIN_FIX.md` 파일 참고

### 1. 플러그인을 찾을 수 없음
```
[KAKAO LOGIN] ❌ Plugin not found in Capacitor.Plugins
[KAKAO LOGIN] ❌ Available plugins: [...]
```
**해결 방법:** 앱을 다시 빌드하고 플러그인이 제대로 설치되었는지 확인

### 2. Access Token 누락
```
[ANDROID LOGIN] ❌ Missing required fields: { hasAccessToken: false, hasKakaoId: true }
```
**해결 방법:** Kakao SDK 로그인이 제대로 완료되었는지 확인

### 3. Invalid Access Token
```
[ANDROID LOGIN] ❌ Invalid access token - Status: 401
[ANDROID LOGIN] ❌ Invalid access token - Response: ...
```
**해결 방법:** 
- 카카오 개발자 콘솔에서 앱 키 확인
- 토큰이 만료되지 않았는지 확인
- 네이티브 앱 키와 REST API 키가 올바른지 확인

### 4. 세션 생성 실패
```
[ANDROID LOGIN] ❌ Session creation failed: ...
[ANDROID LOGIN] ❌ Session save failed: ...
```
**해결 방법:**
- 세션 스토어(PostgreSQL) 연결 확인
- 세션 쿠키 설정 확인 (SameSite=None, Secure=true)

### 5. 네트워크 에러
```
[KAKAO LOGIN] ❌ Server error: 0
[KAKAO LOGIN] ❌ Network error: Unable to connect to server
```
**해결 방법:**
- 서버 URL 설정 확인 (`getApiBaseUrl()`)
- 네트워크 연결 확인
- CORS 설정 확인

## 로그 레벨별 정보

### INFO 레벨 (정상 흐름)
- 요청 수신
- 각 단계별 성공 메시지
- 성능 정보 (응답 시간 등)

### WARN 레벨 (경고)
- 플러그인 등록 실패 후 대체 방법 시도
- 일부 필드 누락 (선택적 필드)

### ERROR 레벨 (에러)
- 필수 필드 누락
- 토큰 검증 실패
- 세션 생성/저장 실패
- 네트워크 에러

## 디버깅 팁

1. **타임스탬프 확인:** 모든 로그에 타임스탬프가 포함되어 있어 시간 순서 추적 가능
2. **요청/응답 시간:** 각 단계별 소요 시간이 로그에 포함되어 성능 문제 파악 가능
3. **상세한 에러 정보:** 개발 환경에서는 스택 트레이스도 포함되어 더 자세한 디버깅 가능
4. **민감 정보 보호:** Access Token은 일부만 표시되어 보안 유지

## 로그 파일 저장 (선택사항)

서버 로그를 파일로 저장하려면:

```bash
# PM2 사용 시
pm2 logs --lines 1000 > kakao-login-logs.txt

# 일반 실행 시
npm run dev 2>&1 | tee kakao-login-logs.txt
```

## 추가 도움말

문제가 지속되면 다음 정보를 포함하여 이슈를 제출하세요:
1. 서버 로그 (최근 100줄)
2. 클라이언트 로그 (브라우저 콘솔 또는 Logcat)
3. 에러 발생 시점의 타임스탬프
4. 사용 중인 플랫폼 (Android 버전, 앱 버전)
5. 네트워크 환경 (WiFi, 모바일 데이터 등)
