import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, MapPin, Languages, LogOut, Type, User, Moon, Sun, Map, Coins, Plus, Sparkles, Heart } from "lucide-react";
import { useLanguage, type Language } from "@/lib/language-context";
import { useFont, type FontFamily } from "@/lib/font-context";
import { useTheme } from "@/lib/theme-context";
import { useLayoutTheme, type LayoutTheme } from "@/lib/layout-theme-context";
import { useMapProvider, type MapProvider } from "@/lib/map-provider-context";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { getApiBaseUrl } from "@/lib/api-config";

interface SettingsViewProps {
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  locationEnabled: boolean;
  onLocationChange: (enabled: boolean) => void;
  proximityRadius: number;
  onProximityRadiusChange: (radius: number) => void;
}

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
];

export function SettingsView({
  notificationsEnabled,
  onNotificationsChange,
  locationEnabled,
  onLocationChange,
  proximityRadius,
  onProximityRadiusChange,
}: SettingsViewProps) {
  const { language, setLanguage, t } = useLanguage();
  const { fontFamily, setFontFamily, fontSize, setFontSize } = useFont();
  const { theme, setTheme } = useTheme();
  const { layoutTheme, setLayoutTheme } = useLayoutTheme();
  const { mapProvider, setMapProvider } = useMapProvider();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const handleLogout = async () => {
    if (Capacitor.isNativePlatform()) {
      // 안드로이드 앱: fetch API를 사용하여 로그아웃 요청
      try {
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
        
        const logoutUrl = `${baseUrl}/api/logout`;
        console.log('[LOGOUT] Sending logout request to:', logoutUrl);
        
        const response = await fetch(logoutUrl, {
          method: 'GET',
          credentials: 'include', // 쿠키 포함
          redirect: 'manual', // 리다이렉트를 수동으로 처리 (CORS 오류 방지)
          headers: {
            'Accept': 'application/json',
            'X-Platform': 'android', // 서버에서 안드로이드 앱임을 명확히 알 수 있도록
          },
        });
        
        console.log('[LOGOUT] Response status:', response.status);
        console.log('[LOGOUT] Response headers:', Object.fromEntries(response.headers.entries()));
        
        // 모든 응답 상태 코드 처리
        if (response.status >= 200 && response.status < 300) {
          // 성공 응답 (2xx)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const data = await response.json();
              console.log('[LOGOUT] Logout successful:', data);
            } catch (e) {
              console.log('[LOGOUT] Response is not JSON, but status is OK');
            }
          } else {
            console.log('[LOGOUT] Response is not JSON, but status is OK');
          }
        } else if (response.status >= 300 && response.status < 400) {
          // 리다이렉트 응답 (3xx) - 서버가 여전히 리다이렉트를 시도하는 경우
          const location = response.headers.get('location');
          console.log('[LOGOUT] Server redirected to:', location);
          console.log('[LOGOUT] Ignoring redirect for native app');
        } else {
          // 에러 응답 (4xx, 5xx)
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[LOGOUT] Logout failed:', response.status, errorText);
          throw new Error(`Logout failed: ${response.status} ${errorText}`);
        }
        
        // 쿼리 캐시 무효화
        console.log('[LOGOUT] Invalidating queries...');
        await queryClient.invalidateQueries();
        
        // 로그아웃 성공 후 랜딩 페이지로 이동
        console.log('[LOGOUT] Redirecting to landing page...');
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);
        toast({
          title: language === 'ko' ? "로그아웃 실패" : "Logout failed",
          description: language === 'ko' 
            ? "로그아웃 중 오류가 발생했습니다."
            : "An error occurred during logout.",
          variant: "destructive",
        });
      }
    } else {
      // 웹 브라우저: 기존 방식 사용 (서버 리다이렉트)
      window.location.href = "/api/logout";
    }
  };

  const getProviderName = (provider: string) => {
    if (provider === 'kakao') return '카카오';
    if (provider === 'replit') return 'Replit';
    return provider;
  };

  const fontOptions: { value: FontFamily; label: string }[] = [
    { value: "default", label: t.settings.fontDefault },
    { value: "noto-sans", label: t.settings.fontNotoSans },
    { value: "nanum-gothic", label: t.settings.fontNanumGothic },
    { value: "gamja-flower", label: t.settings.fontGamjaFlower },
    { value: "dokdo", label: t.settings.fontDokdo },
    { value: "nanum-pen", label: t.settings.fontNanumPen },
  ];

  const purchasePointsMutation = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest("POST", "/api/points/purchase", { amount });
    },
    onSuccess: async (data, amount) => {
      console.log('[Points Purchase] Success response:', data);

      // 응답 데이터로 즉시 캐시 업데이트 (낙관적 업데이트)
      // 서버에서 전체 사용자 정보를 반환하므로 이를 활용
      if (data && data.points !== undefined) {
        // 현재 캐시 데이터 가져오기
        const currentCache = queryClient.getQueryData(["/api/auth/user"]) as any;

        // 서버 응답 데이터로 완전한 사용자 객체 구성
        const updatedUserData = {
          id: data.id || currentCache?.id,
          email: data.email || currentCache?.email,
          firstName: data.firstName || currentCache?.firstName,
          lastName: data.lastName || currentCache?.lastName,
          profileImageUrl: data.profileImageUrl || currentCache?.profileImageUrl,
          points: data.points, // 서버에서 반환한 최신 포인트 (가장 중요!)
          provider: data.provider || currentCache?.provider,
        };

        // 캐시에 즉시 반영 (UI가 즉시 업데이트됨)
        queryClient.setQueryData(["/api/auth/user"], updatedUserData);

        console.log('[Points Purchase] ✅ Cache updated immediately:', {
          oldPoints: currentCache?.points,
          newPoints: data.points,
          userId: updatedUserData.id
        });

        // 백그라운드에서 최신 정보 재요청 (데이터 동기화 보장)
        // invalidateQueries를 절대 사용하지 않음 (캐시 무효화 방지)
        // refetchQueries는 기존 캐시를 유지한 채로 업데이트만 수행하므로 안전
        // 지연 시간을 두어 낙관적 업데이트가 완전히 반영된 후 실행
        setTimeout(async () => {
          try {
            const result = await queryClient.refetchQueries({
              queryKey: ["/api/auth/user"],
              type: 'active',
            });
            console.log('[Points Purchase] ✅ Background refetch completed');
          } catch (refetchError) {
            console.error('[Points Purchase] ⚠️ Background refetch error (non-critical):', refetchError);
            // Refetch 실패해도 낙관적 업데이트로 이미 UI가 업데이트되었으므로 문제없음
          }
        }, 1000); // 1초 지연으로 낙관적 업데이트가 완전히 반영된 후 재요청
      } else {
        console.error('[Points Purchase] ❌ Response data missing points:', data);
        // 포인트 정보가 없으면 에러지만, invalidateQueries는 사용하지 않음
        // 대신 refetchQueries만 사용하여 캐시 무효화 방지
        queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      }

      setIsPurchaseDialogOpen(false);
      toast({
        title: t.settings.pointsCharged,
        description: t.settings.pointsChargedDesc.replace('{amount}', amount.toLocaleString()),
      });
    },
    onError: (error: any) => {
      // Handle authentication errors - keep dialog open for manual retry after re-login
      if (error.status === 401 || error.status === 403) {
        toast({
          title: t.settings.authExpired,
          description: t.settings.authExpiredDesc,
          variant: "destructive",
        });
        // Don't close dialog or auto-redirect - let user manually close and re-authenticate
        return;
      }

      // For other errors, keep dialog open so user can retry
      toast({
        title: t.settings.pointsChargeFailed,
        description: error.error || error.message || t.settings.pointsChargeFailedDesc,
        variant: "destructive",
      });
    },
  });

  const pointPackages = [
    { amount: 1000, price: "₩1,000", icon: "🥉", label: "기본", color: "from-slate-500/10 to-slate-600/10 border-slate-500/40" },
    { amount: 5000, price: "₩5,000", icon: "🥈", label: "인기", color: "from-blue-500/10 to-indigo-500/10 border-blue-500/40" },
    { amount: 10000, price: "₩10,000", icon: "🥇", label: "프리미엄", color: "from-amber-500/10 to-orange-500/10 border-amber-500/40" },
  ];

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5 pb-20 sm:pb-24 space-y-3 sm:space-y-4 overflow-y-auto h-full bg-gradient-to-br from-pink-50/30 to-white min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#9333ea] mb-4 sm:mb-5">{t.settings.title}</h1>

      {/* 1. 계정 */}
      {user ? (
        <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">{t.settings.account}</span>
                </CardTitle>
                {/* <CardDescription className="text-xs sm:text-sm mt-0.5">
                  {t.settings.accountInfo}
                </CardDescription> */}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
                className="flex items-center gap-1.5 shrink-0 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{t.settings.logout}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0">
                <AvatarImage src={(user as any).profileImageUrl || undefined} alt={(user as any).firstName} />
                <AvatarFallback>{(user as any).firstName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base sm:text-lg truncate" data-testid="text-user-name">
                  {(user as any).firstName} {(user as any).lastName}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate" data-testid="text-user-email">
                  {(user as any).email}
                </p>
                <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                    {getProviderName((user as any).provider)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 2. 포인트 */}
      {
        user ? (
          <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm border border-amber-500/40 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
                {t.settings.points}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {t.settings.pointsDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t.settings.currentPointsLabel}</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-user-points">
                      {((user as any)?.points ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setIsPurchaseDialogOpen(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-md text-sm sm:text-base h-9 sm:h-10"
                data-testid="button-purchase-points"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                {t.settings.purchasePoints}
              </Button>
            </CardContent>
          </Card>
        ) : null
      }

      {/* 4. 지도 프로바이더 */}
      <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg hover:shadow-xl transition-all">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <Map className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            {t.settings.mapProvider}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            {t.settings.mapProviderDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-4 sm:pb-6">
          <Select value={mapProvider} onValueChange={(value) => setMapProvider(value as MapProvider)}>
            <SelectTrigger className="w-full h-9 sm:h-10 text-sm sm:text-base" data-testid="select-map-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kakao" data-testid="map-provider-kakao">
                {t.settings.mapProviderKakao}
              </SelectItem>
              <SelectItem value="google" data-testid="map-provider-google">
                {t.settings.mapProviderGoogle}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 포인트 구매 다이얼로그 */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
              {t.settings.purchasePointsTitle}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t.settings.purchasePointsDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 sm:space-y-3 py-2 sm:py-4">
            {pointPackages.map((pkg) => (
              <button
                key={pkg.amount}
                onClick={() => purchasePointsMutation.mutate(pkg.amount)}
                disabled={purchasePointsMutation.isPending}
                className={`w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${pkg.color} border sm:border-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                style={{
                  transform: purchasePointsMutation.isPending ? 'none' : undefined,
                }}
                data-testid={`button-purchase-${pkg.amount}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="text-2xl sm:text-3xl shrink-0">{pkg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="font-bold text-base sm:text-lg truncate">{pkg.amount.toLocaleString()} {t.settings.pointsPackage}</p>
                        {pkg.label === "인기" && (
                          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500 text-white font-semibold shrink-0">
                            {t.settings.popular}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.canCopyMemos.replace('{count}', (pkg.amount / 10).toLocaleString())}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base sm:text-lg text-amber-600 dark:text-amber-400">
                      {pkg.price}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-3 sm:pt-4 border-t">
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              {t.settings.pointsUsageNote}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. 알림 및 위치 */}
      <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg hover:shadow-xl transition-all">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">
            서비스 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5 pt-0 pb-4 sm:pb-6">
          {/* 알림 섹션 */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="notifications" className="cursor-pointer text-sm sm:text-base font-medium">
                  {t.settings.notifications}
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {t.settings.notificationsDesc}
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={onNotificationsChange}
                data-testid="switch-notifications"
              />
            </div>

            {notificationsEnabled && (
              <div className="space-y-2 pl-6 sm:pl-7">
                <Label htmlFor="proximity-radius" className="text-xs sm:text-sm">{t.settings.proximityRadius}</Label>
                <Select
                  value={proximityRadius.toString()}
                  onValueChange={(value) => onProximityRadiusChange(Number(value))}
                >
                  <SelectTrigger id="proximity-radius" className="h-9 sm:h-10 text-sm sm:text-base" data-testid="select-proximity-radius">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50" data-testid="radius-50m">{t.settings.radius50m}</SelectItem>
                    <SelectItem value="100" data-testid="radius-100m">{t.settings.radius100m}</SelectItem>
                    <SelectItem value="200" data-testid="radius-200m">{t.settings.radius200m}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div className="border-t border-border/50"></div>

          {/* 위치 섹션 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="location" className="cursor-pointer text-sm sm:text-base font-medium">
                  {t.settings.location}
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {t.settings.locationDesc}
                </p>
              </div>
              <Switch
                id="location"
                checked={locationEnabled}
                onCheckedChange={onLocationChange}
                data-testid="switch-location"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. 표시 설정 */}
      <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg hover:shadow-xl transition-all">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">
            표시 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5 pt-0 pb-4 sm:pb-6">
          {/* 레이아웃 테마 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm sm:text-base font-medium">
                  {language === 'ko' && '레이아웃 테마'}
                  {language === 'en' && 'Layout Theme'}
                  {language === 'zh' && '布局主题'}
                  {language === 'ja' && 'レイアウトテーマ'}
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {language === 'ko' && '앱의 전체적인 디자인 스타일을 선택하세요'}
                  {language === 'en' && 'Choose the overall design style of the app'}
                  {language === 'zh' && '选择应用的整体设计风格'}
                  {language === 'ja' && 'アプリの全体的なデザインスタイルを選択'}
                </p>
              </div>
            </div>
            <Select value={layoutTheme} onValueChange={(value) => setLayoutTheme(value as LayoutTheme)}>
              <SelectTrigger className="w-full h-10 text-sm" data-testid="select-layout-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default" data-testid="layout-default">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200"></div>
                    <span>{language === 'ko' ? '기본 (핑크)' : language === 'en' ? 'Default (Pink)' : language === 'zh' ? '默认 (粉色)' : 'デフォルト (ピンク)'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="lavender-night" data-testid="layout-lavender-night">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-900 to-blue-900"></div>
                    <span>{language === 'ko' ? '라벤더 나이트 (다크)' : language === 'en' ? 'Lavender Night (Dark)' : language === 'zh' ? '薰衣草之夜 (深色)' : 'ラベンダーナイト (ダーク)'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="romantic-love" data-testid="layout-romantic-love">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-400 via-rose-400 to-red-400 border border-pink-300/50 flex items-center justify-center">
                      <Heart className="h-2.5 w-2.5 text-white fill-white" />
                    </div>
                    <span>{language === 'ko' ? '로맨틱 러브 (커플)' : language === 'en' ? 'Romantic Love (Couple)' : language === 'zh' ? '浪漫爱情 (情侣)' : 'ロマンチックラブ (カップル)'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="pastel-dream" data-testid="layout-pastel-dream">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-200 via-purple-200 to-pink-200 border border-pink-300/50"></div>
                    <span>{language === 'ko' ? '파스텔 드림 (음악 플레이어)' : language === 'en' ? 'Pastel Dream (Music Player)' : language === 'zh' ? '粉彩梦境 (音乐播放器)' : 'パステルドリーム (ミュージックプレーヤー)'}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 언어 섹션 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm sm:text-base font-medium">
                  {t.settings.language}
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {t.settings.languageDesc}
                </p>
              </div>
            </div>
            <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
              <SelectTrigger className="w-full h-9 sm:h-10 text-sm sm:text-base" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} data-testid={`language-${option.value}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl">{option.flag}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 구분선 */}
          <div className="border-t border-border/50"></div>

          {/* 폰트 섹션 */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm sm:text-base font-medium">
                  {t.settings.font}
                </Label>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {t.settings.fontDesc}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 pl-6 sm:pl-7">
              <Label htmlFor="font-family" className="text-xs sm:text-sm">{t.settings.fontFamily}</Label>
              <Select value={fontFamily} onValueChange={(value) => setFontFamily(value as FontFamily)}>
                <SelectTrigger id="font-family" className="w-full h-9 sm:h-10 text-sm sm:text-base" data-testid="select-font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`font-${option.value}`}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:space-y-3 pl-6 sm:pl-7">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size" className="text-xs sm:text-sm">{t.settings.fontSize}</Label>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">{fontSize}px</span>
              </div>
              <Slider
                id="font-size"
                min={12}
                max={24}
                step={1}
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                className="w-full"
                data-testid="slider-font-size"
              />
              <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span>12px</span>
                <span>24px</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. 앱정보 */}
      <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg hover:shadow-xl transition-all">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">{t.settings.appInfo}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 sm:pb-6 space-y-1.5 sm:space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">{t.settings.version}</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">{t.settings.developer}</span>
            <span className="truncate ml-2">{t.settings.developerName}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
