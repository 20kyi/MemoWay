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
      return await apiRequest("POST", "/api/email/login", data);
    },
    onSuccess: async () => {
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
      toast({
        title: language === 'ko' ? "로그인 실패" : "Login failed",
        description: error.error || error.message || (language === 'ko' ? "로그인에 실패했습니다" : "Failed to login"),
        variant: "destructive",
      });
    },
  });

  // 이메일 회원가입 mutation
  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      return await apiRequest("POST", "/api/email/register", data);
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
      const loginUrl = `${baseUrl}/api/kakao/login?lang=${language}&platform=android`;
      window.location.href = loginUrl;
    } else {
      // 웹: 상대 경로 사용
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
                {/* 이메일 로그인 버튼 */}
                <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="w-full text-lg h-16 border-2 border-primary/50 text-foreground font-bold rounded-full shadow-lg hover:shadow-2xl transition-all active-elevate-2"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      {language === 'ko' && '이메일로 로그인'}
                      {language === 'en' && 'Sign in with Email'}
                      {language === 'zh' && '使用邮箱登录'}
                      {language === 'ja' && 'メールでログイン'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {language === 'ko' && '이메일 로그인'}
                        {language === 'en' && 'Email Login'}
                        {language === 'zh' && '邮箱登录'}
                        {language === 'ja' && 'メールログイン'}
                      </DialogTitle>
                      <DialogDescription>
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
                        <Label htmlFor="login-email">
                          {language === 'ko' && '이메일'}
                          {language === 'en' && 'Email'}
                          {language === 'zh' && '邮箱'}
                          {language === 'ja' && 'メールアドレス'}
                        </Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="example@email.com"
                          {...loginForm.register("email")}
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-destructive">
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">
                          {language === 'ko' && '비밀번호'}
                          {language === 'en' && 'Password'}
                          {language === 'zh' && '密码'}
                          {language === 'ja' && 'パスワード'}
                        </Label>
                        <Input
                          id="login-password"
                          type="password"
                          {...loginForm.register("password")}
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending
                            ? (language === 'ko' ? '로그인 중...' : 'Logging in...')
                            : (language === 'ko' ? '로그인' : 'Login')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
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

                {/* 이메일 회원가입 버튼 */}
                <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="w-full text-lg h-16 border-2 border-secondary/50 text-foreground font-bold rounded-full shadow-lg hover:shadow-2xl transition-all active-elevate-2"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      {language === 'ko' && '이메일로 회원가입'}
                      {language === 'en' && 'Sign up with Email'}
                      {language === 'zh' && '使用邮箱注册'}
                      {language === 'ja' && 'メールで新規登録'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {language === 'ko' && '회원가입'}
                        {language === 'en' && 'Sign up'}
                        {language === 'zh' && '注册'}
                        {language === 'ja' && '新規登録'}
                      </DialogTitle>
                      <DialogDescription>
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
                        <Label htmlFor="register-email">
                          {language === 'ko' && '이메일'}
                          {language === 'en' && 'Email'}
                          {language === 'zh' && '邮箱'}
                          {language === 'ja' && 'メールアドレス'}
                        </Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="example@email.com"
                          {...registerForm.register("email")}
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">
                          {language === 'ko' && '비밀번호'}
                          {language === 'en' && 'Password'}
                          {language === 'zh' && '密码'}
                          {language === 'ja' && 'パスワード'}
                        </Label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder={language === 'ko' ? '최소 6자 이상' : 'At least 6 characters'}
                          {...registerForm.register("password")}
                        />
                        {registerForm.formState.errors.password && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-firstName">
                          {language === 'ko' && '이름'}
                          {language === 'en' && 'Name'}
                          {language === 'zh' && '姓名'}
                          {language === 'ja' && '名前'}
                        </Label>
                        <Input
                          id="register-firstName"
                          type="text"
                          {...registerForm.register("firstName")}
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-destructive">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending
                            ? (language === 'ko' ? '가입 중...' : 'Signing up...')
                            : (language === 'ko' ? '회원가입' : 'Sign up')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {language === 'ko' && '또는'}
                      {language === 'en' && 'OR'}
                      {language === 'zh' && '或'}
                      {language === 'ja' && 'または'}
                    </span>
                  </div>
                </div>

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
