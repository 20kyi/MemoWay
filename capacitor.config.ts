import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memoway.app',
  appName: 'MemoWay',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
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
