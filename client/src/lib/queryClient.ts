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
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, text);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const isFormData = data instanceof FormData;
  
  // 절대 URL이 아니면 베이스 URL 추가
  const fullUrl = url.startsWith('http') ? url : getApiBaseUrl() + url;
  
  const res = await fetch(fullUrl, {
    method,
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  
  return res;
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
