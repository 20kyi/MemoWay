import { Capacitor } from "@capacitor/core";

/**
 * API 베이스 URL 가져오기
 * 네이티브 앱에서는 절대 URL 필요, 웹 브라우저에서는 상대 경로 사용
 */
export function getApiBaseUrl(): string {
  const isNativePlatform = Capacitor.isNativePlatform();
  
  console.log('[API CONFIG] ========== getApiBaseUrl called ==========');
  console.log('[API CONFIG] isNativePlatform:', isNativePlatform);
  console.log('[API CONFIG] User Agent:', navigator.userAgent);
  console.log('[API CONFIG] Window location:', window.location.href);
  
  if (isNativePlatform) {
    // Vite는 빌드 시점에 환경 변수를 번들에 포함
    // vite.config.ts의 define 옵션을 통해 주입됨
    const replitUrl = import.meta.env.VITE_REPLIT_URL;
    
    console.log('[API CONFIG] VITE_REPLIT_URL exists:', !!replitUrl);
    console.log('[API CONFIG] VITE_REPLIT_URL type:', typeof replitUrl);
    if (replitUrl) {
      console.log('[API CONFIG] VITE_REPLIT_URL preview:', `${replitUrl.substring(0, 30)}...`);
    } else {
      console.error('[API CONFIG] VITE_REPLIT_URL is NOT SET!');
    }
    
    if (!replitUrl || typeof replitUrl !== 'string' || replitUrl.trim() === '') {
      console.error('[API CONFIG] ========== CONFIGURATION ERROR ==========');
      console.error('[API CONFIG] VITE_REPLIT_URL is not configured. API requests will fail in native app.');
      console.error('[API CONFIG] Please ensure VITE_REPLIT_URL is set in .env file and rebuild the app.');
      console.error('[API CONFIG] Example: VITE_REPLIT_URL=https://your-app.replit.app');
      console.error('[API CONFIG] ========================================');
      return '';
    }
    
    try {
      const url = new URL(replitUrl);
      const baseUrl = url.origin + url.pathname.replace(/\/$/, '');
      console.log('[API CONFIG] Parsed URL origin:', url.origin);
      console.log('[API CONFIG] Parsed URL pathname:', url.pathname);
      console.log('[API CONFIG] Resolved base URL:', baseUrl);
      console.log('[API CONFIG] ==========================================');
      return baseUrl;
    } catch (error) {
      console.error('[API CONFIG] ========== URL PARSING ERROR ==========');
      console.error('[API CONFIG] Invalid VITE_REPLIT_URL:', replitUrl);
      console.error('[API CONFIG] Error:', error);
      console.error('[API CONFIG] ========================================');
      return '';
    }
  }
  
  // 웹 브라우저 환경: 상대 경로 사용
  console.log('[API CONFIG] Web browser environment - using relative paths');
  console.log('[API CONFIG] Base URL: (empty - relative paths)');
  console.log('[API CONFIG] ==========================================');
  return '';
}

