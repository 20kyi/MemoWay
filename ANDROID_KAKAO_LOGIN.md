# 안드로이드 카카오 로그인 구현 가이드

안드로이드 앱에서 카카오 로그인을 구현하는 방법을 안내합니다.

## 방법 1: 네이티브 카카오 SDK 사용 (권장)

네이티브 카카오 SDK를 사용하면 더 나은 사용자 경험을 제공할 수 있습니다.

### 1. 카카오 개발자 콘솔 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com)에 접속
2. 내 애플리케이션 > 앱 선택
3. **플랫폼 설정** 메뉴로 이동
4. **Android 플랫폼 등록** 클릭
5. 패키지 이름 입력: `com.memomap.app`
6. 키 해시 등록:
   ```bash
   # 디버그 키 해시 확인 (Windows)
   keytool -exportcert -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore -storepass android -keypass android | openssl sha1 -binary | openssl base64
   
   # 릴리즈 키 해시 확인 (릴리즈 키스토어가 있는 경우)
   keytool -exportcert -alias memomap -keystore android/app/memomap-release.keystore | openssl sha1 -binary | openssl base64
   ```
7. **네이티브 앱 키** 발급받기
8. **제품 설정 > 카카오 로그인** 메뉴에서:
   - Redirect URI 등록: `kakao{네이티브앱키}://oauth` (예: `kakao1234567890://oauth`)
   - 동의 항목 설정 (이메일, 프로필 등)

### 2. Gradle 의존성 추가

`android/app/build.gradle` 파일에 카카오 SDK 의존성을 추가합니다:

```gradle
dependencies {
    // ... 기존 의존성들 ...
    
    // 카카오 SDK
    implementation "com.kakao.sdk:v2-all:2.20.0" // 최신 버전 확인 필요
}
```

### 3. AndroidManifest.xml 설정

`android/app/src/main/AndroidManifest.xml` 파일에 카카오 로그인을 위한 설정을 추가합니다:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <!-- 카카오 로그인을 위한 Activity 추가 -->
        <activity
            android:name="com.kakao.sdk.auth.AuthCodeHandlerActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="kakao{네이티브앱키}" android:host="oauth" />
            </intent-filter>
        </activity>

        <!-- 기존 Activity들 ... -->
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <!-- ... 나머지 설정 ... -->
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

### 4. strings.xml에 네이티브 앱 키 추가

`android/app/src/main/res/values/strings.xml` 파일을 생성하거나 수정합니다:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">MemoMap</string>
    <string name="kakao_native_app_key">YOUR_NATIVE_APP_KEY</string>
</resources>
```

### 5. MainActivity 수정

`android/app/src/main/java/com/memomap/app/MainActivity.java` 파일을 수정합니다:

```java
package com.memomap.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.kakao.sdk.common.KakaoSdk;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 카카오 SDK 초기화
        String nativeAppKey = getString(R.string.kakao_native_app_key);
        KakaoSdk.init(this, nativeAppKey);
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}
```

### 6. Capacitor 플러그인 생성 (선택사항)

네이티브 카카오 로그인을 JavaScript에서 호출할 수 있도록 Capacitor 플러그인을 만들 수 있습니다.

`android/app/src/main/java/com/memomap/app/KakaoLoginPlugin.java` 파일 생성:

```java
package com.memomap.app;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.kakao.sdk.auth.model.OAuthToken;
import com.kakao.sdk.user.UserApiClient;
import com.kakao.sdk.user.model.User;

@CapacitorPlugin(name = "KakaoLogin")
public class KakaoLoginPlugin extends Plugin {
    
    @PluginMethod
    public void login(PluginCall call) {
        Activity activity = getActivity();
        
        // 카카오톡이 설치되어 있는지 확인
        if (UserApiClient.getInstance().isKakaoTalkLoginAvailable(activity)) {
            // 카카오톡 로그인
            UserApiClient.getInstance().loginWithKakaoTalk(activity, (token, error) -> {
                if (error != null) {
                    call.reject("카카오톡 로그인 실패", error);
                } else if (token != null) {
                    // 사용자 정보 가져오기
                    getUserInfo(call, token);
                }
            });
        } else {
            // 카카오계정으로 로그인
            UserApiClient.getInstance().loginWithKakaoAccount(activity, (token, error) -> {
                if (error != null) {
                    call.reject("카카오계정 로그인 실패", error);
                } else if (token != null) {
                    getUserInfo(call, token);
                }
            });
        }
    }
    
