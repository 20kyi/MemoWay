import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // 401 에러 시 null 반환
    retry: false,
    // 에러 발생 시에도 로딩 상태를 false로 만들어서 로그인 화면 표시
    throwOnError: false,
  });

  // 에러가 발생하거나 user가 null이면 인증되지 않음
  // isLoading이 false가 되면 로그인 화면 표시
  return {
    user: error ? null : user,
    isLoading,
    isAuthenticated: !!user && !error, // 에러가 없고 user가 있을 때만 인증됨
  };
}
