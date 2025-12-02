import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { User, Coins, FileText, Users, LogOut, Settings, ShoppingBag, HelpCircle, Info, ExternalLink, ChevronRight, Bell, Map, Languages, Type, Sparkles, Plus, Gem, Star, Mail, MessageSquare, Bug, FileText as FileTextIcon, Shield, Megaphone, MessageCircle, Database, Trash2, HardDrive, UserX } from "lucide-react";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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

// 공지사항 데이터 타입 정의
type NoticeItem = {
  title: string;
  date: string;
  content: string;
  important?: boolean;
};

// FAQ 데이터 타입 정의
type FAQItem = {
  question: string;
  answer: string;
};

// FAQ 데이터 (한글만)
const faqData: FAQItem[] = [
  {
    question: "MemoWay는 무엇인가요?",
    answer: "MemoWay는 위치 기반 메모 서비스입니다. 특별한 장소의 추억을 기록하고, 그룹과 공유할 수 있습니다. 지도에서 위치를 선택하여 메모를 추가하고, 사진을 첨부할 수 있습니다."
  },
  {
    question: "그룹은 어떻게 만들고 참여하나요?",
    answer: "그룹 탭에서 '그룹 만들기' 버튼을 눌러 새 그룹을 만들 수 있습니다. 다른 사람의 그룹에 참여하려면 그룹 리더에게 초대 코드를 요청하고, '그룹 참여하기'에서 초대 코드를 입력하세요."
  },
  {
    question: "포인트는 무엇인가요?",
    answer: "포인트는 그룹 메모를 개인 그룹으로 복사할 때 사용됩니다. 메모 1개당 10포인트가 필요합니다. 설정에서 포인트를 구매할 수 있습니다."
  },
  {
    question: "위치 기반 알림은 어떻게 작동하나요?",
    answer: "설정에서 위치 추적을 활성화하고 알림 반경을 설정하면, 해당 반경 내에 메모가 있을 때 알림을 받을 수 있습니다. 지도 탭에서 위치 고정 모드를 활성화하면 더 정확한 알림을 받을 수 있습니다."
  },
  {
    question: "메모를 삭제할 수 있나요?",
    answer: "네, 메모 상세 화면에서 삭제 버튼을 눌러 메모를 삭제할 수 있습니다. 그룹 메모의 경우, 그룹 리더이거나 메모 작성자만 삭제할 수 있습니다."
  },
  {
    question: "언어를 변경할 수 있나요?",
    answer: "설정에서 언어를 변경할 수 있습니다. 한국어, 영어, 중국어, 일본어를 지원합니다."
  },
  {
    question: "그룹 메모를 개인 메모로 복사할 수 있나요?",
    answer: "네, 그룹 관리 화면에서 '그룹 메모 복사' 기능을 사용할 수 있습니다. 메모 1개당 10포인트가 필요하며, 복사된 메모는 개인 그룹에 저장됩니다."
  },
  {
    question: "앱이 위치를 찾지 못해요",
    answer: "브라우저나 앱의 위치 권한을 확인해주세요. 설정에서 위치 서비스 권한을 허용했는지 확인하고, GPS가 켜져 있는지 확인하세요. 지도 탭에서 위치 고정 모드를 활성화하면 더 정확한 위치를 찾을 수 있습니다."
  }
];

