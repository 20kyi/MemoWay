import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider, useLanguage, type Language } from "./lib/language-context";
import { FontProvider } from "./lib/font-context";
import { ThemeProvider } from "./lib/theme-context";
import { MapProviderProvider } from "./lib/map-provider-context";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, lazy, Suspense } from "react";
import { getQueryFn } from "./lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

// Lazy load pages for code splitting
const Home = lazy(() => import("@/pages/home"));
const Landing = lazy(() => import("@/pages/landing"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  const { isAuthenticated, isLoading, user, networkError } = useAuth();
  const { setLanguage } = useLanguage();

  // Handle Deep Link from OAuth callback (Android app)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleDeepLink = async (urlString: string) => {
        console.log('App opened with URL:', urlString);
        
        // Parse Deep Link: com.memoway.app://login?lang=ko
        try {
          const url = new URL(urlString);
          if (url.pathname === '/login') {
            const langParam = url.searchParams.get('lang');
            if (langParam && ['ko', 'en', 'zh', 'ja'].includes(langParam)) {
              setLanguage(langParam as Language);
            }
            
            // 인증 상태 확인 및 재요청
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            
            // 잠시 대기 후 홈으로 이동 (세션 쿠키가 설정될 시간 확보)
            setTimeout(() => {
              window.location.href = '/';
            }, 300);
          }
        } catch (error) {
          console.error('Failed to parse Deep Link:', error);
        }
      };

      // Listen for app URL open events (Deep Links)
      CapacitorApp.addListener('appUrlOpen', (data: { url: string }) => {
        handleDeepLink(data.url);
      });

      // Check initial URL if app was opened via Deep Link
      CapacitorApp.getLaunchUrl().then((ret: { url: string } | undefined) => {
        if (ret?.url) {
          handleDeepLink(ret.url);
        }
      }).catch(() => {
        // No launch URL, app opened normally
      });
    }
  }, [setLanguage, queryClient]);

  // Check for language parameter in URL and set language (web)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam && ['ko', 'en', 'zh', 'ja'].includes(langParam)) {
      setLanguage(langParam as Language);
      // Clean up URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setLanguage]);

  // 로그인 후 데이터 미리 가져오기 (prefetch)로 로딩 시간 단축
  useEffect(() => {
    if (isAuthenticated && user) {
      // memos와 groups를 병렬로 미리 가져오기
      const queryFn = getQueryFn({ on401: "throw" });
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["/api/memos"],
          queryFn: queryFn as any,
          staleTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: ["/api/groups"],
          queryFn: queryFn as any,
          staleTime: 5 * 60 * 1000,
        }),
      ]).catch((error) => {
        // Prefetch 실패는 무시 (나중에 실제 쿼리에서 재시도)
        console.log("Prefetch failed (will retry on component mount):", error);
      });
    }
  }, [isAuthenticated, user]);

  // 네이티브 앱에서 인증 상태 확인 개선 (세션 쿠키가 설정될 시간 확보)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !isLoading && !isAuthenticated && !user) {
      // 로그인/회원가입 직후 세션 쿠키가 아직 전달되지 않았을 수 있음
      // 추가 확인을 위해 짧은 지연 후 재확인 (최대 5번, 더 긴 대기 시간)
      let retryCount = 0;
      const maxRetries = 5;
      
      const checkAuthAgain = async () => {
        if (retryCount >= maxRetries) {
          console.warn('인증 상태 재확인 최대 시도 횟수 초과');
          return;
        }
        
        try {
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          const authUser = await queryClient.fetchQuery({
            queryKey: ["/api/auth/user"],
            queryFn: getQueryFn({ on401: "returnNull" }),
            staleTime: 0, // 캐시 무시
          });
          
          if (authUser) {
            // 인증 성공 - 강제로 홈으로 이동
            console.log('인증 상태 확인 성공, 홈으로 이동');
            window.location.href = "/";
            return;
          }
        } catch (error: any) {
          // 네트워크 에러는 재시도 계속
          if (error.status === 0) {
            console.warn(`네트워크 에러로 인증 상태 재확인 실패 (시도 ${retryCount + 1}/${maxRetries}):`, error);
          } else {
            console.warn(`인증 상태 재확인 실패 (시도 ${retryCount + 1}/${maxRetries}):`, error);
          }
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          // 점진적으로 대기 시간 증가 (1초, 2초, 3초, 4초, 5초)
          setTimeout(checkAuthAgain, retryCount * 1000);
        }
      };
      
      // 첫 번째 재확인은 2초 후 (쿠키 전파 시간 확보)
      const timeoutId = setTimeout(checkAuthAgain, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, isAuthenticated, user, queryClient]);

  // 로그아웃 후 리다이렉트 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === 'true') {
      // 로그아웃 상태 명시를 위해 쿼리 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname);
      // 인증 상태 쿼리 무효화하여 즉시 랜딩 페이지 표시
      queryClient.setQueryData(['/api/auth/user'], null);
    }
  }, [queryClient]);

  // 네트워크 에러가 있으면 로딩 화면 표시 (인증 실패로 처리하지 않음)
  // 로그아웃 직후에는 로딩 상태를 false로 설정하여 즉시 랜딩 페이지 표시
  const params = new URLSearchParams(window.location.search);
  const isLogoutRedirect = params.get('logout') === 'true';
  const showLoading = (isLoading || (networkError && !isAuthenticated)) && !isLogoutRedirect;
  
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-accent/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {networkError ? "서버에 연결하는 중..." : "로딩 중..."}
          </p>
          {networkError && (
            <p className="text-sm text-destructive mt-2">
              네트워크 연결을 확인해주세요
            </p>
          )}
        </div>
      </div>
    }>
      <Switch>
        {showLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/home" component={Home} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <FontProvider>
            <MapProviderProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </MapProviderProvider>
          </FontProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
