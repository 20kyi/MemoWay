# 🔄 앱 재빌드 가이드

## 문제
- ✅ `.env` 파일에 `VITE_REPLIT_URL=https://memo-way.replit.app` 설정됨
- ❌ 앱이 여전히 `https://memoway.replit.app` 사용 중 (이전 빌드)

## 해결: 앱 재빌드

환경 변수는 **빌드 시점**에 앱 번들에 포함되므로, 새로운 도메인을 반영하려면 앱을 다시 빌드해야 합니다.

---

## 🔨 재빌드 단계

### 1단계: 웹 앱 빌드
```bash
npm run build
```
이 명령어는:
- `.env` 파일에서 `VITE_REPLIT_URL` 읽음
- `vite.config.ts`를 통해 환경 변수를 번들에 포함
- `dist/public` 폴더에 빌드된 파일 생성

### 2단계: Capacitor 동기화
```bash
npx cap sync android
```
이 명령어는:
- `dist/public`의 파일을 Android 프로젝트로 복사
- Android 리소스 업데이트

### 3단계: Android Studio에서 APK 빌드
```bash
npx cap open android
```
또는 Android Studio에서:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. 빌드 완료 후 `android/app/build/outputs/apk/debug/app-debug.apk` 생성됨

### 4단계: 새 APK 설치
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
또는 USB 연결 후 Android Studio에서 "Run" 버튼

---

## ✅ 확인

새 APK 설치 후 로그캣에서 확인:
```
getApiBaseUrl - resolved base URL: https://memo-way.replit.app
```
(옛 도메인 `memoway`가 아닌 새 도메인 `memo-way`가 표시되어야 함)

---

## 🚀 빠른 재빌드 명령어

한 번에 실행:
```bash
npm run build && npx cap sync android
```

그 다음 Android Studio에서 APK 빌드 및 설치.

