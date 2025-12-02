import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { ExitDialog } from "@/components/exit-dialog";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-context";
import { useMapProvider } from "@/lib/map-provider-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";
import { useToast } from "@/hooks/use-toast";
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
  const { user } = useAuth();
  const { mapProvider } = useMapProvider();
  const { layoutTheme } = useLayoutTheme();
  const isCoupleTheme = layoutTheme === "couple-clay";
  const { toast } = useToast();

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
  
  // 저장된 지도 데이터 타입
  type SavedMap = {
    id: string;
    name: string;
    memoIds: string[];
    createdAt: Date;
  };
  
  // 저장된 지도 목록 (localStorage에서 로드)
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>(() => {
    const saved = localStorage.getItem("savedMaps");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((map: any) => ({
          ...map,
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
  const { createMemoMutation, updateMemoMutation, deleteMemoMutation, setMainMemoMutation } =
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

  // 선택된 메모들을 지도에 표시하는 핸들러
  const handleShowOnMap = useCallback((memoIds: string[]) => {
    setSelectedMemoIdsForMap(new Set(memoIds));
    handleTabChange("map");
  }, [handleTabChange]);

  // 지도 저장하기 핸들러
  const handleSaveMap = useCallback(() => {
    if (selectedMemoIdsForMap && selectedMemoIdsForMap.size > 0) {
      const newSavedMap: SavedMap = {
        id: `saved-map-${Date.now()}`,
        name: `저장된 지도 ${new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`,
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
      
      // 저장 후 필터 해제
      setSelectedMemoIdsForMap(null);
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
    try {
      // 선택한 모든 메모를 그룹으로 이동
      const results = await Promise.allSettled(
        memoIds.map((memoId) => {
          const memo = memos.find((m) => m.id === memoId);
          if (!memo) {
            throw new Error(`메모를 찾을 수 없습니다: ${memoId}`);
          }
          return updateMemoMutation.mutateAsync({
            memoId,
            data: {
              buildingName: memo.buildingName,
              address: memo.address,
              content: memo.content,
              markerIcon: memo.markerIcon,
              groupIds: [groupId],
            },
          });
        })
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
        toast({
          title: t.toast.memoEditSuccess || "성공",
          description: `${successCount}개의 메모를 그룹으로 이동했습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ""}`,
        });
      } else {
        throw new Error("모든 메모 이동에 실패했습니다.");
      }
    } catch (error: any) {
      toast({
        title: t.toast.memoEditError || "오류 발생",
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
                  onSaveMap={handleSaveMap}
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
                  onSaveMap={handleSaveMap}
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
              onShowOnMap={handleShowOnMap}
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
              onUpdateGroup={(groupId, data) =>
                updateGroupMutation.mutate({ groupId, ...data })
              }
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
          onSubmit={(data) => {
            if (editingMemo) {
              updateMemoMutation.mutate({
                memoId: editingMemo.id,
                data,
              });
            } else {
              createMemoMutation.mutate(data);
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
      />

      <ExitDialog open={showExitDialog} onOpenChange={setShowExitDialog} />
    </div>
  );
}
