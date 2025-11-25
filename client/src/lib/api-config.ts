import { Capacitor } from "@capacitor/core";

/**
 * API 베이스 URL 가져오기
 * 네이티브 앱에서는 절대 URL 필요, 웹 브라우저에서는 상대 경로 사용
 */
export function getApiBaseUrl(): string {
  const isNativePlatform = Capacitor.isNativePlatform();
  
  if (isNativePlatform) {
    // Vite는 빌드 시점에 환경 변수를 번들에 포함
    // vite.config.ts의 define 옵션을 통해 주입됨
    const replitUrl = import.meta.env.VITE_REPLIT_URL;
    
    console.log('getApiBaseUrl - isNativePlatform:', isNativePlatform);
    console.log('getApiBaseUrl - VITE_REPLIT_URL:', replitUrl ? `${replitUrl.substring(0, 20)}...` : 'NOT SET');
    
    if (!replitUrl || typeof replitUrl !== 'string' || replitUrl.trim() === '') {
      console.error('VITE_REPLIT_URL is not configured. API requests will fail in native app.');
      console.error('Please ensure VITE_REPLIT_URL is set in .env file and rebuild the app.');
      return '';
    }
    
    try {
      const url = new URL(replitUrl);
      const baseUrl = url.origin + url.pathname.replace(/\/$/, '');
      console.log('getApiBaseUrl - resolved base URL:', baseUrl);
      return baseUrl;
    } catch (error) {
      console.error('Invalid VITE_REPLIT_URL:', replitUrl, error);
      return '';
    }
  }
  
  // 웹 브라우저 환경: 상대 경로 사용
  return '';
}

