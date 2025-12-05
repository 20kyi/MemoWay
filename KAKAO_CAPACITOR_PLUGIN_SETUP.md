# Android Kakao 로그인 Capacitor 플러그인 설정 가이드

## 📦 설치된 플러그인
**@team-lepisode/capacitor-kakao-login** (v7.0.0)
- Capacitor 7 호환
- Android, iOS, Web 지원
- 최근 업데이트 (5개월 전)

## 🚀 설치 및 설정 단계

### 1단계: 플러그인 설치

```bash
npm install @team-lepisode/capacitor-kakao-login
```

### 2단계: Capacitor 동기화

```bash
npx cap sync android
```

이 명령어는:
- 플러그인을 Android 프로젝트에 추가
- 필요한 네이티브 코드 자동 생성
- Android 프로젝트 설정 업데이트

### 3단계: Android Studio에서 빌드

```bash
# Android Studio 열기
npx cap open android

# 또는 직접 빌드
npm run android:build
```

## ✅ 완료된 설정

### 1. package.json
```json
"@team-lepisode/capacitor-kakao-login": "^7.0.0"
```

### 2. capacitor.config.ts
```typescript
plugins: {
  KakaoLogin: {
    nativeAppKey: "972181125f7cd0fb9dbd9442fdde314e",
  }
}
```

### 3. strings.xml
```xml
<string name="kakao_native_app_key">972181125f7cd0fb9dbd9442fdde314e</string>
```

### 4. AndroidManifest.xml
- 카카오 로그인 Activity 설정 완료
- Deep Link 설정 완료

### 5. MainActivity.java
- Kakao SDK 초기화 코드 있음

### 6. build.gradle
- 카카오 SDK 의존성 있음 (`com.kakao.sdk:v2-all:2.20.0`)
- 카카오 Maven 저장소 설정 완료

## 📝 사용 예제

### 프런트엔드 코드 (landing.tsx)

```typescript
import { KakaoLogin } from '@team-lepisode/capacitor-kakao-login';

const handleKakaoLogin = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // 플러그인 초기화
      await KakaoLogin.initialize({
        nativeAppKey: '972181125f7cd0fb9dbd9442fdde314e'
      });
      
      // 카카오 로그인 실행
      const loginResult = await KakaoLogin.login();
      
      // 서버로 전달
      const response = await fetch(`${baseUrl}/api/kakao/android-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: loginResult.accessToken,
          kakaoId: loginResult.id,
          email: loginResult.email,
          nickname: loginResult.nickname,
          profileImage: loginResult.profileImage,
        }),
      });
      
      // 세션 생성 완료
      const result = await response.json();
      // ...
    } catch (error) {
      console.error('Kakao login failed:', error);
    }
  }
};
```

## 🔍 플러그인 API

### initialize(options)
플러그인 초기화
```typescript
await KakaoLogin.initialize({
  nativeAppKey: 'YOUR_NATIVE_APP_KEY'
});
```

### login()
카카오 로그인 실행
```typescript
const result = await KakaoLogin.login();
// result: { accessToken, refreshToken, id, email, nickname, profileImage }
```

### logout()
카카오 로그아웃
```typescript
await KakaoLogin.logout();
```

### unlink()
카카오 계정 연결 해제
```typescript
await KakaoLogin.unlink();
```

## ⚠️ 주의사항

1. **앱 재빌드 필수**: 플러그인 설치 후 반드시 앱을 다시 빌드해야 합니다.
2. **카카오 개발자 콘솔 설정**: 
   - 안드로이드 플랫폼 등록
   - 패키지명: `com.memoway.app`
   - 키 해시 등록
   - Redirect URI: `kakao972181125f7cd0fb9dbd9442fdde314e://oauth`
3. **네이티브 앱 키**: `strings.xml`과 `capacitor.config.ts`에 동일한 키가 설정되어 있는지 확인

## 🐛 문제 해결

### "plugin is not implemented" 에러
1. `npm install` 실행
2. `npx cap sync android` 실행
3. Android Studio에서 **Clean Project** → **Rebuild Project**
4. 앱 재설치

### 로그인 실패
1. 카카오 개발자 콘솔에서 키 해시 확인
2. AndroidManifest.xml의 카카오 스킴 확인
3. MainActivity.java의 SDK 초기화 확인

## 📚 참고 자료

- 플러그인 NPM: https://www.npmjs.com/package/@team-lepisode/capacitor-kakao-login
- 카카오 개발자 콘솔: https://developers.kakao.com
- Capacitor 문서: https://capacitorjs.com/docs
