import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapView } from "@/components/map-view";
import { GoogleMapView } from "@/components/google-map-view";
import { MemoFormSheet } from "@/components/memo-form-sheet";
import { MemoDetailSheet } from "@/components/memo-detail-sheet";
import { MemoClusterSheet } from "@/components/memo-cluster-sheet";
import { MemoList } from "@/components/memo-list";
import { GroupManagement } from "@/components/group-management";
import { SettingsView } from "@/components/settings-view";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-context";
import { useMapProvider } from "@/lib/map-provider-context";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";

// Calculate distance between two coordinates using Haversine formula (in meters)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { mapProvider } = useMapProvider();
  
  // Get initial tab from URL hash or default to "map"
  const getInitialTab = (): "map" | "memos" | "groups" | "settings" => {
    const hash = window.location.hash.slice(1); // Remove '#'
    if (hash === "map" || hash === "memos" || hash === "groups" || hash === "settings") {
      return hash;
    }
    return "map";
  };
  
  const [activeTab, setActiveTab] = useState<"map" | "memos" | "groups" | "settings">(getInitialTab);
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
  const [selectedMarkerIcons, setSelectedMarkerIcons] = useState<string[]>(["all"]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(["all"]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const { toast } = useToast();

  // Custom tab change handler that updates URL hash
  const handleTabChange = useCallback((tab: "map" | "memos" | "groups" | "settings") => {
    setActiveTab(tab);
    // Push to history for back button support
    window.history.pushState(null, "", `#${tab}`);
  }, []);

  // Handle browser back/forward button for tab navigation
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1);
      
      // If we're on the map tab and trying to go back, show exit confirmation
      if (activeTab === "map" && !hash) {
        // Push the current state back to prevent actual navigation
        window.history.pushState(null, "", "#map");
        setShowExitDialog(true);
        return;
      }
      
      if (hash === "map" || hash === "memos" || hash === "groups" || hash === "settings") {
        setActiveTab(hash);
      } else if (!hash) {
        // If no hash, we're trying to navigate away from the app
        window.history.pushState(null, "", "#map");
        setShowExitDialog(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    
    // Set initial hash if not present
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#map");
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeTab]);

  // Function to move map to specific location
  const moveToLocation = useCallback((lat: number, lng: number, memo?: MemoWithDetails) => {
    if (mapInstance) {
      // Handle both Kakao Maps and Google Maps
      if (mapProvider === "kakao" && window.kakao?.maps) {
        const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
        mapInstance.panTo(moveLatLon);
      } else if (mapProvider === "google") {
        // Google Maps panTo
        mapInstance.panTo({ lat, lng });
        mapInstance.setZoom(15);
      }
      
      // Switch to map tab using the new handler
      handleTabChange("map");
      
      // If memo is provided, open its detail after a short delay
      if (memo) {
        setTimeout(() => {
          setSelectedMemo(memo);
          setMemoDetailOpen(true);
        }, 300);
      }
    }
  }, [mapInstance, mapProvider, handleTabChange]);

  // WebSocket for real-time updates
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === "memo_created" || data.type === "memo_deleted" || data.type === "memo_updated") {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      
      if (data.type === "memo_created" && data.memo) {
        toast({
          title: t.toast.newMemo,
          description: `${data.memo?.buildingName}${t.toast.newMemoDesc}`,
          action: (
            <ToastAction 
              altText="위치 보기"
              onClick={() => moveToLocation(data.memo.latitude, data.memo.longitude, data.memo)}
              data-testid="button-view-memo-location"
            >
              위치 보기
            </ToastAction>
          ),
        });
      } else if (data.type === "memo_updated" && data.memo) {
        toast({
          title: t.toast.memoUpdated,
          description: `${data.memo?.buildingName}${t.toast.memoUpdatedDesc}`,
          action: (
            <ToastAction 
              altText="위치 보기"
              onClick={() => moveToLocation(data.memo.latitude, data.memo.longitude, data.memo)}
              data-testid="button-view-memo-location"
            >
              위치 보기
            </ToastAction>
          ),
        });
      }
    }
  }, [toast, t, moveToLocation]);

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

  // Track user location and check for nearby memos
  useEffect(() => {
    if (!locationEnabled || !notificationsEnabled) return;

    let watchId: number | null = null;
    const DESIRED_ACCURACY = 30; // meters

    const startTracking = () => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            
            // 정밀도가 30m 이하인 경우에만 위치 업데이트
            if (accuracy <= DESIRED_ACCURACY) {
              setUserLocation({ lat: latitude, lng: longitude });

              // Check for nearby memos
              memos.forEach((memo) => {
                // Skip if already notified
                if (notifiedMemoIds.has(memo.id)) return;

                const distance = calculateDistance(latitude, longitude, memo.latitude, memo.longitude);

                if (distance <= proximityRadius) {
                  // Notify user
                  toast({
                    title: memo.buildingName || "근처 메모",
                    description: `${Math.round(distance)}m 내에 메모가 있습니다`,
                  });

                  // Mark as notified
                  setNotifiedMemoIds((prev) => new Set(prev).add(memo.id));
                }
              });
            } else {
              console.log(`위치 정밀도 부족: ${Math.round(accuracy)}m > 30m, 업데이트 건너뜀`);
            }
          },
          (error) => {
            console.error("위치 추적 오류:", error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0, // 캐시 사용 안 함
            timeout: 10000, // 10초로 증가
          }
        );
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationEnabled, notificationsEnabled, memos, proximityRadius, notifiedMemoIds, toast]);

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

  // 개인 메모용 멤버 자동 생성
  useEffect(() => {
    // groups 쿼리가 완료될 때까지 대기
    if (!groupsIsFetched || !user) {
      return;
    }

    // 이미 개인 메모 그룹이 있는지 확인
    const existingPersonalGroup = groups.find(g => g.name === "개인 메모");
    if (existingPersonalGroup && existingPersonalGroup.members.length > 0) {
      // 현재 사용자의 멤버 찾기
      const currentUserId = (user as any).id;
      const myMember = existingPersonalGroup.members.find(m => m.userId === currentUserId);
      
      if (myMember) {
        // 현재 personalMemberId가 내 멤버 ID와 다르면 업데이트
        if (!personalMemberId || personalMemberId !== myMember.id) {
          console.log('개인 메모 멤버 ID 업데이트:', myMember.id);
          setPersonalMemberId(myMember.id);
          localStorage.setItem("personalMemberId", myMember.id);
        }
        return;
      }
    }

    // 개인 메모 그룹이 없거나 내 멤버가 없으면 생성
    const createPersonalMember = async () => {
      try {
        const response = await apiRequest("POST", "/api/groups", {
          name: "개인 메모",
          memberName: "나",
        });
        if (response.member?.id) {
          console.log('개인 메모 멤버 생성 완료:', response.member.id);
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
  }, [personalMemberId, groups, groupsIsFetched, user, toast, queryClient, t]);

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
      
      if (data.photoOrders && data.photoOrders.length > 0) {
        formData.append("photoOrders", JSON.stringify(data.photoOrders));
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

  const setMainMemoMutation = useMutation({
    mutationFn: async (memoId: string) => {
      return apiRequest("POST", `/api/memos/${memoId}/set-main`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: "메인 메모 설정 완료",
        description: "이 메모가 지도에 표시됩니다.",
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; memberName: string; color: string; markerIcon: string }) => {
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

  const copyGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("POST", `/api/groups/${groupId}/copy-to-personal`);
    },
    onSuccess: (data: any) => {
      // myMemberIds에 새 멤버 ID 추가 (useEffect가 동기화함)
      if (data.member?.id) {
        const newMemberId = data.member.id;
        setMyMemberIds(prev => {
          if (prev.includes(newMemberId)) return prev;
          const newIds = [...prev, newMemberId];
          localStorage.setItem("myMemberIds", JSON.stringify(newIds));
          return newIds;
        });
      }
      
      // 그룹 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      
      toast({
        title: "✅ 그룹 복사 완료",
        description: `새로운 그룹 "${data.group.name}"이(가) 생성되었고, ${data.copiedCount}개의 메모가 복사되었습니다`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "그룹 복사 실패",
        description: error.message || "그룹 메모 복사 중 오류가 발생했습니다",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest("DELETE", `/api/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.groupDeleted,
        description: t.toast.groupDeletedDesc,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.toast.deleteError,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (data: { groupId: string; memberId: string }) => {
      return apiRequest("DELETE", `/api/groups/${data.groupId}/members/${data.memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: "멤버 강퇴 완료",
        description: "멤버가 그룹에서 제거되었습니다",
      });
    },
    onError: (error: any) => {
      toast({
        title: "멤버 강퇴 실패",
        description: error.message || "멤버 제거 중 오류가 발생했습니다",
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; name: string; description?: string; color: string; markerIcon: string }) => {
      return apiRequest("PATCH", `/api/groups/${data.groupId}`, {
        name: data.name,
        description: data.description,
        color: data.color,
        markerIcon: data.markerIcon,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: "그룹 수정 완료",
        description: "그룹 정보가 수정되었습니다",
      });
    },
    onError: (error: any) => {
      toast({
        title: "그룹 수정 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const transferLeadershipMutation = useMutation({
    mutationFn: async (data: { groupId: string; newLeaderId: string }) => {
      return apiRequest("POST", `/api/groups/${data.groupId}/transfer-leader`, {
        newLeaderId: data.newLeaderId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: t.toast.leadershipTransferred,
        description: t.toast.leadershipTransferredDesc,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.toast.leadershipTransferError,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberPermissionsMutation = useMutation({
    mutationFn: async (data: { groupId: string; memberId: string; canEditGroupMemos: boolean }) => {
      return apiRequest("PATCH", `/api/groups/${data.groupId}/members/${data.memberId}/permissions`, {
        canEditGroupMemos: data.canEditGroupMemos,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "권한 업데이트",
        description: "멤버 권한이 업데이트되었습니다",
      });
    },
    onError: (error: any) => {
      toast({
        title: "권한 업데이트 실패",
        description: error.message,
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
    if (mapInstance && pendingLocation) {
      if (mapProvider === "kakao" && window.kakao?.maps) {
        const position = new window.kakao.maps.LatLng(pendingLocation.lat, pendingLocation.lng);
        mapInstance.panTo(position);
        mapInstance.setLevel(3);
      } else if (mapProvider === "google") {
        mapInstance.panTo({ lat: pendingLocation.lat, lng: pendingLocation.lng });
        mapInstance.setZoom(16);
      }
      setPendingLocation(null);
    }
  }, [mapInstance, pendingLocation, mapProvider]);

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
                onMyLocationClick={(location) => {
                  setUserLocation(location);
                }}
                groups={groups.filter(g => 
                  g.members.some(m => m.userId === (user as any)?.id)
                )}
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
                onMyLocationClick={(location) => {
                  setUserLocation(location);
                }}
                groups={groups.filter(g => 
                  g.members.some(m => m.userId === (user as any)?.id)
                )}
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
            groups={groups.filter(g => 
              g.name !== "개인 메모" && 
              g.members.some(m => m.userId === (user as any)?.id)
            )}
            onEdit={handleEditMemo}
            onDelete={(memoId) => {
              if (confirm("정말로 이 메모를 삭제하시겠습니까?")) {
                deleteMemoMutation.mutate(memoId);
              }
            }}
            onBulkDelete={(memoIds) => {
              if (confirm(`선택한 ${memoIds.length}개의 메모를 삭제하시겠습니까?`)) {
                Promise.all(memoIds.map(id => 
                  apiRequest("DELETE", `/api/memos/${id}`)
                )).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/memos'] });
                  toast({
                    title: t.toast.deleteSuccess,
                    description: `${memoIds.length}개의 메모가 삭제되었습니다.`,
                  });
                }).catch((error) => {
                  toast({
                    title: t.toast.deleteError,
                    description: error.message,
                    variant: "destructive",
                  });
                });
              }
            }}
            onMemoClick={(memoId) => {
              const memo = memos.find(m => m.id === memoId);
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
            groups={groups.filter(g => 
              g.name !== "개인 메모" && 
              g.members.some(m => m.userId === (user as any)?.id)
            )}
            myMemberIds={myMemberIds}
            personalMemberId={personalMemberId}
            userId={(user as any)?.id}
            onCreateGroup={(data) => createGroupMutation.mutate(data)}
            onUpdateGroup={(groupId, data) => updateGroupMutation.mutate({ groupId, ...data })}
            onJoinGroup={(inviteCode, memberName) => {
              joinGroupMutation.mutate({ inviteCode, memberName });
            }}
            onLeaveGroup={(groupId, memberId) => {
              if (confirm("정말로 이 그룹에서 나가시겠습니까?")) {
                leaveGroupMutation.mutate({ groupId, memberId });
              }
            }}
            onCopyGroup={(groupId) => {
              if (confirm("이 그룹의 모든 메모를 새 그룹으로 복사하시겠습니까?\n새로운 그룹이 생성됩니다.")) {
                copyGroupMutation.mutate(groupId);
              }
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
              updateMemberPermissionsMutation.mutate({ groupId, memberId, canEditGroupMemos })
            }
            isLoading={createGroupMutation.isPending || joinGroupMutation.isPending}
          />
        )}
        {activeTab === "settings" && (
          <SettingsView
            notificationsEnabled={notificationsEnabled}
            onNotificationsChange={setNotificationsEnabled}
            locationEnabled={locationEnabled}
            onLocationChange={setLocationEnabled}
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
          g.members.some(m => m.userId === (user as any)?.id)
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

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent 
          data-testid="dialog-exit-app"
          className="max-w-sm rounded-3xl border-0 bg-gradient-to-br from-white/95 to-white/90 dark:from-zinc-900/95 dark:to-zinc-900/90 backdrop-blur-xl shadow-2xl"
        >
          <AlertDialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
              </svg>
            </div>
            <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {t.exitDialog?.title || "앱 종료"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600 dark:text-gray-400 px-4">
              {t.exitDialog?.description || "정말로 앱을 종료하시겠습니까?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 sm:gap-3 mt-2">
            <AlertDialogCancel 
              data-testid="button-cancel-exit"
              className="flex-1 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-700 font-semibold text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg transition-all duration-200 mt-0"
            >
              {t.exitDialog?.cancel || "취소"}
            </AlertDialogCancel>
            <AlertDialogAction 
              data-testid="button-confirm-exit"
              onClick={() => {
                // Actually navigate away from the app
                window.history.go(-2); // Go back twice to exit
              }}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t.exitDialog?.confirm || "종료"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
