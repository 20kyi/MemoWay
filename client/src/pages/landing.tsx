import { Button } from "@/components/ui/button";
import { MapPin, Globe, Users, Languages, Heart, Sparkles, Mail } from "lucide-react";
import { useLanguage, type Language } from "@/lib/language-context";
import { Capacitor } from "@capacitor/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getApiBaseUrl } from "@/lib/api-config";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
];

// 이메일 로그인 스키마
const loginSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

// 이메일 회원가입 스키마
const registerSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  firstName: z.string().min(1, "이름을 입력하세요"),
});

export default function Landing() {
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  // 이메일 로그인 폼
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 이메일 회원가입 폼
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
    },
  });

  // 이메일 로그인 mutation
  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const isNativePlatform = Capacitor.isNativePlatform();
      
      console.log("[LOGIN] ========== STARTING LOGIN ==========");
      console.log("[LOGIN] Email:", data.email);
      console.log("[LOGIN] Platform:", isNativePlatform ? "Android/Capacitor" : "Web Browser");
      console.log("[LOGIN] Calling apiRequest with:", { method: "POST", url: "/api/email/login" });
      
      if (isNativePlatform) {
        console.log("[MOBILE LOGIN] ========== STARTING LOGIN ==========");
        console.log("[MOBILE LOGIN] Email:", data.email);
        console.log("[MOBILE LOGIN] Platform: Android/Capacitor");
        const baseUrl = getApiBaseUrl();
        console.log("[MOBILE LOGIN] API Base URL:", baseUrl);
        console.log("[MOBILE LOGIN] Final URL will be:", `${baseUrl}/api/email/login`);
      }
      
      try {
        const result = await apiRequest("POST", "/api/email/login", data);
        console.log("[LOGIN] ========== LOGIN SUCCESS ==========");
        console.log("[LOGIN] Response:", result);
        
        if (isNativePlatform) {
          console.log("[MOBILE LOGIN] ========== LOGIN SUCCESS ==========");
          console.log("[MOBILE LOGIN] Response:", result);
          console.log("[MOBILE LOGIN] Session cookie should be set now");
        }
        
        return result;
      } catch (error: any) {
        console.error("[LOGIN] ========== LOGIN ERROR ==========");
        console.error("[LOGIN] Error name:", error?.name);
        console.error("[LOGIN] Error message:", error?.message);
        console.error("[LOGIN] Error status:", error?.status);
        console.error("[LOGIN] Error error:", error?.error);
        console.error("[LOGIN] Full error object:", error);
        
        if (isNativePlatform) {
          console.error("[MOBILE LOGIN] ========== LOGIN ERROR ==========");
          console.error("[MOBILE LOGIN] Error name:", error?.name);
          console.error("[MOBILE LOGIN] Error message:", error?.message);
          console.error("[MOBILE LOGIN] Error status:", error?.status);
          console.error("[MOBILE LOGIN] Error error:", error?.error);
          
          if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error("[MOBILE LOGIN] Network error detected - check connection and server URL");
          }
          
          if (error.status === 401) {
            console.error("[MOBILE LOGIN] 401 Unauthorized - credentials might be invalid");
          }
        }
        
        throw error;
      }
    },
    onSuccess: async () => {
      console.log("[LOGIN] onSuccess callback called");
      toast({
        title: language === 'ko' ? "로그인 성공" : "Login successful",
        description: language === 'ko' ? "환영합니다!" : "Welcome!",
      });
      setLoginDialogOpen(false);
      loginForm.reset();
      
      // 인증 상태 쿼리 무효화 및 재요청
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // 네이티브 앱에서도 직접 페이지 리로드 (세션 쿠키가 설정될 시간 확보)
      // Deep Link는 OAuth 콜백에서만 사용하고, 이메일 로그인은 직접 리다이렉트
      if (Capacitor.isNativePlatform()) {
        // 네이티브 앱: 세션 쿠키가 설정될 시간을 확보한 후 페이지 리로드
        // 네이티브 앱에서는 쿠키 전파가 더 느릴 수 있으므로 더 긴 대기 시간
        setTimeout(() => {
          // 페이지를 완전히 리로드하여 세션 쿠키를 포함한 새 요청 보내기
          window.location.href = "/";
        }, 1000);
      } else {
        // 웹: 일반 리다이렉트
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }
    },
    onError: (error: any) => {
      console.error("[LOGIN] onError callback called");
      console.error("[LOGIN] Error in onError:", error);
      
      const isNativePlatform = Capacitor.isNativePlatform();
      
      // 에러 메시지 생성 (더 상세한 정보 포함)
      let errorMessage = error?.error || error?.message || (language === 'ko' ? "로그인에 실패했습니다" : "Failed to login");
      
      // 네트워크 에러 처리
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = language === 'ko' 
          ? "네트워크 에러: 서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요."
          : "Network error: Unable to connect to server. Please check your internet connection.";
        
        if (isNativePlatform) {
          const baseUrl = getApiBaseUrl();
          errorMessage += `\n${language === 'ko' ? '서버 URL:' : 'Server URL:'} ${baseUrl}`;
        }
      }
      
      // HTTP 상태 코드별 메시지
      if (error?.status === 401) {
        errorMessage = language === 'ko'
          ? "서버 응답: 401 Unauthorized - 이메일 또는 비밀번호가 올바르지 않습니다."
          : "Server response: 401 Unauthorized - Invalid email or password.";
      } else if (error?.status === 0) {
        errorMessage = language === 'ko'
          ? "네트워크 에러: 서버에 연결할 수 없습니다."
          : "Network error: Unable to connect to server.";
      } else if (error?.status) {
        errorMessage = `${language === 'ko' ? '서버 응답' : 'Server response'}: ${error.status} ${error.statusText || ''} - ${errorMessage}`;
      }
      
      if (isNativePlatform) {
        console.error("[MOBILE LOGIN] onError - showing toast with error:", errorMessage);
      }
      
      toast({
        title: language === 'ko' ? "로그인 실패" : "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // 이메일 회원가입 mutation
  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      console.log("[REGISTER] ========== STARTING REGISTRATION ==========");
      console.log("[REGISTER] Email:", data.email);
      console.log("[REGISTER] Calling apiRequest with:", { method: "POST", url: "/api/email/register" });
      
      try {
        const result = await apiRequest("POST", "/api/email/register", data);
        console.log("[REGISTER] ========== REGISTRATION SUCCESS ==========");
        console.log("[REGISTER] Response:", result);
        return result;
      } catch (error: any) {
        console.error("[REGISTER] ========== REGISTRATION ERROR ==========");
        console.error("[REGISTER] Error name:", error?.name);
        console.error("[REGISTER] Error message:", error?.message);
        console.error("[REGISTER] Error status:", error?.status);
        console.error("[REGISTER] Error error:", error?.error);
        console.error("[REGISTER] Full error object:", error);
        throw error;
      }
    },
    onSuccess: async () => {
      toast({
        title: language === 'ko' ? "회원가입 성공" : "Registration successful",
        description: language === 'ko' ? "환영합니다!" : "Welcome!",
      });
      setRegisterDialogOpen(false);
      registerForm.reset();
      
      // 인증 상태 쿼리 무효화 및 재요청
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // 네이티브 앱에서도 직접 페이지 리로드 (세션 쿠키가 설정될 시간 확보)
      // Deep Link는 OAuth 콜백에서만 사용하고, 이메일 회원가입은 직접 리다이렉트
      if (Capacitor.isNativePlatform()) {
        // 네이티브 앱: 세션 쿠키가 설정될 시간을 확보한 후 페이지 리로드
        // 네이티브 앱에서는 쿠키 전파가 더 느릴 수 있으므로 더 긴 대기 시간
        setTimeout(() => {
          // 페이지를 완전히 리로드하여 세션 쿠키를 포함한 새 요청 보내기
          window.location.href = "/";
        }, 1000);
      } else {
        // 웹: 일반 리다이렉트
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }
    },
    onError: (error: any) => {
      toast({
        title: language === 'ko' ? "회원가입 실패" : "Registration failed",
        description: error.error || error.message || (language === 'ko' ? "회원가입에 실패했습니다" : "Failed to register"),
        variant: "destructive",
      });
    },
  });

  const handleKakaoLogin = async () => {
    if (Capacitor.isNativePlatform()) {
      // Android: Kakao SDK + REST API 방식
      const timestamp = new Date().toISOString();
      try {
        console.log(`[${timestamp}] [KAKAO LOGIN] ========== Starting Android Kakao login with SDK ==========`);
        console.log('[KAKAO LOGIN] Platform:', Capacitor.getPlatform());
        console.log('[KAKAO LOGIN] Is native platform:', Capacitor.isNativePlatform());
        
        // @team-lepisode/capacitor-kakao-login 플러그인 사용
        console.log('[KAKAO LOGIN] Attempting to load @team-lepisode/capacitor-kakao-login plugin...');
        
        let KakaoLogin: any;
        try {
          // 동적 import를 try-catch로 감싸서 빌드 시 에러 방지
          // 플러그인이 설치되지 않았거나 로드할 수 없으면 웹 OAuth로 fallback
          const pluginModule = await import('@team-lepisode/capacitor-kakao-login').catch((err) => {
            console.warn('[KAKAO LOGIN] Plugin import failed, using web OAuth fallback:', err);
            return null;
          });
          
          if (!pluginModule || !pluginModule.KakaoLogin) {
            throw new Error('Plugin module not available');
          }
          
          KakaoLogin = pluginModule.KakaoLogin;
          console.log('[KAKAO LOGIN] ✅ Plugin loaded successfully');
        } catch (importError: any) {
          console.error('[KAKAO LOGIN] ❌ Failed to load plugin:', importError?.message || importError);
          // 플러그인을 로드할 수 없으면 웹 OAuth 플로우로 fallback
          console.log('[KAKAO LOGIN] Falling back to web OAuth flow...');
          const baseUrl = getApiBaseUrl();
          const loginUrl = baseUrl 
            ? `${baseUrl}/api/kakao/login?lang=${language}&platform=web`
            : `/api/kakao/login?lang=${language}&platform=web`;
          window.location.href = loginUrl;
          return;
        }
        
        if (!KakaoLogin || typeof KakaoLogin.login !== 'function') {
          console.error('[KAKAO LOGIN] ❌ Plugin or login method not available');
          // 웹 OAuth로 fallback
          const baseUrl = getApiBaseUrl();
          const loginUrl = baseUrl 
            ? `${baseUrl}/api/kakao/login?lang=${language}&platform=web`
            : `/api/kakao/login?lang=${language}&platform=web`;
          window.location.href = loginUrl;
          return;
        }
        
        // 플러그인 초기화 (필요시 - 앱 시작 시 한 번만 호출)
        try {
          await KakaoLogin.initialize({
            appKey: '972181125f7cd0fb9dbd9442fdde314e' // 네이티브 앱 키 사용
          });
          console.log('[KAKAO LOGIN] ✅ Plugin initialized');
        } catch (initError: any) {
          // 이미 초기화되었거나 에러가 발생해도 계속 진행
          console.warn('[KAKAO LOGIN] ⚠️ Plugin initialization warning (may already be initialized):', initError?.message || initError);
        }
        
        console.log('[KAKAO LOGIN] Calling Kakao SDK login...');
        const sdkLoginStart = Date.now();
        
        // 카카오 로그인 실행
        const loginResult = await KakaoLogin.login();
        const sdkLoginTime = Date.now() - sdkLoginStart;
        
        console.log('[KAKAO LOGIN] ✅ Kakao SDK login successful:', {
          hasAccessToken: !!loginResult.accessToken,
          hasId: !!loginResult.id,
          hasEmail: !!loginResult.email,
          hasNickname: !!loginResult.nickname,
          hasProfileImage: !!loginResult.profileImage,
          accessTokenLength: loginResult.accessToken?.length || 0,
          loginTime: sdkLoginTime + 'ms',
          fullResult: loginResult // 디버깅용
        });
        
        // 플러그인 응답 형식에 맞게 변환 (서버 API 형식에 맞춤)
        const kakaoResult = {
          accessToken: loginResult.accessToken || '',
          refreshToken: loginResult.refreshToken,
          id: loginResult.id?.toString() || String(loginResult.id) || '',
          email: loginResult.email,
          nickname: loginResult.nickname,
          profileImage: loginResult.profileImage
        };
        
        // 서버에 accessToken 전달하여 세션 생성
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) {
          console.error('[KAKAO LOGIN] ❌ Server configuration missing');
          throw new Error('Server configuration missing');
        }
        
        console.log('[KAKAO LOGIN] Server base URL:', baseUrl);
        console.log('[KAKAO LOGIN] Sending login request to server...');
        const serverRequestStart = Date.now();
        
        const requestBody = {
          accessToken: kakaoResult.accessToken,
          kakaoId: kakaoResult.id,
          email: kakaoResult.email,
          nickname: kakaoResult.nickname,
          profileImage: kakaoResult.profileImage,
        };
        console.log('[KAKAO LOGIN] Request body (sanitized):', {
          hasAccessToken: !!requestBody.accessToken,
          hasKakaoId: !!requestBody.kakaoId,
          kakaoId: requestBody.kakaoId,
          hasEmail: !!requestBody.email,
          hasNickname: !!requestBody.nickname,
          hasProfileImage: !!requestBody.profileImage
        });
        
        const response = await fetch(`${baseUrl}/api/kakao/android-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 쿠키 포함 (세션 쿠키 받기 위해)
          body: JSON.stringify(requestBody),
        });
        
        const serverRequestTime = Date.now() - serverRequestStart;
        console.log('[KAKAO LOGIN] Server response status:', response.status);
        console.log('[KAKAO LOGIN] Server response time:', serverRequestTime + 'ms');
        console.log('[KAKAO LOGIN] Server response headers:', {
          'content-type': response.headers.get('content-type'),
          'set-cookie': response.headers.get('set-cookie') ? 'present' : 'missing'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Unknown error' };
          }
          console.error('[KAKAO LOGIN] ❌ Server login failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.error || errorData.details || `Server error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[KAKAO LOGIN] ✅ Server login successful:', {
          success: result.success,
          userId: result.user?.id,
          userEmail: result.user?.email,
          hasSessionId: !!result.sessionId
        });
        
        // 세션이 생성되었으므로 인증 상태 갱신
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // 성공 메시지
        toast({
          title: language === 'ko' ? "로그인 성공" : "Login successful",
          description: language === 'ko' 
            ? "카카오 로그인이 완료되었습니다."
            : "Kakao login completed successfully.",
        });
        
        // 홈으로 이동 (라우터가 자동으로 인증 상태를 확인하여 리다이렉트)
        // useAuth hook이 세션을 확인하여 자동으로 홈으로 이동시킴
        window.location.href = '/';
        
      } catch (error: any) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [KAKAO LOGIN] ❌ ========== Android Kakao login failed ==========`);
        console.error('[KAKAO LOGIN] ❌ Error type:', error?.constructor?.name || typeof error);
        console.error('[KAKAO LOGIN] ❌ Error message:', error?.message);
        console.error('[KAKAO LOGIN] ❌ Error stack:', error?.stack);
        console.error('[KAKAO LOGIN] ❌ Full error object:', error);
        
        let errorMessage = language === 'ko' 
          ? "카카오 로그인에 실패했습니다."
          : "Kakao login failed.";
        
        if (error.message) {
          if (error.message.includes('Server configuration')) {
            errorMessage = language === 'ko'
              ? "서버 연결 설정이 없습니다. 앱을 다시 설치해주세요."
              : "Server configuration missing. Please reinstall the app.";
          } else if (error.message.includes('Invalid access token')) {
            errorMessage = language === 'ko'
              ? "유효하지 않은 카카오 토큰입니다."
              : "Invalid Kakao access token.";
          } else if (error.message.includes('plugin not found')) {
            errorMessage = language === 'ko'
              ? "카카오 로그인 플러그인을 찾을 수 없습니다. 앱을 다시 빌드해주세요."
              : "Kakao login plugin not found. Please rebuild the app.";
          } else {
            errorMessage = error.message;
          }
        }
        
        toast({
          title: language === 'ko' ? "로그인 실패" : "Login failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } else {
      // 웹: 기존 OAuth redirect 방식 유지
      const loginUrl = `/api/kakao/login?lang=${language}&platform=web`;
      window.location.href = loginUrl;
    }
  };

  const handleGoogleLogin = () => {
    if (Capacitor.isNativePlatform()) {
      // 네이티브 앱: 절대 URL 사용
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        toast({
          title: language === 'ko' ? "오류" : "Error",
          description: language === 'ko' 
            ? "서버 연결 설정이 없습니다. 앱을 다시 설치해주세요."
            : "Server configuration missing. Please reinstall the app.",
          variant: "destructive",
        });
        return;
      }
      const loginUrl = `${baseUrl}/api/google/login?lang=${language}`;
      window.location.href = loginUrl;
    } else {
      // 웹: 상대 경로 사용
      const loginUrl = `/api/google/login?lang=${language}`;
      window.location.href = loginUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100/50 to-pink-50 flex items-center justify-center relative overflow-hidden pt-[env(safe-area-inset-top)]">
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-full shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md" 
              data-testid="button-language-selector"
            >
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="backdrop-blur-sm bg-white/95 z-50">
            {languageOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setLanguage(option.value)}
                className={language === option.value ? "bg-primary/20" : ""}
                data-testid={`language-option-${option.value}`}
              >
                <span className="text-xl mr-2">{option.flag}</span>
                <span>{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Login Content */}
      <div className="w-full max-w-md px-6 py-8 relative z-10">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo - Split Heart */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-24 h-24">
              <svg 
                className="w-full h-full" 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <clipPath id="leftHalf">
                    <rect x="0" y="0" width="50" height="100" />
                  </clipPath>
                  <clipPath id="rightHalf">
                    <rect x="50" y="0" width="50" height="100" />
                  </clipPath>
                </defs>
                {/* Heart shape path */}
                <path 
                  d="M50 85C50 85 20 60 20 35C20 22 30 12 43 12C49 12 50 15 50 15C50 15 51 12 57 12C70 12 80 22 80 35C80 60 50 85 50 85Z" 
                  fill="#0ea5e9"
                  clipPath="url(#leftHalf)"
                />
                <path 
                  d="M50 85C50 85 20 60 20 35C20 22 30 12 43 12C49 12 50 15 50 15C50 15 51 12 57 12C70 12 80 22 80 35C80 60 50 85 50 85Z" 
                  fill="#60a5fa"
                  clipPath="url(#rightHalf)"
                />
              </svg>
            </div>
            
            {/* MemoWay Text */}
            <h1 className="text-4xl sm:text-5xl font-bold text-sky-600 dark:text-sky-500 tracking-tight">
              MemoWay
            </h1>
          </div>

          {/* Login Buttons */}
          <div className="w-full space-y-4">
            {/* Email Login Button */}
            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  className="w-full h-12 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  <Mail className="h-5 w-5 mr-2 text-white" />
                  {language === 'ko' && '이메일로 계속하기'}
                  {language === 'en' && 'Continue with Email'}
                  {language === 'zh' && '使用邮箱继续'}
                  {language === 'ja' && 'メールで続ける'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg">
                    {language === 'ko' && '이메일 로그인'}
                    {language === 'en' && 'Email Login'}
                    {language === 'zh' && '邮箱登录'}
                    {language === 'ja' && 'メールログイン'}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {language === 'ko' && '이메일과 비밀번호로 로그인하세요'}
                    {language === 'en' && 'Sign in with your email and password'}
                    {language === 'zh' && '使用您的邮箱和密码登录'}
                    {language === 'ja' && 'メールアドレスとパスワードでログイン'}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm">
                      {language === 'ko' && '이메일'}
                      {language === 'en' && 'Email'}
                      {language === 'zh' && '邮箱'}
                      {language === 'ja' && 'メールアドレス'}
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="example@email.com"
                      className="text-sm"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm">
                      {language === 'ko' && '비밀번호'}
                      {language === 'en' && 'Password'}
                      {language === 'zh' && '密码'}
                      {language === 'ja' && 'パスワード'}
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      className="text-sm"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="flex-1 text-sm"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending
                        ? (language === 'ko' ? '로그인 중...' : 'Logging in...')
                        : (language === 'ko' ? '로그인' : 'Login')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-sm"
                      onClick={() => {
                        setLoginDialogOpen(false);
                        setRegisterDialogOpen(true);
                      }}
                    >
                      {language === 'ko' && '회원가입'}
                      {language === 'en' && 'Sign up'}
                      {language === 'zh' && '注册'}
                      {language === 'ja' && '新規登録'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* OR Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300"></span>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-transparent px-2 text-gray-600">
                  {language === 'ko' && '또는'}
                  {language === 'en' && 'or'}
                  {language === 'zh' && '或'}
                  {language === 'ja' && 'または'}
                </span>
              </div>
            </div>

            {/* Google Login Button */}
            <Button 
              size="lg" 
              className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-900 font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
              onClick={handleGoogleLogin}
              data-testid="button-google-login"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {language === 'ko' && 'Google로 로그인'}
              {language === 'en' && 'Sign in with Google'}
              {language === 'zh' && '使用 Google 登录'}
              {language === 'ja' && 'Google でログイン'}
            </Button>

            {/* Apple Login Button */}
            <Button 
              size="lg" 
              className="w-full h-12 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-900 font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
              onClick={() => {
                toast({
                  title: language === 'ko' ? '알림' : 'Notice',
                  description: language === 'ko' 
                    ? 'Apple 로그인은 현재 준비 중입니다.' 
                    : 'Apple sign-in is currently under development.',
                });
              }}
              data-testid="button-apple-login"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {language === 'ko' && 'Apple로 로그인'}
              {language === 'en' && 'Sign in with Apple'}
              {language === 'zh' && '使用 Apple 登录'}
              {language === 'ja' && 'Apple でログイン'}
            </Button>

            {/* Kakao Login Button */}
            <Button 
              size="lg" 
              className="w-full h-12 bg-[#FEE500] hover:bg-[#FDD835] border border-[#FDD835] hover:border-[#FBC02D] text-[#000000] font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
              onClick={handleKakaoLogin}
              data-testid="button-kakao-login"
            >
              <Heart className="h-5 w-5 mr-2 fill-current" />
              {language === 'ko' && '카카오로 로그인'}
              {language === 'en' && 'Sign in with Kakao'}
              {language === 'zh' && '使用 Kakao 登录'}
              {language === 'ja' && 'Kakao でログイン'}
            </Button>
          </div>

          {/* Sign Up Link */}
          <p className="text-sm text-gray-600 text-center">
            {language === 'ko' && '계정이 없으신가요? '}
            {language === 'en' && "Don't have an account? "}
            {language === 'zh' && '没有账户？'}
            {language === 'ja' && 'アカウントをお持ちでないですか？'}
            <button
              onClick={() => setRegisterDialogOpen(true)}
              className="text-sky-600 hover:text-sky-700 dark:text-sky-500 dark:hover:text-sky-400 font-medium underline"
            >
              {language === 'ko' && '회원가입'}
              {language === 'en' && 'Sign up'}
              {language === 'zh' && '注册'}
              {language === 'ja' && '新規登録'}
            </button>
          </p>

          {/* Register Dialog */}
          <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
            <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg">
                  {language === 'ko' && '회원가입'}
                  {language === 'en' && 'Sign up'}
                  {language === 'zh' && '注册'}
                  {language === 'ja' && '新規登録'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {language === 'ko' && '새 계정을 만들어보세요'}
                  {language === 'en' && 'Create a new account'}
                  {language === 'zh' && '创建新账户'}
                  {language === 'ja' && '新しいアカウントを作成'}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm">
                    {language === 'ko' && '이메일'}
                    {language === 'en' && 'Email'}
                    {language === 'zh' && '邮箱'}
                    {language === 'ja' && 'メールアドレス'}
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="example@email.com"
                    className="text-sm"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm">
                    {language === 'ko' && '비밀번호'}
                    {language === 'en' && 'Password'}
                    {language === 'zh' && '密码'}
                    {language === 'ja' && 'パスワード'}
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder={language === 'ko' ? '최소 6자 이상' : 'At least 6 characters'}
                    className="text-sm"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-firstName" className="text-sm">
                    {language === 'ko' && '이름'}
                    {language === 'en' && 'Name'}
                    {language === 'zh' && '姓名'}
                    {language === 'ja' && '名前'}
                  </Label>
                  <Input
                    id="register-firstName"
                    type="text"
                    className="text-sm"
                    {...registerForm.register("firstName")}
                  />
                  {registerForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">
                      {registerForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 text-sm"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending
                      ? (language === 'ko' ? '가입 중...' : 'Signing up...')
                      : (language === 'ko' ? '회원가입' : 'Sign up')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-sm"
                    onClick={() => {
                      setRegisterDialogOpen(false);
                      setLoginDialogOpen(true);
                    }}
                  >
                    {language === 'ko' && '로그인'}
                    {language === 'en' && 'Login'}
                    {language === 'zh' && '登录'}
                    {language === 'ja' && 'ログイン'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