// 공지사항 데이터 (컴포넌트 외부로 이동하여 재생성 방지)
const noticeData: Record<Language, NoticeItem[]> = {
  ko: [
    {
      title: "MemoWay 서비스 오픈 안내",
      date: "2024.01.01",
      content: "안녕하세요. MemoWay를 이용해 주셔서 감사합니다. MemoWay는 위치 기반 메모 서비스로, 특별한 장소의 추억을 기록하고 공유할 수 있습니다. 앞으로도 더 나은 서비스를 제공하기 위해 노력하겠습니다.",
      important: true
    },
    {
      title: "그룹 기능 업데이트 안내",
      date: "2024.01.15",
      content: "그룹 기능이 업데이트되었습니다. 이제 그룹 메모를 더 쉽게 관리하고 공유할 수 있습니다. 그룹 리더는 그룹 메모 편집 권한을 설정할 수 있으며, 그룹 메모 복사 기능도 추가되었습니다."
    },
    {
      title: "위치 기반 알림 기능 개선",
      date: "2024.02.01",
      content: "위치 기반 알림 기능이 개선되었습니다. 이제 더 정확한 위치 추적과 알림을 받을 수 있습니다. 지도 탭에서 위치 고정 모드를 활성화하면 더욱 정확한 알림을 받을 수 있습니다."
    },
    {
      title: "다국어 지원 확대",
      date: "2024.02.15",
      content: "MemoWay는 이제 한국어, 영어, 중국어, 일본어를 지원합니다. 설정에서 원하는 언어로 변경할 수 있습니다."
    }
  ],
  en: [
    {
      title: "MemoWay Service Launch Notice",
      date: "2024.01.01",
      content: "Thank you for using MemoWay. MemoWay is a location-based memo service that allows you to record and share memories of special places. We will continue to work hard to provide better services.",
      important: true
    },
    {
      title: "Group Feature Update Notice",
      date: "2024.01.15",
      content: "The group feature has been updated. You can now manage and share group memos more easily. Group leaders can set group memo editing permissions, and a group memo copy feature has also been added."
    },
    {
      title: "Location-Based Notification Feature Improvement",
      date: "2024.02.01",
      content: "The location-based notification feature has been improved. You can now receive more accurate location tracking and notifications. Activate Location Lock Mode in the Map tab for even more accurate notifications."
    },
    {
      title: "Multilingual Support Expansion",
      date: "2024.02.15",
      content: "MemoWay now supports Korean, English, Chinese, and Japanese. You can change the language in Settings."
    }
  ],
  zh: [
    {
      title: "MemoWay 服务启动通知",
      date: "2024.01.01",
      content: "感谢您使用 MemoWay。MemoWay 是一个基于位置的备忘录服务，允许您记录和分享特殊地点的回忆。我们将继续努力提供更好的服务。",
      important: true
    },
    {
      title: "群组功能更新通知",
      date: "2024.01.15",
      content: "群组功能已更新。您现在可以更轻松地管理和共享群组备忘录。群组负责人可以设置群组备忘录编辑权限，还添加了群组备忘录复制功能。"
    },
    {
      title: "基于位置的通知功能改进",
      date: "2024.02.01",
      content: "基于位置的通知功能已改进。您现在可以接收更准确的位置跟踪和通知。在地图标签页中激活位置锁定模式以获得更准确的通知。"
    },
    {
      title: "多语言支持扩展",
      date: "2024.02.15",
      content: "MemoWay 现在支持韩语、英语、中文和日语。您可以在设置中更改语言。"
    }
  ],
  ja: [
    {
      title: "MemoWay サービス開始のお知らせ",
      date: "2024.01.01",
      content: "MemoWayをご利用いただき、ありがとうございます。MemoWayは位置ベースのメモサービスで、特別な場所の思い出を記録し、共有することができます。今後もより良いサービスを提供するために努力してまいります。",
      important: true
    },
    {
      title: "グループ機能アップデートのお知らせ",
      date: "2024.01.15",
      content: "グループ機能がアップデートされました。これでグループメモをより簡単に管理し、共有できるようになりました。グループリーダーはグループメモの編集権限を設定でき、グループメモのコピー機能も追加されました。"
    },
    {
      title: "位置ベースの通知機能の改善",
      date: "2024.02.01",
      content: "位置ベースの通知機能が改善されました。これでより正確な位置追跡と通知を受けることができます。地図タブで位置ロックモードを有効にすると、さらに正確な通知を受けることができます。"
    },
    {
      title: "多言語サポートの拡大",
      date: "2024.02.15",
      content: "MemoWayは現在、韓国語、英語、中国語、日本語をサポートしています。設定で希望の言語に変更できます。"
    }
  ]
};

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
  const isMobile = useIsMobile();
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [isAppInfoDialogOpen, setIsAppInfoDialogOpen] = useState(false);
  const [isPersonalSettingsDialogOpen, setIsPersonalSettingsDialogOpen] = useState(false);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false);
  const [isNoticeDialogOpen, setIsNoticeDialogOpen] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false);
  const [isDataManagementDialogOpen, setIsDataManagementDialogOpen] = useState(false);
  const [isAccountManagementDialogOpen, setIsAccountManagementDialogOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ used: number; total: number; cache: number } | null>(null);

  // 저장공간 사용량 계산
  const calculateStorageUsage = async () => {
    try {
      // IndexedDB 크기 계산
      let indexedDBSize = 0;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        indexedDBSize = estimate.usage || 0;
      }

      // LocalStorage 크기 계산
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }

      // SessionStorage 크기 계산
      let sessionStorageSize = 0;
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          sessionStorageSize += sessionStorage[key].length + key.length;
        }
      }

      // 캐시 크기 계산 (Service Worker 캐시)
      let cacheSize = 0;
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              cacheSize += blob.size;
            }
          }
        }
      }

      const totalUsed = indexedDBSize + (localStorageSize * 2) + (sessionStorageSize * 2) + cacheSize;
      const total = navigator.storage?.estimate ? (await navigator.storage.estimate()).quota || 0 : 0;

      setStorageUsage({
        used: totalUsed,
        total: total,
        cache: cacheSize,
      });
    } catch (error) {
      console.error('Storage calculation error:', error);
      setStorageUsage({
        used: 0,
        total: 0,
        cache: 0,
      });
    }
  };

  // 저장공간 사용량 포맷팅
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // 캐시 삭제
  const clearCache = async () => {
    try {
      // Service Worker 캐시 삭제
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // LocalStorage 캐시 관련 항목 삭제 (쿼리 캐시 등)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('react-query') || key.startsWith('tanstack-query') || key.startsWith('cache'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // QueryClient 캐시 무효화
      await queryClient.clear();

      // 저장공간 사용량 재계산
      await calculateStorageUsage();

      toast({
        title: language === 'ko' ? '캐시 삭제 완료' : language === 'en' ? 'Cache Cleared' : language === 'zh' ? '缓存已清除' : 'キャッシュをクリアしました',
        description: language === 'ko' 
          ? '캐시가 성공적으로 삭제되었습니다.'
          : language === 'en'
          ? 'Cache has been successfully cleared.'
          : language === 'zh'
          ? '缓存已成功清除。'
          : 'キャッシュが正常にクリアされました。',
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      toast({
        title: language === 'ko' ? '캐시 삭제 실패' : language === 'en' ? 'Cache Clear Failed' : language === 'zh' ? '缓存清除失败' : 'キャッシュクリアに失敗しました',
        description: language === 'ko'
          ? '캐시 삭제 중 오류가 발생했습니다.'
          : language === 'en'
          ? 'An error occurred while clearing cache.'
          : language === 'zh'
          ? '清除缓存时发生错误。'
          : 'キャッシュをクリア中にエラーが発生しました。',
        variant: 'destructive',
      });
    }
  };

  // 계정 삭제
  const deleteAccount = async () => {
    if (!confirm(
      language === 'ko'
        ? '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        : language === 'en'
        ? 'Are you sure you want to delete your account? This action cannot be undone.'
        : language === 'zh'
        ? '您确定要删除您的账户吗？此操作无法撤销。'
        : 'アカウントを削除してもよろしいですか？この操作は元に戻せません。'
    )) {
      return;
    }

    try {
      const response = await apiRequest('DELETE', '/api/users/me');
      if (response.ok) {
        toast({
          title: language === 'ko' ? '계정 삭제 완료' : language === 'en' ? 'Account Deleted' : language === 'zh' ? '账户已删除' : 'アカウントを削除しました',
          description: language === 'ko'
            ? '계정이 성공적으로 삭제되었습니다.'
            : language === 'en'
            ? 'Your account has been successfully deleted.'
            : language === 'zh'
            ? '您的账户已成功删除。'
            : 'アカウントが正常に削除されました。',
        });
        // 로그아웃 및 홈으로 이동
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        throw new Error('Account deletion failed');
      }
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast({
        title: language === 'ko' ? '계정 삭제 실패' : language === 'en' ? 'Account Deletion Failed' : language === 'zh' ? '账户删除失败' : 'アカウント削除に失敗しました',
        description: error.message || (language === 'ko'
          ? '계정 삭제 중 오류가 발생했습니다.'
          : language === 'en'
          ? 'An error occurred while deleting your account.'
          : language === 'zh'
          ? '删除账户时发生错误。'
          : 'アカウントを削除中にエラーが発生しました。'),
        variant: 'destructive',
      });
    }
  };

  // 데이터 관리 다이얼로그 열 때 저장공간 사용량 계산
  useEffect(() => {
    if (isDataManagementDialogOpen) {
      calculateStorageUsage();
    }
  }, [isDataManagementDialogOpen]);
  
  // 알림 기능 (토스트 알림 제어)
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('toastNotificationsEnabled');
    return saved !== null ? saved === 'true' : true; // 기본값은 true
  });

  useEffect(() => {
    localStorage.setItem('toastNotificationsEnabled', toastNotificationsEnabled.toString());
  }, [toastNotificationsEnabled]);

  // 데이터 관리 다이얼로그 열 때 저장공간 사용량 계산
  useEffect(() => {
    if (isDataManagementDialogOpen) {
      calculateStorageUsage();
    }
  }, [isDataManagementDialogOpen]);

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
        setIsSupportDialogOpen(true);
      },
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
    {
      id: "appInfo",
      icon: Info,
      title: t.settings.appInfo,
      description: t.settings.appInfoDesc,
      color: "from-slate-500/10 to-gray-500/10 border-slate-500/40",
      iconColor: "text-slate-600",
      onClick: () => setIsAppInfoDialogOpen(true),
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
            
            {/* 포인트 및 프리미엄 구독 */}
            <div className="pt-4 sm:pt-6 border-t border-indigo-200/50">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* 포인트 표시 - 클릭 시 상점 열기 */}
                <button
                  onClick={() => setIsStoreDialogOpen(true)}
                  className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 p-2.5 sm:p-5 rounded-lg sm:rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200/50 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <Sparkles className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 font-medium leading-tight">
                      {language === 'ko' ? '보유 포인트' : language === 'en' ? 'Current Points' : language === 'zh' ? '当前积分' : '保有ポイント'}
                    </p>
                    <p className="text-base sm:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent leading-tight" data-testid="text-user-points">
                      {userPoints.toLocaleString()}
                      <span className="text-[10px] sm:text-base text-muted-foreground ml-0.5 sm:ml-1">P</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100" />
                </button>
                
                {/* 프리미엄 구독 버튼 */}
                <button className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 p-2.5 sm:p-5 rounded-lg sm:rounded-2xl bg-gradient-to-br from-purple-50/50 to-pink-50/30 border border-purple-200/50 hover:shadow-md active:scale-[0.98] transition-all group">
                  <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                    <Gem className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 font-medium leading-tight truncate">
                      {language === 'ko' ? '프리미엄 구독' : language === 'en' ? 'Premium Subscription' : language === 'zh' ? '高级订阅' : 'プレミアム購読'}
                    </p>
                    <p className="text-xs sm:text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight truncate">
                      {language === 'ko' ? '구독하기' : language === 'en' ? 'Subscribe' : language === 'zh' ? '订阅' : '購読する'}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </button>
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

      {/* 상점 다이얼로그 - 팝업창으로 표시 */}
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

      {/* 앱 정보 다이얼로그 - 팝업창으로 표시 */}
        <Dialog open={isAppInfoDialogOpen} onOpenChange={setIsAppInfoDialogOpen}>
          <DialogContent className="sm:max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b bg-gradient-to-br from-green-50/50 to-emerald-50/30">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                <Info className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                {t.settings.appInfo}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-4 sm:px-5 py-4 sm:py-5">
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-50/60 to-emerald-50/60 border-2 border-green-200/60">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t.settings.version}</span>
                    <span className="text-sm sm:text-base font-semibold">1.0.0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">{t.settings.developer}</span>
                    <span className="text-sm sm:text-base font-semibold truncate ml-2">{t.settings.developerName}</span>
                  </div>
                </div>

                {/* 이용약관 */}
                <button
                  onClick={() => {
                    setIsAppInfoDialogOpen(false);
                    setTimeout(() => setIsTermsDialogOpen(true), 300);
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-50/80 to-gray-50/80 border-2 border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-slate-100 to-gray-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {t.settings.supportTerms}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.supportTermsDesc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 개인정보처리방침 */}
                <button
                  onClick={() => {
                    setIsAppInfoDialogOpen(false);
                    setTimeout(() => setIsPrivacyDialogOpen(true), 300);
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-50/80 to-purple-50/80 border-2 border-violet-200/60 hover:border-violet-300 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {t.settings.supportPrivacy}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.supportPrivacyDesc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 데이터 관리 */}
                <button
                  onClick={() => {
                    setIsAppInfoDialogOpen(false);
                    setTimeout(() => setIsDataManagementDialogOpen(true), 300);
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50/80 to-cyan-50/80 border-2 border-blue-200/60 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Database className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {language === 'ko' ? '데이터 관리' : language === 'en' ? 'Data Management' : language === 'zh' ? '数据管理' : 'データ管理'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {language === 'ko' ? '저장공간 사용량 및 캐시 관리' : language === 'en' ? 'Storage usage and cache management' : language === 'zh' ? '存储使用量和缓存管理' : 'ストレージ使用量とキャッシュ管理'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 계정 관리 */}
                <button
                  onClick={() => {
                    setIsAppInfoDialogOpen(false);
                    setTimeout(() => setIsAccountManagementDialogOpen(true), 300);
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50/80 to-orange-50/80 border-2 border-red-200/60 hover:border-red-300 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-100 to-orange-100 border border-red-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {language === 'ko' ? '계정 관리' : language === 'en' ? 'Account Management' : language === 'zh' ? '账户管理' : 'アカウント管理'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {language === 'ko' ? '계정 삭제 및 관리' : language === 'en' ? 'Delete and manage account' : language === 'zh' ? '删除和管理账户' : 'アカウントの削除と管理'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* 데이터 관리 다이얼로그 */}
      <Dialog open={isDataManagementDialogOpen} onOpenChange={setIsDataManagementDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b bg-gradient-to-br from-blue-50/50 to-cyan-50/30">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
              {language === 'ko' ? '데이터 관리' : language === 'en' ? 'Data Management' : language === 'zh' ? '数据管理' : 'データ管理'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1">
              {language === 'ko' ? '저장공간 사용량 및 캐시 관리' : language === 'en' ? 'Storage usage and cache management' : language === 'zh' ? '存储使用量和缓存管理' : 'ストレージ使用量とキャッシュ管理'}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-4 sm:px-5 py-4 sm:py-5">
            <div className="space-y-4 sm:space-y-5">
              {/* 저장공간 사용량 */}
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border-2 border-blue-200/60">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm sm:text-base">
                    {language === 'ko' ? '저장공간 사용량' : language === 'en' ? 'Storage Usage' : language === 'zh' ? '存储使用量' : 'ストレージ使用量'}
                  </h3>
                </div>
                {storageUsage ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {language === 'ko' ? '사용 중' : language === 'en' ? 'Used' : language === 'zh' ? '已使用' : '使用中'}
                      </span>
                      <span className="text-sm sm:text-base font-semibold">{formatBytes(storageUsage.used)}</span>
                    </div>
                    {storageUsage.total > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {language === 'ko' ? '전체 용량' : language === 'en' ? 'Total' : language === 'zh' ? '总容量' : '総容量'}
                        </span>
                        <span className="text-sm sm:text-base font-semibold">{formatBytes(storageUsage.total)}</span>
                      </div>
                    )}
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: storageUsage.total > 0
                            ? `${(storageUsage.used / storageUsage.total) * 100}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {language === 'ko' ? '계산 중...' : language === 'en' ? 'Calculating...' : language === 'zh' ? '计算中...' : '計算中...'}
                  </p>
                )}
              </div>

              {/* 캐시 정보 */}
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50/60 to-yellow-50/60 border-2 border-amber-200/60">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-sm sm:text-base">
                    {language === 'ko' ? '캐시 크기' : language === 'en' ? 'Cache Size' : language === 'zh' ? '缓存大小' : 'キャッシュサイズ'}
                  </h3>
                </div>
                {storageUsage ? (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'ko' ? '캐시 데이터' : language === 'en' ? 'Cache Data' : language === 'zh' ? '缓存数据' : 'キャッシュデータ'}
                    </span>
                    <span className="text-sm sm:text-base font-semibold">{formatBytes(storageUsage.cache)}</span>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {language === 'ko' ? '계산 중...' : language === 'en' ? 'Calculating...' : language === 'zh' ? '计算中...' : '計算中...'}
                  </p>
                )}
              </div>

              {/* 캐시 삭제 버튼 */}
              <Button
                onClick={clearCache}
                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50/80 to-orange-50/80 border-2 border-red-200/60 hover:border-red-300 hover:shadow-md transition-all duration-200"
                variant="outline"
              >
                <div className="flex items-center gap-3 w-full">
                  <Trash2 className="h-5 w-5 text-red-600 shrink-0" />
                  <span className="font-semibold text-sm sm:text-base">
                    {language === 'ko' ? '캐시 삭제' : language === 'en' ? 'Clear Cache' : language === 'zh' ? '清除缓存' : 'キャッシュをクリア'}
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 계정 관리 다이얼로그 */}
      <Dialog open={isAccountManagementDialogOpen} onOpenChange={setIsAccountManagementDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b bg-gradient-to-br from-red-50/50 to-orange-50/30">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
              <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 shrink-0" />
              {language === 'ko' ? '계정 관리' : language === 'en' ? 'Account Management' : language === 'zh' ? '账户管理' : 'アカウント管理'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1">
              {language === 'ko' ? '계정 삭제 및 관리' : language === 'en' ? 'Delete and manage account' : language === 'zh' ? '删除和管理账户' : 'アカウントの削除と管理'}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-4 sm:px-5 py-4 sm:py-5">
            <div className="space-y-4 sm:space-y-5">
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50/60 to-orange-50/60 border-2 border-red-200/60">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  {language === 'ko' ? '위험한 작업' : language === 'en' ? 'Dangerous Actions' : language === 'zh' ? '危险操作' : '危険な操作'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  {language === 'ko'
                    ? '계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.'
                    : language === 'en'
                    ? 'Deleting your account will permanently delete all data and cannot be recovered.'
                    : language === 'zh'
                    ? '删除账户将永久删除所有数据，无法恢复。'
                    : 'アカウントを削除すると、すべてのデータが永続的に削除され、復元できません。'}
                </p>
                <Button
                  onClick={deleteAccount}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white border-0 hover:shadow-md transition-all duration-200"
                  variant="destructive"
                >
                  <div className="flex items-center gap-3 w-full justify-center">
                    <Trash2 className="h-5 w-5 shrink-0" />
                    <span className="font-semibold text-sm sm:text-base">
                      {language === 'ko' ? '계정 삭제' : language === 'en' ? 'Delete Account' : language === 'zh' ? '删除账户' : 'アカウントを削除'}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 고객지원 다이얼로그 - 팝업창으로 표시 */}
        <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
          <DialogContent className="sm:max-w-lg w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b bg-gradient-to-br from-blue-50/50 to-cyan-50/30">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
                {t.settings.customerSupport}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                {t.settings.customerSupportDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto px-4 sm:px-5 py-4 sm:py-5">
              <div className="space-y-3 sm:space-y-4">
                {/* FAQ */}
                <button
                  onClick={() => {
                    setIsFaqDialogOpen(true);
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50/80 to-cyan-50/80 border-2 border-blue-200/60 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {t.settings.supportFaq}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.supportFaqDesc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 문의하기 */}
                <button
                  onClick={() => {
                    const email = 'storybuild@naver.com';
                    const category = '[문의하기]';
                    const subject = language === 'ko' ? '문의하기' : language === 'en' ? 'Inquiry' : language === 'zh' ? '咨询' : 'お問い合わせ';
                    const body = language === 'ko' 
                      ? `문의 내용을 작성해주세요:\n\n1. 문의 유형:\n\n2. 문의 내용:\n\n3. 연락처 (선택사항):\n\n4. 기타 사항:`
                      : language === 'en'
                      ? `Please describe your inquiry:\n\n1. Inquiry type:\n\n2. Inquiry details:\n\n3. Contact information (optional):\n\n4. Additional information:`
                      : language === 'zh'
                      ? `请描述您的咨询：\n\n1. 咨询类型：\n\n2. 咨询内容：\n\n3. 联系方式（可选）：\n\n4. 其他事项：`
                      : `お問い合わせ内容を記入してください：\n\n1. お問い合わせ種類：\n\n2. お問い合わせ内容：\n\n3. 連絡先（任意）：\n\n4. その他：`;
                    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(`${category} ${subject}`)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoLink;
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-200/60 dark:border-indigo-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                      <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {t.settings.supportInquiry}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.supportInquiryDesc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 피드백 보내기 */}
                <button
                  onClick={() => {
                    const email = 'storybuild@naver.com';
                    const category = '[피드백보내기]';
                    const subject = language === 'ko' ? '피드백보내기' : language === 'en' ? 'Feedback' : language === 'zh' ? '反馈' : 'フィードバック';
                    const body = language === 'ko' 
                      ? `피드백 내용을 작성해주세요:\n\n1. 피드백 유형:\n\n2. 피드백 내용:\n\n3. 개선 제안 (선택사항):\n\n4. 기타 의견:`
                      : language === 'en'
                      ? `Please provide your feedback:\n\n1. Feedback type:\n\n2. Feedback details:\n\n3. Improvement suggestions (optional):\n\n4. Additional comments:`
                      : language === 'zh'
                      ? `请提供您的反馈：\n\n1. 反馈类型：\n\n2. 反馈内容：\n\n3. 改进建议（可选）：\n\n4. 其他意见：`
                      : `フィードバック内容を記入してください：\n\n1. フィードバック種類：\n\n2. フィードバック内容：\n\n3. 改善提案（任意）：\n\n4. その他の意見：`;
                    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(`${category} ${subject}`)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoLink;
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                      <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {t.settings.supportFeedback}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.supportFeedbackDesc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 버그 신고 */}
                <button
                  onClick={() => {
                    const email = 'storybuild@naver.com';
                    const category = '[버그신고]';
                    const subject = language === 'ko' ? '버그신고' : language === 'en' ? 'Bug Report' : language === 'zh' ? '错误报告' : 'バグ報告';
                    const body = language === 'ko' 
                      ? `버그 신고 내용을 작성해주세요:\n\n1. 발생한 문제:\n\n2. 재현 방법:\n\n3. 예상 결과:\n\n4. 실제 결과:\n\n5. 기기 정보 (선택사항):\n\n6. 스크린샷 (선택사항):`
                      : language === 'en'
                      ? `Please describe the bug:\n\n1. Issue:\n\n2. Steps to reproduce:\n\n3. Expected result:\n\n4. Actual result:\n\n5. Device information (optional):\n\n6. Screenshot (optional):`
                      : language === 'zh'
                      ? `请描述错误：\n\n1. 问题：\n\n2. 重现步骤：\n\n3. 预期结果：\n\n4. 实际结果：\n\n5. 设备信息（可选）：\n\n6. 截图（可选）：`
                      : `バグの内容を記入してください：\n\n1. 発生した問題：\n\n2. 再現方法：\n\n3. 期待される結果：\n\n4. 実際の結果：\n\n5. デバイス情報（任意）：\n\n6. スクリーンショット（任意）：`;
                    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(`${category} ${subject}`)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoLink;
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-200/60 dark:border-red-800/40 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 border border-red-200 dark:border-red-800/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                      <Bug className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {t.settings.supportBugReport}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.supportBugReportDesc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 공지사항 */}
                <button
                  onClick={() => {
                    setIsSupportDialogOpen(false);
                    setTimeout(() => setIsNoticeDialogOpen(true), 300);
                  }}
                  className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50/80 to-yellow-50/80 border-2 border-amber-200/60 hover:border-amber-300 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-foreground mb-0.5">
                        {t.settings.supportNotice}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t.settings.supportNoticeDesc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

              </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* 이용약관 다이얼로그 - 모바일은 Sheet, 데스크톱은 Dialog */}
      {isMobile ? (
        <Sheet open={isTermsDialogOpen} onOpenChange={(open) => {
          setIsTermsDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsAppInfoDialogOpen(true), 300);
          }
        }}>
          <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-t-3xl">
            <SheetHeader className="px-5 pt-6 pb-4 border-b bg-gradient-to-br from-slate-50/50 to-gray-50/30">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <FileTextIcon className="h-6 w-6 text-slate-600 shrink-0" />
                {language === 'ko' ? '이용약관' : language === 'en' ? 'Terms of Service' : language === 'zh' ? '服务条款' : '利用規約'}
              </SheetTitle>
              <SheetDescription className="text-sm mt-1.5">
                {language === 'ko' ? 'MemoWay 서비스 이용약관' : language === 'en' ? 'MemoWay Terms of Service' : language === 'zh' ? 'MemoWay 服务条款' : 'MemoWay 利用規約'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="space-y-6 text-sm leading-relaxed">
                {language === 'ko' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제1조 (목적)</h3>
                      <p className="text-muted-foreground">
                        본 약관은 MemoWay(이하 "회사")가 제공하는 위치 기반 메모 공유 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제2조 (정의)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. "서비스"란 회사가 제공하는 위치 기반 메모 작성, 공유, 그룹 관리 등의 기능을 포함하는 모든 서비스를 의미합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. "이용자"란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 의미합니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. "메모"란 이용자가 특정 위치에 작성한 텍스트, 사진 등의 콘텐츠를 의미합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제3조 (서비스의 제공)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 다음과 같은 서비스를 제공합니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>위치 기반 메모 작성 및 관리</li>
                        <li>그룹 생성 및 메모 공유</li>
                        <li>지도 기반 메모 탐색</li>
                        <li>포인트 구매 및 사용</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만, 회사의 업무상 또는 기술상의 이유로 서비스가 일시 중단될 수 있으며, 이 경우 회사는 사전에 공지합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제4조 (이용자의 의무)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 이용자는 다음 행위를 하여서는 안 됩니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>타인의 개인정보를 무단으로 수집, 이용하거나 타인에게 제공하는 행위</li>
                        <li>서비스의 안정적 운영을 방해하는 행위</li>
                        <li>불법적이거나 부적절한 콘텐츠를 게시하는 행위</li>
                        <li>다른 이용자의 서비스 이용을 방해하는 행위</li>
                        <li>회사의 지적재산권을 침해하는 행위</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 이용자가 본 조의 의무를 위반한 경우, 회사는 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제5조 (포인트 및 유료 서비스)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 일부 서비스에 대해 포인트를 통한 유료 서비스를 제공할 수 있습니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 포인트는 회사가 정한 방법으로 구매할 수 있으며, 구매한 포인트는 환불되지 않습니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. 포인트는 서비스 내에서만 사용 가능하며, 현금으로 환전하거나 양도할 수 없습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제6조 (개인정보 보호)</h3>
                      <p className="text-muted-foreground">
                        회사는 이용자의 개인정보를 보호하기 위하여 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련 법령 및 회사의 개인정보처리방침이 적용됩니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제7조 (서비스의 변경 및 중단)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 서비스의 내용을 변경하거나 중단할 수 있습니다.
                      </p>
                      <p className="text-muted-foreground">
                        2. 회사는 서비스 중단 시 사전에 공지하며, 중단으로 인한 이용자의 손해에 대해 책임을 지지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제8조 (면책사항)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
                      </p>
                      <p className="text-muted-foreground">
                        2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제9조 (약관의 변경)</h3>
                      <p className="text-muted-foreground">
                        회사는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 화면에 공지함으로써 효력을 발생합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제10조 (준거법 및 관할법원)</h3>
                      <p className="text-muted-foreground">
                        본 약관에 명시되지 않은 사항은 대한민국 법령을 따르며, 서비스 이용과 관련하여 발생한 분쟁에 대해서는 회사의 본사 소재지를 관할하는 법원을 관할법원으로 합니다.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        본 약관은 2024년 1월 1일부터 시행됩니다.
                      </p>
                    </div>
                  </>
                ) : language === 'en' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 1 (Purpose)</h3>
                      <p className="text-muted-foreground">
                        These Terms of Service govern the use of MemoWay's location-based memo sharing service (the "Service") and establish the rights, obligations, and responsibilities between the Company and users.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 2 (Definitions)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. "Service" means all services provided by the Company, including location-based memo creation, sharing, and group management features.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. "User" means any person who agrees to these Terms and uses the Service.
                      </p>
                      <p className="text-muted-foreground">
                        3. "Memo" means content such as text and photos created by users at specific locations.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 3 (Service Provision)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company provides the following services:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Location-based memo creation and management</li>
                        <li>Group creation and memo sharing</li>
                        <li>Map-based memo exploration</li>
                        <li>Point purchase and usage</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. The Service is provided 24 hours a day, 365 days a year. However, the Service may be temporarily suspended due to business or technical reasons, and the Company will provide prior notice in such cases.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 4 (User Obligations)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. Users must not engage in the following acts:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Unauthorized collection, use, or provision of others' personal information</li>
                        <li>Acts that interfere with the stable operation of the Service</li>
                        <li>Posting illegal or inappropriate content</li>
                        <li>Acts that interfere with other users' use of the Service</li>
                        <li>Acts that infringe upon the Company's intellectual property rights</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. If a user violates the obligations under this Article, the Company may restrict Service use or terminate the agreement.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 5 (Points and Paid Services)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company may provide paid services through points for some services.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. Points can be purchased through methods determined by the Company, and purchased points are non-refundable.
                      </p>
                      <p className="text-muted-foreground">
                        3. Points can only be used within the Service and cannot be exchanged for cash or transferred.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 6 (Privacy Protection)</h3>
                      <p className="text-muted-foreground">
                        The Company strives to protect users' personal information. The protection and use of personal information is governed by applicable laws and the Company's Privacy Policy.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 7 (Service Changes and Suspension)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company may change or suspend the Service.
                      </p>
                      <p className="text-muted-foreground">
                        2. The Company will provide prior notice when suspending the Service and is not liable for any damages to users resulting from such suspension.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 8 (Disclaimer)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company is exempt from liability for Service provision in cases of natural disasters or similar force majeure events.
                      </p>
                      <p className="text-muted-foreground">
                        2. The Company is not liable for Service disruptions caused by user negligence.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 9 (Amendment of Terms)</h3>
                      <p className="text-muted-foreground">
                        The Company may amend these Terms when necessary, and amended Terms become effective upon notification on the Service screen.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 10 (Governing Law and Jurisdiction)</h3>
                      <p className="text-muted-foreground">
                        Matters not specified in these Terms are governed by the laws of the Republic of Korea, and disputes arising from Service use shall be subject to the jurisdiction of the court having jurisdiction over the Company's headquarters.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        These Terms take effect from January 1, 2024.
                      </p>
                    </div>
                  </>
                ) : language === 'zh' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第1条 (目的)</h3>
                      <p className="text-muted-foreground">
                        本条款旨在规定MemoWay（以下简称"公司"）提供的位置备忘录共享服务（以下简称"服务"）的使用，以及公司与用户之间的权利、义务和责任。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第2条 (定义)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. "服务"是指公司提供的包括基于位置的备忘录创建、共享、群组管理等功能的所有服务。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. "用户"是指同意本条款并使用公司提供的服务的个人。
                      </p>
                      <p className="text-muted-foreground">
                        3. "备忘录"是指用户在特定位置创建的文本、照片等内容。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第3条 (服务提供)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 公司提供以下服务：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>基于位置的备忘录创建和管理</li>
                        <li>群组创建和备忘录共享</li>
                        <li>基于地图的备忘录探索</li>
                        <li>积分购买和使用</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 服务原则上全年365天、每天24小时提供。但是，由于公司业务或技术原因，服务可能会暂时中断，在这种情况下，公司将提前通知。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第4条 (用户义务)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 用户不得从事以下行为：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>未经授权收集、使用或提供他人的个人信息</li>
                        <li>干扰服务稳定运行的行为</li>
                        <li>发布非法或不适当的内容</li>
                        <li>干扰其他用户使用服务的行为</li>
                        <li>侵犯公司知识产权的行为</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 如果用户违反本条的义务，公司可以限制服务使用或终止协议。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第5条 (积分和付费服务)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 公司可能对某些服务提供通过积分的付费服务。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 积分可以通过公司确定的方式购买，购买的积分不可退款。
                      </p>
                      <p className="text-muted-foreground">
                        3. 积分只能在服务内使用，不能兑换现金或转让。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第6条 (隐私保护)</h3>
                      <p className="text-muted-foreground">
                        公司努力保护用户的个人信息。个人信息的保护和使用受相关法律法规和公司隐私政策的约束。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第7条 (服务变更和中止)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 公司可以更改或中止服务。
                      </p>
                      <p className="text-muted-foreground">
                        2. 公司在中止服务时将提前通知，不对因中止而给用户造成的损害承担责任。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第8条 (免责声明)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 因自然灾害或类似不可抗力导致无法提供服务时，公司对服务提供不承担责任。
                      </p>
                      <p className="text-muted-foreground">
                        2. 因用户过错导致的服务使用障碍，公司不承担责任。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第9条 (条款变更)</h3>
                      <p className="text-muted-foreground">
                        公司可以在必要时修改本条款，修改后的条款通过在服务屏幕上通知而生效。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第10条 (适用法律和管辖法院)</h3>
                      <p className="text-muted-foreground">
                        本条款未规定的事项适用大韩民国法律，与服务使用相关的争议应由对公司总部有管辖权的法院管辖。
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        本条款自2024年1月1日起生效。
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第1条 (目的)</h3>
                      <p className="text-muted-foreground">
                        本規約は、MemoWay（以下「会社」）が提供する位置情報ベースのメモ共有サービス（以下「サービス」）の利用に関し、会社と利用者間の権利、義務および責任事項を定めることを目的とします。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第2条 (定義)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 「サービス」とは、会社が提供する位置情報ベースのメモ作成、共有、グループ管理などの機能を含むすべてのサービスを意味します。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 「利用者」とは、本規約に同意し、会社が提供するサービスを利用する者を意味します。
                      </p>
                      <p className="text-muted-foreground">
                        3. 「メモ」とは、利用者が特定の場所に作成したテキスト、写真などのコンテンツを意味します。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第3条 (サービスの提供)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社は以下のサービスを提供します：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>位置情報ベースのメモ作成および管理</li>
                        <li>グループ作成およびメモ共有</li>
                        <li>地図ベースのメモ探索</li>
                        <li>ポイント購入および使用</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. サービスは原則として年中無休、1日24時間提供されます。ただし、会社の業務上または技術上の理由により、サービスが一時的に中断される場合があり、この場合、会社は事前に通知します。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第4条 (利用者の義務)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 利用者は以下の行為を行ってはなりません：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>他人の個人情報を無断で収集、利用または他人に提供する行為</li>
                        <li>サービスの安定した運営を妨害する行為</li>
                        <li>違法または不適切なコンテンツを投稿する行為</li>
                        <li>他の利用者のサービス利用を妨害する行為</li>
                        <li>会社の知的財産権を侵害する行為</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 利用者が本条の義務に違反した場合、会社はサービスの利用を制限または契約を解除することができます。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第5条 (ポイントおよび有料サービス)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社は一部のサービスについて、ポイントを通じた有料サービスを提供する場合があります。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. ポイントは会社が定めた方法で購入でき、購入したポイントは返金されません。
                      </p>
                      <p className="text-muted-foreground">
                        3. ポイントはサービス内でのみ使用可能で、現金に交換したり譲渡したりすることはできません。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第6条 (個人情報保護)</h3>
                      <p className="text-muted-foreground">
                        会社は利用者の個人情報を保護するために努力します。個人情報の保護および使用については、関連法令および会社のプライバシーポリシーが適用されます。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第7条 (サービスの変更および中断)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社はサービスの内容を変更または中断することができます。
                      </p>
                      <p className="text-muted-foreground">
                        2. 会社はサービス中断時に事前に通知し、中断による利用者の損害について責任を負いません。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第8条 (免責事項)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社は天災地変またはこれに準ずる不可抗力によりサービスを提供できない場合、サービス提供に関する責任を免れます。
                      </p>
                      <p className="text-muted-foreground">
                        2. 会社は利用者の責めに帰すべき事由によるサービス利用の障害について責任を負いません。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第9条 (規約の変更)</h3>
                      <p className="text-muted-foreground">
                        会社は必要な場合、本規約を変更することができ、変更された規約はサービス画面に通知することにより効力を発生します。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">第10条 (準拠法および管轄裁判所)</h3>
                      <p className="text-muted-foreground">
                        本規約に明示されていない事項は大韓民国の法令に従い、サービス利用に関連して発生した紛争については、会社の本社所在地を管轄する裁判所を管轄裁判所とします。
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        本規約は2024年1月1日から施行されます。
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isTermsDialogOpen} onOpenChange={(open) => {
          setIsTermsDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsAppInfoDialogOpen(true), 300);
          }
        }}>
          <DialogContent className="sm:max-w-2xl w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-br from-slate-50/50 to-gray-50/30">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
                <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600 shrink-0" />
                {language === 'ko' ? '이용약관' : language === 'en' ? 'Terms of Service' : language === 'zh' ? '服务条款' : '利用規約'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                {language === 'ko' ? 'MemoWay 서비스 이용약관' : language === 'en' ? 'MemoWay Terms of Service' : language === 'zh' ? 'MemoWay 服务条款' : 'MemoWay 利用規約'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="space-y-6 text-sm sm:text-base leading-relaxed">
                {language === 'ko' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제1조 (목적)</h3>
                      <p className="text-muted-foreground">
                        본 약관은 MemoWay(이하 "회사")가 제공하는 위치 기반 메모 공유 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제2조 (정의)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. "서비스"란 회사가 제공하는 위치 기반 메모 작성, 공유, 그룹 관리 등의 기능을 포함하는 모든 서비스를 의미합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. "이용자"란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 의미합니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. "메모"란 이용자가 특정 위치에 작성한 텍스트, 사진 등의 콘텐츠를 의미합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제3조 (서비스의 제공)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 다음과 같은 서비스를 제공합니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>위치 기반 메모 작성 및 관리</li>
                        <li>그룹 생성 및 메모 공유</li>
                        <li>지도 기반 메모 탐색</li>
                        <li>포인트 구매 및 사용</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만, 회사의 업무상 또는 기술상의 이유로 서비스가 일시 중단될 수 있으며, 이 경우 회사는 사전에 공지합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제4조 (이용자의 의무)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 이용자는 다음 행위를 하여서는 안 됩니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>타인의 개인정보를 무단으로 수집, 이용하거나 타인에게 제공하는 행위</li>
                        <li>서비스의 안정적 운영을 방해하는 행위</li>
                        <li>불법적이거나 부적절한 콘텐츠를 게시하는 행위</li>
                        <li>다른 이용자의 서비스 이용을 방해하는 행위</li>
                        <li>회사의 지적재산권을 침해하는 행위</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 이용자가 본 조의 의무를 위반한 경우, 회사는 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제5조 (포인트 및 유료 서비스)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 일부 서비스에 대해 포인트를 통한 유료 서비스를 제공할 수 있습니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 포인트는 회사가 정한 방법으로 구매할 수 있으며, 구매한 포인트는 환불되지 않습니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. 포인트는 서비스 내에서만 사용 가능하며, 현금으로 환전하거나 양도할 수 없습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제6조 (개인정보 보호)</h3>
                      <p className="text-muted-foreground">
                        회사는 이용자의 개인정보를 보호하기 위하여 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련 법령 및 회사의 개인정보처리방침이 적용됩니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제7조 (서비스의 변경 및 중단)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 서비스의 내용을 변경하거나 중단할 수 있습니다.
                      </p>
                      <p className="text-muted-foreground">
                        2. 회사는 서비스 중단 시 사전에 공지하며, 중단으로 인한 이용자의 손해에 대해 책임을 지지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제8조 (면책사항)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
                      </p>
                      <p className="text-muted-foreground">
                        2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제9조 (약관의 변경)</h3>
                      <p className="text-muted-foreground">
                        회사는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 화면에 공지함으로써 효력을 발생합니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제10조 (준거법 및 관할법원)</h3>
                      <p className="text-muted-foreground">
                        본 약관에 명시되지 않은 사항은 대한민국 법령을 따르며, 서비스 이용과 관련하여 발생한 분쟁에 대해서는 회사의 본사 소재지를 관할하는 법원을 관할법원으로 합니다.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        본 약관은 2024년 1월 1일부터 시행됩니다.
                      </p>
                    </div>
                  </>
                ) : language === 'en' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 1 (Purpose)</h3>
                      <p className="text-muted-foreground">
                        These Terms of Service govern the use of MemoWay's location-based memo sharing service (the "Service") and establish the rights, obligations, and responsibilities between the Company and users.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 2 (Definitions)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. "Service" means all services provided by the Company, including location-based memo creation, sharing, and group management features.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. "User" means any person who agrees to these Terms and uses the Service.
                      </p>
                      <p className="text-muted-foreground">
                        3. "Memo" means content such as text and photos created by users at specific locations.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 3 (Service Provision)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company provides the following services:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Location-based memo creation and management</li>
                        <li>Group creation and memo sharing</li>
                        <li>Map-based memo exploration</li>
                        <li>Point purchase and usage</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. The Service is provided 24 hours a day, 365 days a year. However, the Service may be temporarily suspended due to business or technical reasons, and the Company will provide prior notice in such cases.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 4 (User Obligations)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. Users must not engage in the following acts:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Unauthorized collection, use, or provision of others' personal information</li>
                        <li>Acts that interfere with the stable operation of the Service</li>
                        <li>Posting illegal or inappropriate content</li>
                        <li>Acts that interfere with other users' use of the Service</li>
                        <li>Acts that infringe upon the Company's intellectual property rights</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. If a user violates the obligations under this Article, the Company may restrict Service use or terminate the agreement.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 5 (Points and Paid Services)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company may provide paid services through points for some services.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. Points can be purchased through methods determined by the Company, and purchased points are non-refundable.
                      </p>
                      <p className="text-muted-foreground">
                        3. Points can only be used within the Service and cannot be exchanged for cash or transferred.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 6 (Privacy Protection)</h3>
                      <p className="text-muted-foreground">
                        The Company strives to protect users' personal information. The protection and use of personal information is governed by applicable laws and the Company's Privacy Policy.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 7 (Service Changes and Suspension)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company may change or suspend the Service.
                      </p>
                      <p className="text-muted-foreground">
                        2. The Company will provide prior notice when suspending the Service and is not liable for any damages to users resulting from such suspension.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 8 (Disclaimer)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company is exempt from liability for Service provision in cases of natural disasters or similar force majeure events.
                      </p>
                      <p className="text-muted-foreground">
                        2. The Company is not liable for Service disruptions caused by user negligence.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 9 (Amendment of Terms)</h3>
                      <p className="text-muted-foreground">
                        The Company may amend these Terms when necessary, and amended Terms become effective upon notification on the Service screen.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 10 (Governing Law and Jurisdiction)</h3>
                      <p className="text-muted-foreground">
                        Matters not specified in these Terms are governed by the laws of the Republic of Korea, and disputes arising from Service use shall be subject to the jurisdiction of the court having jurisdiction over the Company's headquarters.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        These Terms take effect from January 1, 2024.
                      </p>
                    </div>
                  </>
                ) : language === 'zh' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第1条 (目的)</h3>
                      <p className="text-muted-foreground">
                        本条款旨在规定MemoWay（以下简称"公司"）提供的位置备忘录共享服务（以下简称"服务"）的使用，以及公司与用户之间的权利、义务和责任。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第2条 (定义)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. "服务"是指公司提供的包括基于位置的备忘录创建、共享、群组管理等功能的所有服务。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. "用户"是指同意本条款并使用公司提供的服务的个人。
                      </p>
                      <p className="text-muted-foreground">
                        3. "备忘录"是指用户在特定位置创建的文本、照片等内容。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第3条 (服务提供)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 公司提供以下服务：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>基于位置的备忘录创建和管理</li>
                        <li>群组创建和备忘录共享</li>
                        <li>基于地图的备忘录探索</li>
                        <li>积分购买和使用</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 服务原则上全年365天、每天24小时提供。但是，由于公司业务或技术原因，服务可能会暂时中断，在这种情况下，公司将提前通知。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第4条 (用户义务)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 用户不得从事以下行为：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>未经授权收集、使用或提供他人的个人信息</li>
                        <li>干扰服务稳定运行的行为</li>
                        <li>发布非法或不适当的内容</li>
                        <li>干扰其他用户使用服务的行为</li>
                        <li>侵犯公司知识产权的行为</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 如果用户违反本条的义务，公司可以限制服务使用或终止协议。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第5条 (积分和付费服务)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 公司可能对某些服务提供通过积分的付费服务。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 积分可以通过公司确定的方式购买，购买的积分不可退款。
                      </p>
                      <p className="text-muted-foreground">
                        3. 积分只能在服务内使用，不能兑换现金或转让。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第6条 (隐私保护)</h3>
                      <p className="text-muted-foreground">
                        公司努力保护用户的个人信息。个人信息的保护和使用受相关法律法规和公司隐私政策的约束。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第7条 (服务变更和中止)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 公司可以更改或中止服务。
                      </p>
                      <p className="text-muted-foreground">
                        2. 公司在中止服务时将提前通知，不对因中止而给用户造成的损害承担责任。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第8条 (免责声明)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 因自然灾害或类似不可抗力导致无法提供服务时，公司对服务提供不承担责任。
                      </p>
                      <p className="text-muted-foreground">
                        2. 因用户过错导致的服务使用障碍，公司不承担责任。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第9条 (条款变更)</h3>
                      <p className="text-muted-foreground">
                        公司可以在必要时修改本条款，修改后的条款通过在服务屏幕上通知而生效。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第10条 (适用法律和管辖法院)</h3>
                      <p className="text-muted-foreground">
                        本条款未规定的事项适用大韩民国法律，与服务使用相关的争议应由对公司总部有管辖权的法院管辖。
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        本条款自2024年1月1日起生效。
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第1条 (目的)</h3>
                      <p className="text-muted-foreground">
                        本規約は、MemoWay（以下「会社」）が提供する位置情報ベースのメモ共有サービス（以下「サービス」）の利用に関し、会社と利用者間の権利、義務および責任事項を定めることを目的とします。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第2条 (定義)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 「サービス」とは、会社が提供する位置情報ベースのメモ作成、共有、グループ管理などの機能を含むすべてのサービスを意味します。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 「利用者」とは、本規約に同意し、会社が提供するサービスを利用する者を意味します。
                      </p>
                      <p className="text-muted-foreground">
                        3. 「メモ」とは、利用者が特定の場所に作成したテキスト、写真などのコンテンツを意味します。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第3条 (サービスの提供)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社は以下のサービスを提供します：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>位置情報ベースのメモ作成および管理</li>
                        <li>グループ作成およびメモ共有</li>
                        <li>地図ベースのメモ探索</li>
                        <li>ポイント購入および使用</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. サービスは原則として年中無休、1日24時間提供されます。ただし、会社の業務上または技術上の理由により、サービスが一時的に中断される場合があり、この場合、会社は事前に通知します。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第4条 (利用者の義務)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 利用者は以下の行為を行ってはなりません：
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>他人の個人情報を無断で収集、利用または他人に提供する行為</li>
                        <li>サービスの安定した運営を妨害する行為</li>
                        <li>違法または不適切なコンテンツを投稿する行為</li>
                        <li>他の利用者のサービス利用を妨害する行為</li>
                        <li>会社の知的財産権を侵害する行為</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        2. 利用者が本条の義務に違反した場合、会社はサービスの利用を制限または契約を解除することができます。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第5条 (ポイントおよび有料サービス)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社は一部のサービスについて、ポイントを通じた有料サービスを提供する場合があります。
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. ポイントは会社が定めた方法で購入でき、購入したポイントは返金されません。
                      </p>
                      <p className="text-muted-foreground">
                        3. ポイントはサービス内でのみ使用可能で、現金に交換したり譲渡したりすることはできません。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第6条 (個人情報保護)</h3>
                      <p className="text-muted-foreground">
                        会社は利用者の個人情報を保護するために努力します。個人情報の保護および使用については、関連法令および会社のプライバシーポリシーが適用されます。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第7条 (サービスの変更および中断)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社はサービスの内容を変更または中断することができます。
                      </p>
                      <p className="text-muted-foreground">
                        2. 会社はサービス中断時に事前に通知し、中断による利用者の損害について責任を負いません。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第8条 (免責事項)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 会社は天災地変またはこれに準ずる不可抗力によりサービスを提供できない場合、サービス提供に関する責任を免れます。
                      </p>
                      <p className="text-muted-foreground">
                        2. 会社は利用者の責めに帰すべき事由によるサービス利用の障害について責任を負いません。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第9条 (規約の変更)</h3>
                      <p className="text-muted-foreground">
                        会社は必要な場合、本規約を変更することができ、変更された規約はサービス画面に通知することにより効力を発生します。
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">第10条 (準拠法および管轄裁判所)</h3>
                      <p className="text-muted-foreground">
                        本規約に明示されていない事項は大韓民国の法令に従い、サービス利用に関連して発生した紛争については、会社の本社所在地を管轄する裁判所を管轄裁判所とします。
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        本規約は2024年1月1日から施行されます。
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 개인정보처리방침 다이얼로그 - 모바일은 Sheet, 데스크톱은 Dialog */}
      {isMobile ? (
        <Sheet open={isPrivacyDialogOpen} onOpenChange={(open) => {
          setIsPrivacyDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsAppInfoDialogOpen(true), 300);
          }
        }}>
          <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-t-3xl">
            <SheetHeader className="px-5 pt-6 pb-4 border-b bg-gradient-to-br from-violet-50/50 to-purple-50/30">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-6 w-6 text-violet-600 shrink-0" />
                {language === 'ko' ? '개인정보처리방침' : language === 'en' ? 'Privacy Policy' : '개인정보처리방침'}
              </SheetTitle>
              <SheetDescription className="text-sm mt-1.5">
                {language === 'ko' ? 'MemoWay 개인정보처리방침' : language === 'en' ? 'MemoWay Privacy Policy' : 'MemoWay 개인정보처리방침'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="space-y-6 text-sm leading-relaxed">
                {language === 'ko' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제1조 (개인정보의 처리 목적)</h3>
                      <p className="text-muted-foreground mb-2">
                        MemoWay(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>서비스 제공: 위치 기반 메모 작성, 그룹 생성 및 관리, 메모 공유 등 서비스 제공</li>
                        <li>회원 관리: 회원 가입, 본인 확인, 계정 관리, 서비스 이용에 따른 본인확인</li>
                        <li>위치 정보 처리: 사용자의 현재 위치 수집 및 저장, 위치 기반 메모 표시</li>
                        <li>결제 및 포인트 관리: 포인트 구매 및 사용 내역 관리</li>
                        <li>고객 지원: 문의사항 응대, 불만 처리, 공지사항 전달</li>
                      </ul>
                    </div>
                  </>
                ) : language === 'en' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 1 (Purpose of Personal Information Processing)</h3>
                      <p className="text-muted-foreground mb-2">
                        MemoWay (hereinafter referred to as "the Company") processes personal information for the following purposes. The personal information being processed will not be used for purposes other than those specified, and if the purpose of use changes, necessary measures such as obtaining separate consent will be implemented in accordance with Article 18 of the Personal Information Protection Act.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Service Provision: Providing services such as location-based memo creation, group creation and management, and memo sharing.</li>
                        <li>Member Management: Member registration, identity verification, account management, and identity verification for service use.</li>
                        <li>Location Information Processing: Collecting and storing user's current location, displaying location-based memos.</li>
                        <li>Payment and Point Management: Managing point purchases and usage history.</li>
                        <li>Customer Support: Responding to inquiries, handling complaints, and delivering announcements.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제1조 (개인정보의 처리 목적)</h3>
                      <p className="text-muted-foreground mb-2">
                        MemoWay(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>서비스 제공: 위치 기반 메모 작성, 그룹 생성 및 관리, 메모 공유 등 서비스 제공</li>
                        <li>회원 관리: 회원 가입, 본인 확인, 계정 관리, 서비스 이용에 따른 본인확인</li>
                        <li>위치 정보 처리: 사용자의 현재 위치 수집 및 저장, 위치 기반 메모 표시</li>
                        <li>결제 및 포인트 관리: 포인트 구매 및 사용 내역 관리</li>
                        <li>고객 지원: 문의사항 응대, 불만 처리, 공지사항 전달</li>
                      </ul>
                    </div>
                  </>
                )}

                {language === 'ko' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제2조 (개인정보의 처리 및 보유기간)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>회원 정보: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
                        <li>위치 정보: 서비스 이용 중 위치 정보 수집, 서비스 종료 시 즉시 삭제 (단, 메모에 저장된 위치 정보는 해당 메모 삭제 시까지 보유)</li>
                        <li>결제 정보: 전자상거래법에 따라 5년간 보관</li>
                        <li>로그 정보: 서비스 이용 기록은 1년간 보관</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제3조 (처리하는 개인정보의 항목)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 다음의 개인정보 항목을 처리하고 있습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        1. 필수 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>이메일 주소, 이름 (소셜 로그인 시 제공되는 정보)</li>
                        <li>위치 정보 (GPS, Wi-Fi, 기지국 정보 등)</li>
                        <li>서비스 이용 기록 (메모 작성, 그룹 참여 등)</li>
                        <li>기기 정보 (기기 고유번호, OS 버전 등)</li>
                      </ul>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        2. 선택 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>프로필 사진</li>
                        <li>알림 설정 정보</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제4조 (개인정보의 제3자 제공)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 회사는 다음과 같이 개인정보를 제3자에게 제공할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>지도 서비스 제공업체 (카카오맵, 구글맵): 위치 정보를 통한 지도 표시 및 주소 검색</li>
                        <li>결제 서비스 제공업체: 포인트 구매 시 결제 처리</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        3. 회사는 정보주체의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제5조 (개인정보처리의 위탁)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>클라우드 서비스 제공업체: 서버 운영 및 데이터 저장</li>
                        <li>이메일 발송 서비스: 고객 지원 및 공지사항 발송</li>
                      </ul>
                      <p className="text-muted-foreground">
                        2. 회사는 위탁계약 체결 시 개인정보보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제6조 (정보주체의 권리·의무 및 행사방법)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>개인정보 처리정지 요구</li>
                        <li>개인정보 열람 요구</li>
                        <li>개인정보 정정·삭제 요구</li>
                      </ul>
                      <p className="text-muted-foreground mb-2">
                        2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제7조 (개인정보의 파기)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        가. 파기절차
                      </p>
                      <p className="text-muted-foreground mb-2 ml-2">
                        회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        나. 파기방법
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>전자적 파일 형태: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</li>
                        <li>기록물, 인쇄물, 서면 등: 분쇄하거나 소각하여 파기</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제8조 (개인정보 보호책임자)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-2">
                        <p className="text-muted-foreground mb-1">
                          <span className="font-semibold">개인정보 보호책임자</span>
                        </p>
                        <p className="text-muted-foreground mb-1">
                          이메일: support@memoway.com
                        </p>
                        <p className="text-muted-foreground">
                          정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제9조 (개인정보의 안전성 확보조치)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                        <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                        <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제10조 (개인정보처리방침 변경)</h3>
                      <p className="text-muted-foreground">
                        이 개인정보처리방침은 2024년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.
                      </p>
                    </div>
                  </>
                ) : language === 'en' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 2 (Processing and Retention Period of Personal Information)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company processes and retains personal information within the period of retention and use of personal information in accordance with laws and regulations, or within the period of retention and use of personal information agreed upon when collecting personal information from the data subject.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. The processing and retention period for each type of personal information is as follows:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Member Information: Until membership withdrawal (However, if an investigation or inquiry is in progress due to violation of related laws, until the end of such investigation or inquiry)</li>
                        <li>Location Information: Collected during service use, deleted immediately upon service termination (However, location information stored in memos is retained until the memo is deleted)</li>
                        <li>Payment Information: Retained for 5 years in accordance with the Electronic Commerce Act</li>
                        <li>Log Information: Service usage records are retained for 1 year</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 3 (Items of Personal Information Processed)</h3>
                      <p className="text-muted-foreground mb-2">
                        The Company processes the following personal information items:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        1. Required Items:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>Email address, name (information provided during social login)</li>
                        <li>Location information (GPS, Wi-Fi, base station information, etc.)</li>
                        <li>Service usage records (memo creation, group participation, etc.)</li>
                        <li>Device information (device unique number, OS version, etc.)</li>
                      </ul>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        2. Optional Items:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Profile photo</li>
                        <li>Notification settings information</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 4 (Provision of Personal Information to Third Parties)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company processes personal information of data subjects only within the scope specified in Article 1 (Purpose of Personal Information Processing), and provides personal information to third parties only in cases corresponding to Article 17 and Article 18 of the Personal Information Protection Act, such as consent from the data subject or special provisions of laws.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. The Company may provide personal information to third parties as follows:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Map service providers (Kakao Map, Google Map): Map display and address search using location information</li>
                        <li>Payment service providers: Payment processing when purchasing points</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        3. The Company does not provide personal information to third parties without the consent of the data subject.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 5 (Entrustment of Personal Information Processing)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. For smooth processing of personal information, the Company entrusts personal information processing tasks as follows:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>Cloud service providers: Server operation and data storage</li>
                        <li>Email delivery services: Customer support and announcement delivery</li>
                      </ul>
                      <p className="text-muted-foreground">
                        2. When entering into an entrustment contract, the Company specifies in documents such as contracts matters regarding prohibition of personal information processing for purposes other than the entrusted work, technical and administrative protection measures, restrictions on re-entrustment, management and supervision of trustees, and compensation for damages in accordance with Article 26 of the Personal Information Protection Act, and supervises whether trustees process personal information safely.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 6 (Rights, Obligations, and Exercise Methods of Data Subjects)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. Data subjects may exercise the following rights related to personal information protection against the Company at any time:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>Request for suspension of personal information processing</li>
                        <li>Request for access to personal information</li>
                        <li>Request for correction or deletion of personal information</li>
                      </ul>
                      <p className="text-muted-foreground mb-2">
                        2. The exercise of rights under paragraph 1 may be made to the Company in writing, by email, facsimile transmission (FAX), etc., and the Company will take action without delay.
                      </p>
                      <p className="text-muted-foreground">
                        3. If a data subject requests correction or deletion of errors in personal information, the Company will not use or provide the personal information until the correction or deletion is completed.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 7 (Destruction of Personal Information)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company destroys personal information without delay when it becomes unnecessary due to the expiration of the personal information retention period or achievement of the processing purpose.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. The procedures and methods for destroying personal information are as follows:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        a. Destruction Procedure
                      </p>
                      <p className="text-muted-foreground mb-2 ml-2">
                        The Company selects personal information for which a reason for destruction has occurred and destroys it after obtaining approval from the Company's personal information protection officer.
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        b. Destruction Method
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Electronic file format: Deletion using technical methods that cannot reproduce records</li>
                        <li>Records, printed materials, written documents, etc.: Destruction by shredding or incineration</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 8 (Personal Information Protection Officer)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company is responsible for overseeing all matters related to personal information processing, and has designated a personal information protection officer as follows to handle complaints and provide relief for damages related to personal information processing:
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-2">
                        <p className="text-muted-foreground mb-1">
                          <span className="font-semibold">Personal Information Protection Officer</span>
                        </p>
                        <p className="text-muted-foreground mb-1">
                          Email: support@memoway.com
                        </p>
                        <p className="text-muted-foreground">
                          Data subjects may contact the personal information protection officer regarding all matters related to personal information protection inquiries, complaint handling, and damage relief that occur while using the Company's services.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 9 (Measures to Ensure Safety of Personal Information)</h3>
                      <p className="text-muted-foreground mb-2">
                        The Company takes the following measures to ensure the safety of personal information:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Administrative measures: Establishment and implementation of internal management plans, regular employee training, etc.</li>
                        <li>Technical measures: Management of access rights to personal information processing systems, installation of access control systems, encryption of unique identification information, installation of security programs</li>
                        <li>Physical measures: Access control to computer rooms, data storage rooms, etc.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">Article 10 (Changes to Privacy Policy)</h3>
                      <p className="text-muted-foreground">
                        This Privacy Policy takes effect from January 1, 2024, and if there are additions, deletions, or corrections to the contents in accordance with laws and policies, notice will be given through announcements 7 days before the implementation of the changes.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        This Privacy Policy takes effect from January 1, 2024.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제2조 (개인정보의 처리 및 보유기간)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>회원 정보: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
                        <li>위치 정보: 서비스 이용 중 위치 정보 수집, 서비스 종료 시 즉시 삭제 (단, 메모에 저장된 위치 정보는 해당 메모 삭제 시까지 보유)</li>
                        <li>결제 정보: 전자상거래법에 따라 5년간 보관</li>
                        <li>로그 정보: 서비스 이용 기록은 1년간 보관</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제3조 (처리하는 개인정보의 항목)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 다음의 개인정보 항목을 처리하고 있습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        1. 필수 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>이메일 주소, 이름 (소셜 로그인 시 제공되는 정보)</li>
                        <li>위치 정보 (GPS, Wi-Fi, 기지국 정보 등)</li>
                        <li>서비스 이용 기록 (메모 작성, 그룹 참여 등)</li>
                        <li>기기 정보 (기기 고유번호, OS 버전 등)</li>
                      </ul>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        2. 선택 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>프로필 사진</li>
                        <li>알림 설정 정보</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제4조 (개인정보의 제3자 제공)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 회사는 다음과 같이 개인정보를 제3자에게 제공할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>지도 서비스 제공업체 (카카오맵, 구글맵): 위치 정보를 통한 지도 표시 및 주소 검색</li>
                        <li>결제 서비스 제공업체: 포인트 구매 시 결제 처리</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        3. 회사는 정보주체의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제5조 (개인정보처리의 위탁)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>클라우드 서비스 제공업체: 서버 운영 및 데이터 저장</li>
                        <li>이메일 발송 서비스: 고객 지원 및 공지사항 발송</li>
                      </ul>
                      <p className="text-muted-foreground">
                        2. 회사는 위탁계약 체결 시 개인정보보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제6조 (정보주체의 권리·의무 및 행사방법)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>개인정보 처리정지 요구</li>
                        <li>개인정보 열람 요구</li>
                        <li>개인정보 정정·삭제 요구</li>
                      </ul>
                      <p className="text-muted-foreground mb-2">
                        2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제7조 (개인정보의 파기)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        가. 파기절차
                      </p>
                      <p className="text-muted-foreground mb-2 ml-2">
                        회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        나. 파기방법
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>전자적 파일 형태: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</li>
                        <li>기록물, 인쇄물, 서면 등: 분쇄하거나 소각하여 파기</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제8조 (개인정보 보호책임자)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-2">
                        <p className="text-muted-foreground mb-1">
                          <span className="font-semibold">개인정보 보호책임자</span>
                        </p>
                        <p className="text-muted-foreground mb-1">
                          이메일: support@memoway.com
                        </p>
                        <p className="text-muted-foreground">
                          정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제9조 (개인정보의 안전성 확보조치)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                        <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                        <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base mb-2 text-foreground">제10조 (개인정보처리방침 변경)</h3>
                      <p className="text-muted-foreground">
                        이 개인정보처리방침은 2024년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isPrivacyDialogOpen} onOpenChange={(open) => {
          setIsPrivacyDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsAppInfoDialogOpen(true), 300);
          }
        }}>
          <DialogContent className="sm:max-w-2xl w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-br from-violet-50/50 to-purple-50/30">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 shrink-0" />
                {language === 'ko' ? '개인정보처리방침' : language === 'en' ? 'Privacy Policy' : '개인정보처리방침'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                {language === 'ko' ? 'MemoWay 개인정보처리방침' : language === 'en' ? 'MemoWay Privacy Policy' : 'MemoWay 개인정보처리방침'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="space-y-6 text-sm sm:text-base leading-relaxed">
                {language === 'ko' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제1조 (개인정보의 처리 목적)</h3>
                      <p className="text-muted-foreground mb-2">
                        MemoWay(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>서비스 제공: 위치 기반 메모 작성, 그룹 생성 및 관리, 메모 공유 등 서비스 제공</li>
                        <li>회원 관리: 회원 가입, 본인 확인, 계정 관리, 서비스 이용에 따른 본인확인</li>
                        <li>위치 정보 처리: 사용자의 현재 위치 수집 및 저장, 위치 기반 메모 표시</li>
                        <li>결제 및 포인트 관리: 포인트 구매 및 사용 내역 관리</li>
                        <li>고객 지원: 문의사항 응대, 불만 처리, 공지사항 전달</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제2조 (개인정보의 처리 및 보유기간)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>회원 정보: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
                        <li>위치 정보: 서비스 이용 중 위치 정보 수집, 서비스 종료 시 즉시 삭제 (단, 메모에 저장된 위치 정보는 해당 메모 삭제 시까지 보유)</li>
                        <li>결제 정보: 전자상거래법에 따라 5년간 보관</li>
                        <li>로그 정보: 서비스 이용 기록은 1년간 보관</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제3조 (처리하는 개인정보의 항목)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 다음의 개인정보 항목을 처리하고 있습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        1. 필수 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>이메일 주소, 이름 (소셜 로그인 시 제공되는 정보)</li>
                        <li>위치 정보 (GPS, Wi-Fi, 기지국 정보 등)</li>
                        <li>서비스 이용 기록 (메모 작성, 그룹 참여 등)</li>
                        <li>기기 정보 (기기 고유번호, OS 버전 등)</li>
                      </ul>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        2. 선택 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>프로필 사진</li>
                        <li>알림 설정 정보</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제4조 (개인정보의 제3자 제공)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 회사는 다음과 같이 개인정보를 제3자에게 제공할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>지도 서비스 제공업체 (카카오맵, 구글맵): 위치 정보를 통한 지도 표시 및 주소 검색</li>
                        <li>결제 서비스 제공업체: 포인트 구매 시 결제 처리</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        3. 회사는 정보주체의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제5조 (개인정보처리의 위탁)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>클라우드 서비스 제공업체: 서버 운영 및 데이터 저장</li>
                        <li>이메일 발송 서비스: 고객 지원 및 공지사항 발송</li>
                      </ul>
                      <p className="text-muted-foreground">
                        2. 회사는 위탁계약 체결 시 개인정보보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제6조 (정보주체의 권리·의무 및 행사방법)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>개인정보 처리정지 요구</li>
                        <li>개인정보 열람 요구</li>
                        <li>개인정보 정정·삭제 요구</li>
                      </ul>
                      <p className="text-muted-foreground mb-2">
                        2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제7조 (개인정보의 파기)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        가. 파기절차
                      </p>
                      <p className="text-muted-foreground mb-2 ml-2">
                        회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        나. 파기방법
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>전자적 파일 형태: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</li>
                        <li>기록물, 인쇄물, 서면 등: 분쇄하거나 소각하여 파기</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제8조 (개인정보 보호책임자)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                      </p>
                      <div className="bg-muted/50 p-3 sm:p-4 rounded-lg mt-2">
                        <p className="text-muted-foreground mb-1">
                          <span className="font-semibold">개인정보 보호책임자</span>
                        </p>
                        <p className="text-muted-foreground mb-1">
                          이메일: support@memoway.com
                        </p>
                        <p className="text-muted-foreground">
                          정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제9조 (개인정보의 안전성 확보조치)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                        <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                        <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제10조 (개인정보처리방침 변경)</h3>
                      <p className="text-muted-foreground">
                        이 개인정보처리방침은 2024년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.
                      </p>
                    </div>
                  </>
                ) : language === 'en' ? (
                  <>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 1 (Purpose of Personal Information Processing)</h3>
                      <p className="text-muted-foreground mb-2">
                        MemoWay (hereinafter referred to as "the Company") processes personal information for the following purposes. The personal information being processed will not be used for purposes other than those specified, and if the purpose of use changes, necessary measures such as obtaining separate consent will be implemented in accordance with Article 18 of the Personal Information Protection Act.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Service Provision: Providing services such as location-based memo creation, group creation and management, and memo sharing.</li>
                        <li>Member Management: Member registration, identity verification, account management, and identity verification for service use.</li>
                        <li>Location Information Processing: Collecting and storing user's current location, displaying location-based memos.</li>
                        <li>Payment and Point Management: Managing point purchases and usage history.</li>
                        <li>Customer Support: Responding to inquiries, handling complaints, and delivering announcements.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 2 (Processing and Retention Period of Personal Information)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company processes and retains personal information within the period of retention and use of personal information in accordance with laws and regulations, or within the period of retention and use of personal information agreed upon when collecting personal information from the data subject.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. The processing and retention period for each type of personal information is as follows:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Member Information: Until membership withdrawal (However, if an investigation or inquiry is in progress due to violation of related laws, until the end of such investigation or inquiry)</li>
                        <li>Location Information: Collected during service use, deleted immediately upon service termination (However, location information stored in memos is retained until the memo is deleted)</li>
                        <li>Payment Information: Retained for 5 years in accordance with the Electronic Commerce Act</li>
                        <li>Log Information: Service usage records are retained for 1 year</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 3 (Items of Personal Information Processed)</h3>
                      <p className="text-muted-foreground mb-2">
                        The Company processes the following personal information items:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        1. Required Items:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>Email address, name (information provided during social login)</li>
                        <li>Location information (GPS, Wi-Fi, base station information, etc.)</li>
                        <li>Service usage records (memo creation, group participation, etc.)</li>
                        <li>Device information (device unique number, OS version, etc.)</li>
                      </ul>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        2. Optional Items:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Profile photo</li>
                        <li>Notification settings information</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 4 (Provision of Personal Information to Third Parties)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company processes personal information of data subjects only within the scope specified in Article 1 (Purpose of Personal Information Processing), and provides personal information to third parties only in cases corresponding to Article 17 and Article 18 of the Personal Information Protection Act, such as consent from the data subject or special provisions of laws.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. The Company may provide personal information to third parties as follows:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Map service providers (Kakao Map, Google Map): Map display and address search using location information</li>
                        <li>Payment service providers: Payment processing when purchasing points</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        3. The Company does not provide personal information to third parties without the consent of the data subject.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 5 (Entrustment of Personal Information Processing)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. For smooth processing of personal information, the Company entrusts personal information processing tasks as follows:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>Cloud service providers: Server operation and data storage</li>
                        <li>Email delivery services: Customer support and announcement delivery</li>
                      </ul>
                      <p className="text-muted-foreground">
                        2. When entering into an entrustment contract, the Company specifies in documents such as contracts matters regarding prohibition of personal information processing for purposes other than the entrusted work, technical and administrative protection measures, restrictions on re-entrustment, management and supervision of trustees, and compensation for damages in accordance with Article 26 of the Personal Information Protection Act, and supervises whether trustees process personal information safely.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 6 (Rights, Obligations, and Exercise Methods of Data Subjects)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. Data subjects may exercise the following rights related to personal information protection against the Company at any time:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>Request for suspension of personal information processing</li>
                        <li>Request for access to personal information</li>
                        <li>Request for correction or deletion of personal information</li>
                      </ul>
                      <p className="text-muted-foreground mb-2">
                        2. The exercise of rights under paragraph 1 may be made to the Company in writing, by email, facsimile transmission (FAX), etc., and the Company will take action without delay.
                      </p>
                      <p className="text-muted-foreground">
                        3. If a data subject requests correction or deletion of errors in personal information, the Company will not use or provide the personal information until the correction or deletion is completed.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 7 (Destruction of Personal Information)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company destroys personal information without delay when it becomes unnecessary due to the expiration of the personal information retention period or achievement of the processing purpose.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. The procedures and methods for destroying personal information are as follows:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        a. Destruction Procedure
                      </p>
                      <p className="text-muted-foreground mb-2 ml-2">
                        The Company selects personal information for which a reason for destruction has occurred and destroys it after obtaining approval from the Company's personal information protection officer.
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        b. Destruction Method
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Electronic file format: Deletion using technical methods that cannot reproduce records</li>
                        <li>Records, printed materials, written documents, etc.: Destruction by shredding or incineration</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 8 (Personal Information Protection Officer)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. The Company is responsible for overseeing all matters related to personal information processing, and has designated a personal information protection officer as follows to handle complaints and provide relief for damages related to personal information processing:
                      </p>
                      <div className="bg-muted/50 p-3 sm:p-4 rounded-lg mt-2">
                        <p className="text-muted-foreground mb-1">
                          <span className="font-semibold">Personal Information Protection Officer</span>
                        </p>
                        <p className="text-muted-foreground mb-1">
                          Email: support@memoway.com
                        </p>
                        <p className="text-muted-foreground">
                          Data subjects may contact the personal information protection officer regarding all matters related to personal information protection inquiries, complaint handling, and damage relief that occur while using the Company's services.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 9 (Measures to Ensure Safety of Personal Information)</h3>
                      <p className="text-muted-foreground mb-2">
                        The Company takes the following measures to ensure the safety of personal information:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>Administrative measures: Establishment and implementation of internal management plans, regular employee training, etc.</li>
                        <li>Technical measures: Management of access rights to personal information processing systems, installation of access control systems, encryption of unique identification information, installation of security programs</li>
                        <li>Physical measures: Access control to computer rooms, data storage rooms, etc.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">Article 10 (Changes to Privacy Policy)</h3>
                      <p className="text-muted-foreground">
                        This Privacy Policy takes effect from January 1, 2024, and if there are additions, deletions, or corrections to the contents in accordance with laws and policies, notice will be given through announcements 7 days before the implementation of the changes.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        This Privacy Policy takes effect from January 1, 2024.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제1조 (개인정보의 처리 목적)</h3>
                      <p className="text-muted-foreground mb-2">
                        MemoWay(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>서비스 제공: 위치 기반 메모 작성, 그룹 생성 및 관리, 메모 공유 등 서비스 제공</li>
                        <li>회원 관리: 회원 가입, 본인 확인, 계정 관리, 서비스 이용에 따른 본인확인</li>
                        <li>위치 정보 처리: 사용자의 현재 위치 수집 및 저장, 위치 기반 메모 표시</li>
                        <li>결제 및 포인트 관리: 포인트 구매 및 사용 내역 관리</li>
                        <li>고객 지원: 문의사항 응대, 불만 처리, 공지사항 전달</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제2조 (개인정보의 처리 및 보유기간)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>회원 정보: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
                        <li>위치 정보: 서비스 이용 중 위치 정보 수집, 서비스 종료 시 즉시 삭제 (단, 메모에 저장된 위치 정보는 해당 메모 삭제 시까지 보유)</li>
                        <li>결제 정보: 전자상거래법에 따라 5년간 보관</li>
                        <li>로그 정보: 서비스 이용 기록은 1년간 보관</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제3조 (처리하는 개인정보의 항목)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 다음의 개인정보 항목을 처리하고 있습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        1. 필수 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>이메일 주소, 이름 (소셜 로그인 시 제공되는 정보)</li>
                        <li>위치 정보 (GPS, Wi-Fi, 기지국 정보 등)</li>
                        <li>서비스 이용 기록 (메모 작성, 그룹 참여 등)</li>
                        <li>기기 정보 (기기 고유번호, OS 버전 등)</li>
                      </ul>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        2. 선택 항목:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>프로필 사진</li>
                        <li>알림 설정 정보</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제4조 (개인정보의 제3자 제공)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 회사는 다음과 같이 개인정보를 제3자에게 제공할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>지도 서비스 제공업체 (카카오맵, 구글맵): 위치 정보를 통한 지도 표시 및 주소 검색</li>
                        <li>결제 서비스 제공업체: 포인트 구매 시 결제 처리</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        3. 회사는 정보주체의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제5조 (개인정보처리의 위탁)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>클라우드 서비스 제공업체: 서버 운영 및 데이터 저장</li>
                        <li>이메일 발송 서비스: 고객 지원 및 공지사항 발송</li>
                      </ul>
                      <p className="text-muted-foreground">
                        2. 회사는 위탁계약 체결 시 개인정보보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제6조 (정보주체의 권리·의무 및 행사방법)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2 mb-2">
                        <li>개인정보 처리정지 요구</li>
                        <li>개인정보 열람 요구</li>
                        <li>개인정보 정정·삭제 요구</li>
                      </ul>
                      <p className="text-muted-foreground mb-2">
                        2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
                      </p>
                      <p className="text-muted-foreground">
                        3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제7조 (개인정보의 파기)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2">
                        2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        가. 파기절차
                      </p>
                      <p className="text-muted-foreground mb-2 ml-2">
                        회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
                      </p>
                      <p className="text-muted-foreground mb-2 font-semibold">
                        나. 파기방법
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>전자적 파일 형태: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</li>
                        <li>기록물, 인쇄물, 서면 등: 분쇄하거나 소각하여 파기</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제8조 (개인정보 보호책임자)</h3>
                      <p className="text-muted-foreground mb-2">
                        1. 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                      </p>
                      <div className="bg-muted/50 p-3 sm:p-4 rounded-lg mt-2">
                        <p className="text-muted-foreground mb-1">
                          <span className="font-semibold">개인정보 보호책임자</span>
                        </p>
                        <p className="text-muted-foreground mb-1">
                          이메일: support@memoway.com
                        </p>
                        <p className="text-muted-foreground">
                          정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제9조 (개인정보의 안전성 확보조치)</h3>
                      <p className="text-muted-foreground mb-2">
                        회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                        <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                        <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                        <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-foreground">제10조 (개인정보처리방침 변경)</h3>
                      <p className="text-muted-foreground">
                        이 개인정보처리방침은 2024년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* FAQ 다이얼로그 - 모바일은 Sheet, 데스크톱은 Dialog */}
      {isMobile ? (
        <Sheet open={isFaqDialogOpen} onOpenChange={(open) => {
          setIsFaqDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsSupportDialogOpen(true), 300);
          }
        }}>
          <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-t-3xl">
            <SheetHeader className="px-5 pt-6 pb-4 border-b bg-gradient-to-br from-blue-50/50 to-cyan-50/30">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <MessageCircle className="h-6 w-6 text-blue-600 shrink-0" />
                {t.settings.supportFaq}
              </SheetTitle>
              <SheetDescription className="text-sm mt-1.5">
                {t.settings.supportFaqDesc}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="space-y-4">
                {faqData.map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-2xl border-2 bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border-blue-200/60"
                  >
                    <h3 className="font-semibold text-base text-foreground mb-3 flex items-start gap-2">
                      <span className="text-blue-600 shrink-0">Q{index + 1}.</span>
                      <span className="flex-1">{faq.question}</span>
                    </h3>
                    <div className="ml-6 pl-4 border-l-2 border-blue-200">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isFaqDialogOpen} onOpenChange={(open) => {
          setIsFaqDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsSupportDialogOpen(true), 300);
          }
        }}>
          <DialogContent className="sm:max-w-2xl w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-br from-blue-50/50 to-cyan-50/30">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" />
                {t.settings.supportFaq}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                {t.settings.supportFaqDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="space-y-4 sm:space-y-5">
                {faqData.map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 bg-gradient-to-br from-blue-50/60 to-cyan-50/60 border-blue-200/60 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-sm sm:text-base text-foreground mb-3 flex items-start gap-2">
                      <span className="text-blue-600 shrink-0">Q{index + 1}.</span>
                      <span className="flex-1">{faq.question}</span>
                    </h3>
                    <div className="ml-6 pl-4 border-l-2 border-blue-200">
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 공지사항 다이얼로그 - 모바일은 Sheet, 데스크톱은 Dialog */}
      {isMobile ? (
        <Sheet open={isNoticeDialogOpen} onOpenChange={(open) => {
          setIsNoticeDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsSupportDialogOpen(true), 300);
          }
        }}>
          <SheetContent side="bottom" className="h-[90vh] max-h-[90vh] p-0 flex flex-col overflow-hidden rounded-t-3xl">
            <SheetHeader className="px-5 pt-6 pb-4 border-b bg-gradient-to-br from-amber-50/50 to-yellow-50/30">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Megaphone className="h-6 w-6 text-amber-600 shrink-0" />
                {t.settings.supportNotice}
              </SheetTitle>
              <SheetDescription className="text-sm mt-1.5">
                {t.settings.supportNoticeDesc}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="space-y-4">
                {(noticeData[language] || noticeData.ko).map((notice, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-2xl border-2 ${
                      notice.important
                        ? 'bg-gradient-to-br from-amber-50/80 to-yellow-50/80 border-amber-300/60'
                        : 'bg-gradient-to-br from-amber-50/60 to-yellow-50/60 border-amber-200/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className={`font-semibold text-base flex-1 ${
                        notice.important ? 'text-amber-900' : 'text-foreground'
                      }`}>
                        {notice.title}
                      </h3>
                      {notice.important && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white shrink-0">
                          중요
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {notice.date}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {notice.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isNoticeDialogOpen} onOpenChange={(open) => {
          setIsNoticeDialogOpen(open);
          if (!open) {
            setTimeout(() => setIsSupportDialogOpen(true), 300);
          }
        }}>
          <DialogContent className="sm:max-w-2xl w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-3xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-br from-amber-50/50 to-yellow-50/30">
              <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl">
                <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 shrink-0" />
                {t.settings.supportNotice}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
                {t.settings.supportNoticeDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
              <div className="space-y-4 sm:space-y-5">
                {(noticeData[language] || noticeData.ko).map((notice, index) => (
                  <div
                    key={index}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 ${
                      notice.important
                        ? 'bg-gradient-to-br from-amber-50/80 to-yellow-50/80 border-amber-300/60 hover:shadow-lg'
                        : 'bg-gradient-to-br from-amber-50/60 to-yellow-50/60 border-amber-200/60 hover:shadow-md'
                    } transition-all`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className={`font-semibold text-sm sm:text-base flex-1 ${
                        notice.important ? 'text-amber-900' : 'text-foreground'
                      }`}>
                        {notice.title}
                      </h3>
                      {notice.important && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white shrink-0">
                          {language === 'ko' ? '중요' : language === 'en' ? 'Important' : language === 'zh' ? '重要' : '重要'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                      {notice.date}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {notice.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

