import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { User, Coins, FileText, Users, LogOut, Settings, ShoppingBag, HelpCircle, Info, ExternalLink, ChevronRight, Bell, Map, Languages, Type, Sparkles, Plus, Gem, Star } from "lucide-react";
import { useLanguage, type Language } from "@/lib/language-context";
import { useFont, type FontFamily } from "@/lib/font-context";
import { useLayoutTheme, type LayoutTheme } from "@/lib/layout-theme-context";
import { useMapProvider, type MapProvider } from "@/lib/map-provider-context";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { getApiBaseUrl } from "@/lib/api-config";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";

interface ProfileViewProps {
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  proximityRadius: number;
  onProximityRadiusChange: (radius: number) => void;
}

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
];

export function ProfileView({ 
  notificationsEnabled,
  onNotificationsChange,
  proximityRadius,
  onProximityRadiusChange,
}: ProfileViewProps) {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { fontFamily, setFontFamily, fontSize, setFontSize } = useFont();
  const { layoutTheme, setLayoutTheme } = useLayoutTheme();
  const { mapProvider, setMapProvider } = useMapProvider();
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [isAppInfoDialogOpen, setIsAppInfoDialogOpen] = useState(false);
  const [isPersonalSettingsDialogOpen, setIsPersonalSettingsDialogOpen] = useState(false);
  
  // 알림 기능 (토스트 알림 제어)
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('toastNotificationsEnabled');
    return saved !== null ? saved === 'true' : true; // 기본값은 true
  });

  useEffect(() => {
    localStorage.setItem('toastNotificationsEnabled', toastNotificationsEnabled.toString());
  }, [toastNotificationsEnabled]);

  const fontOptions: { value: FontFamily; label: string }[] = [
    { value: "default", label: t.settings.fontDefault },
    { value: "noto-sans", label: t.settings.fontNotoSans },
    { value: "nanum-gothic", label: t.settings.fontNanumGothic },
    { value: "gamja-flower", label: t.settings.fontGamjaFlower },
    { value: "dokdo", label: t.settings.fontDokdo },
    { value: "nanum-pen", label: t.settings.fontNanumPen },
  ];

  // 사용자 메모 및 그룹 데이터 가져오기
  const { data: memos = [] } = useQuery<MemoWithDetails[]>({
    queryKey: ["/api/memos"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: groups = [] } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/groups"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">로그인이 필요합니다</p>
      </div>
    );
  }

  const userData = user as any;
  const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "사용자";
  const userEmail = userData.email || "";
  const profileImage = userData.profileImageUrl;
  const userPoints = userData.points ?? 0;
  const provider = userData.provider || "replit";

  // 통계 계산
  const totalMemos = memos.length;
  const personalMemos = memos.filter(m => !m.groupId).length;
  const groupMemos = totalMemos - personalMemos;
  const totalGroups = groups.filter(g => g.name !== "개인 메모").length;
  const joinedGroups = groups.filter(g => g.name !== "개인 메모" && g.members.some(m => m.userId === userData.id)).length;

  const getProviderName = (provider: string) => {
    if (provider === 'kakao') return '카카오';
    if (provider === 'replit') return 'Replit';
    if (provider === 'google') return 'Google';
    if (provider === 'email') return '이메일';
    return provider;
  };

  const purchasePointsMutation = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest("POST", "/api/points/purchase", { amount });
    },
    onSuccess: async (data, amount) => {
      if (data && data.points !== undefined) {
        const currentCache = queryClient.getQueryData(["/api/auth/user"]) as any;
        const updatedUserData = {
          id: data.id || currentCache?.id,
          email: data.email || currentCache?.email,
          firstName: data.firstName || currentCache?.firstName,
          lastName: data.lastName || currentCache?.lastName,
          profileImageUrl: data.profileImageUrl || currentCache?.profileImageUrl,
          points: data.points,
          provider: data.provider || currentCache?.provider,
        };
        queryClient.setQueryData(["/api/auth/user"], updatedUserData);
        setTimeout(async () => {
          try {
            await queryClient.refetchQueries({
              queryKey: ["/api/auth/user"],
              type: 'active',
            });
          } catch (refetchError) {
            console.error('[Points Purchase] ⚠️ Background refetch error:', refetchError);
          }
        }, 1000);
      }
      setIsStoreDialogOpen(false);
      toast({
        title: t.settings.pointsCharged,
        description: t.settings.pointsChargedDesc.replace('{amount}', amount.toLocaleString()),
      });
    },
    onError: (error: any) => {
      if (error.status === 401 || error.status === 403) {
        toast({
          title: t.settings.authExpired,
          description: t.settings.authExpiredDesc,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t.settings.pointsChargeFailed,
        description: error.error || error.message || t.settings.pointsChargeFailedDesc,
        variant: "destructive",
      });
    },
  });

  const pointPackages = [
    { 
      amount: 1000, 
      price: "₩1,000", 
      icon: Gem, 
      iconColor: "text-slate-500",
      bgColor: "from-slate-50 to-slate-100",
      borderColor: "border-slate-300",
      label: "기본", 
      color: "from-slate-50/80 to-slate-100/80 border-slate-200/60" 
    },
    { 
      amount: 5000, 
      price: "₩5,000", 
      icon: Star, 
      iconColor: "text-blue-500",
      bgColor: "from-blue-50 to-indigo-50",
      borderColor: "border-blue-300",
      label: "인기", 
      color: "from-blue-50/80 to-indigo-50/80 border-blue-200/60" 
    },
    { 
      amount: 10000, 
      price: "₩10,000", 
      icon: Sparkles, 
      iconColor: "text-amber-500",
      bgColor: "from-amber-50 to-orange-50",
      borderColor: "border-amber-300",
      label: "프리미엄", 
      color: "from-amber-50/80 to-orange-50/80 border-amber-200/60" 
    },
  ];

  const menuItems = [
    {
      id: "settings",
      icon: Settings,
      title: t.settings.personalSettings,
      description: t.settings.personalSettingsDesc,
      color: "from-indigo-500/10 to-purple-500/10 border-indigo-500/40",
      iconColor: "text-indigo-500",
      onClick: () => {
        setIsPersonalSettingsDialogOpen(true);
      },
    },
    {
      id: "store",
      icon: ShoppingBag,
      title: t.settings.store,
      description: t.settings.storeDesc,
      color: "from-amber-500/10 to-orange-500/10 border-amber-500/40",
      iconColor: "text-amber-500",
      onClick: () => {
        setIsStoreDialogOpen(true);
      },
    },
    {
      id: "support",
      icon: HelpCircle,
      title: t.settings.customerSupport,
      description: t.settings.customerSupportDesc,
      color: "from-blue-500/10 to-cyan-500/10 border-blue-500/40",
      iconColor: "text-blue-500",
      onClick: () => {
        window.location.href = `mailto:support@memoway.com?subject=${encodeURIComponent(language === 'ko' ? '문의사항' : language === 'en' ? 'Inquiry' : language === 'zh' ? '咨询' : 'お問い合わせ')}`;
      },
    },
    {
      id: "appInfo",
      icon: Info,
      title: t.settings.appInfo,
      description: t.settings.appInfoDesc,
      color: "from-green-500/10 to-emerald-500/10 border-green-500/40",
      iconColor: "text-green-500",
      onClick: () => setIsAppInfoDialogOpen(true),
    },
    {
      id: "community",
      icon: Users,
      title: t.settings.community,
      description: t.settings.communityDesc,
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/40",
      iconColor: "text-emerald-500",
      onClick: () => {
        window.open('https://cafe.naver.com/memoway', '_blank', 'noopener,noreferrer');
      },
    },
  ];

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
        
        // 로그아웃 성공 메시지 표시
        toast({
          title: language === 'ko' ? "로그아웃 완료" : "Logged out",
          description: language === 'ko' 
            ? "로그아웃되었습니다."
            : "You have been logged out.",
        });
        
        // 로그아웃 성공 후 랜딩 페이지로 이동
        console.log('[LOGOUT] Redirecting to landing page...');
        setTimeout(() => {
          window.location.href = '/?logout=true';
        }, 500); // 토스트 메시지를 보여주기 위한 짧은 지연
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
      // 웹 브라우저: 로그아웃 처리
      try {
        // 먼저 쿼리 캐시 무효화
        await queryClient.invalidateQueries();
        
        // 로그아웃 요청
        const response = await fetch('/api/logout', {
          method: 'GET',
          credentials: 'include',
          redirect: 'manual', // 리다이렉트를 수동으로 처리
        });
        
        console.log('[LOGOUT] Response status:', response.status);
        console.log('[LOGOUT] Response type:', response.type);
        
        // 성공 메시지 표시
        toast({
          title: language === 'ko' ? "로그아웃 완료" : "Logged out",
          description: language === 'ko' 
            ? "로그아웃되었습니다."
            : "You have been logged out.",
        });
        
        // 리다이렉트 응답이거나 성공 응답인 경우
        if (response.status >= 200 && response.status < 400) {
          // 랜딩 페이지로 이동
          setTimeout(() => {
            window.location.href = '/?logout=true';
          }, 500); // 토스트 메시지를 보여주기 위한 짧은 지연
        } else {
          // 에러 응답인 경우에도 랜딩 페이지로 이동
          setTimeout(() => {
            window.location.href = '/?logout=true';
          }, 500);
        }
      } catch (error) {
        console.error('Logout error:', error);
        // 에러가 발생해도 로그아웃 처리 시도
        await queryClient.invalidateQueries();
        toast({
          title: language === 'ko' ? "로그아웃 완료" : "Logged out",
          description: language === 'ko' 
            ? "로그아웃되었습니다."
            : "You have been logged out.",
        });
        setTimeout(() => {
          window.location.href = '/?logout=true';
        }, 500);
      }
    }
  };

  return (
    <div className="px-4 pt-6 sm:pt-4 sm:px-5 space-y-3 sm:space-y-4 overflow-y-auto h-full bg-gradient-to-br from-blue-50/30 to-white min-h-screen pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom))+1rem)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-500 mb-4 sm:mb-5">
        {language === 'ko' ? '마이페이지' : language === 'en' ? 'Profile' : language === 'zh' ? '我的' : 'マイページ'}
      </h1>

      {/* 계정 카드 */}
      {user && (
        <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 backdrop-blur-sm border border-indigo-200/50 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                  <span className="truncate">{t.settings.account}</span>
                </CardTitle>
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
          <CardContent className="pt-0 pb-6 sm:pb-8">
            <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 border-4 border-indigo-200/50 shadow-lg">
                <AvatarImage src={profileImage || undefined} alt={userName} />
                <AvatarFallback className="text-2xl sm:text-3xl font-bold">{userName[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl sm:text-2xl mb-1 sm:mb-2 truncate" data-testid="text-user-name">
                  {userName}
                </p>
                <p className="text-sm sm:text-base text-muted-foreground truncate mb-2 sm:mb-3" data-testid="text-user-email">
                  {userEmail}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-md bg-primary/10 text-primary font-medium">
                    {getProviderName(provider)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 포인트 표시 */}
            <div className="pt-4 sm:pt-6 border-t border-indigo-200/50">
              <div className="flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200/50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">
                      {language === 'ko' ? '보유 포인트' : language === 'en' ? 'Current Points' : language === 'zh' ? '当前积分' : '保有ポイント'}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent" data-testid="text-user-points">
                      {userPoints.toLocaleString()}
                      <span className="text-base sm:text-lg text-muted-foreground ml-1">P</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메뉴 버튼들 */}
      <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg hover:shadow-xl transition-all">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">
            {language === 'ko' ? '메뉴' : language === 'en' ? 'Menu' : language === 'zh' ? '菜单' : 'メニュー'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${item.color} border hover:shadow-md transition-all text-left`}
                >
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-background/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 상점 다이얼로그 */}
      <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
        <DialogContent className="sm:max-w-lg w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-br from-amber-50/50 to-orange-50/30">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0" />
              {language === 'ko' ? '상점' : language === 'en' ? 'Store' : language === 'zh' ? '商店' : 'ショップ'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1">
              {t.settings.purchasePointsDesc}
            </DialogDescription>
          </DialogHeader>

          {/* 보유 포인트 표시 */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
            <div className="relative rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 border-2 border-purple-200/50 shadow-lg overflow-hidden">
              {/* 배경 패턴 */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400 rounded-full blur-2xl"></div>
              </div>
              
              <div className="relative p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center shrink-0">
                      <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">
                        {language === 'ko' ? '보유 포인트' : language === 'en' ? 'Current Points' : language === 'zh' ? '当前积分' : '保有ポイント'}
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" data-testid="text-user-points-store">
                        {userPoints.toLocaleString()}
                        <span className="text-base sm:text-lg text-muted-foreground ml-1">P</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 포인트 구매 패키지 */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">
                {t.settings.purchasePointsTitle}
              </h3>
              {pointPackages.map((pkg) => {
                const IconComponent = pkg.icon;
                return (
                  <button
                    key={pkg.amount}
                    onClick={() => purchasePointsMutation.mutate(pkg.amount)}
                    disabled={purchasePointsMutation.isPending}
                    className={`w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${pkg.color} border-2 ${pkg.borderColor} hover:shadow-xl hover:scale-[1.02] hover:border-opacity-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg text-left relative overflow-hidden group`}
                    data-testid={`button-purchase-${pkg.amount}`}
                  >
                    {/* 배경 장식 */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${pkg.bgColor} rounded-full blur-3xl`}></div>
                      <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br ${pkg.bgColor} rounded-full blur-2xl`}></div>
                    </div>
                    
                    <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br ${pkg.bgColor} border ${pkg.borderColor} shadow-md flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                          <IconComponent className={`h-7 w-7 sm:h-8 sm:w-8 ${pkg.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-1.5">
                            <p className="font-bold text-lg sm:text-xl text-foreground">
                              {pkg.amount.toLocaleString()} {t.settings.pointsPackage}
                            </p>
                            {pkg.label === "인기" && (
                              <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shrink-0 shadow-md">
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
                        <p className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-0.5">
                          {pkg.price}
                        </p>
                        {purchasePointsMutation.isPending && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {language === 'ko' ? '처리 중...' : language === 'en' ? 'Processing...' : language === 'zh' ? '处理中...' : '処理中...'}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 하단 안내 */}
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 border-t bg-muted/30">
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center leading-relaxed">
              {t.settings.pointsUsageNote}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 개인 설정 다이얼로그 */}
      <Dialog open={isPersonalSettingsDialogOpen} onOpenChange={setIsPersonalSettingsDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 shrink-0" />
              {t.settings.personalSettings}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1">
              {t.settings.personalSettingsDesc}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
            {/* 지도 프로바이더 */}
            <Card className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                  <Map className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  {t.settings.mapProvider}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  {t.settings.mapProviderDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <Select value={mapProvider} onValueChange={(value) => setMapProvider(value as MapProvider)}>
                  <SelectTrigger className="w-full h-9 sm:h-10 text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kakao">
                      {t.settings.mapProviderKakao}
                    </SelectItem>
                    <SelectItem value="google">
                      {t.settings.mapProviderGoogle}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* 서비스 설정 */}
            <Card className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">
                  {t.settings.serviceSettings}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5 pt-0 pb-4">
                {/* 알림 기능 (토스트 알림 제어) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <Label htmlFor="toast-notifications-dialog" className="cursor-pointer text-sm sm:text-base font-medium">
                        {t.settings.notifications}
                      </Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {t.settings.notificationsDesc}
                      </p>
                    </div>
                    <Switch
                      id="toast-notifications-dialog"
                      checked={toastNotificationsEnabled}
                      onCheckedChange={setToastNotificationsEnabled}
                    />
                  </div>
                </div>

                {/* 구분선 */}
                <div className="border-t border-border/50"></div>

                {/* 메모 알림 섹션 */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <Label htmlFor="notifications-dialog" className="cursor-pointer text-sm sm:text-base font-medium">
                        {t.settings.memoNotifications}
                      </Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {t.settings.memoNotificationsDesc}
                      </p>
                    </div>
                    <Switch
                      id="notifications-dialog"
                      checked={notificationsEnabled}
                      onCheckedChange={onNotificationsChange}
                    />
                  </div>

                  {notificationsEnabled && (
                    <div className="space-y-2 pl-6 sm:pl-7">
                      <Label htmlFor="proximity-radius-dialog" className="text-xs sm:text-sm">{t.settings.proximityRadius}</Label>
                      <Select
                        value={proximityRadius.toString()}
                        onValueChange={(value) => onProximityRadiusChange(Number(value))}
                      >
                        <SelectTrigger id="proximity-radius-dialog" className="h-9 sm:h-10 text-sm sm:text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">{t.settings.radius50m}</SelectItem>
                          <SelectItem value="100">{t.settings.radius100m}</SelectItem>
                          <SelectItem value="200">{t.settings.radius200m}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 표시 설정 */}
            <Card className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">
                  {t.settings.displaySettings}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5 pt-0 pb-4">
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
                    <SelectTrigger className="w-full h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200"></div>
                          <span>{language === 'ko' ? '기본' : language === 'en' ? 'Default' : language === 'zh' ? '默认' : 'デフォルト'}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="lavender-night">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-900 to-blue-900"></div>
                          <span>{language === 'ko' ? '라벤더 나이트 (다크)' : language === 'en' ? 'Lavender Night (Dark)' : language === 'zh' ? '薰衣草之夜 (深色)' : 'ラベンダーナイト (ダーク)'}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="couple-clay">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-300 to-rose-400 shadow-md" style={{ boxShadow: '0 2px 4px rgba(255, 105, 180, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 rgba(255, 20, 147, 0.3)' }}></div>
                          <span>{language === 'ko' ? '커플 클레이 3D' : language === 'en' ? 'Couple Clay 3D' : language === 'zh' ? '情侣粘土3D' : 'カップルクレイ3D'}</span>
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
                    <SelectTrigger className="w-full h-9 sm:h-10 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
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
                    <Label htmlFor="font-family-dialog" className="text-xs sm:text-sm">{t.settings.fontFamily}</Label>
                    <Select value={fontFamily} onValueChange={(value) => setFontFamily(value as FontFamily)}>
                      <SelectTrigger id="font-family-dialog" className="w-full h-9 sm:h-10 text-sm sm:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:space-y-3 pl-6 sm:pl-7">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="font-size-dialog" className="text-xs sm:text-sm">{t.settings.fontSize}</Label>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground">{fontSize}px</span>
                    </div>
                    <Slider
                      id="font-size-dialog"
                      min={12}
                      max={24}
                      step={1}
                      value={[fontSize]}
                      onValueChange={(value) => setFontSize(value[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                      <span>12px</span>
                      <span>24px</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* 앱 정보 다이얼로그 */}
      <Dialog open={isAppInfoDialogOpen} onOpenChange={setIsAppInfoDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
              <Info className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
              {t.settings.appInfo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
              <span className="text-sm sm:text-base text-muted-foreground">{t.settings.version}</span>
              <span className="text-sm sm:text-base font-semibold">1.0.0</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
              <span className="text-sm sm:text-base text-muted-foreground">{t.settings.developer}</span>
              <span className="text-sm sm:text-base font-semibold truncate ml-2">{t.settings.developerName}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

