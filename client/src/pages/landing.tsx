import { Button } from "@/components/ui/button";
import { MapPin, Globe, Users, Lock, Languages, Heart, Sparkles } from "lucide-react";
import { useLanguage, type Language } from "@/lib/language-context";
import { Capacitor } from "@capacitor/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KakaoLoginPlugin } from "@/types/capacitor-plugins";

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
];

export default function Landing() {
  const { t, language, setLanguage } = useLanguage();

  const handleKakaoLogin = async () => {
    if (Capacitor.isNativePlatform()) {
      // 안드로이드 네이티브 카카오 로그인
      try {
        // Capacitor 플러그인 동적 로드
        const { registerPlugin } = await import("@capacitor/core");
        
        // 플러그인 등록 (웹 환경에서는 빈 구현체 사용)
        const KakaoLogin = registerPlugin<KakaoLoginPlugin>('KakaoLogin', {
          web: {
            login: async () => {
              throw new Error('Kakao login is not available on web platform');
            },
          },
        });
        
        console.log("카카오 로그인 시작...");
        const result = await KakaoLogin.login();
        console.log("카카오 로그인 결과:", result);
        
        if (!result || !result.accessToken || !result.id) {
          throw new Error("카카오 로그인 결과가 올바르지 않습니다.");
        }
        
        // 서버에 토큰 전송하여 세션 생성
        const response = await fetch("/api/kakao/android-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            accessToken: result.accessToken,
            kakaoId: result.id,
            email: result.email || null,
            nickname: result.nickname || null,
            profileImage: result.profileImage || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("서버 응답 오류:", response.status, errorData);
          throw new Error(errorData.error || response.statusText || "로그인에 실패했습니다");
        }

        // 로그인 성공 - 페이지 새로고침하여 인증 상태 업데이트
        window.location.href = "/";
      } catch (error: any) {
        console.error("카카오 로그인 오류:", error);
        
        // 사용자에게 에러 메시지 표시
        const errorMessage = error?.message || "카카오 로그인 중 오류가 발생했습니다";
        alert(errorMessage);
        
        // 네이티브 플러그인이 없거나 실패하면 웹 방식으로 폴백
        // 안드로이드에서는 웹뷰에서 열어야 함
        try {
          const loginUrl = `/api/kakao/login?lang=${language}`;
          window.location.href = loginUrl;
        } catch (fallbackError) {
          console.error("폴백 로그인도 실패:", fallbackError);
        }
      }
    } else {
      // 웹에서는 같은 창에서 로그인
      const loginUrl = `/api/kakao/login?lang=${language}`;
      window.location.href = loginUrl;
    }
  };

  const handleGoogleLogin = () => {
    // Pass current language as query parameter
    const loginUrl = `/api/google/login?lang=${language}`;
    // Same window redirect
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-accent/20 relative overflow-hidden">
      {/* Decorative hearts */}
      <div className="absolute top-20 left-10 opacity-20">
        <Heart className="h-16 w-16 text-primary fill-primary animate-pulse" />
      </div>
      <div className="absolute bottom-20 right-10 opacity-15">
        <Heart className="h-20 w-20 text-secondary fill-secondary animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute top-1/2 right-1/4 opacity-10">
        <Sparkles className="h-12 w-12 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Language Selector - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full shadow-lg bg-card/80 backdrop-blur-sm hover-elevate" 
              data-testid="button-language-selector"
            >
              <Languages className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="backdrop-blur-sm bg-card/95 z-50">
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

      <div className="container mx-auto px-4 py-16 max-w-6xl relative z-10">
        <div className="flex flex-col items-center text-center space-y-12">
          <div className="space-y-6 animate-in fade-in slide-in-from-top duration-700">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <MapPin className="h-14 w-14 text-primary drop-shadow-lg" />
                <Heart className="h-6 w-6 text-destructive fill-destructive absolute -top-1 -right-1 animate-pulse" />
              </div>
              <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Memo Way
              </h1>
            </div>
            <p className="text-2xl text-foreground/80 max-w-2xl font-medium">
              {language === 'ko' && '우리의 특별한 순간을 기억하세요'}
              {language === 'en' && 'Remember our special moments together'}
              {language === 'zh' && '记住我们的特别时刻'}
              {language === 'ja' && '特別な瞬間を記憶しましょう'}
            </p>
            <p className="text-lg text-muted-foreground max-w-xl">
              {language === 'ko' && '소중한 사람들과 함께한 장소의 추억을 사진과 메모로 남겨보세요'}
              {language === 'en' && 'Save memories of places with your loved ones through photos and notes'}
              {language === 'zh' && '用照片和备忘录保存与亲人在一起的地方的回忆'}
              {language === 'ja' && '大切な人と一緒に過ごした場所の思い出を写真とメモで残しましょう'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom duration-700 delay-200">
            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-primary/30 shadow-lg hover-elevate transition-all hover:shadow-2xl">
              <div className="bg-gradient-to-br from-primary/30 to-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-md">
                <Globe className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-bold text-2xl mb-3 text-primary">
                {language === 'ko' && '지도에 메모 남기기'}
                {language === 'en' && 'Pin Memos on Map'}
                {language === 'zh' && '在地图上添加备忘录'}
                {language === 'ja' && '地図にメモを追加'}
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                {language === 'ko' && '데이트했던 카페, 처음 만난 장소... 특별한 위치에 사진과 함께 메모를 남겨보세요'}
                {language === 'en' && 'The cafe from your date, where you first met... Save memories with photos at special locations'}
                {language === 'zh' && '约会的咖啡馆，第一次见面的地方...在特殊的地方用照片保存回忆'}
                {language === 'ja' && 'デートしたカフェ、初めて会った場所...特別な場所に写真と一緒にメモを残しましょう'}
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-purple-500/40 shadow-lg hover-elevate transition-all hover:shadow-2xl">
              <div className="bg-gradient-to-br from-purple-500/30 to-purple-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-md">
                <Users className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="font-bold text-2xl mb-3 text-purple-600 dark:text-purple-400">
                {language === 'ko' && '함께 공유하기'}
                {language === 'en' && 'Share Together'}
                {language === 'zh' && '一起分享'}
                {language === 'ja' && '一緒に共有'}
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                {language === 'ko' && '연인, 친구, 가족과 그룹을 만들어 소중한 추억을 함께 만들어가세요'}
                {language === 'en' && 'Create groups with your partner, friends, and family to build precious memories together'}
                {language === 'zh' && '与恋人、朋友、家人创建群组，一起创造珍贵的回忆'}
                {language === 'ja' && '恋人、友達、家族とグループを作って大切な思い出を一緒に作りましょう'}
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border-2 border-accent/50 shadow-lg hover-elevate transition-all hover:shadow-2xl">
              <div className="bg-gradient-to-br from-accent/30 to-accent/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-md">
                <Heart className="h-10 w-10 text-accent fill-accent" />
              </div>
              <h3 className="font-bold text-2xl mb-3 text-accent">
                {language === 'ko' && '추억을 간직하기'}
                {language === 'en' && 'Cherish Memories'}
                {language === 'zh' && '珍藏回忆'}
                {language === 'ja' && '思い出を大切に'}
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                {language === 'ko' && '언제 어디서나 함께했던 순간들을 다시 떠올리며 행복을 느껴보세요'}
                {language === 'en' && 'Feel the happiness by recalling the moments you shared together, anytime, anywhere'}
                {language === 'zh' && '随时随地回忆一起度过的时光，感受幸福'}
                {language === 'ja' && 'いつでもどこでも一緒に過ごした瞬間を思い出して幸せを感じましょう'}
              </p>
            </div>
          </div>

          <div className="space-y-6 w-full max-w-md animate-in fade-in slide-in-from-bottom duration-700 delay-500">
            <div className="bg-card/60 backdrop-blur-sm p-8 rounded-3xl border-2 border-primary/30 shadow-xl">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Heart className="h-5 w-5 text-destructive fill-destructive animate-pulse" />
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ko' && '지금 바로 시작하세요'}
                  {language === 'en' && 'Start now'}
                  {language === 'zh' && '立即开始'}
                  {language === 'ja' && '今すぐ始めましょう'}
                </p>
                <Heart className="h-5 w-5 text-destructive fill-destructive animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
              
              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full text-lg h-16 bg-white dark:bg-gray-100 border-2 border-gray-300 text-black font-bold rounded-full shadow-lg hover:shadow-2xl transition-all active-elevate-2"
                  onClick={handleGoogleLogin}
                  data-testid="button-google-login"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {language === 'ko' && '구글로 시작하기'}
                  {language === 'en' && 'Continue with Google'}
                  {language === 'zh' && '使用 Google 继续'}
                  {language === 'ja' && 'Google で続ける'}
                </Button>

                <Button 
                  size="lg" 
                  className="w-full text-lg h-16 bg-yellow-400 border-2 border-yellow-500 text-black font-bold rounded-full shadow-lg hover:shadow-2xl transition-all active-elevate-2"
                  onClick={handleKakaoLogin}
                  data-testid="button-kakao-login"
                >
                  <Heart className="h-5 w-5 mr-2 fill-current" />
                  {language === 'ko' && '카카오로 시작하기'}
                  {language === 'en' && 'Continue with Kakao'}
                  {language === 'zh' && '使用 Kakao 继续'}
                  {language === 'ja' && 'Kakao で続ける'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4 leading-relaxed text-center">
                {language === 'ko' && '구글 또는 카카오 계정으로 간편하게 로그인하고\n소중한 추억을 기록해보세요'}
                {language === 'en' && 'Sign in easily with your Google or Kakao account\nand start recording precious memories'}
                {language === 'zh' && '使用 Google 或 Kakao 账户轻松登록\n并开始记录珍贵的回忆'}
                {language === 'ja' && 'Google または Kakao アカウントで簡単にログインして\n大切な思い出を記録しましょう'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
