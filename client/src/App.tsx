import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider, useLanguage, type Language } from "./lib/language-context";
import { FontProvider } from "./lib/font-context";
import { ThemeProvider } from "./lib/theme-context";
import { LayoutThemeProvider } from "./lib/layout-theme-context";
import { MapProviderProvider } from "./lib/map-provider-context";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, lazy, Suspense, useRef } from "react";
import { getQueryFn } from "./lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { getApiBaseUrl } from "./lib/api-config";

// Lazy load pages for code splitting
const Home = lazy(() => import("@/pages/home"));
const Landing = lazy(() => import("@/pages/landing"));
const NotFound = lazy(() => import("@/pages/not-found"));
const KakaoCallback = lazy(() => import("@/pages/kakao-callback"));

function Router() {
  const { isAuthenticated, isLoading, user, networkError } = useAuth();
  const { setLanguage } = useLanguage();
  const appStateListenerRef = useRef<any>(null);

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
            const sessionOk = url.searchParams.get('session_ok');
            const error = url.searchParams.get('error');
            
            if (error === 'session_failed' || error === 'session_sync_failed') {
              console.error('Kakao login failed:', error === 'session_failed' ? 'session not found' : 'session sync failed');
              // 세션 동기화 실패 시에도 재시도
              if (error === 'session_sync_failed') {
                console.log('[DEEP LINK] Retrying session sync...');
                // 세션 동기화 재시도 로직은 아래에서 처리됨
              } else {
                // 세션이 없는 경우는 재시도하지 않음
                return;
              }
            }
            
            if (langParam && ['ko', 'en', 'zh', 'ja'].includes(langParam)) {
              setLanguage(langParam as Language);
            }
            
            console.log('[DEEP LINK] Kakao login callback received, session_ok:', sessionOk);
            
            // 세션 쿠키를 WebView에 동기화하기 위해 서버에 요청
            // WebView에서 앱으로 Deep Link로 이동할 때 쿠키가 전달되지 않으므로
            // 앱이 열릴 때 서버에서 쿠키를 다시 받아와야 합니다
            const baseUrl = getApiBaseUrl();
            console.log('[DEEP LINK] Base URL:', baseUrl);
            
            // 안드로이드에서 카카오 로그인 완료 후 세션 확인 및 메인 화면으로 이동
            if (Capacitor.isNativePlatform() && baseUrl) {
              console.log('[ANDROID KAKAO LOGIN] ========== Deep Link Session Check ==========');
              console.log('[ANDROID KAKAO LOGIN] Checking session after Kakao login...');
              
              // /api/auth/user 호출하여 로그인 상태 확인 (여러 번 시도)
              let sessionFound = false;
              const checkUrl = `${baseUrl}/api/auth/user`;
              console.log('[ANDROID KAKAO LOGIN] checking /api/auth/user', { url: checkUrl });
              
              for (let attempt = 0; attempt < 5; attempt++) {
                try {
                  console.log(`[ANDROID KAKAO LOGIN] Session check attempt ${attempt + 1}/5`);
                  const response = await fetch(checkUrl, {
                    method: 'GET',
                    credentials: 'include', // 쿠키 포함
                    headers: {
                      'Accept': 'application/json',
                    }
                  });
                  
                  console.log(`[ANDROID KAKAO LOGIN] Response status: ${response.status}`);
                  
                  if (response.ok) {
                    // 200: 로그인됨
                    const userData = await response.json();
                    console.log('[ANDROID KAKAO LOGIN] ✅ /api/auth/user 200 - Session found');
                    console.log('[ANDROID KAKAO LOGIN] User data:', {
                      id: userData?.id,
                      email: userData?.email,
                      firstName: userData?.firstName,
                      lastName: userData?.lastName
                    });
                    sessionFound = true;
                    
                    // auth context 업데이트 (queryClient를 통해)
                    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                    
                    // 메인 화면으로 이동
                    console.log('[ANDROID KAKAO LOGIN] Redirecting to home page (main screen)');
                    setTimeout(() => {
                      window.location.href = '/';
                    }, 500);
                    break;
                  } else if (response.status === 401) {
                    // 401: 비로그인 상태
                    console.log('[ANDROID KAKAO LOGIN] /api/auth/user 401');
                    console.log('[ANDROID KAKAO LOGIN] ❌ No session found (401) - login failed or session expired');
                    console.log('[ANDROID KAKAO LOGIN] Staying on login page');
                    break; // 더 이상 시도하지 않음
                  } else {
                    console.warn(`[ANDROID KAKAO LOGIN] Session check failed (attempt ${attempt + 1}):`, response.status);
                    const errorText = await response.text().catch(() => '');
                    console.warn(`[ANDROID KAKAO LOGIN] Error response:`, errorText);
                  }
                } catch (err) {
                  console.error(`[ANDROID KAKAO LOGIN] Session check error (attempt ${attempt + 1}):`, err);
                }
                
                // 마지막 시도가 아니면 점진적으로 대기 시간 증가
                if (attempt < 4) {
                  const waitTime = (attempt + 1) * 500; // 0.5초, 1초, 1.5초, 2초
                  console.log(`[ANDROID KAKAO LOGIN] Waiting ${waitTime}ms before next attempt...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                }
              }
              
              if (!sessionFound) {
                console.error('[ANDROID KAKAO LOGIN] Failed to find session after 5 attempts');
                console.error('[ANDROID KAKAO LOGIN] Possible reasons:');
                console.error('[ANDROID KAKAO LOGIN] 1. Login was not completed in external browser');
                console.error('[ANDROID KAKAO LOGIN] 2. Session cookie was not set properly');
                console.error('[ANDROID KAKAO LOGIN] 3. Cookie domain/path mismatch between browser and WebView');
                // 세션을 찾지 못했으므로 로그인 화면 유지
                return;
              }
            } else if (!Capacitor.isNativePlatform()) {
              // 웹: 기존 로직 유지
              if (baseUrl && sessionOk === 'true') {
                // 인증 상태 확인 및 재요청
                await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                
                // 홈으로 이동
                setTimeout(() => {
                  console.log('[DEEP LINK] Redirecting to home page (Web)');
                  window.location.href = '/';
                }, 500);
              }
            }
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

      // 앱이 포그라운드로 돌아왔을 때 세션 확인 (외부 브라우저에서 카카오 로그인 완료 후)
      const handleAppStateChange = async (state: { isActive: boolean }) => {
        if (state.isActive) {
          console.log('[APP STATE] App became active, checking session...');
          
          // 로그아웃 직후에는 세션 확인하지 않음
          const logoutTimestamp = localStorage.getItem("logoutTimestamp");
          const isRecentLogout = logoutTimestamp && (Date.now() - parseInt(logoutTimestamp)) < 30000;
          
          if (isRecentLogout) {
            console.log('[APP STATE] Recent logout detected, skipping session check');
            return;
          }

          // 안드로이드에서만 세션 확인 (웹은 기존 로직 유지)
          if (Capacitor.isNativePlatform()) {
            // 현재 인증되지 않은 상태이고 로딩 중이 아닐 때만 세션 확인
            // 외부 브라우저에서 카카오 로그인 완료 후 앱으로 돌아왔을 때를 감지
            if (!isAuthenticated && !isLoading && !user) {
              console.log('[ANDROID KAKAO LOGIN] ========== App State Change Session Check ==========');
              console.log('[ANDROID KAKAO LOGIN] Android: Not authenticated, checking session after app became active...');
              
              const baseUrl = getApiBaseUrl();
              if (!baseUrl) {
                console.warn('[ANDROID KAKAO LOGIN] Base URL not available');
                return;
              }

              // /api/auth/user 호출하여 로그인 상태 확인 (최대 5번 시도, 점진적 대기 시간)
              let sessionFound = false;
              const checkUrl = `${baseUrl}/api/auth/user`;
              console.log('[ANDROID KAKAO LOGIN] checking /api/auth/user', { url: checkUrl });
              
              for (let attempt = 0; attempt < 5; attempt++) {
                try {
                  console.log(`[ANDROID KAKAO LOGIN] Session check attempt ${attempt + 1}/5`);
                  const response = await fetch(checkUrl, {
                    method: 'GET',
                    credentials: 'include', // 쿠키 포함
                    headers: {
                      'Accept': 'application/json',
                    }
                  });

                  console.log(`[ANDROID KAKAO LOGIN] Response status: ${response.status}`);

                  if (response.ok) {
                    // 200: 로그인됨
                    const userData = await response.json();
                    console.log('[ANDROID KAKAO LOGIN] ✅ /api/auth/user 200 - Session found');
                    console.log('[ANDROID KAKAO LOGIN] User data:', {
                      id: userData?.id,
                      email: userData?.email,
                      firstName: userData?.firstName,
                      lastName: userData?.lastName
                    });
                    sessionFound = true;
                    
                    // auth context 업데이트 (queryClient를 통해)
                    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                    
                    // 메인 화면으로 이동
                    console.log('[ANDROID KAKAO LOGIN] Redirecting to home page (main screen)');
                    setTimeout(() => {
                      window.location.href = '/';
                    }, 500);
                    break;
                  } else if (response.status === 401) {
                    // 401: 비로그인 상태
                    console.log('[ANDROID KAKAO LOGIN] /api/auth/user 401');
                    console.log('[ANDROID KAKAO LOGIN] ❌ No session found (401) - login failed or session expired');
                    console.log('[ANDROID KAKAO LOGIN] Staying on login page');
                    // 더 시도하지 않고 종료
                    break;
                  } else {
                    console.warn(`[ANDROID KAKAO LOGIN] Session check failed (attempt ${attempt + 1}):`, response.status);
                    const errorText = await response.text().catch(() => '');
                    console.warn(`[ANDROID KAKAO LOGIN] Error response:`, errorText);
                  }
                } catch (err) {
                  console.error(`[ANDROID KAKAO LOGIN] Session check error (attempt ${attempt + 1}):`, err);
                }

                // 마지막 시도가 아니면 점진적으로 대기 시간 증가
                if (attempt < 4) {
                  const waitTime = (attempt + 1) * 1000; // 1초, 2초, 3초, 4초
                  console.log(`[ANDROID KAKAO LOGIN] Waiting ${waitTime}ms before next attempt...`);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                }
              }

              if (!sessionFound) {
                console.log('[ANDROID KAKAO LOGIN] No session found after 5 attempts');
                console.log('[ANDROID KAKAO LOGIN] This might be because:');
                console.log('[ANDROID KAKAO LOGIN] 1. Login was not completed in external browser');
                console.log('[ANDROID KAKAO LOGIN] 2. Session cookie was not set properly');
                console.log('[ANDROID KAKAO LOGIN] 3. Cookie domain/path mismatch between browser and WebView');
                // 세션을 찾지 못했으므로 로그인 화면 유지
              }
            } else {
              console.log('[APP STATE] Already authenticated or loading, skipping session check');
            }
          } else {
            // 웹: 기존 로직 유지 (세션 확인하지 않음)
            console.log('[APP STATE] Web platform, skipping session check');
          }
        }
      };

      // 앱 상태 변경 리스너 및 브라우저 이벤트 리스너 등록 (async 함수로 래핑)
      (async () => {
        try {
          // 앱 상태 변경 리스너 등록
          appStateListenerRef.current = await CapacitorApp.addListener('appStateChange', handleAppStateChange);
          console.log('[APP STATE] App state change listener registered');

      // Browser 이벤트 리스너 (브라우저가 닫힐 때)
      // 안드로이드에서 외부 브라우저로 카카오 로그인을 시작한 경우,
      // 브라우저가 닫히면 앱으로 돌아왔다는 의미이므로 세션을 확인해야 합니다.
      if (Browser.addListener) {
        await Browser.addListener('browserFinished', async () => {
          console.log('[ANDROID KAKAO LOGIN] ========== Browser Finished Session Check ==========');
          console.log('[ANDROID KAKAO LOGIN] Browser closed, checking session...');
          
          // 안드로이드에서만 세션 확인
          if (Capacitor.isNativePlatform()) {
            const baseUrl = getApiBaseUrl();
            if (!baseUrl) {
              console.warn('[ANDROID KAKAO LOGIN] Base URL not available');
              return;
            }

            // 로그아웃 직후에는 세션 확인하지 않음
            const logoutTimestamp = localStorage.getItem("logoutTimestamp");
            const isRecentLogout = logoutTimestamp && (Date.now() - parseInt(logoutTimestamp)) < 30000;
            
            if (isRecentLogout) {
              console.log('[ANDROID KAKAO LOGIN] Recent logout detected, skipping session check');
              return;
            }

            // 세션 확인 (최대 5번 시도, 점진적 대기 시간)
            let sessionFound = false;
            const checkUrl = `${baseUrl}/api/auth/user`;
            console.log('[ANDROID KAKAO LOGIN] checking /api/auth/user', { url: checkUrl });
            
            for (let attempt = 0; attempt < 5; attempt++) {
              try {
                console.log(`[ANDROID KAKAO LOGIN] Session check attempt ${attempt + 1}/5`);
                const response = await fetch(checkUrl, {
                  method: 'GET',
                  credentials: 'include', // 쿠키 포함
                  headers: {
                    'Accept': 'application/json',
                  }
                });

                console.log(`[ANDROID KAKAO LOGIN] Response status: ${response.status}`);

                if (response.ok) {
                  // 200: 로그인됨
                  const userData = await response.json();
                  console.log('[ANDROID KAKAO LOGIN] ✅ /api/auth/user 200 - Session found');
                  console.log('[ANDROID KAKAO LOGIN] User data:', {
                    id: userData?.id,
                    email: userData?.email,
                    firstName: userData?.firstName,
                    lastName: userData?.lastName
                  });
                  sessionFound = true;
                  
                  // auth context 업데이트 (queryClient를 통해)
                  await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                  
                  // 메인 화면으로 이동
                  console.log('[ANDROID KAKAO LOGIN] Redirecting to home page (main screen)');
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 500);
                  break;
                } else if (response.status === 401) {
                  // 401: 비로그인 상태
                  console.log('[ANDROID KAKAO LOGIN] /api/auth/user 401');
                  console.log('[ANDROID KAKAO LOGIN] ❌ No session found (401) - login failed or session expired');
                  console.log('[ANDROID KAKAO LOGIN] Staying on login page');
                  break; // 더 이상 시도하지 않음
                } else {
                  console.warn(`[ANDROID KAKAO LOGIN] Session check failed (attempt ${attempt + 1}):`, response.status);
                  const errorText = await response.text().catch(() => '');
                  console.warn(`[ANDROID KAKAO LOGIN] Error response:`, errorText);
                }
              } catch (err) {
                console.error(`[ANDROID KAKAO LOGIN] Session check error (attempt ${attempt + 1}):`, err);
              }

              // 마지막 시도가 아니면 점진적으로 대기 시간 증가
              if (attempt < 4) {
                const waitTime = (attempt + 1) * 1000; // 1초, 2초, 3초, 4초
                console.log(`[ANDROID KAKAO LOGIN] Waiting ${waitTime}ms before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            }

            if (!sessionFound) {
              console.error('[ANDROID KAKAO LOGIN] Failed to find session after 5 attempts');
              console.error('[ANDROID KAKAO LOGIN] Possible reasons:');
              console.error('[ANDROID KAKAO LOGIN] 1. Login was not completed in external browser');
              console.error('[ANDROID KAKAO LOGIN] 2. Session cookie was not set properly');
              console.error('[ANDROID KAKAO LOGIN] 3. Cookie domain/path mismatch between browser and WebView');
              // 세션을 찾지 못했으므로 로그인 화면 유지
            }
          } else {
            console.log('[BROWSER] Web platform, skipping session check');
          }
        });
        console.log('[BROWSER] Browser finished listener registered');
      } else {
        console.warn('[BROWSER] Browser.addListener not supported');
      }
        } catch (error) {
          console.error('[APP STATE] Failed to register listeners:', error);
        }
      })();

      // Cleanup
      return () => {
        if (appStateListenerRef.current) {
          appStateListenerRef.current.remove();
        }
        Browser.removeAllListeners();
      };
    }
  }, [setLanguage, queryClient, isAuthenticated, isLoading, user]);

  // Check for language parameter and login_success in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    const loginSuccess = params.get('login_success');
    
    if (langParam && ['ko', 'en', 'zh', 'ja'].includes(langParam)) {
      setLanguage(langParam as Language);
    }
    
    // 안드로이드 WebView에서 카카오 로그인 성공 후 리다이렉트된 경우
    if (loginSuccess === 'true') {
      console.log('[ANDROID WEBVIEW LOGIN] Login success detected, refreshing auth state...');
      // 인증 상태 갱신
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
    
    // Clean up URL parameters
    if (langParam || loginSuccess) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setLanguage, queryClient]);

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
  // 단, 로그아웃 직후에는 절대 실행하지 않음 (자동 로그인 방지)
  useEffect(() => {
    // 로그아웃 플래그 확인 (30초 이내 로그아웃한 경우 자동 인증 재확인 완전 비활성화)
    const logoutTimestamp = localStorage.getItem("logoutTimestamp");
    const isRecentLogout = logoutTimestamp && (Date.now() - parseInt(logoutTimestamp)) < 30000; // 30초로 증가
    
    if (isRecentLogout) {
      console.log('[AUTH] Recent logout detected (within 30s), skipping automatic auth recheck completely');
      // 로그아웃 플래그 제거 (30초 후 자동으로 만료되지만 명시적으로 제거)
      if (Date.now() - parseInt(logoutTimestamp) > 30000) {
        localStorage.removeItem("logoutTimestamp");
      }
      return; // 로그아웃 직후에는 절대 자동 인증 재확인을 하지 않음
    }
    
    // 로그아웃 플래그가 없을 때만 자동 인증 재확인 실행
    // 단, 로그인/회원가입 직후에만 실행 (랜딩 페이지에서 세션 쿠키가 설정될 시간 확보)
    if (Capacitor.isNativePlatform() && !isLoading && !isAuthenticated && !user) {
      // 추가 안전장치: URL에 logout 파라미터가 있으면 실행하지 않음
      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === 'true') {
        console.log('[AUTH] Logout parameter detected, skipping automatic auth recheck');
        return;
      }
      
      // 로그인/회원가입 직후 세션 쿠키가 아직 전달되지 않았을 수 있음
      // 추가 확인을 위해 짧은 지연 후 재확인 (최대 5번, 더 긴 대기 시간)
      let retryCount = 0;
      const maxRetries = 5;
      
      const checkAuthAgain = async () => {
        // 재확인 중에도 로그아웃 플래그 확인 (매번 확인)
        const currentLogoutTimestamp = localStorage.getItem("logoutTimestamp");
        const isStillRecentLogout = currentLogoutTimestamp && (Date.now() - parseInt(currentLogoutTimestamp)) < 30000;
        
        if (isStillRecentLogout) {
          console.log('[AUTH] Logout detected during recheck, stopping automatic auth recheck immediately');
          return;
        }
        
        // URL 파라미터도 다시 확인
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('logout') === 'true') {
          console.log('[AUTH] Logout parameter detected during recheck, stopping');
          return;
        }
        
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
            // 인증 성공 - 하지만 로그아웃 플래그가 있으면 이동하지 않음
            const finalLogoutCheck = localStorage.getItem("logoutTimestamp");
            if (finalLogoutCheck && (Date.now() - parseInt(finalLogoutCheck)) < 30000) {
              console.log('[AUTH] Logout detected after auth check, preventing auto-login');
              return;
            }
            
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
        {/* 카카오 OAuth 콜백 페이지 (인증 전에도 접근 가능) */}
        <Route path="/api/kakao/callback" component={KakaoCallback} />
        
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

import { ErrorBoundary } from "@/components/error-boundary";

function App() {
  // 앱 실행 시 화면 꺼짐 방지 활성화 및 상태바 색상 설정 (Android/iOS)
  // 동적 import를 사용하여 빌드 시 오류 방지 및 웹 환경에서 안전하게 처리
  useEffect(() => {
    const initializeNativeFeatures = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // 화면 꺼짐 방지
          try {
            const pluginPath = '@capacitor-community/keep-awake';
            const { KeepAwake } = await import(/* @vite-ignore */ pluginPath);
            await KeepAwake.keepAwake();
            console.log('[App] Screen Keep Awake enabled');
          } catch (err) {
            console.warn('[App] Keep Awake plugin not available:', err);
          }

          // 상태바 색상 설정
          try {
            const { StatusBar, Style } = await import("@capacitor/status-bar");
            const savedLayoutTheme = localStorage.getItem("layoutTheme");
            const layoutTheme = (savedLayoutTheme === "default" || savedLayoutTheme === "lavender-night" || savedLayoutTheme === "couple-clay") 
              ? savedLayoutTheme 
              : "default";
            
            if (layoutTheme === "default") {
              // 기본 테마: 밝은 배경이므로 Light style (어두운 아이콘) + 흰색 배경
              await StatusBar.setStyle({ style: Style.Light });
              await StatusBar.setBackgroundColor({ color: "#ffffff" });
              await StatusBar.setOverlaysWebView({ overlay: false });
            } else if (layoutTheme === "lavender-night") {
              // 라벤더 나이트 테마: 어두운 배경이므로 Dark style (밝은 아이콘) + 어두운 배경
              await StatusBar.setStyle({ style: Style.Dark });
              await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
              await StatusBar.setOverlaysWebView({ overlay: false });
            } else if (layoutTheme === "couple-clay") {
              // 커플 클레이 테마: 밝은 배경이므로 Light style (어두운 아이콘) + 밝은 핑크 배경
              await StatusBar.setStyle({ style: Style.Light });
              await StatusBar.setBackgroundColor({ color: "#ffc0e8" });
              await StatusBar.setOverlaysWebView({ overlay: false });
            }
            console.log('[App] StatusBar color set for theme:', layoutTheme);
          } catch (err) {
            console.warn('[App] StatusBar plugin not available:', err);
          }
        }
      } catch (err) {
        console.warn('[App] Native features initialization error:', err);
      }
    };
    
    initializeNativeFeatures();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LayoutThemeProvider>
          <LanguageProvider>
            <FontProvider>
              <MapProviderProvider>
                <TooltipProvider>
                  <Toaster />
                  <ErrorBoundary>
                    <Router />
                  </ErrorBoundary>
                </TooltipProvider>
              </MapProviderProvider>
            </FontProvider>
          </LanguageProvider>
        </LayoutThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
