import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, MapPin, Languages, LogOut, Type, User, Moon, Sun, Map, Coins, Plus, Sparkles, Users, ExternalLink, Loader2 } from "lucide-react";
import { useLanguage, type Language } from "@/lib/language-context";
import { useFont, type FontFamily } from "@/lib/font-context";
import { useLayoutTheme, type LayoutTheme } from "@/lib/layout-theme-context";
import { useMapProvider, type MapProvider } from "@/lib/map-provider-context";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { getApiBaseUrl } from "@/lib/api-config";
import { handleLogout as handleLogoutUtil } from "@/lib/authUtils";
import { useLocation } from "wouter";

// interface SettingsViewProps {
//   notificationsEnabled: boolean;
//   onNotificationsChange: (enabled: boolean) => void;
//   locationEnabled: boolean;
//   onLocationChange: (enabled: boolean) => void;
//   proximityRadius: number;
//   onProximityRadiusChange: (radius: number) => void;
// }

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
];

export function SettingsView() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  
  // 알림 기능 (토스트 알림 제어)
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('toastNotificationsEnabled');
    return saved !== null ? saved === 'true' : true; // 기본값은 true
  });

  useEffect(() => {
    localStorage.setItem('toastNotificationsEnabled', toastNotificationsEnabled.toString());
  }, [toastNotificationsEnabled]);

  // 로그아웃 로딩 상태 추가
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true); // 로딩 시작
      console.log('[LOGOUT] ========== Starting logout from SettingsView ==========');
      
      // 공통 로그아웃 함수 사용 (네트워크 실패해도 항상 성공으로 반환)
      const logoutResult = await handleLogoutUtil();
      console.log('[LOGOUT] Logout result:', logoutResult);
      
      // 로딩 화면을 보여주기 위해 지연 후 데이터 초기화 및 리다이렉트
      setTimeout(() => {
        // 요청 성공/실패와 상관없이 항상 클라이언트 상태 초기화
        console.log('[LOGOUT] Clearing all user data...');
        
        // 1. 인증 관련 캐시 무효화 및 제거 (가장 먼저 실행)
        try {
          // 모든 쿼리 무효화
          queryClient.invalidateQueries();
          
          // 특히 /api/auth/user 쿼리를 명시적으로 무효화 및 제거
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
          
          // 인증 상태를 즉시 null로 설정 (auto-login 방지)
          queryClient.setQueryData(['/api/auth/user'], null);
          
          console.log('[LOGOUT] Auth queries invalidated and removed');
        } catch (e) {
          console.error('[LOGOUT] Failed to invalidate auth queries:', e);
          // 최소한 쿼리 데이터는 null로 설정
          try {
            queryClient.setQueryData(['/api/auth/user'], null);
          } catch (e2) {
            console.error('[LOGOUT] Failed to set query data to null:', e2);
          }
        }
        
        // 3. 모든 쿼리 캐시 무효화 및 제거 (memos, groups 등)
        try {
          queryClient.removeQueries();
        } catch (e) {
          console.error('[LOGOUT] Failed to remove queries:', e);
        }
        
        // 4. 로컬 스토리지에서 사용자 관련 데이터 제거
        localStorage.removeItem("currentMemberId");
        localStorage.removeItem("personalMemberId");
        localStorage.removeItem("myMemberIds");
        localStorage.removeItem("notificationsEnabled");
        localStorage.removeItem("locationEnabled");
        localStorage.removeItem("proximityRadius");
        localStorage.removeItem("toastNotificationsEnabled");
        
        // 5. 로그아웃 플래그 설정 (자동 인증 재확인 방지)
        // 30초 동안 자동 인증 재확인 비활성화 (모바일 앱에서 자동 로그인 완전 차단)
        localStorage.setItem("logoutTimestamp", Date.now().toString());
        
        // 6. 클라이언트 측에서도 쿠키 삭제 시도 (WebView에서 쿠키가 남아있을 수 있음)
        try {
          // 모든 가능한 도메인과 경로에서 쿠키 삭제 시도
          const domains = [
            window.location.hostname,
            '.memoway-production.up.railway.app',
            'memoway-production.up.railway.app',
          ];
          const paths = ['/', '/api'];
          
          domains.forEach(domain => {
            paths.forEach(path => {
              // connect.sid 쿠키 삭제 시도
              document.cookie = `connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
              document.cookie = `connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`;
            });
          });
          console.log('[LOGOUT] Client-side cookies cleared');
        } catch (e) {
          console.error('[LOGOUT] Failed to clear client-side cookies:', e);
        }
        
        // 로그아웃 후 즉시 랜딩 페이지로 강제 리다이렉트
        console.log('[LOGOUT] Force redirecting to landing page...');
        
        const isNativePlatform = Capacitor.isNativePlatform();
        if (isNativePlatform) {
          // 안드로이드 앱: 현재 origin을 유지하고 루트 경로로 이동 (logout 파라미터 추가)
          window.location.replace(window.location.origin + '/?logout=true');
        } else {
          // 웹 브라우저: 상대 경로 사용 (logout 파라미터 추가)
          window.location.replace('/?logout=true');
        }
      }, 1000); // 로딩 화면을 확실히 보여주기 위해 1초 지연
    } catch (error: any) {
      // 예상치 못한 에러가 발생해도 상태 초기화 및 네비게이션은 수행
      console.error('[LOGOUT] Unexpected error during logout:', error);
      
      // 에러가 발생해도 지연 후 클라이언트 상태는 초기화 시도
      setTimeout(() => {
        try {
          queryClient.setQueryData(['/api/auth/user'], null);
          queryClient.removeQueries();
          localStorage.removeItem("currentMemberId");
          localStorage.removeItem("personalMemberId");
          localStorage.removeItem("myMemberIds");
        } catch (e) {
          console.error('[LOGOUT] Failed to clear state after error:', e);
        }
        
        // 에러가 발생해도 랜딩 페이지로 이동 (logout 파라미터 추가)
        const isNativePlatform = Capacitor.isNativePlatform();
        if (isNativePlatform) {
          window.location.replace(window.location.origin + '/?logout=true');
        } else {
          window.location.replace('/?logout=true');
        }
      }, 1000);
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
    <div className="px-4 pt-6 sm:pt-4 sm:px-5 space-y-3 sm:space-y-4 overflow-y-auto h-full bg-gradient-to-br from-blue-50/30 to-white min-h-screen pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom))+1rem)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-500 mb-4 sm:mb-5">{t.settings.title}</h1>

      {/* 1. 계정 */}
      {user ? (
        <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 backdrop-blur-sm border border-indigo-200/50 shadow-lg hover:shadow-xl transition-all">
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

      {/* 3. 커뮤니티 */}
      <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 backdrop-blur-sm border border-emerald-200/50 shadow-lg hover:shadow-xl transition-all">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
            {t.settings.community}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            {t.settings.communityDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-4 sm:pb-6">
          <Button
            onClick={() => {
              window.open('https://cafe.naver.com/memoway', '_blank', 'noopener,noreferrer');
            }}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-md text-sm sm:text-base h-9 sm:h-10"
            data-testid="button-visit-community"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            {t.settings.visitCommunity}
          </Button>
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


      {/* 4. 배터리 최적화 (안드로이드만) */}
      {Capacitor.isNativePlatform() && (
        <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 backdrop-blur-sm border border-purple-200/50 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 shrink-0" />
              {t.settings.batteryOptimization}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              {t.settings.batteryOptimizationDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t.settings.batteryOptimizationRequestDesc}
            </p>
            <Button
              onClick={async () => {
                try {
                  if (Capacitor.isNativePlatform()) {
                    // 동적 import를 문자열 변수로 감싸서 Vite의 정적 분석 방지
                    const pluginPath = '@capawesome-team/capacitor-android-battery-optimization';
                    const { BatteryOptimization } = await import(/* @vite-ignore */ pluginPath);
                    
                    // 배터리 최적화가 활성화되어 있는지 확인
                    const status = await BatteryOptimization.isBatteryOptimizationEnabled();
                    
                    if (status.enabled) {
                      // 배터리 최적화 설정 화면 열기
                      await BatteryOptimization.openBatteryOptimizationSettings();
                    } else {
                      toast({
                        title: t.settings.batteryOptimization,
                        description: "배터리 최적화가 이미 비활성화되어 있습니다.",
                        duration: 3000,
                      });
                    }
                  }
                } catch (err) {
                  console.error('Failed to open battery optimization settings:', err);
                  toast({
                    title: t.settings.batteryOptimization,
                    description: t.settings.batteryOptimizationRequestDesc,
                    variant: "destructive",
                  });
                }
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold shadow-md text-sm sm:text-base h-9 sm:h-10"
            >
              <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              {t.settings.batteryOptimizationRequest}
            </Button>
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              {t.settings.batteryOptimizationNote}
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* 로그아웃 로딩 오버레이 */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center animate-in fade-in duration-300">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-bold text-gray-800">
              {language === 'ko' ? '로그아웃 중...' : 
               language === 'en' ? 'Logging out...' : 
               language === 'zh' ? '正在退出...' : 'ログアウト中...'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {language === 'ko' ? '잠시만 기다려주세요' : 'Please wait a moment'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
