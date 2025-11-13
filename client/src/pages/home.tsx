import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapView } from "@/components/map-view";
import { MemoFormSheet } from "@/components/memo-form-sheet";
import { MemoList } from "@/components/memo-list";
import { GroupManagement } from "@/components/group-management";
import { SettingsView } from "@/components/settings-view";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"map" | "memos" | "groups" | "settings">("map");
  const [memoFormOpen, setMemoFormOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    buildingName: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(
    localStorage.getItem("currentMemberId")
  );
  const { toast } = useToast();

  // WebSocket for real-time updates
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === "memo_created" || data.type === "memo_deleted") {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      
      if (data.type === "memo_created") {
        toast({
          title: "새 메모 알림",
          description: `${data.memo?.buildingName}에 새 메모가 추가되었습니다`,
        });
      }
    }
  }, [toast]);

  useWebSocket(handleWebSocketMessage);

  const { data: memos = [] } = useQuery<MemoWithDetails[]>({
    queryKey: ["/api/memos"],
  });

  const { data: groups = [] } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/groups"],
  });

  const createMemoMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("buildingName", data.buildingName);
      formData.append("address", data.address);
      formData.append("latitude", selectedLocation?.lat.toString() || "0");
      formData.append("longitude", selectedLocation?.lng.toString() || "0");
      formData.append("content", data.content);
      formData.append("memberId", currentMemberId || "");
      if (data.groupIds && data.groupIds.length > 0) {
        formData.append("groupId", data.groupIds[0]);
      }
      data.photos.forEach((photo: File) => {
        formData.append("photos", photo);
      });

      return apiRequest("POST", "/api/memos", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: "메모 생성 완료",
        description: "새 메모가 추가되었습니다",
      });
    },
  });

  const deleteMemoMutation = useMutation({
    mutationFn: async (memoId: string) => {
      return apiRequest("DELETE", `/api/memos/${memoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: "메모 삭제 완료",
        description: "메모가 삭제되었습니다",
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; memberName: string }) => {
      return apiRequest("POST", "/api/groups", data);
    },
    onSuccess: (data: any) => {
      if (data.member?.id) {
        setCurrentMemberId(data.member.id);
        localStorage.setItem("currentMemberId", data.member.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "그룹 생성 완료",
        description: "새 그룹이 생성되었습니다",
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
      }
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "그룹 참여 완료",
        description: "그룹에 참여했습니다",
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

    nearbyMemos.forEach(memo => {
      if (Notification.permission === "granted") {
        new Notification("근처 메모 있음", {
          body: `${memo.buildingName}에 메모가 있습니다`,
          icon: "/favicon.png",
        });
      }
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
    if (!currentMemberId) {
      toast({
        title: "그룹 필요",
        description: "메모를 작성하려면 먼저 그룹을 만들거나 참여하세요",
        variant: "destructive",
      });
      setActiveTab("groups");
      return;
    }
    setSelectedLocation(location);
    setMemoFormOpen(true);
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

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden pb-16">
        {activeTab === "map" && (
          <div className="relative h-full">
            <MapView
              onLocationSelect={handleLocationSelect}
              memos={memos}
              onMarkerClick={(memoId) => {
                setActiveTab("memos");
              }}
              userLocation={userLocation}
            />
            {currentMemberId && (
              <Button
                size="icon"
                className="absolute bottom-4 right-4 h-16 w-16 rounded-full shadow-lg"
                onClick={() => {
                  toast({
                    title: "지도 탭",
                    description: "지도에서 위치를 탭하여 메모를 추가하세요",
                  });
                }}
                data-testid="button-add-memo-fab"
              >
                <Plus className="h-8 w-8" />
              </Button>
            )}
          </div>
        )}
        {activeTab === "memos" && (
          <MemoList
            memos={memos}
            onEdit={(memoId) => {
              toast({
                title: "편집 기능",
                description: "메모 편집 기능은 추후 추가될 예정입니다",
              });
            }}
            onDelete={(memoId) => deleteMemoMutation.mutate(memoId)}
            onMemoClick={(memoId) => {
              const memo = memos.find(m => m.id === memoId);
              if (memo) {
                toast({
                  title: memo.buildingName,
                  description: memo.content,
                });
              }
            }}
          />
        )}
        {activeTab === "groups" && (
          <GroupManagement
            groups={groups}
            onCreateGroup={(data) => createGroupMutation.mutate(data)}
            onJoinGroup={(inviteCode, memberName) =>
              joinGroupMutation.mutate({ inviteCode, memberName })
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
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <MemoFormSheet
        open={memoFormOpen}
        onOpenChange={setMemoFormOpen}
        onSubmit={(data) => createMemoMutation.mutate(data)}
        initialData={selectedLocation}
        groups={groups}
        isLoading={createMemoMutation.isPending}
      />
    </div>
  );
}
