import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API 베이스 URL 가져오기
function getApiBaseUrl(): string {
  // Capacitor 네이티브 환경 감지
  const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
  
  console.log('getApiBaseUrl - isNativePlatform:', isNativePlatform);
  
  if (isNativePlatform) {
    // Capacitor 네이티브 환경: Replit 배포 URL 사용
    const replitUrl = import.meta.env.VITE_REPLIT_URL;
    
    console.log('getApiBaseUrl - VITE_REPLIT_URL:', replitUrl);
    
    if (!replitUrl) {
      console.error('VITE_REPLIT_URL is not configured. API requests will fail in native app.');
      // 폴백으로 빈 문자열 반환 (요청이 실패하면 에러 처리)
      return '';
    }
    
    // URL 정규화 (trailing slash 제거)
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
  console.log('getApiBaseUrl - using relative paths (web browser)');
  return '';
}

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
      
      // URL이 유효하지 않으면 null 반환 (네트워크 에러 방지)
      if (!fullUrl || fullUrl === path) {
        console.warn('API base URL not configured, returning null for:', path);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        throw new ApiError(500, 'API base URL not configured');
      }
      
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      // 네트워크 에러나 기타 에러 처리
      console.error('API request failed:', error);
      
      // 401 에러이고 returnNull이면 null 반환
      if (error.status === 401 && unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      // 네트워크 에러도 returnNull이면 null 반환 (로그인 화면 표시)
      if (unauthorizedBehavior === "returnNull") {
        console.warn('Returning null due to error (will show login screen)');
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
    },
    mutations: {
      retry: false,
    },
  },
});
