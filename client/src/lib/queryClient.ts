import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiBaseUrl } from "./api-config";

class ApiError extends Error {
  status: number;
  error: string;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
    
    // Try to parse JSON error message
    try {
      // Check if message looks like JSON
      if (message.trim().startsWith('{')) {
        const parsed = JSON.parse(message);
        this.error = parsed.error || parsed.message || message;
      } else {
        // Plain text error (e.g., "Not Found")
        this.error = message;
      }
    } catch {
      // Fallback to original message
      this.error = message;
    }
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // 응답 본문을 읽기 전에 상태 코드 확인
    const status = res.status;
    const statusText = res.statusText;
    
    // 응답 본문 읽기 (한 번만 읽을 수 있으므로 주의)
    let errorText = '';
    try {
      errorText = await res.text();
    } catch (e) {
      console.warn("[API REQUEST] Failed to read error response body:", e);
      errorText = statusText;
    }
    
    console.error(`[API REQUEST] HTTP Error ${status} ${statusText}`);
    console.error(`[API REQUEST] Error response body:`, errorText);
    
    // 401 Unauthorized 에러인 경우 특별 처리
    if (status === 401) {
      console.error("[API REQUEST] ========== 401 UNAUTHORIZED ==========");
      console.error("[API REQUEST] This usually means:");
      console.error("[API REQUEST] 1. Session expired - user needs to re-login");
      console.error("[API REQUEST] 2. Cookie not being sent - check credentials: 'include'");
      console.error("[API REQUEST] 3. CORS issue - check server CORS settings");
      console.error("[API REQUEST] Response text:", errorText);
      console.error("[API REQUEST] ======================================");
      
      // 세션 만료 시 사용자에게 알림을 위해 특별한 에러 메시지
      const errorMessage = errorText || "인증이 만료되었습니다. 다시 로그인해주세요.";
      const apiError = new ApiError(status, errorMessage);
      apiError.error = "세션이 만료되었습니다. 페이지를 새로고침하거나 다시 로그인해주세요.";
      throw apiError;
    }
    
    // 403 Forbidden 에러
    if (status === 403) {
      console.error("[API REQUEST] 403 Forbidden - Access denied");
      const apiError = new ApiError(status, errorText || statusText);
      apiError.error = "접근 권한이 없습니다.";
      throw apiError;
    }
    
    // 기타 에러
    throw new ApiError(status, errorText || statusText);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const isFormData = data instanceof FormData;
  
  // 플랫폼 정보 확인 (최우선)
  const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
  
  // 베이스 URL 가져오기
  const baseUrl = getApiBaseUrl();
  
  // 절대 URL이 아니면 베이스 URL 추가
  const fullUrl = url.startsWith('http') ? url : baseUrl + url;
  
  // Android 앱에서 디버깅 로그 추가
  if (isNativePlatform) {
    console.log(`[MOBILE LOGIN] ========================================`);
    console.log(`[MOBILE LOGIN] Starting request from Android app`);
    console.log(`[MOBILE LOGIN] Method: ${method}`);
    console.log(`[MOBILE LOGIN] Original URL (input): ${url}`);
    console.log(`[MOBILE LOGIN] Base URL: ${baseUrl}`);
    console.log(`[MOBILE LOGIN] ========== FINAL URL ==========`);
    console.log(`[MOBILE LOGIN] Final URL: ${fullUrl}`);
    console.log(`[MOBILE LOGIN] ==============================`);
  }
  
