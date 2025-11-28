# 카카오 개발자 콘솔 플랫폼 설정 가이드

## 현재 앱 정보
- **앱 ID**: `com.memoway.app`
- **앱 이름**: MemoWay
- **실행 도메인**: `https://localhost` (Android WebView)

## 필수 플랫폼 설정

### 1. Web 플랫폼 설정 (필수)
카카오 지도 JavaScript SDK를 사용하기 위해 **반드시** Web 플랫폼을 등록해야 합니다.

**설정 방법:**
1. https://developers.kakao.com 접속
2. 내 애플리케이션 선택
3. **플랫폼 설정** 메뉴 클릭
4. **Web 플랫폼** 추가:
   - **사이트 도메인**: `https://localhost`
   - 저장

**중요:** 
- `https://localhost` (프로토콜 포함)로 정확히 입력
- `localhost`만 입력하면 안 됨
- `http://localhost`도 별도로 추가 가능 (필요 시)

### 2. Android 플랫폼 설정 (선택사항)
네이티브 카카오 SDK를 사용하지 않으므로 필수는 아니지만, OAuth 등 다른 기능을 위해 등록하는 것을 권장합니다.

**설정 방법:**
1. **플랫폼 설정** 메뉴에서
2. **Android 플랫폼** 추가:
   - **패키지명**: `com.memoway.app`
   - **키 해시**: (필요 시) 개발용 키 해시 등록
   - 저장

### 3. JavaScript 키 확인
1. **앱 키** 메뉴로 이동
2. **JavaScript 키** 확인:
   - 현재 사용 중인 키: `7963d02942...` (32자)
   - JavaScript 키가 활성화되어 있는지 확인
   - **Native 앱 키가 아닌 JavaScript 키를 사용해야 함**

## 현재 문제 진단

로그에서 확인된 사항:
- ✅ API 키 로드 성공: `7963d02942...` (32자)
- ✅ 스크립트 URL 정상 생성
- ❌ 스크립트 로드 실패: `script.onerror` 발생

**가장 가능성 높은 원인:**
- `https://localhost` 도메인이 Web 플랫폼에 등록되지 않음

## 설정 확인 체크리스트

현재 플랫폼 설정에서 다음을 확인하세요:

- [ ] Web 플랫폼에 `https://localhost` 등록됨
- [ ] JavaScript 키 활성화됨
- [ ] JavaScript 키가 32자 이상 (현재: 32자 ✅)
- [ ] Android 플랫폼에 `com.memoway.app` 등록됨 (선택)

## 설정 후 확인 방법

1. 카카오 개발자 콘솔에서 설정 저장
2. 안드로이드 앱 완전 종료 후 재시작
3. Logcat에서 다음 로그 확인:
   - `[Kakao Maps] Script loaded, initializing...` ✅
   - `[Kakao Maps] SDK loaded successfully` ✅

## 추가 문제 해결

만약 `https://localhost`를 등록할 수 없다면:

1. **대안 1**: 실제 도메인 사용
   - Replit 프로덕션 URL: `https://memo-way.replit.app`
   - Web 플랫폼에 이 도메인 등록
   - `capacitor.config.ts`에서 `server.url` 설정

2. **대안 2**: 개발용 도메인 사용
   - 로컬 개발 서버 도메인 등록
   - 예: `http://192.168.x.x:5000` (로컬 네트워크 IP)

## 참고

- 카카오 지도 JavaScript SDK는 **반드시** Web 플랫폼에 도메인이 등록되어야 작동합니다
- Android WebView는 `https://localhost`를 사용하므로 이 도메인을 등록해야 합니다
- Native 앱 키는 JavaScript SDK에서 사용할 수 없습니다

