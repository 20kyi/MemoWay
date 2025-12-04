import { Capacitor } from "@capacitor/core";
import { queryClient } from "./queryClient";
import { getApiBaseUrl } from "./api-config";

/**
 * 공통 로그아웃 함수
 * 웹 브라우저와 안드로이드 앱 모두에서 동일하게 동작
 * 
 * 주의: 이 함수는 네비게이션을 처리하지 않습니다.
 * 호출하는 컴포넌트에서 로그아웃 후 네비게이션을 처리해야 합니다.
 */
export async function handleLogout(): Promise<{ success: boolean; error?: string }> {
  const isNativePlatform = Capacitor.isNativePlatform();
  const baseUrl = getApiBaseUrl();
  
  // 안드로이드 앱에서는 항상 절대 URL 사용 (CORS 및 쿠키 전송 보장)
  let logoutUrl: string;
  if (isNativePlatform) {
    // 안드로이드 앱: 절대 URL 필수 사용
    if (!baseUrl) {
      console.error('[LOGOUT] Server configuration missing. Please reinstall the app.');
      // 설정이 없어도 로그아웃은 계속 진행 (클라이언트 상태 초기화는 필요)
      // 하지만 절대 URL이 없으면 네트워크 에러가 발생할 수 있음
      logoutUrl = "https://memoway-production.up.railway.app/api/logout"; // Fallback
      console.warn('[LOGOUT] Using fallback URL:', logoutUrl);
    } else {
      logoutUrl = `${baseUrl}/api/logout`;
    }
  } else {
    // 웹 브라우저: 상대 경로 사용 (같은 origin이므로)
    logoutUrl = "/api/logout";
  }
  
  console.log('[LOGOUT] ========== Starting logout ==========');
  console.log('[LOGOUT] Platform:', isNativePlatform ? 'Native (Android)' : 'Web Browser');
  console.log('[LOGOUT] Logout URL:', logoutUrl);
  console.log('[LOGOUT] Base URL:', baseUrl);
  
  // 로그아웃 요청 시도 (실패해도 에러를 throw하지 않음)
  let logoutRequestSuccess = false;
  try {
    const response = await fetch(logoutUrl, {
      method: 'GET',
      credentials: 'include', // 쿠키 포함 필수 (CORS preflight에서도 필요)
      redirect: 'manual', // 리다이렉트를 수동으로 처리
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(isNativePlatform && { 'X-Platform': 'android' }), // 안드로이드 앱임을 명시
      },
    });
    
    console.log('[LOGOUT] Response status:', response.status);
    console.log('[LOGOUT] Response headers:', Object.fromEntries(response.headers.entries()));
    
    // 응답 처리
    if (response.status >= 200 && response.status < 300) {
      // 성공 응답 (2xx)
      logoutRequestSuccess = true;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          console.log('[LOGOUT] Logout successful:', data);
        } catch (e) {
          console.log('[LOGOUT] Response is not JSON, but status is OK');
        }
      }
      console.log('[LOGOUT] Logout request sent successfully');
    } else if (response.status >= 300 && response.status < 400) {
      // 리다이렉트 응답 (3xx) - 무시 (웹 브라우저에서만 발생할 수 있음)
      logoutRequestSuccess = true; // 리다이렉트도 성공으로 간주
      const location = response.headers.get('location');
      console.log('[LOGOUT] Server redirected to:', location);
      console.log('[LOGOUT] Ignoring redirect');
      console.log('[LOGOUT] Logout request completed (redirect ignored)');
    } else {
      // 에러 응답 (4xx, 5xx) - 에러를 throw하지 않고 로그만 찍음
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[LOGOUT] Logout request failed (network or server error):', response.status, errorText);
      console.error('[LOGOUT] Response headers:', Object.fromEntries(response.headers.entries()));
      // ❗ 여기서 절대 throw 하지 않음 - 에러를 삼키고 넘어감
      // 하지만 서버 쿠키가 삭제되지 않았을 수 있으므로 클라이언트 상태는 초기화해야 함
    }
  } catch (error: any) {
    // 네트워크 에러 (Failed to fetch 등) - 에러를 throw하지 않고 로그만 찍음
    console.error('[LOGOUT] Logout request failed (network or CORS):', error);
    console.error('[LOGOUT] Error type:', error?.name);
    console.error('[LOGOUT] Error message:', error?.message);
    console.error('[LOGOUT] This usually means:');
    console.error('[LOGOUT] 1. CORS preflight failed');
    console.error('[LOGOUT] 2. Network connection issue');
    console.error('[LOGOUT] 3. Server is unreachable');
    console.error('[LOGOUT] Client-side state will be cleared anyway to prevent auto-login');
    // ❗ 여기서 절대 throw 하지 않음 - 에러를 삼키고 넘어감
    // 네트워크 에러가 발생해도 클라이언트 상태는 초기화해야 함
  }
  
  // 요청 성공/실패와 상관없이 항상 쿼리 캐시 무효화 시도
  // 네트워크 에러가 발생해도 클라이언트 상태는 완전히 초기화해야 함
  try {
    console.log('[LOGOUT] Invalidating all queries...');
    await queryClient.invalidateQueries();
    
    // 특히 /api/auth/user 쿼리를 명시적으로 무효화 및 제거
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    
    // 인증 상태를 즉시 null로 설정 (auto-login 방지)
    queryClient.setQueryData(['/api/auth/user'], null);
    
    console.log('[LOGOUT] ========== Logout completed successfully ==========');
    console.log('[LOGOUT] Server request success:', logoutRequestSuccess);
    console.log('[LOGOUT] Client state cleared:', !queryClient.getQueryData(['/api/auth/user']));
  } catch (invalidateError) {
    console.error('[LOGOUT] Failed to invalidate queries:', invalidateError);
    // invalidate 실패해도 계속 진행
    // 최소한 쿼리 데이터는 null로 설정
    try {
      queryClient.setQueryData(['/api/auth/user'], null);
    } catch (e) {
      console.error('[LOGOUT] Failed to set query data to null:', e);
    }
  }
  
  // 항상 성공으로 반환 (네트워크 실패와 상관없이 클라이언트 상태는 초기화됨)
  // 하지만 서버 요청이 실패했다는 정보는 포함
  return { 
    success: true, 
    serverRequestSuccess: logoutRequestSuccess 
  };
}

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
