# Kakao Capacitor 플러그인 설치 명령어

## 📦 설치 순서

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
# 방법 1: Android Studio 열기
npx cap open android
# 그 다음 Android Studio에서 Build → Clean Project → Rebuild Project

# 방법 2: 명령어로 빌드
npm run android:build
```

### 4. 앱 재설치
```bash
npm run android:install
```

## ✅ 확인 사항

설치 후 다음을 확인하세요:

1. **package.json**에 플러그인이 추가되었는지:
   ```json
   "@team-lepisode/capacitor-kakao-login": "^7.0.0"
   ```

2. **node_modules**에 플러그인이 설치되었는지:
   ```bash
   ls node_modules/@team-lepisode/capacitor-kakao-login
   ```

3. **Android 프로젝트**에 플러그인이 동기화되었는지:
   - `android/app/src/main/java/` 폴더에 플러그인 관련 파일이 있는지 확인
   - Android Studio에서 프로젝트를 열었을 때 에러가 없는지 확인

## 🔧 문제 해결

### 플러그인이 설치되지 않는 경우
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
npm install @team-lepisode/capacitor-kakao-login
npx cap sync android
```

### 동기화 에러가 발생하는 경우
```bash
# Android 프로젝트 정리 후 재동기화
cd android
./gradlew clean
cd ..
npx cap sync android
```

### 빌드 에러가 발생하는 경우
1. Android Studio에서 **File → Invalidate Caches / Restart**
2. **Build → Clean Project**
3. **Build → Rebuild Project**