    private void getUserInfo(PluginCall call, OAuthToken token) {
        UserApiClient.getInstance().me((user, error) -> {
            if (error != null) {
                call.reject("사용자 정보 조회 실패", error);
            } else if (user != null) {
                JSObject result = new JSObject();
                result.put("accessToken", token.getAccessToken());
                result.put("refreshToken", token.getRefreshToken());
                result.put("id", user.getId());
                result.put("email", user.getKakaoAccount().getEmail());
                result.put("nickname", user.getKakaoAccount().getProfile().getNickname());
                result.put("profileImage", user.getKakaoAccount().getProfile().getProfileImageUrl());
                call.resolve(result);
            }
        });
    }
    
    @PluginMethod
    public void logout(PluginCall call) {
        UserApiClient.getInstance().logout((error) -> {
            if (error != null) {
                call.reject("로그아웃 실패", error);
            } else {
                call.resolve();
            }
        });
    }
}
```

### 7. JavaScript에서 사용

클라이언트 코드에서 카카오 로그인을 사용합니다:

```typescript
import { Capacitor } from '@capacitor/core';
import { Plugins } from '@capacitor/core';

// 플러그인 등록 (타입 정의 필요)
declare const KakaoLogin: {
  login: () => Promise<{
    accessToken: string;
    refreshToken: string;
    id: string;
    email: string;
    nickname: string;
    profileImage: string;
  }>;
  logout: () => Promise<void>;
};

// 사용 예시
const handleKakaoLogin = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await KakaoLogin.login();
      // 서버에 토큰 전송하여 세션 생성
      const response = await fetch('/api/kakao/android-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: result.accessToken,
          kakaoId: result.id,
          email: result.email,
          nickname: result.nickname,
          profileImage: result.profileImage,
        }),
      });
      // 로그인 성공 처리
    } catch (error) {
      console.error('카카오 로그인 실패:', error);
    }
  } else {
    // 웹에서는 기존 방식 사용
    window.open(`/api/kakao/login?lang=${language}`, '_blank');
  }
};
```

### 8. 서버에 Android 로그인 엔드포인트 추가

`server/kakaoAuth.ts` 파일에 Android용 엔드포인트를 추가합니다:

```typescript
// Android 네이티브 로그인 엔드포인트
app.post("/api/kakao/android-login", async (req, res) => {
  const { accessToken, kakaoId, email, nickname, profileImage } = req.body;

  if (!accessToken || !kakaoId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 카카오 토큰 검증 (선택사항)
    const userInfoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: "Invalid access token" });
    }

    // 사용자 정보 저장
    const user = await storage.upsertUser({
      id: `kakao_${kakaoId}`,
      email: email || `kakao_${kakaoId}@placeholder.com`,
      firstName: nickname || "Kakao User",
      lastName: "",
      profileImageUrl: profileImage || null,
      provider: "kakao",
      kakaoId: kakaoId.toString(),
    });

    // 세션 생성
    (req as any).login(
      {
        id: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
      },
      (err: any) => {
        if (err) {
          return res.status(500).json({ error: "Failed to create session" });
        }
        res.json({ success: true, user });
      }
    );
  } catch (error) {
    console.error("Android Kakao login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});
```

---

## 방법 2: 웹뷰에서 기존 OAuth 플로우 사용 (간단한 방법)

네이티브 SDK를 사용하지 않고 기존 웹 OAuth 플로우를 사용하는 방법입니다.

### 장점
- 구현이 간단함
- 서버 코드 변경 최소화

### 단점
- 사용자 경험이 네이티브보다 떨어짐
- 카카오톡 앱 연동 불가

### 구현 방법

`client/src/pages/landing.tsx` 파일에서 안드로이드 환경 감지:

```typescript
import { Capacitor } from '@capacitor/core';

const handleKakaoLogin = () => {
  const loginUrl = `/api/kakao/login?lang=${language}`;
  
  if (Capacitor.isNativePlatform()) {
    // 안드로이드에서는 현재 창에서 열기
    window.location.href = loginUrl;
  } else {
    // 웹에서는 새 탭에서 열기
    window.open(loginUrl, '_blank');
  }
};
```

이 방법은 기존 서버 코드를 그대로 사용할 수 있지만, 웹뷰에서 OAuth 플로우가 진행되므로 사용자 경험이 네이티브 SDK보다 떨어질 수 있습니다.

---

## 추천 방법

**방법 1 (네이티브 SDK)**을 권장합니다. 이유:
- 더 나은 사용자 경험
- 카카오톡 앱 연동 가능
- 네이티브 앱처럼 동작

---

## 참고 자료

- [카카오 SDK Android 가이드](https://developers.kakao.com/docs/latest/ko/getting-started/sdk-android)
- [카카오 로그인 Android](https://developers.kakao.com/docs/latest/ko/kakaologin/android)
- [Capacitor 플러그인 개발 가이드](https://capacitorjs.com/docs/plugins)

