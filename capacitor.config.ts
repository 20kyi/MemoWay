import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.memomap.app',
  appName: 'MemoMap',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // 개발 중에는 Replit 도메인을 사용
    // 프로덕션 빌드 시에는 주석 처리
    // url: 'https://your-replit-url.replit.dev',
    // cleartext: true
  },
  plugins: {
    Camera: {
      // 카메라 권한 설정
      // Android에서 자동으로 권한 요청
    },
    Geolocation: {
      // GPS 권한 설정
      // Android에서 자동으로 권한 요청
    }
  }
};

export default config;
