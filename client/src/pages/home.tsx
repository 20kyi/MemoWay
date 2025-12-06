import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/bottom-nav";
import { ExitDialog } from "@/components/exit-dialog";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-context";
import { useMapProvider } from "@/lib/map-provider-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase } from "lucide-react";
import { markerIconTypes, type MarkerIconType } from "@shared/schema";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";
import type { SelectedLocation } from "@/types/home";

// Custom hooks
import { useTabNavigation } from "@/hooks/useTabNavigation";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { usePersonalMember } from "@/hooks/usePersonalMember";
import { useMapInstance } from "@/hooks/useMapInstance";
import { useWebSocketMessages } from "@/hooks/useWebSocketMessages";
import { useMemos } from "@/hooks/useMemos";
import { useGroups } from "@/hooks/useGroups";

// Import components directly for instant tab switching (no lazy loading delay)
import { MapView } from "@/components/map-view";
import { GoogleMapView } from "@/components/google-map-view";
import { MemoFormSheet } from "@/components/memo-form-sheet";
import { MemoDetailSheet } from "@/components/memo-detail-sheet";
import { MemoClusterSheet } from "@/components/memo-cluster-sheet";
import { MemoList } from "@/components/memo-list";
import { GroupManagement } from "@/components/group-management";
import { ProfileView } from "@/components/profile-view";

