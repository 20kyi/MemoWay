import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapView } from "@/components/map-view";
import { MemoFormSheet } from "@/components/memo-form-sheet";
import { MemoDetailSheet } from "@/components/memo-detail-sheet";
import { MemoClusterSheet } from "@/components/memo-cluster-sheet";
import { MemoList } from "@/components/memo-list";
import { GroupManagement } from "@/components/group-management";
import { SettingsView } from "@/components/settings-view";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-context";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";

export default function Home() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"map" | "memos" | "groups" | "settings">("map");
  const [memoFormOpen, setMemoFormOpen] = useState(false);
  const [memoDetailOpen, setMemoDetailOpen] = useState(false);
  const [memoClusterOpen, setMemoClusterOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoWithDetails | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<MemoWithDetails | null>(null);
  const [clusterMemoIds, setClusterMemoIds] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    buildingName: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notifiedMemoIds, setNotifiedMemoIds] = useState<Set<string>>(new Set());
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
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  // WebSocket for real-time updates
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === "memo_created" || data.type === "memo_deleted" || data.type === "memo_updated") {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      
      if (data.type === "memo_created") {
        toast({
          title: t.toast.newMemo,
          description: `${data.memo?.buildingName}${t.toast.newMemoDesc}`,
        });
      } else if (data.type === "memo_updated") {
        toast({
          title: t.toast.memoUpdated,
          description: `${data.memo?.buildingName}${t.toast.memoUpdatedDesc}`,
        });
      }
    }
  }, [toast, t]);

  useWebSocket(handleWebSocketMessage);

  const { data: memos = [] } = useQuery<MemoWithDetails[]>({
    queryKey: ["/api/memos"],
  });

  const { data: groups = [], isFetched: groupsIsFetched } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/groups"],
  });

  // groups 데이터로 myMemberIds 동기화
  useEffect(() => {
    if (!groupsIsFetched || groups.length === 0) return;

    // 모든 그룹의 멤버 ID 수집
    const allMemberIds = new Set<string>();
    groups.forEach(group => {
      group.members.forEach(member => {
        allMemberIds.add(member.id);
      });
    });

    // 현재 myMemberIds 중 실제로 존재하는 멤버만 유지
    const validMemberIds = myMemberIds.filter(id => allMemberIds.has(id));

    // currentMemberId가 그룹에 존재하는데 myMemberIds에 없으면 추가
    if (currentMemberId && allMemberIds.has(currentMemberId) && !validMemberIds.includes(currentMemberId)) {
      validMemberIds.push(currentMemberId);
    }

    // personalMemberId가 그룹에 존재하는데 myMemberIds에 없으면 추가
    if (personalMemberId && allMemberIds.has(personalMemberId) && !validMemberIds.includes(personalMemberId)) {
      validMemberIds.push(personalMemberId);
    }

    // 변경사항이 있으면 업데이트
    if (JSON.stringify([...validMemberIds].sort()) !== JSON.stringify([...myMemberIds].sort())) {
      setMyMemberIds(validMemberIds);
      localStorage.setItem("myMemberIds", JSON.stringify(validMemberIds));
    }
  }, [groups, groupsIsFetched, currentMemberId, personalMemberId, myMemberIds]);

  // 개인 메모용 멤버 자동 생성
  useEffect(() => {
    // groups 쿼리가 완료될 때까지 대기
    if (!groupsIsFetched) {
      return;
    }

    // 이미 개인 메모 그룹이 있는지 확인
    const existingPersonalGroup = groups.find(g => g.name === "개인 메모");
    if (existingPersonalGroup && existingPersonalGroup.members.length > 0) {
      if (!personalMemberId || personalMemberId !== existingPersonalGroup.members[0].id) {
        setPersonalMemberId(existingPersonalGroup.members[0].id);
        localStorage.setItem("personalMemberId", existingPersonalGroup.members[0].id);
      }
      return;
    }

    // 개인 메모 그룹이 없고 personalMemberId도 없으면 생성
    if (!personalMemberId) {
      const createPersonalMember = async () => {
        try {
          const response = await apiRequest("POST", "/api/groups", {
            name: "개인 메모",
            memberName: "나",
          });
          if (response.member?.id) {
            setPersonalMemberId(response.member.id);
            localStorage.setItem("personalMemberId", response.member.id);
            // groups 쿼리 무효화하여 최신 상태 유지
            queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
          }
        } catch (error) {
          console.error("개인 메모 멤버 생성 실패:", error);
          toast({
            title: t.toast.personalSetupFailed,
            description: t.toast.personalSetupFailedDesc,
            variant: "destructive",
          });
        }
      };
      createPersonalMember();
    }
  }, [personalMemberId, groups, groupsIsFetched, toast, queryClient]);

  const createMemoMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("buildingName", data.buildingName);
      formData.append("address", data.address);
      formData.append("latitude", selectedLocation?.lat.toString() || "0");
      formData.append("longitude", selectedLocation?.lng.toString() || "0");
      formData.append("content", data.content);
      formData.append("markerIcon", data.markerIcon || "default");
      
      // 개인 메모인지 그룹 메모인지 결정
      const isPersonalMemo = !data.groupIds || data.groupIds.length === 0;
      const memberId = isPersonalMemo ? personalMemberId : currentMemberId;
      
      if (!memberId) {
        throw new Error("멤버 ID가 필요합니다");
      }
      
      formData.append("memberId", memberId);
      
      if (!isPersonalMemo && data.groupIds.length > 0) {
        formData.append("groupId", data.groupIds[0]);
      }
      
      data.photos.forEach((photo: File) => {
        formData.append("photos", photo);
      });
      
      if (data.mainPhotoIndex !== undefined) {
        formData.append("mainPhotoIndex", data.mainPhotoIndex.toString());
      }

      return apiRequest("POST", "/api/memos", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.memoCreated,
        description: t.toast.memoCreatedDesc,
      });
      setMemoFormOpen(false);
      setSelectedLocation(null);
    },
  });

  const updateMemoMutation = useMutation({
    mutationFn: async ({ memoId, data }: { memoId: string; data: any }) => {
      const formData = new FormData();
      formData.append("buildingName", data.buildingName);
      formData.append("address", data.address);
      formData.append("content", data.content);
      
      if (data.markerIcon) {
        formData.append("markerIcon", data.markerIcon);
      }
      
      // Only send groupId if a group is selected
      if (data.groupIds && data.groupIds.length > 0) {
        formData.append("groupId", data.groupIds[0]);
      }
      // If no group selected, explicitly send empty string to clear group
      else {
        formData.append("groupId", "");
      }
      
      if (data.deletedPhotoIds && data.deletedPhotoIds.length > 0) {
        formData.append("deletedPhotoIds", JSON.stringify(data.deletedPhotoIds));
      }
      
      data.photos.forEach((photo: File) => {
        formData.append("photos", photo);
      });
      
      if (data.mainPhotoId) {
        formData.append("mainPhotoId", data.mainPhotoId);
      } else if (data.mainPhotoIndex !== undefined) {
        formData.append("mainPhotoIndex", data.mainPhotoIndex.toString());
      }

      return apiRequest("PATCH", `/api/memos/${memoId}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.memoEditSuccess,
        description: t.toast.memoEditSuccessDesc,
      });
      setMemoFormOpen(false);
      setEditingMemo(null);
      setSelectedLocation(null);
      setMemoDetailOpen(false);
      setSelectedMemo(null);
    },
  });

  const deleteMemoMutation = useMutation({
    mutationFn: async (memoId: string) => {
      return apiRequest("DELETE", `/api/memos/${memoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.memoDeleted,
        description: t.toast.memoDeletedDesc,
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; memberName: string; color: string; markerIcon: string }) => {
      return apiRequest("POST", "/api/groups", data);
    },
    onSuccess: (data: any) => {
      // Always invalidate queries first to ensure markerIcon is reflected in UI
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      
      if (data.member?.id) {
        setCurrentMemberId(data.member.id);
        localStorage.setItem("currentMemberId", data.member.id);
        
        setMyMemberIds(prev => {
          if (prev.includes(data.member.id)) return prev;
          const newIds = [...prev, data.member.id];
          localStorage.setItem("myMemberIds", JSON.stringify(newIds));
          return newIds;
        });
      }
      
      toast({
        title: t.toast.groupCreated,
        description: t.toast.groupCreatedDesc,
      });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (data: { inviteCode: string; memberName: string }) => {
      return apiRequest("POST", `/api/groups/join`, data);
    },
    onSuccess: (data: any) => {
      if (data.member?.id) {
        setCurrentMemberId(data.member.id);
        localStorage.setItem("currentMemberId", data.member.id);
        
        setMyMemberIds(prev => {
          if (prev.includes(data.member.id)) return prev;
          const newIds = [...prev, data.member.id];
          localStorage.setItem("myMemberIds", JSON.stringify(newIds));
          return newIds;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: t.toast.groupJoined,
        description: t.toast.groupJoinedDesc,
      });
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; memberId: string }) => {
      return apiRequest("DELETE", `/api/groups/${data.groupId}/members/${data.memberId}`);
    },
    onSuccess: (_, variables) => {
      setMyMemberIds(prev => {
        const newIds = prev.filter(id => id !== variables.memberId);
        localStorage.setItem("myMemberIds", JSON.stringify(newIds));
        return newIds;
      });
      
      if (currentMemberId === variables.memberId) {
        setCurrentMemberId(null);
        localStorage.removeItem("currentMemberId");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.groupLeft,
        description: t.toast.groupLeftDesc,
      });
    },
    onError: (error: any) => {
      toast({
        title: "그룹 나가기 실패",
        description: error.message || "그룹에서 나가는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!locationEnabled || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);

        if (notificationsEnabled && memos.length > 0) {
          checkNearbyMemos(newLocation);
        }
      },
      (error) => {
        console.error("위치 추적 오류:", error);
        toast({
          title: "위치 추적 오류",
          description: "위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인하세요.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationEnabled, notificationsEnabled, memos]);

  const checkNearbyMemos = (location: { lat: number; lng: number }) => {
    const nearbyMemos = memos.filter(memo => {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        memo.latitude,
        memo.longitude
      );
      return distance <= 100;
    });

    // Only notify for new memos that haven't been notified yet
    nearbyMemos.forEach(memo => {
      if (Notification.permission === "granted" && !notifiedMemoIds.has(memo.id)) {
        new Notification("근처 메모 있음", {
          body: `${memo.buildingName}에 메모가 있습니다`,
          icon: "/favicon.png",
        });
        
        // Mark this memo as notified
        setNotifiedMemoIds(prev => new Set(prev).add(memo.id));
      }
    });
    
    // Clean up notified memos that are no longer nearby
    const nearbyMemoIds = new Set(nearbyMemos.map(m => m.id));
    setNotifiedMemoIds(prev => {
      const updated = new Set<string>();
      prev.forEach(id => {
        if (nearbyMemoIds.has(id)) {
          updated.add(id);
        }
      });
      return updated;
    });
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleLocationSelect = (location: {
    lat: number;
    lng: number;
    address: string;
    buildingName: string;
  }) => {
    setEditingMemo(null);
    setSelectedLocation(location);
    setMemoFormOpen(true);
  };

  const handleEditMemo = (memoId: string) => {
    const memo = memos.find(m => m.id === memoId);
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

  const handleNavigateToLocation = (lat: number, lng: number) => {
    setPendingLocation({ lat, lng });
    setActiveTab("map");
  };

  useEffect(() => {
    if (mapInstance && pendingLocation && window.kakao?.maps) {
      const position = new window.kakao.maps.LatLng(pendingLocation.lat, pendingLocation.lng);
      mapInstance.setCenter(position);
      mapInstance.setLevel(3);
      setPendingLocation(null);
    }
  }, [mapInstance, pendingLocation]);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden pb-16">
        {activeTab === "map" && (
          <div className="relative h-full">
            <MapView
              onLocationSelect={handleLocationSelect}
              memos={memos}
              onMarkerClick={(memoId) => {
                const memo = memos.find(m => m.id === memoId);
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
            />
            <Button
              size="icon"
              className="absolute bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-50"
              onClick={() => {
                if (navigator.geolocation && mapInstance) {
                  navigator.geolocation.getCurrentPosition((position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const latlng = new window.kakao.maps.LatLng(lat, lng);
                    mapInstance.setCenter(latlng);
                  });
                }
              }}
              data-testid="button-my-location"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        )}
        {activeTab === "memos" && (
          <MemoList
            memos={memos}
            onEdit={handleEditMemo}
            onDelete={(memoId) => {
              if (confirm("정말로 이 메모를 삭제하시겠습니까?")) {
                deleteMemoMutation.mutate(memoId);
              }
            }}
            onMemoClick={(memoId) => {
              const memo = memos.find(m => m.id === memoId);
              if (memo) {
                setSelectedMemo(memo);
                setMemoDetailOpen(true);
              }
            }}
          />
        )}
        {activeTab === "groups" && (
          <GroupManagement
            groups={groups.filter(g => 
              g.name !== "개인 메모" && 
              g.members.some(m => myMemberIds.includes(m.id))
            )}
            myMemberIds={myMemberIds}
            personalMemberId={personalMemberId}
            onCreateGroup={(data) => createGroupMutation.mutate(data)}
            onJoinGroup={(inviteCode, memberName) =>
              joinGroupMutation.mutate({ inviteCode, memberName })
            }
            onLeaveGroup={(groupId, memberId) => {
              if (confirm("정말로 이 그룹에서 나가시겠습니까?")) {
                leaveGroupMutation.mutate({ groupId, memberId });
              }
            }}
            isLoading={createGroupMutation.isPending || joinGroupMutation.isPending}
          />
        )}
        {activeTab === "settings" && (
          <SettingsView
            notificationsEnabled={notificationsEnabled}
            onNotificationsChange={handleNotificationsChange}
            locationEnabled={locationEnabled}
            onLocationChange={handleLocationChange}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

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
              data
            });
          } else {
            createMemoMutation.mutate(data);
          }
        }}
        initialData={editingMemo ? {
          buildingName: editingMemo.buildingName,
          address: editingMemo.address,
          latitude: editingMemo.latitude,
          longitude: editingMemo.longitude,
          content: editingMemo.content,
          groupIds: editingMemo.groupId ? [editingMemo.groupId] : [],
          markerIcon: editingMemo.markerIcon || 'default',
          mainPhotoId: (editingMemo as any).mainPhotoId,
          existingPhotos: editingMemo.photos.map(p => ({ id: p.id, url: p.url })),
        } : selectedLocation ? {
          buildingName: selectedLocation.buildingName,
          address: selectedLocation.address,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
        } : null}
        groups={groups.filter(g => 
          g.name !== "개인 메모" && 
          g.members.some(m => myMemberIds.includes(m.id))
        )}
        isLoading={createMemoMutation.isPending || updateMemoMutation.isPending}
        isPersonalMemberReady={!!personalMemberId}
        currentMemberId={currentMemberId}
        editMode={!!editingMemo}
      />

      <MemoClusterSheet
        open={memoClusterOpen}
        onOpenChange={setMemoClusterOpen}
        memos={memos.filter(m => clusterMemoIds.includes(m.id))}
        onMemoSelect={(memoId) => {
          const memo = memos.find(m => m.id === memoId);
          if (memo) {
            setSelectedMemo(memo);
            setMemoDetailOpen(true);
          }
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
    </div>
  );
}
