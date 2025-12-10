import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memoway.app',
  appName: 'MemoWay',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // allowNavigation: [],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#ffffff',
  },
  plugins: {
    Camera: {},
    Geolocation: {},
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
    KakaoLogin: {
      nativeAppKey: '972181125f7cd0fb9dbd9442fdde314e',
    },
  },
};

export default config;
