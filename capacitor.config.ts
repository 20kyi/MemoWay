import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { bundledWebRuntime?: boolean } = {
  appId: 'com.memoway.app',
  appName: 'MemoWay',
  webDir: 'dist/public',
  bundledWebRuntime: true,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
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
  }
};

export default config;
