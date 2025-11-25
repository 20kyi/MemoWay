import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
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
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // 네트워크 에러와 인증 실패 구분
  // 네트워크 에러(status: 0)는 인증 실패가 아니므로 별도 처리
  const isNetworkError = error && (error as any).status === 0;
  const isAuthError = error && (error as any).status !== 0;

  // 에러가 발생하거나 user가 null이면 인증되지 않음
  // 단, 네트워크 에러는 인증 상태를 판단하지 않음 (로딩 상태 유지)
  return {
    user: isAuthError ? null : user,
    isLoading: isLoading || isNetworkError, // 네트워크 에러 시 로딩 상태 유지
    isAuthenticated: !!user && !isAuthError, // 인증 에러가 없고 user가 있을 때만 인증됨
    networkError: isNetworkError ? error : null, // 네트워크 에러 정보 제공
  };
}
