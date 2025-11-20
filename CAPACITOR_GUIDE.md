# 📱 Capacitor APK 빌드 가이드

이 가이드는 MemoMap 웹 앱을 Android APK로 변환하는 방법을 설명합니다.

## 🎯 개요

Capacitor를 사용하여 현재 웹 앱을 네이티브 Android 앱으로 변환합니다. 기존 React 코드는 그대로 유지되며, 네이티브 앱 래퍼만 추가됩니다.

---

## 📋 사전 준비사항

### 1. 필수 소프트웨어 설치

#### **Node.js & npm** (이미 설치됨)
```bash
node --version  # v18 이상
npm --version   # v8 이상
```

#### **Android Studio**
1. [Android Studio 다운로드](https://developer.android.com/studio)
2. 설치 시 "Android SDK", "Android SDK Platform", "Android Virtual Device" 모두 선택
3. SDK Manager에서 최신 Android SDK 설치 (API Level 33 이상 권장)

#### **JDK (Java Development Kit)**
```bash
# macOS (Homebrew 사용)
brew install openjdk@17

# Windows
# https://adoptium.net/ 에서 JDK 17 다운로드

# Linux (Ubuntu/Debian)
sudo apt install openjdk-17-jdk
```

환경 변수 설정:
```bash
# macOS/Linux (~/.bashrc 또는 ~/.zshrc)
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools

# Windows (시스템 환경 변수)
JAVA_HOME=C:\Program Files\Java\jdk-17
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
```

---

## 🚀 1단계: 웹 앱 빌드

Replit 또는 로컬 환경에서 웹 앱을 먼저 빌드합니다.

```bash
# 웹 앱 빌드
npm run build

# 빌드 결과 확인
ls -la dist/public
```

빌드가 성공하면 `dist/public` 폴더에 HTML, CSS, JS 파일이 생성됩니다.

---

## 🔧 2단계: Android 플랫폼 추가

처음 한 번만 실행하면 됩니다.

```bash
# Android 플랫폼 추가
npx cap add android
```

이 명령은 `android/` 폴더를 생성하고 네이티브 Android 프로젝트를 초기화합니다.

**주의:** `android/` 폴더는 자동 생성되므로 Git에 커밋하지 않습니다 (.gitignore에 이미 추가됨).

---

## 🔄 3단계: 웹 자산 동기화

웹 앱을 수정할 때마다 실행해야 합니다.

```bash
# 1. 웹 앱 빌드
npm run build

# 2. Capacitor 동기화 (빌드 파일을 Android 프로젝트로 복사)
npx cap sync
```

또는 한 번에:
```bash
npm run build && npx cap sync
```

---

## 📲 4단계: Android Studio에서 APK 빌드

### Android Studio 열기

```bash
npx cap open android
```

또는 Android Studio에서 직접:
1. Android Studio 실행
2. **File → Open**
3. 프로젝트의 `android/` 폴더 선택

### Gradle 동기화 대기

Android Studio가 열리면 자동으로 Gradle 빌드를 시작합니다. 
- 우측 하단에 "Gradle Build Running..." 메시지 표시
- 첫 실행은 5-10분 소요될 수 있음 (의존성 다운로드)

### APK 빌드 방법

#### **방법 1: UI에서 빌드 (추천)**

1. 상단 메뉴: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. 빌드 완료 후 알림 창에서 **locate** 클릭
3. APK 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

#### **방법 2: 명령줄에서 빌드**

```bash
cd android
./gradlew assembleDebug  # macOS/Linux
gradlew.bat assembleDebug  # Windows
```

APK 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 5단계: APK 설치 및 테스트

### USB 디버깅 활성화 (Android 기기)

1. **설정 → 휴대전화 정보 → 빌드 번호** 7번 탭 (개발자 모드 활성화)
2. **설정 → 개발자 옵션 → USB 디버깅** 활성화

### 기기 연결 및 설치

```bash
# 연결된 기기 확인
adb devices

# APK 설치
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

또는 Android Studio에서:
1. 기기를 USB로 연결
2. 상단 툴바에서 연결된 기기 선택
3. **Run (▶️)** 버튼 클릭

---

## 🔐 6단계: 프로덕션 APK 빌드 (앱 스토어 배포용)

### Keystore 생성 (처음 한 번만)

```bash
cd android/app
keytool -genkey -v -keystore memomap-release.keystore -alias memomap -keyalg RSA -keysize 2048 -validity 10000
```

비밀번호와 정보 입력 후 `memomap-release.keystore` 파일 생성됨.

### Gradle 설정

`android/app/build.gradle` 파일 수정:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file('memomap-release.keystore')
            storePassword 'your-keystore-password'
            keyAlias 'memomap'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 프로덕션 APK 빌드

```bash
cd android
./gradlew assembleRelease
```

APK 위치: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🌐 환경 변수 설정

### Replit URL 설정

APK에서 백엔드 서버로 연결하려면 Replit 배포 URL을 설정해야 합니다.

1. `.env` 파일 생성 (프로젝트 루트):

```bash
VITE_REPLIT_URL=https://your-actual-repl-url.replit.dev
```

2. 웹 앱 재빌드:

```bash
npm run build
npx cap sync
```

**중요:** 실제 Replit 앱의 퍼블리시 URL로 교체하세요.

---

## 🗺️ 지도 API 키 설정

### Google Maps API

Android 앱에서 Google Maps를 사용하려면 추가 설정이 필요합니다.

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. API 및 서비스 → 사용자 인증 정보
3. 기존 API 키 수정 또는 새로 생성
4. **애플리케이션 제한사항 → Android 앱** 선택
5. 패키지 이름 추가: `com.memomap.app`
6. SHA-1 인증서 지문 추가:

```bash
# 디버그 키 지문 확인
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# 릴리즈 키 지문 확인
keytool -list -v -keystore android/app/memomap-release.keystore -alias memomap
```

### Kakao Maps API

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 내 애플리케이션 → 앱 선택
3. **플랫폼 → Android 플랫폼 등록**
   - 패키지 이름: `com.memomap.app`
   - 키 해시: SHA-1 지문을 Base64로 변환한 값

```bash
# SHA-1을 Base64로 변환
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
```

4. Android용 네이티브 앱 키 발급받아 `capacitor.config.ts`에 추가

---

## 🎨 앱 아이콘 및 스플래시 스크린

### 아이콘 생성

1. 1024x1024 PNG 이미지 준비
2. `resources/icon.png`로 저장
3. 자동 리사이징:

```bash
npm install -g cordova-res
cordova-res android --skip-config --copy
```

### 스플래시 스크린

1. 2732x2732 PNG 이미지 준비
2. `resources/splash.png`로 저장
3. 자동 리사이징:

```bash
cordova-res android --skip-config --copy
```

---

## 🐛 문제 해결

### "JAVA_HOME is not set"

```bash
export JAVA_HOME=/path/to/jdk-17
```

### "SDK location not found"

`android/local.properties` 파일 생성:

```properties
sdk.dir=/Users/YourName/Library/Android/sdk  # macOS
# sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk  # Windows
```

### "Gradle build failed"

```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### WebSocket 연결 실패

1. `.env` 파일에 `VITE_REPLIT_URL` 설정 확인
2. Replit 앱이 퍼블리시되어 있는지 확인
3. 앱 재빌드: `npm run build && npx cap sync`

---

## 📚 추가 자료

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Android Studio 가이드](https://developer.android.com/studio/intro)
- [Google Play Console](https://play.google.com/console) (앱 스토어 배포)

---

## ✅ 체크리스트

- [ ] Node.js, Android Studio, JDK 설치
- [ ] 환경 변수 설정 (JAVA_HOME, ANDROID_HOME)
- [ ] `npm run build` 성공
- [ ] `npx cap add android` 실행
- [ ] `npx cap sync` 실행
- [ ] Android Studio에서 Gradle 빌드 성공
- [ ] APK 빌드 성공
- [ ] `.env` 파일에 VITE_REPLIT_URL 설정
- [ ] Google Maps / Kakao Maps Android 키 설정
- [ ] 실제 기기에서 테스트

---

**문제가 발생하면 에러 메시지와 함께 질문해주세요!** 🚀