export default function Home() {
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { mapProvider } = useMapProvider();
  const { layoutTheme } = useLayoutTheme();
  const isCoupleTheme = layoutTheme === "couple-clay";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // 인증 보호 로직: user가 없고 로딩이 완료되었으면 랜딩 페이지로 리다이렉트
  useEffect(() => {
    if (!isLoading && !user && !isAuthenticated) {
      console.log('[HOME] User not authenticated, redirecting to landing page...');
      // wouter의 setLocation은 replace 옵션을 지원하지 않으므로 window.history.replaceState 사용
      window.history.replaceState(null, '', '/');
      setLocation('/');
    }
  }, [isLoading, user, isAuthenticated, setLocation]);
  
  // 안전장치: user가 null이거나 인증되지 않았으면 로딩 화면 표시
  // App.tsx에서 이미 처리하지만, Home 컴포넌트 내부에서도 상태 불일치로 인한 흰 화면 방지
  if (isLoading || !user || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-accent/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isLoading ? "데이터를 불러오는 중..." : "로그인 정보를 확인 중..."}
          </p>
        </div>
      </div>
    );
  }

  // Tab navigation
  const { activeTab, handleTabChange, showExitDialog, setShowExitDialog } =
    useTabNavigation();

  // Local state
  const [memoFormOpen, setMemoFormOpen] = useState(false);
  const [memoDetailOpen, setMemoDetailOpen] = useState(false);
  const [memoClusterOpen, setMemoClusterOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoWithDetails | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoWithDetails | null>(null);
  const [clusterMemoIds, setClusterMemoIds] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem("notificationsEnabled") === "true";
  });
  const [locationEnabled, setLocationEnabled] = useState(() => {
    return localStorage.getItem("locationEnabled") === "true";
  });
  const [proximityRadius, setProximityRadius] = useState<number>(() => {
    const saved = localStorage.getItem("proximityRadius");
    return saved ? Number(saved) : 100;
  });
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(
    localStorage.getItem("currentMemberId")
  );
  const [personalMemberId, setPersonalMemberId] = useState<string | null>(
    localStorage.getItem("personalMemberId")
  );
  const [myMemberIds, setMyMemberIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("myMemberIds");
    const savedIds = saved ? JSON.parse(saved) : [];
    const currentId = localStorage.getItem("currentMemberId");
    const personalId = localStorage.getItem("personalMemberId");

    const allIds = [...savedIds];
    if (currentId && !allIds.includes(currentId)) {
      allIds.push(currentId);
    }
    if (personalId && !allIds.includes(personalId)) {
      allIds.push(personalId);
    }

    return allIds;
  });
  const [selectedMarkerIcons, setSelectedMarkerIcons] = useState<string[]>(["all"]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(["all"]);
  const [selectedMemoIdsForMap, setSelectedMemoIdsForMap] = useState<Set<string> | null>(null);
  const [saveMapDialogOpen, setSaveMapDialogOpen] = useState(false);
  
  // 저장된 지도 데이터 타입
  type SavedMap = {
    id: string;
    name: string;
    category: MarkerIconType;
    color: string;
    memoIds: string[];
    createdAt: Date;
  };
  
  const PRESET_COLORS = [
    { key: 'rose', value: '#ffb3d9' },
    { key: 'pink', value: '#ffc0e8' },
    { key: 'lavender', value: '#d4b5ff' },
    { key: 'peach', value: '#ffd4b3' },
    { key: 'mint', value: '#b3f5d9' },
    { key: 'sky', value: '#b3e5ff' },
    { key: 'lilac', value: '#e8d4ff' },
    { key: 'coral', value: '#ffccb3' },
  ] as const;
  
  const MARKER_ICON_COMPONENTS: Record<MarkerIconType, any> = {
    default: MapPin,
    travel: Plane,
    love: Heart,
    food: Utensils,
    cafe: Coffee,
    shopping: ShoppingBag,
    sport: Trophy,
    work: Briefcase,
  };
  
  const saveMapFormSchema = z.object({
    name: z.string().min(1, "제목을 입력해주세요").max(50, "제목은 50자 이하여야 합니다"),
    category: z.enum(markerIconTypes).default('default'),
    color: z.string().default('#a78bfa'),
  });
  
  type SaveMapFormValues = z.infer<typeof saveMapFormSchema>;
  
  const saveMapForm = useForm<SaveMapFormValues>({
    resolver: zodResolver(saveMapFormSchema),
    defaultValues: {
      name: `저장된 지도 ${new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`,
      category: 'default',
      color: '#a78bfa',
    },
  });
  
  // 저장된 지도 목록 (localStorage에서 로드)
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>(() => {
    const saved = localStorage.getItem("savedMaps");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((map: any) => ({
          ...map,
          category: map.category || 'default',
          color: map.color || '#a78bfa',
          createdAt: new Date(map.createdAt),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  // Data queries - 병렬 로딩 보장 (user가 있을 때만 실행)
  const { data: memos = [], error: memosError } = useQuery<MemoWithDetails[]>({
    queryKey: ["/api/memos"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user, // user가 있을 때만 실행
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 방지
    retry: 1, // 실패 시 1번만 재시도 (로딩 시간 단축)
    retryDelay: 500, // 0.5초 후 재시도
    refetchOnWindowFocus: false, // 창 포커스 시 자동 재요청 방지
    refetchOnReconnect: false, // 재연결 시 자동 재요청 방지
  });

  const { data: groups = [], isFetched: groupsIsFetched, error: groupsError, isLoading: groupsLoading } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/groups"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user, // user가 있을 때만 실행
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 방지
    refetchOnWindowFocus: false, // 창 포커스 시 자동 재요청 방지
    refetchOnReconnect: false, // 재연결 시 자동 재요청 방지
    retry: 1, // 실패 시 1번만 재시도 (로딩 시간 단축)
    retryDelay: 500, // 0.5초 후 재시도
  });

  // 데이터 로딩 에러 처리
  useEffect(() => {
    if (memosError) {
      console.error("메모 로딩 실패:", memosError);
      toast({
        title: t.toast.memosLoadFailed,
        description: t.toast.memosLoadFailedDesc,
        variant: "destructive",
      });
    }
    if (groupsError) {
      console.error("그룹 로딩 실패:", groupsError);
      toast({
        title: t.toast.groupsLoadFailed,
        description: t.toast.groupsLoadFailedDesc,
        variant: "destructive",
      });
    }
  }, [memosError, groupsError, toast]);

  // Location tracking
  const { userLocation, setUserLocation } = useLocationTracking({
    locationEnabled,
    notificationsEnabled,
    proximityRadius,
    memos,
    myMemberIds,
  });

  // Map instance management
  const { setMapInstance, pendingLocation, moveToLocation, handleNavigateToLocation } =
    useMapInstance({
      handleTabChange,
      setSelectedMemo,
      setMemoDetailOpen,
    });

  // WebSocket messages
  const { handleWebSocketMessage } = useWebSocketMessages({ moveToLocation, myMemberIds });
  useWebSocket(handleWebSocketMessage);

  // Personal member management (groups가 로드된 후에만 실행)
  usePersonalMember({
    personalMemberId,
    setPersonalMemberId,
    groups,
    groupsIsFetched: groupsIsFetched && !groupsLoading,
    user,
  });

  // Filter groups for current user (메모이제이션으로 불필요한 재계산 방지)
  const filteredGroups = useMemo(() => {
    return groups.filter((g) =>
      g.members.some((m) => m.userId === (user as any)?.id)
    );
  }, [groups, user]);
  
  const filteredGroupsWithoutPersonal = useMemo(() => {
    return filteredGroups.filter((g) => g.name !== "개인 메모");
  }, [filteredGroups]);

  // Memo mutations
  const { createMemoMutation, updateMemoMutation, deleteMemoMutation, setMainMemoMutation, copyMemoMutation } =
    useMemos({
      selectedLocation,
      personalMemberId,
      currentMemberId,
      groups: filteredGroups,
      onSuccess: () => {
        setMemoFormOpen(false);
        setSelectedLocation(null);
      },
    });

  // Group mutations
  const {
    createGroupMutation,
    joinGroupMutation,
    leaveGroupMutation,
    copyGroupMutation,
    deleteGroupMutation,
    removeMemberMutation,
    updateGroupMutation,
    transferLeadershipMutation,
    updateMemberPermissionsMutation,
  } = useGroups({
    setCurrentMemberId,
    setMyMemberIds,
    currentMemberId,
  });

  // groups 데이터로 myMemberIds 동기화
  useEffect(() => {
    if (!groupsIsFetched || groups.length === 0) return;

    // 모든 그룹의 멤버 ID 수집
    const allMemberIds = new Set<string>();
    groups.forEach((group) => {
      group.members.forEach((member) => {
        allMemberIds.add(member.id);
      });
    });

    // 현재 myMemberIds 중 실제로 존재하는 멤버만 유지
    const validMemberIds = myMemberIds.filter((id) => allMemberIds.has(id));

    // currentMemberId가 그룹에 존재하는데 myMemberIds에 없으면 추가
    if (
      currentMemberId &&
      allMemberIds.has(currentMemberId) &&
      !validMemberIds.includes(currentMemberId)
    ) {
      validMemberIds.push(currentMemberId);
    }

    // personalMemberId가 그룹에 존재하는데 myMemberIds에 없으면 추가
    if (
      personalMemberId &&
      allMemberIds.has(personalMemberId) &&
      !validMemberIds.includes(personalMemberId)
    ) {
      validMemberIds.push(personalMemberId);
    }

    // 변경사항이 있으면 업데이트
    if (
      JSON.stringify([...validMemberIds].sort()) !==
      JSON.stringify([...myMemberIds].sort())
    ) {
      setMyMemberIds(validMemberIds);
      localStorage.setItem("myMemberIds", JSON.stringify(validMemberIds));
    }
  }, [groups, groupsIsFetched, currentMemberId, personalMemberId, myMemberIds]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("notificationsEnabled", notificationsEnabled.toString());
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem("locationEnabled", locationEnabled.toString());
  }, [locationEnabled]);

  useEffect(() => {
    localStorage.setItem("proximityRadius", proximityRadius.toString());
  }, [proximityRadius]);

  // Handlers (useCallback으로 메모이제이션하여 불필요한 리렌더링 방지)
  const handleLocationSelect = useCallback((location: SelectedLocation) => {
    setEditingMemo(null);
    setSelectedLocation(location);
    setMemoFormOpen(true);
  }, []);

  const handleEditMemo = useCallback((memoId: string) => {
    const memo = memos.find((m) => m.id === memoId);
    if (memo) {
      setEditingMemo(memo);
      setSelectedLocation(null);
      setMemoFormOpen(true);
    }
  }, [memos]);

  const handleNotificationsChange = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // 메모 알림을 켤 때 위치 추적도 자동으로 켜기 (알림 기능이 작동하려면 위치 추적이 필요함)
      if (!locationEnabled) {
        setLocationEnabled(true);
      }

      // Capacitor 네이티브 플랫폼 감지
      const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
      
      if (isNativePlatform) {
        // 안드로이드/iOS 네이티브 앱
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const { checkPermissions, requestPermissions } = LocalNotifications;
          
          const permissionStatus = await checkPermissions();
          
          if (permissionStatus.display !== 'granted') {
            const requestResult = await requestPermissions();
            if (requestResult.display !== 'granted') {
              toast({
                title: t.toast.notificationPermissionRequired,
                description: t.toast.notificationPermissionRequiredDesc,
                variant: "destructive",
              });
              return;
            }
          }
        } catch (error) {
          console.error('알림 권한 요청 실패:', error);
          toast({
            title: t.toast.notificationPermissionRequestFailed,
            description: t.toast.notificationPermissionRequestFailedDesc,
            variant: "destructive",
          });
          return;
        }
      } else {
        // 웹 브라우저
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            toast({
              title: t.toast.notificationPermissionRequiredBrowser,
              description: t.toast.notificationPermissionRequiredBrowserDesc,
              variant: "destructive",
            });
            return;
          }
        }
      }
    }
    setNotificationsEnabled(enabled);
  }, [locationEnabled, setLocationEnabled, t, toast]);

  const handleLocationChange = useCallback((enabled: boolean) => {
    if (enabled && !navigator.geolocation) {
      toast({
        title: t.toast.locationServiceUnavailable,
        description: t.toast.locationServiceUnavailableDesc,
        variant: "destructive",
      });
      return;
    }
    setLocationEnabled(enabled);
  }, [t, toast]);

  // 마커 클릭 핸들러 (메모이제이션)
  const handleMarkerClick = useCallback((memoId: string) => {
    const memo = memos.find((m) => m.id === memoId);
    if (memo) {
      setSelectedMemo(memo);
      setMemoDetailOpen(true);
    }
  }, [memos]);

  // 클러스터 클릭 핸들러 (메모이제이션)
  const handleClusterClick = useCallback((memoIds: string[]) => {
    setClusterMemoIds(memoIds);
    setMemoClusterOpen(true);
  }, []);

  // 내 위치 클릭 핸들러 (메모이제이션)
  const handleMyLocationClick = useCallback((location: { lat: number; lng: number }) => {
    setUserLocation(location);
  }, []);

  // 메모 삭제 핸들러 (메모이제이션)
  const handleDeleteMemo = useCallback((memoId: string) => {
    if (confirm("정말로 이 메모를 삭제하시겠습니까?")) {
      deleteMemoMutation.mutate(memoId);
    }
  }, [deleteMemoMutation]);

  // 새 메모 추가 핸들러 (메모이제이션)
  const handleAddNewMemo = useCallback((location: { lat: number; lng: number; address: string; buildingName: string }) => {
    setMemoDetailOpen(false);
    setSelectedMemo(null);
    setSelectedLocation(location);
    setMemoFormOpen(true);
  }, []);

  // 메인 메모 설정 핸들러 (메모이제이션)
  const handleSetMainMemo = useCallback((memoId: string) => {
    setMainMemoMutation.mutate(memoId);
  }, [setMainMemoMutation]);

  // 메모 복사 핸들러 (메모이제이션)
  const handleCopyMemo = useCallback((memoId: string) => {
    if (confirm("10포인트를 사용하여 이 메모를 내 개인 메모로 복사하시겠습니까?")) {
      copyMemoMutation.mutate(memoId);
    }
  }, [copyMemoMutation]);

  // 다중 메모 복사 핸들러 (메모이제이션)
  const handleBulkCopy = useCallback(async (memoIds: string[]) => {
    if (!memoIds || memoIds.length === 0) return;
    
    const requiredPoints = memoIds.length * 10;
    if (confirm(`${memoIds.length}개의 메모를 복사하시겠습니까? (총 ${requiredPoints}포인트 소모)`)) {
      try {
        let successCount = 0;
        const promises = memoIds.map(id => copyMemoMutation.mutateAsync(id).catch(e => {
          console.error(`메모 ${id} 복사 실패:`, e);
          return null;
        }));
        
        const results = await Promise.all(promises);
        successCount = results.filter(r => r !== null).length;
        
        if (successCount > 0) {
          toast({
            title: "복사 완료",
            description: `${successCount}개의 메모가 복사되었습니다.`,
          });
          
          // 쿼리 무효화
          queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } else {
          toast({
            title: "복사 실패",
            description: "메모 복사에 실패했습니다. 포인트를 확인해주세요.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("다중 복사 중 오류:", error);
      }
    }
  }, [copyMemoMutation, toast, queryClient]);

  // 지도 저장하기 버튼 클릭 핸들러 (다이얼로그 열기)
  const handleSaveMapClick = useCallback(() => {
    if (selectedMemoIdsForMap && selectedMemoIdsForMap.size > 0) {
      saveMapForm.reset({
        name: `저장된 지도 ${new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`,
        category: 'default',
        color: '#a78bfa',
      });
      setSaveMapDialogOpen(true);
    }
  }, [selectedMemoIdsForMap, saveMapForm]);
  
  // 지도 저장하기 핸들러 (실제 저장)
  const handleSaveMap = useCallback((data: SaveMapFormValues) => {
    if (selectedMemoIdsForMap && selectedMemoIdsForMap.size > 0) {
      const newSavedMap: SavedMap = {
        id: `saved-map-${Date.now()}`,
        name: data.name,
        category: data.category,
        color: data.color,
        memoIds: Array.from(selectedMemoIdsForMap),
        createdAt: new Date(),
      };
      
      const updatedSavedMaps = [...savedMaps, newSavedMap];
      setSavedMaps(updatedSavedMaps);
      localStorage.setItem("savedMaps", JSON.stringify(updatedSavedMaps));
      
      toast({
        title: "지도 저장 완료",
        description: `${selectedMemoIdsForMap.size}개의 메모가 포함된 지도를 저장했습니다.`,
      });
      
      // 저장 후 필터 해제 및 다이얼로그 닫기
      setSelectedMemoIdsForMap(null);
      setSaveMapDialogOpen(false);
    }
  }, [selectedMemoIdsForMap, savedMaps, toast]);
  
  // 저장된 지도 삭제 핸들러
  const handleDeleteSavedMap = useCallback((mapId: string) => {
    const updatedSavedMaps = savedMaps.filter(map => map.id !== mapId);
    setSavedMaps(updatedSavedMaps);
    localStorage.setItem("savedMaps", JSON.stringify(updatedSavedMaps));
    toast({
      title: "지도 삭제 완료",
      description: "저장된 지도가 삭제되었습니다.",
    });
  }, [savedMaps, toast]);

  // 지도 탭에서 다른 탭으로 이동할 때 필터 해제
  useEffect(() => {
    if (activeTab !== "map" && selectedMemoIdsForMap) {
      setSelectedMemoIdsForMap(null);
    }
  }, [activeTab, selectedMemoIdsForMap]);

  // 그룹으로 이동 핸들러 (메모이제이션)
  const handleMoveToGroup = useCallback(async (memoIds: string[], groupId: string) => {
    if (!memoIds || memoIds.length === 0) {
      toast({
        title: "오류 발생",
        description: "선택된 메모가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!groupId) {
      toast({
        title: "오류 발생",
        description: "그룹을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("그룹으로 이동 시작:", { memoIds, groupId, memosCount: memos.length });
      
      // 선택한 모든 메모를 그룹으로 이동
      const results = await Promise.allSettled(
        memoIds.map(async (memoId) => {
          const memo = memos.find((m) => m.id === memoId);
          if (!memo) {
            console.error(`메모를 찾을 수 없습니다: ${memoId}`);
            throw new Error(`메모를 찾을 수 없습니다: ${memoId}`);
          }
          
          console.log(`메모 이동 중: ${memoId} -> 그룹 ${groupId}`);
          
          try {
            const result = await updateMemoMutation.mutateAsync({
              memoId,
              data: {
                buildingName: memo.buildingName || "",
                address: memo.address || "",
                content: memo.content || "",
                markerIcon: (memo as any)?.markerIcon || (memo.group as any)?.markerIcon || "default",
                groupIds: [groupId],
                photos: [], // photos 필드 추가 (빈 배열)
              },
            });
            console.log(`메모 이동 성공: ${memoId}`, result);
            return result;
          } catch (error: any) {
            console.error(`메모 이동 실패: ${memoId}`, error);
            throw error;
          }
        })
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      console.log("그룹으로 이동 결과:", { successCount, failCount, total: memoIds.length });

      if (successCount > 0) {
        // updateMemoMutation의 onSuccess에서 이미 invalidateQueries를 호출하지만, 
        // 여러 메모를 이동할 때는 여기서도 명시적으로 호출
        queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        
        toast({
          title: t.toast.memoEditSuccess || "성공",
          description: `${successCount}개의 메모를 그룹으로 이동했습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ""}`,
        });
      } else {
        const errors = results
          .filter((r) => r.status === "rejected")
          .map((r) => (r as PromiseRejectedResult).reason?.message || "알 수 없는 오류")
          .join(", ");
        
        console.error("모든 메모 이동 실패:", errors);
        toast({
          title: "오류 발생",
          description: `모든 메모 이동에 실패했습니다.${errors ? ` (${errors})` : ""}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("그룹으로 이동 중 오류 발생:", error);
      toast({
        title: "오류 발생",
        description: error.message || "메모 이동에 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [updateMemoMutation, memos, toast, t, queryClient]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-secondary/10 to-accent/20 relative overflow-hidden pt-[env(safe-area-inset-top)]">
      <div className={`overflow-hidden relative z-10 ${
        isCoupleTheme ? "h-screen pb-0" : "flex-1 pb-16"
      }`}>
        {activeTab === "map" && (
          <div className={`relative h-full ${isCoupleTheme ? 'bg-[#FCEDEF]' : ''}`}>
            {mapProvider === "kakao" ? (
              <MapView
                  onLocationSelect={handleLocationSelect}
                  memos={selectedMemoIdsForMap ? memos.filter(m => selectedMemoIdsForMap.has(m.id)) : memos}
                  onMarkerClick={handleMarkerClick}
                  onClusterClick={handleClusterClick}
                  userLocation={userLocation}
                  onMapReady={setMapInstance}
                  onMyLocationClick={handleMyLocationClick}
                  pendingLocation={pendingLocation}
                  groups={filteredGroups}
                  selectedMarkerIcons={selectedMarkerIcons}
                  selectedGroupIds={selectedGroupIds}
                  onMarkerIconsChange={setSelectedMarkerIcons}
                  onGroupIdsChange={setSelectedGroupIds}
                  selectedMemo={selectedMemo}
                  memoDetailOpen={memoDetailOpen}
                  onEditMemo={handleEditMemo}
                  onDeleteMemo={handleDeleteMemo}
                  onAddNewMemo={handleAddNewMemo}
                  selectedMemoIdsForMap={selectedMemoIdsForMap}
                  onSaveMap={handleSaveMapClick}
                  isActive={activeTab === "map"}
                />
              ) : (
                <GoogleMapView
                  onLocationSelect={handleLocationSelect}
                  memos={selectedMemoIdsForMap ? memos.filter(m => selectedMemoIdsForMap.has(m.id)) : memos}
                  onMarkerClick={handleMarkerClick}
                  onClusterClick={handleClusterClick}
                  userLocation={userLocation}
                  onMapReady={setMapInstance}
                  onMyLocationClick={handleMyLocationClick}
                  pendingLocation={pendingLocation}
                  groups={filteredGroups}
                  selectedMarkerIcons={selectedMarkerIcons}
                  selectedGroupIds={selectedGroupIds}
                  onMarkerIconsChange={setSelectedMarkerIcons}
                  onGroupIdsChange={setSelectedGroupIds}
                  selectedMemo={selectedMemo}
                  memoDetailOpen={memoDetailOpen}
                  onEditMemo={handleEditMemo}
                  onDeleteMemo={handleDeleteMemo}
                  onAddNewMemo={handleAddNewMemo}
                  selectedMemoIdsForMap={selectedMemoIdsForMap}
                  onSaveMap={handleSaveMapClick}
                  isActive={activeTab === "map"}
                />
              )}
          </div>
        )}
        {activeTab === "memos" && (
          <MemoList
              memos={memos.filter(memo => {
                // 자신이 작성한 개인 메모만 표시 (그룹에 속하지 않은 메모)
                return memo.member.userId === (user as any)?.id && !memo.groupId;
              })}
              groups={filteredGroupsWithoutPersonal}
              savedMaps={savedMaps}
              onEdit={handleEditMemo}
              onDelete={(memoId) => {
                if (confirm("정말로 이 메모를 삭제하시겠습니까?")) {
                  deleteMemoMutation.mutate(memoId);
                }
              }}
              onBulkDelete={(memoIds) => {
                if (confirm(`선택한 ${memoIds.length}개의 메모를 삭제하시겠습니까?`)) {
                  Promise.all(
                    memoIds.map((id) => apiRequest("DELETE", `/api/memos/${id}`))
                  )
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
                      toast({
                        title: t.toast.deleteSuccess,
                        description: t.toast.bulkDeleteSuccess.replace('{count}', memoIds.length.toString()),
                      });
                    })
                    .catch((error) => {
                      toast({
                        title: t.toast.deleteError,
                        description: error.message,
                        variant: "destructive",
                      });
                    });
                }
              }}
              onMemoClick={handleMarkerClick}
              onSetMainMemo={handleSetMainMemo}
              onMoveToGroup={handleMoveToGroup}
              onDeleteSavedMap={handleDeleteSavedMap}
            />
        )}
        {activeTab === "groups" && (
          <GroupManagement
              groups={filteredGroupsWithoutPersonal}
              memos={memos}
              myMemberIds={myMemberIds}
              personalMemberId={personalMemberId}
              userId={(user as any)?.id}
              userPoints={(user as any)?.points ?? 0}
              onCreateGroup={(data) => createGroupMutation.mutate(data)}
              onUpdateGroup={async (groupId, data) => {
                console.log("[EDIT GROUP] onUpdateGroup called in home.tsx", { groupId, data });
                try {
                  await updateGroupMutation.mutateAsync({ groupId, ...data });
                  console.log("[EDIT GROUP] Group update successful in home.tsx");
                } catch (error: any) {
                  console.error("[EDIT GROUP] Group update failed in home.tsx:", error);
                  throw error; // 에러를 다시 던져서 group-management에서 처리할 수 있도록
                }
              }}
              onJoinGroup={(inviteCode, memberName) => {
                joinGroupMutation.mutate({ inviteCode, memberName });
              }}
              onLeaveGroup={(groupId, memberId) => {
                if (confirm("정말로 이 그룹에서 나가시겠습니까?")) {
                  leaveGroupMutation.mutate({ groupId, memberId });
                }
              }}
              onCopyGroup={(groupId) => {
                copyGroupMutation.mutate(groupId);
              }}
              onDeleteGroup={(groupId) => deleteGroupMutation.mutate(groupId)}
              onRemoveMember={(groupId, memberId) => {
                if (confirm("정말로 이 멤버를 그룹에서 제거하시겠습니까?")) {
                  removeMemberMutation.mutate({ groupId, memberId });
                }
              }}
              onTransferLeadership={(groupId, newLeaderId) =>
                transferLeadershipMutation.mutate({ groupId, newLeaderId })
              }
              onUpdateMemberPermissions={(groupId, memberId, canEditGroupMemos) =>
                updateMemberPermissionsMutation.mutate({
                  groupId,
                  memberId,
                  canEditGroupMemos,
                })
              }
              onEditMemo={handleEditMemo}
              onDeleteMemo={handleDeleteMemo}
              onMemoClick={handleMarkerClick}
              onSetMainMemo={handleSetMainMemo}
              onBulkCopy={handleBulkCopy}
              isLoading={createGroupMutation.isPending || joinGroupMutation.isPending}
            />
        )}
        {activeTab === "profile" && (
          <ProfileView 
            notificationsEnabled={notificationsEnabled}
            onNotificationsChange={handleNotificationsChange}
            proximityRadius={proximityRadius}
            onProximityRadiusChange={setProximityRadius}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      <MemoFormSheet
          open={memoFormOpen}
          onOpenChange={(open) => {
            setMemoFormOpen(open);
            if (!open) {
              setEditingMemo(null);
              setSelectedLocation(null);
            }
          }}
          onSubmissionComplete={() => {
            // 제출 완료 시 호출 (성공/실패 관계없이)
            // memo-form-sheet에서 isSubmitting 상태를 해제하는데 사용
            console.log("[EDIT MEMO] Submission completed (success or failure)");
          }}
          onSubmit={async (data) => {
            console.log("[EDIT MEMO] onSubmit handler called in home.tsx", { 
              hasEditingMemo: !!editingMemo, 
              editingMemoId: editingMemo?.id,
              dataKeys: Object.keys(data),
              groupIds: data.groupIds 
            });
            
            if (editingMemo) {
              if (!editingMemo.id) {
                console.error("[EDIT MEMO] editingMemo.id is missing!");
                toast({
                  title: "오류 발생",
                  description: "메모 ID가 없습니다.",
                  variant: "destructive",
                });
                return;
              }
              
              console.log("[EDIT MEMO] Starting memo update:", { 
                memoId: editingMemo.id, 
                data, 
                groupIds: data.groupIds 
              });
              
              try {
                console.log("[EDIT MEMO] ========== STARTING MEMO UPDATE ==========");
                console.log("[EDIT MEMO] Platform:", (window as any).Capacitor?.isNativePlatform?.() ? 'Native (Capacitor)' : 'Web Browser');
                console.log("[EDIT MEMO] Calling updateMemoMutation.mutateAsync");
                console.log("[EDIT MEMO] Request data:", {
                  memoId: editingMemo.id,
                  buildingName: data.buildingName,
                  address: data.address,
                  content: data.content?.substring(0, 50) + "...",
                  groupIds: data.groupIds,
                  markerIcon: data.markerIcon,
                  photosCount: data.photos?.length || 0,
                });
                
                // API 호출 전 최종 검증
                if (!editingMemo.id) {
                  throw new Error("메모 ID가 없습니다.");
                }
                
                if (!data.buildingName || !data.address || !data.content) {
                  throw new Error("필수 필드(건물명, 주소, 내용)를 모두 입력해주세요.");
                }
                
                console.log("[EDIT MEMO] About to call mutateAsync...");
                const result = await updateMemoMutation.mutateAsync({
                  memoId: editingMemo.id,
                  data,
                });
                console.log("[EDIT MEMO] mutateAsync completed successfully");
                
                console.log("[EDIT MEMO] Memo update success", result);
                
                // React Query 캐시 무효화 (메모 목록 갱신)
                // updateMemoMutation의 onSuccess에서 이미 invalidateQueries를 호출하지만,
                // 확실하게 하기 위해 여기서도 호출
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["/api/memos"] }),
                  queryClient.invalidateQueries({ queryKey: ["/api/groups"] }),
                ]);
                
                console.log("[EDIT MEMO] Cache invalidated");
                
                // 성공 시 토스트 표시
                toast({
                  title: t.toast.memoUpdated || "메모 수정 완료",
                  description: t.toast.memoUpdatedDesc || "메모가 수정되었습니다.",
                });
                
                // 성공 시 폼 닫기 및 상태 초기화
                console.log("[EDIT MEMO] Closing form and resetting state");
                
                // 상태 초기화를 먼저 하고 폼 닫기
                setEditingMemo(null);
                setSelectedLocation(null);
                
                // 폼 닫기 (토스트가 표시될 시간을 확보하기 위해 약간의 딜레이)
                // 하지만 너무 길면 사용자 경험이 나빠지므로 짧게 설정
                setTimeout(() => {
                  setMemoFormOpen(false);
                  console.log("[EDIT MEMO] Form closed");
                }, 50);
                
                console.log("[EDIT MEMO] All post-save actions completed");
              } catch (error: any) {
                console.error("[EDIT MEMO] Memo update failed:", error);
                console.error("[EDIT MEMO] Error details:", {
                  name: error.name,
                  message: error.message,
                  status: error.status,
                  error: error.error,
                  stack: error.stack,
                  response: error.response,
                  data: error.response?.data,
                });
                
                // 네트워크 에러 체크
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                  console.error("[EDIT MEMO] Network error detected");
                  toast({
                    title: "네트워크 오류",
                    description: "인터넷 연결을 확인해주세요.",
                    variant: "destructive",
                  });
                } else {
                  // 에러 토스트 표시
                  const errorMessage = error.error || 
                                     error.message || 
                                     error.response?.data?.message || 
                                     error.response?.data?.error ||
                                     "메모 수정에 실패했습니다.";
                  
                  toast({
                    title: "오류 발생",
                    description: errorMessage,
                    variant: "destructive",
                  });
                }
                
                // 에러 발생 시에도 상태는 유지 (사용자가 다시 시도할 수 있도록)
                // 폼은 닫지 않음
                // isSubmitting 상태는 memo-form-sheet에서 해제해야 함
              }
            } else {
              console.log("[EDIT MEMO] Creating new memo");
              try {
                await createMemoMutation.mutateAsync(data);
                console.log("[EDIT MEMO] New memo created successfully");
                // 성공 시 폼 닫기
                setMemoFormOpen(false);
                setSelectedLocation(null);
              } catch (error: any) {
                console.error("[EDIT MEMO] New memo creation failed:", error);
                // 에러는 useMemos의 onError에서 처리됨
                // 하지만 401 에러인 경우 추가 처리 가능
                if (error.status === 401) {
                  console.error("[EDIT MEMO] Authentication failed - session may have expired");
                }
              }
            }
          }}
          initialData={
            editingMemo
              ? {
                  buildingName: editingMemo.buildingName,
                  address: editingMemo.address,
                  latitude: editingMemo.latitude,
                  longitude: editingMemo.longitude,
                  content: editingMemo.content,
                  groupIds: editingMemo.groupId ? [editingMemo.groupId] : [],
                  markerIcon: editingMemo.markerIcon || "default",
                  mainPhotoId: (editingMemo as any).mainPhotoId,
                  existingPhotos: editingMemo.photos.map((p) => ({ id: p.id, url: p.url })),
                }
              : selectedLocation
                ? {
                    buildingName: selectedLocation.buildingName,
                    address: selectedLocation.address,
                    latitude: selectedLocation.lat,
                    longitude: selectedLocation.lng,
                  }
                : null
          }
          groups={filteredGroupsWithoutPersonal}
          isLoading={createMemoMutation.isPending || updateMemoMutation.isPending}
          isPersonalMemberReady={!!personalMemberId}
        currentMemberId={currentMemberId}
        editMode={!!editingMemo}
      />

      <MemoClusterSheet
          open={memoClusterOpen}
          onOpenChange={setMemoClusterOpen}
          memos={memos.filter((m) => clusterMemoIds.includes(m.id))}
          onMemoSelect={(memoId) => {
            const memo = memos.find((m) => m.id === memoId);
            if (memo) {
              setSelectedMemo(memo);
              setMemoDetailOpen(true);
            }
          }}
          onAddNewMemo={(location) => {
            setMemoClusterOpen(false);
            setSelectedLocation(location);
          setMemoFormOpen(true);
        }}
      />

      <MemoDetailSheet
          memo={selectedMemo}
          open={memoDetailOpen}
          onOpenChange={(open) => {
            setMemoDetailOpen(open);
            if (!open) {
              setSelectedMemo(null);
            }
          }}
          onEdit={handleEditMemo}
          onDelete={(memoId) => {
            if (confirm("정말로 이 메모를 삭제하시겠습니까?")) {
              deleteMemoMutation.mutate(memoId);
            }
          }}
          onNavigateToLocation={handleNavigateToLocation}
          onAddNewMemo={(location) => {
            setMemoDetailOpen(false);
            setSelectedMemo(null);
            setSelectedLocation(location);
            setMemoFormOpen(true);
          }}
          onCopy={
            selectedMemo && selectedMemo.member.userId !== (user as any)?.id && selectedMemo.groupId
              ? handleCopyMemo
              : undefined
          }
      />

      <ExitDialog open={showExitDialog} onOpenChange={setShowExitDialog} />
      
      {/* 지도 저장 다이얼로그 */}
      <Dialog open={saveMapDialogOpen} onOpenChange={setSaveMapDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100%-2rem)] mx-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-2 sm:pb-3">
            <DialogTitle className="text-lg sm:text-xl">지도 저장하기</DialogTitle>
          </DialogHeader>
          <Form {...saveMapForm}>
            <form onSubmit={saveMapForm.handleSubmit(handleSaveMap)} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-3 sm:space-y-4 overflow-y-auto flex-1 pr-1 sm:pr-2">
                <FormField
                  control={saveMapForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">제목</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="지도 제목을 입력하세요" className="text-sm" data-testid="input-save-map-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={saveMapForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">카테고리</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2" data-testid="category-picker">
                          {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                            const Icon = MARKER_ICON_COMPONENTS[type];
                            return (
                              <button
                                key={type}
                                type="button"
                                className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-2.5 rounded-md sm:rounded-lg border transition-all ${
                                  field.value === type 
                                    ? 'border-primary bg-accent' 
                                    : 'border-border hover:border-foreground/50 hover:bg-accent/50'
                                }`}
                                onClick={() => field.onChange(type)}
                                data-testid={`category-${type}`}
                              >
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="text-[10px] sm:text-xs font-medium">{t.categories[type]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={saveMapForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">색상</FormLabel>
                      <FormControl>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2" data-testid="color-picker">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md border transition-all ${
                                  field.value.toLowerCase() === color.value.toLowerCase()
                                    ? 'border-foreground ring-2 ring-primary ring-offset-1' 
                                    : 'border-border hover:border-foreground/50'
                                }`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => {
                                  field.onChange(color.value);
                                }}
                                data-testid={`color-option-${color.value}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">커스텀 색상:</label>
                            <Input
                              type="color"
                              value={field.value}
                              onChange={(e) => {
                                const newColor = e.target.value.toUpperCase();
                                field.onChange(newColor);
                              }}
                              className="h-8 w-16 sm:h-9 sm:w-20"
                              data-testid="color-custom-picker"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex-shrink-0 pt-3 sm:pt-4 border-t mt-3 sm:mt-4 flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-sm" 
                  onClick={() => setSaveMapDialogOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit" size="sm" className="flex-1 text-sm" data-testid="button-submit-save-map">
                  저장
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