  console.log(`[API REQUEST] ========================================`);
  console.log(`[API REQUEST] Method: ${method}`);
  console.log(`[API REQUEST] Original URL (input): ${url}`);
  console.log(`[API REQUEST] Base URL: ${baseUrl || '(empty - using relative path)'}`);
  console.log(`[API REQUEST] ========== FINAL URL ==========`);
  console.log(`[API REQUEST] Final URL: ${fullUrl}`);
  console.log(`[API REQUEST] ==============================`);
  console.log(`[API REQUEST] Platform: ${isNativePlatform ? 'Native (Capacitor)' : 'Web Browser'}`);
  console.log(`[API REQUEST] Is FormData: ${isFormData}`);
  console.log(`[API REQUEST] Has Data: ${!!data}`);
  if (isFormData && data instanceof FormData) {
    const formDataEntries: string[] = [];
    for (const [key, value] of data.entries()) {
      if (value instanceof File) {
        formDataEntries.push(`${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        formDataEntries.push(`${key}: ${String(value).substring(0, 50)}`);
      }
    }
    console.log(`[API REQUEST] FormData entries:`, formDataEntries);
  } else if (data) {
    console.log(`[API REQUEST] Data size: ${JSON.stringify(data).length} bytes`);
  }
  console.log(`[API REQUEST] ========================================`);
  
  // 요청 옵션 준비
  const requestHeaders: Record<string, string> = {};
  if (!isFormData && data) {
    requestHeaders["Content-Type"] = "application/json";
  }
  requestHeaders["Accept"] = "application/json";
  
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include", // 쿠키 포함 - 필수!
    redirect: "manual", // 리다이렉트를 수동으로 처리하여 쿠키 손실 방지
  };
  
  if (isNativePlatform) {
    console.log(`[MOBILE LOGIN] Request options:`, {
      method: requestOptions.method,
      headers: requestOptions.headers,
      credentials: requestOptions.credentials,
      redirect: requestOptions.redirect,
      hasBody: !!requestOptions.body,
    });
  }
  
  try {
    console.log(`[API REQUEST] ========== STARTING REQUEST ==========`);
    console.log(`[API REQUEST] Method: ${method}`);
    console.log(`[API REQUEST] Final URL: ${fullUrl}`);
    if (data && !isFormData) {
      console.log(`[API REQUEST] Request body:`, JSON.stringify(data, null, 2));
    }
    
    const res = await fetch(fullUrl, requestOptions);

    console.log(`[API REQUEST] ========== RESPONSE RECEIVED ==========`);
    console.log(`[API REQUEST] Status: ${res.status} ${res.statusText}`);
    console.log(`[API REQUEST] OK: ${res.ok}`);
    console.log(`[API REQUEST] Response headers:`, Object.fromEntries(res.headers.entries()));
    
    // Android 앱에서 응답 상세 로그
    if (isNativePlatform) {
      console.log(`[MOBILE LOGIN] ========== RESPONSE RECEIVED ==========`);
      console.log(`[MOBILE LOGIN] Status code: ${res.status}`);
      console.log(`[MOBILE LOGIN] Status text: ${res.statusText}`);
      console.log(`[MOBILE LOGIN] Response OK: ${res.ok}`);
      console.log(`[MOBILE LOGIN] Response headers:`, Object.fromEntries(res.headers.entries()));
    }
    
    // Set-Cookie 헤더 확인
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      console.log(`[API REQUEST] Set-Cookie header:`, setCookieHeader);
      if (isNativePlatform) {
        console.log(`[MOBILE LOGIN] ✓ Set-Cookie header found:`, setCookieHeader);
      }
    } else {
      console.log(`[API REQUEST] No Set-Cookie header in response`);
      if (isNativePlatform) {
        console.warn(`[MOBILE LOGIN] ⚠️ No Set-Cookie header in response!`);
      }
    }
    
    // 응답 본문 읽기 (성공/실패 모두)
    let responseBody: any = null;
    const contentType = res.headers.get("content-type");
    
    try {
      if (contentType && contentType.includes("application/json")) {
        responseBody = await res.json();
        console.log(`[API REQUEST] Response body (JSON):`, JSON.stringify(responseBody, null, 2));
        if (isNativePlatform) {
          console.log(`[MOBILE LOGIN] Response body (JSON):`, JSON.stringify(responseBody, null, 2));
        }
      } else {
        const textBody = await res.text();
        console.log(`[API REQUEST] Response body (text):`, textBody);
        if (isNativePlatform) {
          console.log(`[MOBILE LOGIN] Response body (text):`, textBody);
        }
        responseBody = textBody;
      }
    } catch (parseError) {
      console.error(`[API REQUEST] Failed to parse response body:`, parseError);
      if (isNativePlatform) {
        console.error(`[MOBILE LOGIN] Failed to parse response body:`, parseError);
      }
    }
    
    if (!res.ok) {
      console.error(`[API REQUEST] ========== ERROR RESPONSE ==========`);
      console.error(`[API REQUEST] Status: ${res.status} ${res.statusText}`);
      console.error(`[API REQUEST] Response body:`, responseBody);
    }
    
    await throwIfResNotOk(res);
    
    console.log(`[API REQUEST] ========== REQUEST SUCCESS ==========`);
    return responseBody;
  } catch (error: any) {
    console.error(`[API REQUEST] ========== REQUEST FAILED ==========`);
    console.error(`[API REQUEST] Method: ${method}`);
    console.error(`[API REQUEST] Final URL: ${fullUrl}`);
    console.error(`[API REQUEST] Error name: ${error.name}`);
    console.error(`[API REQUEST] Error message: ${error.message}`);
    console.error(`[API REQUEST] Error type: ${error.constructor.name}`);
    
    // Android 앱에서 네트워크/CORS 에러 상세 로그
    if (isNativePlatform) {
      console.error(`[MOBILE LOGIN] ========== REQUEST FAILED ==========`);
      console.error(`[MOBILE LOGIN] Method: ${method}`);
      console.error(`[MOBILE LOGIN] Final URL: ${fullUrl}`);
      console.error(`[MOBILE LOGIN] Error name: ${error.name}`);
      console.error(`[MOBILE LOGIN] Error message: ${error.message}`);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`[MOBILE LOGIN] ========== NETWORK ERROR DETECTED ==========`);
        console.error(`[MOBILE LOGIN] This is likely a network error (connection failed, DNS error, etc.)`);
        console.error(`[MOBILE LOGIN] Current origin: ${window.location.origin}`);
        console.error(`[MOBILE LOGIN] Request URL: ${fullUrl}`);
        console.error(`[MOBILE LOGIN] Check if the server is reachable from the device`);
        console.error(`[MOBILE LOGIN] ===========================================`);
      }
      
      if (error.status) {
        console.error(`[MOBILE LOGIN] HTTP Error Status: ${error.status}`);
        if (error.status === 401) {
          console.error(`[MOBILE LOGIN] 401 Unauthorized - Session cookie might not be set or expired`);
        }
      }
      
      if (error.error) {
        console.error(`[MOBILE LOGIN] Error details: ${error.error}`);
      }
      
      if (error.stack) {
        console.error(`[MOBILE LOGIN] Error stack:`, error.stack);
      }
      console.error(`[MOBILE LOGIN] ====================================`);
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`[API REQUEST] ========== FETCH ERROR DETECTED ==========`);
      console.error(`[API REQUEST] This is likely a network/CORS error`);
      console.error(`[API REQUEST] Check if the server allows requests from this origin`);
      console.error(`[API REQUEST] Current origin: ${window.location.origin}`);
      console.error(`[API REQUEST] Request URL: ${fullUrl}`);
      console.error(`[API REQUEST] ===========================================`);
    }
    console.error(`[API REQUEST] Error status: ${error.status}`);
    console.error(`[API REQUEST] Error error: ${error.error}`);
    if (error.response) {
      console.error(`[API REQUEST] Error response:`, error.response);
    }
    if (error.stack) {
      console.error(`[API REQUEST] Error stack:`, error.stack);
    }
    console.error(`[API REQUEST] ====================================`);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const path = queryKey.join("/") as string;
      // 절대 URL이 아니면 베이스 URL 추가
      const baseUrl = getApiBaseUrl();
      const fullUrl = path.startsWith('http') ? path : baseUrl + path;
      
      // 웹 브라우저 환경에서는 상대 경로 사용 (baseUrl이 빈 문자열)
      // 네이티브 환경에서만 절대 URL 필요
      const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
      if (isNativePlatform && (!fullUrl || fullUrl === path)) {
        console.warn('API base URL not configured for native app, returning null for:', path);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        throw new ApiError(500, 'API base URL not configured');
      }
      
      // 웹 환경에서는 상대 경로 사용 (fullUrl === path는 정상)
      
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // 네트워크 에러와 인증 실패 구분
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        // 네트워크 에러 (연결 실패, DNS 오류 등)
        console.error('Network error:', error);
        // 네트워크 에러는 status 0으로 표시하여 구분
        const networkError = new ApiError(0, 'Network error: Unable to connect to server');
        if (unauthorizedBehavior === "returnNull") {
          // 네트워크 에러는 null 반환하지 않고 에러 던지기 (사용자에게 알림 필요)
          throw networkError;
        }
        throw networkError;
      }
      
      // 401 에러이고 returnNull이면 null 반환
      if (error.status === 401 && unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      // 그 외에는 에러 던지기
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // 401 에러 시 null 반환하여 정상 처리
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5분간 캐시 유지 (불필요한 재요청 방지)
      gcTime: 10 * 60 * 1000, // 10분간 캐시 보관 (구 cacheTime)
      retry: false,
      // 네트워크가 느릴 때도 빠른 응답을 위해 타임아웃 설정
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});
