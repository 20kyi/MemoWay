import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memoway.app',
  appName: 'MemoWay',
  webDir: 'dist/public',
  server: {
    // HTTPS 스킴 사용 (프로덕션 빌드용)
    androidScheme: 'https',
    
    // 개발 중 라이브 리로드를 사용하려면:
    // 1. 아래 주석 해제
    // 2. url을 실제 Replit 개발 URL로 변경
    // 3. cleartext: true 추가 (HTTP 허용)
    // 
    // 프로덕션 APK 빌드 시에는 반드시 주석 처리할 것!
    // (프로덕션에서는 빌드된 파일을 APK에 포함)
    
    // url: 'https://your-dev-repl-url.replit.dev',
    // cleartext: true
  },
  android: {
    // WebView가 백그라운드에서 unload되지 않도록 설정
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Activity가 백그라운드로 가도 WebView 상태 유지
    backgroundColor: '#ffffff',
  },
  plugins: {
    Camera: {
      // 카메라 권한은 Android Manifest에 자동 추가됨
    },
    Geolocation: {
      // GPS 권한은 Android Manifest에 자동 추가됨
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    KakaoLogin: {
      // 카카오 네이티브 앱 키 (카카오 개발자 콘솔에서 발급받은 네이티브 앱 키)
      nativeAppKey: "972181125f7cd0fb9dbd9442fdde314e",
      // JavaScript 키 (웹용, 선택사항)
      // jsKey: "YOUR_JAVASCRIPT_KEY"
    }
  }
};

export default config;
