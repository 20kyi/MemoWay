# Kakao Capacitor 플러그인 설정 변경사항 요약

## 📋 변경된 파일 목록

### 1. package.json
**변경 내용:**
- `@team-lepisode/capacitor-kakao-login` 플러그인 추가

**변경 전:**
```json
"@capacitor/local-notifications": "^7.0.3",
```

**변경 후:**
```json
"@capacitor/local-notifications": "^7.0.3",
"@team-lepisode/capacitor-kakao-login": "^7.0.0",
```

---

### 2. capacitor.config.ts
**변경 내용:**
- KakaoLogin 플러그인 설정 추가

**변경 전:**
```typescript
plugins: {
  Camera: { ... },
  Geolocation: { ... },
  LocalNotifications: { ... }
}
```

**변경 후:**
```typescript
plugins: {
  Camera: { ... },
  Geolocation: { ... },
  LocalNotifications: { ... },
  KakaoLogin: {
    nativeAppKey: "972181125f7cd0fb9dbd9442fdde314e",
  }
}
```

---

### 3. android/app/src/main/res/values/strings.xml
**변경 내용:**
- 카카오 네이티브 앱 키 추가

**변경 전:**
```xml
<string name="custom_url_scheme">com.memoway.app</string>
</resources>
```

**변경 후:**
```xml
<string name="custom_url_scheme">com.memoway.app</string>
<!-- 카카오 네이티브 앱 키 -->
<string name="kakao_native_app_key">972181125f7cd0fb9dbd9442fdde314e</string>
</resources>
```

---

### 4. client/src/pages/landing.tsx
**변경 내용:**
- 커스텀 플러그인 대신 @team-lepisode/capacitor-kakao-login 사용

**주요 변경:**
- `registerPlugin` 방식에서 공식 플러그인 import 방식으로 변경
- `KakaoLogin.initialize({ appKey: '...' })` 추가
- `KakaoLogin.login()` 사용

---

## ✅ 확인된 설정 (변경 불필요)

### android/app/src/main/AndroidManifest.xml
- ✅ 카카오 로그인 Activity 설정 완료
- ✅ Deep Link 설정 완료

### android/app/src/main/java/com/memoway/app/MainActivity.java
- ✅ Kakao SDK 초기화 코드 있음
- ✅ 플러그인은 Capacitor 7에서 자동 등록됨

### android/app/build.gradle
- ✅ 카카오 SDK 의존성 있음
- ✅ 카카오 Maven 저장소 설정 완료

### android/build.gradle
- ✅ 카카오 Maven 저장소 설정 완료

---

## 🚀 다음 단계

### 1. 플러그인 설치
```bash
npm install @team-lepisode/capacitor-kakao-login
```

### 2. Capacitor 동기화
```bash
npx cap sync android
```

### 3. Android Studio에서 빌드
```bash
npx cap open android
# Build → Clean Project → Rebuild Project
```

### 4. 앱 재설치
```bash
npm run android:install
```

---

## 📝 사용 예제

### 프런트엔드 코드 (이미 적용됨)
```typescript
import { KakaoLogin } from '@team-lepisode/capacitor-kakao-login';

// 초기화 (앱 시작 시 한 번)
await KakaoLogin.initialize({
  appKey: '972181125f7cd0fb9dbd9442fdde314e'
});

// 로그인
const result = await KakaoLogin.login();
// result: { accessToken, refreshToken, id, email, nickname, profileImage }

// 서버로 전달
await fetch('/api/kakao/android-login', {
  method: 'POST',
  body: JSON.stringify({
    accessToken: result.accessToken,
    kakaoId: result.id,
    email: result.email,
    nickname: result.nickname,
    profileImage: result.profileImage,
  })
});
```

---

## ⚠️ 주의사항

1. **기존 커스텀 플러그인**: `KakaoLoginPlugin.java`는 유지하되, 공식 플러그인을 우선 사용
2. **앱 재빌드 필수**: 플러그인 설치 후 반드시 앱을 다시 빌드해야 함
3. **카카오 개발자 콘솔**: 키 해시 등록 확인 필요

---

## 🔍 테스트 체크리스트

- [ ] `npm install` 실행 완료
- [ ] `npx cap sync android` 실행 완료
- [ ] Android Studio에서 빌드 성공
- [ ] 앱 설치 완료
- [ ] 카카오 로그인 버튼 클릭 시 플러그인 호출 확인
- [ ] 로그인 성공 후 서버 세션 생성 확인
