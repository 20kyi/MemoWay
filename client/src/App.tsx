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
  const { isAuthenticated, isLoading, user } = useAuth();
  const { setLanguage } = useLanguage();

  // Handle Deep Link from OAuth callback (Android app)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Listen for app URL open events (Deep Links)
      CapacitorApp.addListener('appUrlOpen', (data: { url: string }) => {
        console.log('App opened with URL:', data.url);
        
        // Parse Deep Link: com.memoway.app://login?lang=ko
        try {
          const url = new URL(data.url);
          if (url.pathname === '/login') {
            const langParam = url.searchParams.get('lang');
            if (langParam && ['ko', 'en', 'zh', 'ja'].includes(langParam)) {
              setLanguage(langParam as Language);
            }
            // Navigate to home page (user is already logged in via session)
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Failed to parse Deep Link:', error);
        }
      });

      // Check initial URL if app was opened via Deep Link
      CapacitorApp.getLaunchUrl().then((ret: { url: string } | undefined) => {
        if (ret?.url) {
          console.log('App launched with URL:', ret.url);
          try {
            const url = new URL(ret.url);
            if (url.pathname === '/login') {
              const langParam = url.searchParams.get('lang');
              if (langParam && ['ko', 'en', 'zh', 'ja'].includes(langParam)) {
                setLanguage(langParam as Language);
              }
              window.location.href = '/';
            }
          } catch (error) {
            console.error('Failed to parse launch URL:', error);
          }
        }
      }).catch(() => {
        // No launch URL, app opened normally
      });
    }
  }, [setLanguage]);

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

  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-accent/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    }>
      <Switch>
        {isLoading || !isAuthenticated ? (
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
