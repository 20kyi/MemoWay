import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  // 로그아웃 플래그 확인 (30초 이내 로그아웃한 경우 쿼리 완전 비활성화)
  const logoutTimestamp = typeof window !== 'undefined' ? localStorage.getItem("logoutTimestamp") : null;
  const isRecentLogout = logoutTimestamp && (Date.now() - parseInt(logoutTimestamp)) < 30000; // 30초
  
  // 로그아웃 직후에는 쿼리를 완전히 비활성화하여 auto-login 방지
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // 401 에러 시 null 반환
    retry: false,
    // 에러 발생 시에도 로딩 상태를 false로 만들어서 로그인 화면 표시
    throwOnError: false,
    // 포인트 정보는 자주 변경될 수 있으므로 짧은 캐시 시간 사용
    staleTime: 30 * 1000, // 30초간 캐시 유지 (포인트 업데이트 즉시 반영)
    gcTime: 5 * 60 * 1000, // 5분간 캐시 보관
    // 네이티브 앱에서 세션 쿠키 확인을 위해 refetch 간격 설정
    // 단, 로그아웃 직후에는 쿼리 자체를 비활성화 (자동 로그인 완전 방지)
    enabled: !isRecentLogout, // 로그아웃 직후에는 쿼리 비활성화
    refetchOnMount: !isRecentLogout, // 로그아웃 직후에는 false
    refetchOnWindowFocus: false,
  });

  // 네트워크 에러와 인증 실패 구분
  // 네트워크 에러(status: 0)는 인증 실패가 아니므로 별도 처리
  const isNetworkError = error && (error as any).status === 0;
  const isAuthError = error && (error as any).status !== 0;

  // 로그아웃 직후에는 쿼리가 비활성화되므로 user는 undefined가 됨
  // 이 경우 명시적으로 null로 처리하여 로그인 페이지로 이동하도록 함
  const finalUser = isRecentLogout ? null : (isAuthError ? null : user);
  const finalIsLoading = isRecentLogout ? false : (isLoading || isNetworkError);
  const finalIsAuthenticated = isRecentLogout ? false : (!!user && !isAuthError);

  // 에러가 발생하거나 user가 null이면 인증되지 않음
  // 단, 네트워크 에러는 인증 상태를 판단하지 않음 (로딩 상태 유지)
  // 로그아웃 직후에는 항상 인증되지 않은 상태로 처리
  return {
    user: finalUser,
    isLoading: finalIsLoading, // 로그아웃 직후에는 로딩 상태 false
    isAuthenticated: finalIsAuthenticated, // 로그아웃 직후에는 항상 false
    networkError: isNetworkError ? error : null, // 네트워크 에러 정보 제공
  };
}
