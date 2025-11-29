# 안드로이드 카카오 로그인 설정 가이드

## ✅ 현재 완료된 설정

1. ✅ **AndroidManifest.xml**: 카카오 로그인 Activity 설정 완료
2. ✅ **build.gradle**: 카카오 SDK 의존성 추가 완료 (`com.kakao.sdk:v2-all:2.20.0`)
3. ✅ **KakaoLoginPlugin.java**: 네이티브 카카오 로그인 플러그인 구현 완료
4. ✅ **MainActivity.java**: 카카오 SDK 초기화 추가 완료
5. ✅ **프론트엔드**: 카카오 로그인 버튼 및 핸들러 구현 완료

## 🔑 카카오 개발자 콘솔 설정 (필수!)

안드로이드에서 카카오 로그인을 사용하려면 **반드시** 카카오 개발자 콘솔에서 안드로이드 플랫폼을 등록해야 합니다.

### 1단계: 카카오 개발자 콘솔 접속

1. [카카오 개발자 콘솔](https://developers.kakao.com) 접속
2. 로그인
3. **내 애플리케이션** 클릭
4. 해당 앱 선택 (또는 새 앱 생성)

### 2단계: 안드로이드 플랫폼 등록

1. 왼쪽 메뉴에서 **플랫폼 설정** 클릭
2. **Android 플랫폼 등록** 버튼 클릭 (또는 기존 Android 플랫폼 수정)

### 3단계: 패키지명 및 키 해시 등록

다음 정보를 입력해야 합니다:

#### 패키지명 (Package Name)
```
com.memoway.app
```

#### 키 해시 (Key Hash)

안드로이드 앱 서명에 사용된 키스토어의 해시값을 등록해야 합니다.

##### 디버그 키 해시 확인 방법

**Windows (PowerShell):**
```powershell
# Java 키스토어 경로 확인
$keytool = "C:\Program Files\Java\jdk-*\bin\keytool.exe"
$keytool = (Get-ChildItem $keytool | Select-Object -First 1).FullName

# 디버그 키스토어 해시 확인
& $keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | Select-String "SHA256"
```

**또는 간단한 방법:**
```powershell
# convert-keyhash.ps1 스크립트 사용 (프로젝트에 있음)
.\convert-keyhash.ps1
```

**macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

##### 릴리즈 키 해시 확인 방법

릴리즈 빌드를 배포할 때는 릴리즈 키스토어의 해시도 등록해야 합니다:

```bash
keytool -list -v -keystore [릴리즈키스토어경로] -alias [키별칭] | grep SHA256
```

### 4단계: 카카오 로그인 활성화

1. 왼쪽 메뉴에서 **제품 설정** > **카카오 로그인** 클릭
2. **활성화 설정**에서 **ON** 선택
3. **Redirect URI** 설정:
   - `kakao972181125f7cd0fb9dbd9442fdde314e://oauth`
   - (스킴은 네이티브 앱 키를 사용: `kakao{네이티브앱키}://oauth`)

### 5단계: 동의 항목 설정

1. 왼쪽 메뉴에서 **제품 설정** > **카카오 로그인** > **동의항목** 클릭
2. 필요한 동의 항목 활성화:
   - **필수 동의**: 닉네임, 프로필 사진
   - **선택 동의**: 카카오계정(이메일) - 이메일 로그인을 위해 필요

## 🔍 확인 사항

### 앱 키 확인

카카오 개발자 콘솔에서:
1. **앱 키** 메뉴 클릭
2. **네이티브 앱 키** 확인
3. 값이 `972181125f7cd0fb9cd0fb9dbd9442fdde314e`와 일치하는지 확인

### AndroidManifest.xml 확인

다음 설정이 올바른지 확인:

```xml
<activity
    android:name="com.kakao.sdk.auth.AuthCodeHandlerActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="kakao972181125f7cd0fb9dbd9442fdde314e" android:host="oauth" />
    </intent-filter>
</activity>
```

## 🚀 테스트 방법

### 1. 앱 빌드 및 설치

```bash
# Android Studio에서 빌드하거나
npm run build
npx cap sync android
npx cap open android
```

### 2. 로그인 테스트

1. 앱 실행
2. 랜딩 페이지에서 **"카카오로 로그인"** 버튼 클릭
3. 카카오톡 또는 카카오계정 로그인 화면이 표시되어야 함
4. 로그인 성공 시 앱으로 자동 복귀

### 3. 로그 확인

Android Studio의 Logcat에서 다음 로그를 확인:

```
MainActivity: Kakao SDK initialized successfully
```

## ⚠️ 문제 해결

### 문제 1: "카카오 로그인 실패" 오류

**원인**: 키 해시가 등록되지 않았거나 잘못됨

**해결**:
1. 키 해시를 다시 확인하고 정확히 입력했는지 확인
2. 디버그 빌드는 디버그 키 해시, 릴리즈 빌드는 릴리즈 키 해시 사용
3. 키 해시 등록 후 몇 분 대기 (적용 시간 필요)

### 문제 2: "앱 키가 올바르지 않습니다" 오류

**원인**: MainActivity.java의 KAKAO_NATIVE_APP_KEY가 잘못됨

**해결**:
1. 카카오 개발자 콘솔에서 네이티브 앱 키 확인
2. `MainActivity.java`의 `KAKAO_NATIVE_APP_KEY` 값 업데이트

### 문제 3: 카카오톡 로그인 화면이 나타나지 않음

**원인**: Redirect URI가 잘못 설정됨

**해결**:
1. 카카오 개발자 콘솔 > 제품 설정 > 카카오 로그인 > Redirect URI 확인
2. `kakao{네이티브앱키}://oauth` 형식이 올바른지 확인
3. AndroidManifest.xml의 intent-filter 스킴과 일치하는지 확인

### 문제 4: SDK 초기화 오류

**원인**: 카카오 SDK 의존성 문제

**해결**:
1. `android/build.gradle`에 카카오 Maven 저장소가 추가되어 있는지 확인:
   ```gradle
   maven { url 'https://devrepo.kakao.com/nexus/content/groups/public/' }
   ```
2. 프로젝트 동기화 (Sync Project with Gradle Files)
3. 앱 재빌드

## 📝 참고 사항

### 네이티브 로그인 vs 웹 로그인

현재 구현:
- **웹**: 서버 OAuth 플로우 사용 (`/api/kakao/login`)
- **안드로이드**: 네이티브 카카오 SDK 사용 가능 (KakaoLoginPlugin)

프론트엔드에서 안드로이드 네이티브 로그인을 사용하려면:

```typescript
import { KakaoLogin } from '@capacitor-community/kakao-login';

// 안드로이드에서만 네이티브 로그인 사용
if (Capacitor.getPlatform() === 'android') {
  const result = await KakaoLogin.login();
  // result에 accessToken, email, nickname 등 포함
}
```

현재는 서버 OAuth 플로우를 사용하므로, 안드로이드에서도 웹뷰를 통해 카카오 로그인 페이지로 이동합니다.

### 보안 고려사항

- 네이티브 앱 키는 안드로이드 앱에 하드코딩되어 있지만, 이는 일반적인 방법입니다
- 프로덕션 배포 시 ProGuard/R8 난독화를 활성화하는 것을 권장합니다
- 키스토어 파일은 절대 공개 저장소에 커밋하지 마세요

## ✅ 체크리스트

안드로이드 카카오 로그인 설정 완료 체크리스트:

- [ ] 카카오 개발자 콘솔에서 안드로이드 플랫폼 등록
- [ ] 패키지명 `com.memoway.app` 등록
- [ ] 디버그 키 해시 등록
- [ ] (선택) 릴리즈 키 해시 등록
- [ ] Redirect URI `kakao972181125f7cd0fb9dbd9442fdde314e://oauth` 등록
- [ ] 카카오 로그인 제품 활성화
- [ ] 동의 항목 설정 (닉네임, 프로필 사진, 이메일)
- [ ] 앱 빌드 및 테스트
- [ ] 로그인 플로우 정상 작동 확인




