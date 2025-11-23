import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/bottom-nav";
import { ExitDialog } from "@/components/exit-dialog";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-context";
import { useMapProvider } from "@/lib/map-provider-context";
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
import { SettingsView } from "@/components/settings-view";

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { mapProvider } = useMapProvider();
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

  // Data queries - 병렬 로딩 보장
  const { data: memos = [] } = useQuery<MemoWithDetails[]>({
    queryKey: ["/api/memos"],
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  const { data: groups = [], isFetched: groupsIsFetched } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/groups"],
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  // Location tracking
  const { userLocation, setUserLocation } = useLocationTracking({
    locationEnabled,
    notificationsEnabled,
    proximityRadius,
    memos,
  });

  // Map instance management
  const { setMapInstance, pendingLocation, moveToLocation, handleNavigateToLocation } =
    useMapInstance({
      handleTabChange,
      setSelectedMemo,
      setMemoDetailOpen,
    });

  // WebSocket messages
  const { handleWebSocketMessage } = useWebSocketMessages({ moveToLocation });
  useWebSocket(handleWebSocketMessage);

  // Personal member management
  usePersonalMember({
    personalMemberId,
    setPersonalMemberId,
    groups,
    groupsIsFetched,
    user,
  });

  // Memo mutations
  const { createMemoMutation, updateMemoMutation, deleteMemoMutation, setMainMemoMutation } =
    useMemos({
      selectedLocation,
      personalMemberId,
      currentMemberId,
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

  // Handlers
  const handleLocationSelect = (location: SelectedLocation) => {
    setEditingMemo(null);
    setSelectedLocation(location);
    setMemoFormOpen(true);
  };

  const handleEditMemo = (memoId: string) => {
    const memo = memos.find((m) => m.id === memoId);
    if (memo) {
      setEditingMemo(memo);
      setSelectedLocation(null);
      setMemoFormOpen(true);
    }
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    if (enabled && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: "알림 권한 필요",
          description: "알림을 받으려면 브라우저에서 알림 권한을 허용하세요",
          variant: "destructive",
        });
        return;
      }
    }
    setNotificationsEnabled(enabled);
  };

  const handleLocationChange = (enabled: boolean) => {
    if (enabled && !navigator.geolocation) {
      toast({
        title: "위치 서비스 없음",
        description: "이 브라우저는 위치 서비스를 지원하지 않습니다",
        variant: "destructive",
      });
      return;
    }
    setLocationEnabled(enabled);
  };

  const filteredGroups = groups.filter((g) =>
    g.members.some((m) => m.userId === (user as any)?.id)
  );
  const filteredGroupsWithoutPersonal = filteredGroups.filter((g) => g.name !== "개인 메모");

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-secondary/10 to-accent/20 relative overflow-hidden">
      <div className="flex-1 overflow-hidden pb-16 relative z-10">
        {activeTab === "map" && (
          <div className="relative h-full">
            {mapProvider === "kakao" ? (
              <MapView
                  onLocationSelect={handleLocationSelect}
                  memos={memos}
                  onMarkerClick={(memoId) => {
                    const memo = memos.find((m) => m.id === memoId);
                    if (memo) {
                      setSelectedMemo(memo);
                      setMemoDetailOpen(true);
                    }
                  }}
                  onClusterClick={(memoIds) => {
                    setClusterMemoIds(memoIds);
                    setMemoClusterOpen(true);
                  }}
                  userLocation={userLocation}
                  onMapReady={setMapInstance}
                  onMyLocationClick={(location) => {
                    setUserLocation(location);
                  }}
                  pendingLocation={pendingLocation}
                  groups={filteredGroups}
                  selectedMarkerIcons={selectedMarkerIcons}
                  selectedGroupIds={selectedGroupIds}
                  onMarkerIconsChange={setSelectedMarkerIcons}
                  onGroupIdsChange={setSelectedGroupIds}
                />
              ) : (
                <GoogleMapView
                  onLocationSelect={handleLocationSelect}
                  memos={memos}
                  onMarkerClick={(memoId) => {
                    const memo = memos.find((m) => m.id === memoId);
                    if (memo) {
                      setSelectedMemo(memo);
                      setMemoDetailOpen(true);
                    }
                  }}
                  onClusterClick={(memoIds) => {
                    setClusterMemoIds(memoIds);
                    setMemoClusterOpen(true);
                  }}
                  userLocation={userLocation}
                  onMapReady={setMapInstance}
                  onMyLocationClick={(location) => {
                    setUserLocation(location);
                  }}
                  pendingLocation={pendingLocation}
                  groups={filteredGroups}
                  selectedMarkerIcons={selectedMarkerIcons}
                  selectedGroupIds={selectedGroupIds}
                  onMarkerIconsChange={setSelectedMarkerIcons}
                  onGroupIdsChange={setSelectedGroupIds}
                />
              )}
          </div>
        )}
        {activeTab === "memos" && (
          <MemoList
              memos={memos}
              groups={filteredGroupsWithoutPersonal}
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
                        description: `${memoIds.length}개의 메모가 삭제되었습니다.`,
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
              onMemoClick={(memoId) => {
                const memo = memos.find((m) => m.id === memoId);
                if (memo) {
                  setSelectedMemo(memo);
                  setMemoDetailOpen(true);
                }
              }}
              onSetMainMemo={(memoId) => {
                setMainMemoMutation.mutate(memoId);
              }}
            />
        )}
        {activeTab === "groups" && (
          <GroupManagement
              groups={filteredGroupsWithoutPersonal}
              myMemberIds={myMemberIds}
              personalMemberId={personalMemberId}
              userId={(user as any)?.id}
              userPoints={(user as any)?.points || 0}
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
              isLoading={createGroupMutation.isPending || joinGroupMutation.isPending}
            />
        )}
        {activeTab === "settings" && (
          <SettingsView
              notificationsEnabled={notificationsEnabled}
              onNotificationsChange={handleNotificationsChange}
              locationEnabled={locationEnabled}
              onLocationChange={handleLocationChange}
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
