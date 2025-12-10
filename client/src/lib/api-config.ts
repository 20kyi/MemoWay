/**
 * API 베이스 URL 가져오기
 * 안드로이드 앱, 웹 브라우저에서 모두 공통으로 쓸 API 서버 주소
 */
export function getApiBaseUrl(): string {
  // Capacitor 네이티브 플랫폼 감지
  const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
  
  // Android 앱에서는 항상 Railway 프로덕션 서버 사용
  if (isNativePlatform) {
    // [개발용] 로컬 서버 사용 시 아래 주석을 해제하고 사용하세요
    // return "http://192.168.219.100:5000";
    
    // [프로덕션용] Railway 배포 서버 사용
    const baseUrl = "https://memoway-production.up.railway.app";
    console.log('[API CONFIG] ========== NATIVE PLATFORM DETECTED ==========');
    console.log('[API CONFIG] Platform: Android/Capacitor');
    console.log('[API CONFIG] Using Railway production server:', baseUrl);
    console.log('[API CONFIG] ===============================================');
    return baseUrl;
  }
  
  // 웹 브라우저 환경
  if (import.meta.env.PROD) {
    // 프로덕션: Railway 서버
    const baseUrl = "https://memoway-production.up.railway.app";
    console.log('[API CONFIG] Production mode - using Railway server:', baseUrl);
    return baseUrl;
  }

  // 개발 환경: 로컬 백엔드
  const baseUrl = "http://localhost:5000";
  console.log('[API CONFIG] Development mode - using local server:', baseUrl);
  return baseUrl;
}

