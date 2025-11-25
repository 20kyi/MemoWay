import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, MapPin, Languages, LogOut, Type, User, Moon, Sun, Map, Coins, Plus, Sparkles } from "lucide-react";
import { useLanguage, type Language } from "@/lib/language-context";
import { useFont, type FontFamily } from "@/lib/font-context";
import { useTheme } from "@/lib/theme-context";
import { useMapProvider, type MapProvider } from "@/lib/map-provider-context";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { mapProvider, setMapProvider } = useMapProvider();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
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
    <div className="px-4 py-6 space-y-4 overflow-y-auto h-full">
      <h1 className="text-2xl font-medium mb-6">{t.settings.title}</h1>

      {/* 1. 계정 */}
      {user ? (
        <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-primary/30 shadow-lg hover:shadow-2xl transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t.settings.account}
                </CardTitle>
                <CardDescription>
                  {t.settings.accountInfo}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t.settings.logout}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={(user as any).profileImageUrl || undefined} alt={(user as any).firstName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {(user as any).firstName?.[0] || (user as any).email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-lg" data-testid="text-user-name">
                  {(user as any).firstName} {(user as any).lastName}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {(user as any).email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                    {getProviderName((user as any).provider)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 2. 포인트 */}
      {user ? (
        <Card className="rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm border-2 border-amber-500/40 shadow-lg hover:shadow-2xl transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              {t.settings.points}
            </CardTitle>
            <CardDescription>
              {t.settings.pointsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.settings.currentPointsLabel}</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-user-points">
                    {((user as any)?.points ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => setIsPurchaseDialogOpen(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg"
              data-testid="button-purchase-points"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.settings.purchasePoints}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* 포인트 구매 다이얼로그 */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {t.settings.purchasePointsTitle}
            </DialogTitle>
            <DialogDescription>
              {t.settings.purchasePointsDesc}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {pointPackages.map((pkg) => (
              <button
                key={pkg.amount}
                onClick={() => purchasePointsMutation.mutate(pkg.amount)}
                disabled={purchasePointsMutation.isPending}
                className={`w-full p-4 rounded-2xl bg-gradient-to-br ${pkg.color} border-2 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                style={{
                  transform: purchasePointsMutation.isPending ? 'none' : undefined,
                }}
                data-testid={`button-purchase-${pkg.amount}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{pkg.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{pkg.amount.toLocaleString()} {t.settings.pointsPackage}</p>
                        {pkg.label === "인기" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-semibold">
                            {t.settings.popular}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t.settings.canCopyMemos.replace('{count}', (pkg.amount / 10).toLocaleString())}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-amber-600 dark:text-amber-400">
                      {pkg.price}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              {t.settings.pointsUsageNote}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. 알림 */}
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-purple-500/40 shadow-lg hover:shadow-2xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.settings.notifications}
          </CardTitle>
          <CardDescription>
            {t.settings.notificationsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="cursor-pointer">
              {t.settings.notificationsEnable}
            </Label>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={onNotificationsChange}
              data-testid="switch-notifications"
            />
          </div>
          
          {notificationsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="proximity-radius">{t.settings.proximityRadius}</Label>
              <Select 
                value={proximityRadius.toString()} 
                onValueChange={(value) => onProximityRadiusChange(Number(value))}
              >
                <SelectTrigger id="proximity-radius" data-testid="select-proximity-radius">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50" data-testid="radius-50m">{t.settings.radius50m}</SelectItem>
                  <SelectItem value="100" data-testid="radius-100m">{t.settings.radius100m}</SelectItem>
                  <SelectItem value="200" data-testid="radius-200m">{t.settings.radius200m}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t.settings.proximityRadiusDesc}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. 위치 */}
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-primary/30 shadow-lg hover:shadow-2xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t.settings.location}
          </CardTitle>
          <CardDescription>
            {t.settings.locationDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="location" className="cursor-pointer">
              {t.settings.locationTracking}
            </Label>
            <Switch
              id="location"
              checked={locationEnabled}
              onCheckedChange={onLocationChange}
              data-testid="switch-location"
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. 지도 프로바이더 */}
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-primary/30 shadow-lg hover:shadow-2xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            {t.settings.mapProvider}
          </CardTitle>
          <CardDescription>
            {t.settings.mapProviderDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Select value={mapProvider} onValueChange={(value) => setMapProvider(value as MapProvider)}>
            <SelectTrigger className="w-full" data-testid="select-map-provider">
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

      {/* 5. 다크모드 */}
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-purple-500/40 shadow-lg hover:shadow-2xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            {t.settings.darkMode}
          </CardTitle>
          <CardDescription>
            {t.settings.darkModeDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme" className="cursor-pointer">
              {t.settings.darkModeEnable}
            </Label>
            <Switch
              id="theme"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              data-testid="switch-theme"
            />
          </div>
        </CardContent>
      </Card>

      {/* 6. 언어 */}
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-primary/30 shadow-lg hover:shadow-2xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t.settings.language}
          </CardTitle>
          <CardDescription>
            {t.settings.languageDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger className="w-full" data-testid="select-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} data-testid={`language-${option.value}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{option.flag}</span>
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 7. 폰트 */}
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-primary/30 shadow-lg hover:shadow-2xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            {t.settings.font}
          </CardTitle>
          <CardDescription>
            {t.settings.fontDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="font-family">{t.settings.fontFamily}</Label>
            <Select value={fontFamily} onValueChange={(value) => setFontFamily(value as FontFamily)}>
              <SelectTrigger id="font-family" className="w-full" data-testid="select-font-family">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size">{t.settings.fontSize}</Label>
              <span className="text-sm font-medium text-muted-foreground">{fontSize}px</span>
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>12px</span>
              <span>24px</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8. 앱정보 */}
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-primary/30 shadow-lg hover:shadow-2xl transition-all">
        <CardHeader>
          <CardTitle>{t.settings.appInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.settings.version}</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.settings.developer}</span>
            <span>{t.settings.developerName}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
