import { Button } from "@/components/ui/button";
import { MapPin, Globe, Users, Lock } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function Landing() {
  const { t, language } = useLanguage();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleKakaoLogin = () => {
    // Open in new tab to avoid Replit iframe restrictions
    window.open("/api/kakao/login", "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex flex-col items-center text-center space-y-12">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <MapPin className="h-12 w-12 text-primary" />
              <h1 className="text-5xl font-bold tracking-tight">Location Memo</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl">
              {language === 'ko' && '위치 기반 메모 공유 앱'}
              {language === 'en' && 'Share location-based memos with your groups'}
              {language === 'zh' && '与您的团队分享基于位置的备忘录'}
              {language === 'ja' && 'グループと位置ベースのメモを共有'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 w-full max-w-4xl">
            <div className="bg-card p-6 rounded-lg border shadow-sm hover-elevate">
              <Globe className="h-10 w-10 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">
                {language === 'ko' && '지도에 메모 남기기'}
                {language === 'en' && 'Pin Memos on Map'}
                {language === 'zh' && '在地图上添加备忘录'}
                {language === 'ja' && '地図にメモを追加'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ko' && '특정 위치에 사진과 함께 메모를 저장하세요'}
                {language === 'en' && 'Save memos with photos at specific locations'}
                {language === 'zh' && '在特定位置保存带照片的备忘录'}
                {language === 'ja' && '特定の場所に写真付きメモを保存'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm hover-elevate">
              <Users className="h-10 w-10 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">
                {language === 'ko' && '그룹과 공유'}
                {language === 'en' && 'Share with Groups'}
                {language === 'zh' && '与团队分享'}
                {language === 'ja' && 'グループと共有'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ko' && '여러 그룹을 만들고 메모를 공유하세요'}
                {language === 'en' && 'Create multiple groups and share your memos'}
                {language === 'zh' && '创建多个团队并分享您的备忘录'}
                {language === 'ja' && '複数のグループを作成してメモを共有'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border shadow-sm hover-elevate">
              <Lock className="h-10 w-10 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">
                {language === 'ko' && '안전한 로그인'}
                {language === 'en' && 'Secure Login'}
                {language === 'zh' && '安全登录'}
                {language === 'ja' && '安全なログイン'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ko' && '이메일/비밀번호, Google, GitHub 로그인 지원'}
                {language === 'en' && 'Email/password, Google, and GitHub login supported'}
                {language === 'zh' && '支持电子邮件/密码、Google 和 GitHub 登录'}
                {language === 'ja' && 'メール/パスワード、Google、GitHub ログイン対応'}
              </p>
            </div>
          </div>

          <div className="space-y-4 w-full max-w-md">
            <Button 
              size="lg" 
              className="w-full text-lg h-14" 
              onClick={handleLogin}
              data-testid="button-login"
            >
              {language === 'ko' && '로그인 / 회원가입'}
              {language === 'en' && 'Log In / Sign Up'}
              {language === 'zh' && '登录 / 注册'}
              {language === 'ja' && 'ログイン / サインアップ'}
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full text-lg h-14 bg-yellow-400 hover:bg-yellow-500 border-yellow-500 text-black"
              onClick={handleKakaoLogin}
              data-testid="button-kakao-login"
            >
              {language === 'ko' && '카카오로 시작하기'}
              {language === 'en' && 'Continue with Kakao'}
              {language === 'zh' && '使用 Kakao 继续'}
              {language === 'ja' && 'Kakao で続ける'}
            </Button>

            <p className="text-sm text-muted-foreground">
              {language === 'ko' && 'Google, GitHub, 이메일/비밀번호, 카카오로 로그인할 수 있습니다'}
              {language === 'en' && 'Log in with Google, GitHub, email/password, or Kakao'}
              {language === 'zh' && '使用 Google、GitHub、电子邮件/密码或 Kakao 登录'}
              {language === 'ja' && 'Google、GitHub、メール/パスワード、または Kakao でログイン'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
