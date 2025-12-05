import { useEffect, useState } from "react";
import { useLocation, useRouter } from "wouter";
import { getApiBaseUrl } from "@/lib/api-config";
import { Capacitor } from "@capacitor/core";
import { useQueryClient } from "@tanstack/react-query";

export default function KakaoCallback() {
  const [, setLocation] = useRouter();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[KAKAO CALLBACK] ========== Processing Kakao OAuth callback ==========');
        console.log('[KAKAO CALLBACK] Current URL:', window.location.href);
        
        // URL에서 인가 코드와 state 추출
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        console.log('[KAKAO CALLBACK] URL params:', {
          hasCode: !!code,
          hasState: !!state,
          error: error || 'none',
          errorDescription: errorDescription || 'none'
        });
        
        // OAuth 에러 처리
        if (error) {
          console.error('[KAKAO CALLBACK] ❌ OAuth error:', error, errorDescription);
          setStatus("error");
          setErrorMessage(errorDescription || error || "카카오 로그인에 실패했습니다.");
          
          // 앱인 경우 딥링크로 에러 전달
          if (Capacitor.isNativePlatform()) {
            setTimeout(() => {
              window.location.href = `com.memoway.app://login?error=oauth_failed&message=${encodeURIComponent(errorDescription || error)}`;
            }, 2000);
          } else {
            // 웹인 경우 홈으로 리다이렉트
            setTimeout(() => {
              setLocation('/?error=oauth_failed&provider=kakao');
            }, 2000);
          }
          return;
        }
        
        // 인가 코드가 없으면 에러
        if (!code) {
          console.error('[KAKAO CALLBACK] ❌ No authorization code received');
          setStatus("error");
          setErrorMessage("인가 코드를 받지 못했습니다.");
          
          if (Capacitor.isNativePlatform()) {
            setTimeout(() => {
              window.location.href = 'com.memoway.app://login?error=no_code';
            }, 2000);
          } else {
            setTimeout(() => {
              setLocation('/?error=oauth_failed&provider=kakao');
            }, 2000);
          }
          return;
        }
        
        // 서버로 인가 코드 전달
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) {
          console.error('[KAKAO CALLBACK] ❌ Server configuration missing');
          setStatus("error");
          setErrorMessage("서버 연결 설정이 없습니다.");
          return;
        }
        
        console.log('[KAKAO CALLBACK] Exchanging code with server...');
        console.log('[KAKAO CALLBACK] Server URL:', baseUrl);
        
        const response = await fetch(`${baseUrl}/api/kakao/exchange-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 쿠키 포함 (세션 쿠키 받기 위해)
          body: JSON.stringify({
            code,
            state,
            lang: new URLSearchParams(window.location.search).get('lang') || 'ko',
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[KAKAO CALLBACK] ❌ Server error:', errorData);
          setStatus("error");
          setErrorMessage(errorData.error || errorData.details || `서버 오류: ${response.status}`);
          
          if (Capacitor.isNativePlatform()) {
            setTimeout(() => {
              window.location.href = `com.memoway.app://login?error=server_error&message=${encodeURIComponent(errorData.error || 'Server error')}`;
            }, 2000);
          } else {
            setTimeout(() => {
              setLocation('/?error=oauth_failed&provider=kakao');
            }, 2000);
          }
          return;
        }
        
        const result = await response.json();
        console.log('[KAKAO CALLBACK] ✅ Login successful:', {
          success: result.success,
          userId: result.user?.id,
          sessionId: result.sessionId
        });
        
        setStatus("success");
        
        // 인증 상태 갱신
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // 앱인 경우 딥링크로 리다이렉트
        if (Capacitor.isNativePlatform()) {
          const lang = result.lang || 'ko';
          const deepLink = `com.memoway.app://login?success=true&lang=${lang}&session_ok=true`;
          
          console.log('[KAKAO CALLBACK] Redirecting to app via Deep Link:', deepLink);
          
          // 세션 쿠키가 설정될 시간을 확보
          setTimeout(() => {
            window.location.href = deepLink;
          }, 1000);
        } else {
          // 웹인 경우 홈으로 리다이렉트
          const lang = result.lang || 'ko';
          setTimeout(() => {
            setLocation(`/?lang=${lang}`);
          }, 1000);
        }
      } catch (error: any) {
        console.error('[KAKAO CALLBACK] ❌ Unexpected error:', error);
        setStatus("error");
        setErrorMessage(error?.message || "예기치 않은 오류가 발생했습니다.");
        
        if (Capacitor.isNativePlatform()) {
          setTimeout(() => {
            window.location.href = `com.memoway.app://login?error=unexpected_error&message=${encodeURIComponent(error?.message || 'Unexpected error')}`;
          }, 2000);
        } else {
          setTimeout(() => {
            setLocation('/?error=oauth_failed&provider=kakao');
          }, 2000);
        }
      }
    };
    
    handleCallback();
  }, [setLocation, queryClient]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100/50 to-pink-50 flex items-center justify-center">
      <div className="text-center p-8">
        {status === "processing" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold mb-2">카카오 로그인 처리 중...</h1>
            <p className="text-muted-foreground">잠시만 기다려주세요.</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h1 className="text-xl font-semibold mb-2">로그인 성공!</h1>
            <p className="text-muted-foreground">앱으로 이동 중...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h1 className="text-xl font-semibold mb-2">로그인 실패</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground mt-4">잠시 후 자동으로 이동합니다...</p>
          </>
        )}
      </div>
    </div>
  );
}
