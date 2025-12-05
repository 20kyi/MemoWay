# KakaoLogin 플러그인 "not implemented" 에러 해결 가이드

## 🔴 에러 메시지
```
[KAKAO LOGIN] ❌ Error message: "KakaoLogin" plugin is not implemented on android
```

## 원인
KakaoLoginPlugin.java 파일은 존재하지만, Capacitor가 플러그인을 인식하지 못하고 있습니다. 이는 보통 다음 이유 때문입니다:
1. 앱을 다시 빌드하지 않음
2. Capacitor 동기화가 완료되지 않음
3. 플러그인이 빌드에 포함되지 않음

## ✅ 해결 방법

### 1단계: 웹 앱 빌드
```bash
npm run build
```

### 2단계: Capacitor 동기화
```bash
npx cap sync android
```

이 명령어는:
- 웹 빌드 파일을 Android 프로젝트로 복사
- 플러그인을 Capacitor에 등록
- Android 프로젝트 설정 업데이트

### 3단계: Android Studio에서 Clean Build

**방법 A: Android Studio GUI**
1. Android Studio에서 프로젝트 열기 (`npx cap open android`)
2. 메뉴: **Build** → **Clean Project**
3. 메뉴: **Build** → **Rebuild Project**

**방법 B: 명령어**
```bash
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

### 4단계: 앱 재설치
```bash
# 기존 앱 제거 후 재설치
npm run android:install
```

또는 Android Studio에서:
1. **Run** → **Run 'app'** (또는 Shift+F10)

## 🔍 확인 사항

### 1. 플러그인 파일 위치 확인
다음 파일이 존재하는지 확인:
```
android/app/src/main/java/com/memoway/app/KakaoLoginPlugin.java
```

### 2. 플러그인 어노테이션 확인
`KakaoLoginPlugin.java` 파일에 다음 어노테이션이 있어야 합니다:
```java
@CapacitorPlugin(name = "KakaoLogin")
public class KakaoLoginPlugin extends Plugin {
    // ...
}
```

### 3. 빌드 로그 확인
Android Studio의 **Build** 탭에서 에러가 없는지 확인:
- 플러그인 컴파일 에러
- 의존성 다운로드 에러
- 카카오 SDK 관련 에러

### 4. Logcat에서 플러그인 등록 확인
앱 실행 후 Logcat에서 다음 로그 확인:
```
Capacitor: Found plugin: KakaoLogin
```

## 🚨 추가 문제 해결

### 문제 1: "Capacitor plugin already registered" 경고
이것은 정상입니다. 플러그인이 이미 등록되어 있다는 의미입니다.

### 문제 2: 여전히 "not implemented" 에러
다음을 시도하세요:

1. **Android Studio에서 프로젝트 동기화**
   - 메뉴: **File** → **Sync Project with Gradle Files**

2. **캐시 삭제 후 재빌드**
   ```bash
   cd android
   .\gradlew.bat clean
   .\gradlew.bat --stop
   .\gradlew.bat assembleDebug
   ```

3. **앱 완전 삭제 후 재설치**
   - 디바이스/에뮬레이터에서 앱 삭제
   - Android Studio에서 다시 설치

### 문제 3: 카카오 SDK 관련 에러
`build.gradle`에 카카오 SDK가 제대로 추가되어 있는지 확인:
```gradle
dependencies {
    // 카카오 SDK
    implementation 'com.kakao.sdk:v2-all:2.20.0'
}
```

그리고 프로젝트 레벨 `build.gradle`에 Maven 저장소가 있는지 확인:
```gradle
allprojects {
    repositories {
        mavenCentral()
        maven { url 'https://devrepo.kakao.com/nexus/content/groups/public/' }
    }
}
```

## 📝 체크리스트

다음 단계를 순서대로 실행하세요:

- [ ] `npm run build` 실행
- [ ] `npx cap sync android` 실행
- [ ] Android Studio에서 **Clean Project**
- [ ] Android Studio에서 **Rebuild Project**
- [ ] 앱 재설치
- [ ] 앱 실행 후 카카오 로그인 버튼 클릭
- [ ] Logcat에서 플러그인 등록 확인
- [ ] 에러가 해결되었는지 확인

## 💡 참고

- Capacitor 7에서는 `@CapacitorPlugin` 어노테이션이 있는 플러그인이 자동으로 등록됩니다
- 플러그인 코드를 수정한 후에는 반드시 앱을 다시 빌드해야 합니다
- `npx cap sync`는 웹 빌드 파일을 복사하지만, 네이티브 플러그인 코드 변경사항은 Android Studio에서 빌드해야 반영됩니다
