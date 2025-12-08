import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import type { SelectedLocation } from "@/types/home";
import type { GroupWithMembers } from "@shared/schema";

interface UseMemosProps {
  selectedLocation: SelectedLocation | null;
  personalMemberId: string | null;
  currentMemberId: string | null;
  groups: GroupWithMembers[];
  onSuccess?: () => void;
}

export function useMemos({
  selectedLocation,
  personalMemberId,
  currentMemberId,
  groups,
  onSuccess,
}: UseMemosProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const createMemoMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("buildingName", data.buildingName);
      formData.append("address", data.address);
      formData.append("latitude", selectedLocation?.lat.toString() || "0");
      formData.append("longitude", selectedLocation?.lng.toString() || "0");
      formData.append("content", data.content);
      formData.append("markerIcon", data.markerIcon || "default");
      formData.append("rating", (data.rating || 0).toString());

      // 개인 메모인지 그룹 메모인지 결정
      const isPersonalMemo = !data.groupIds || data.groupIds.length === 0;
      
      if (isPersonalMemo) {
        // 개인 메모: personalMemberId 사용
        if (!personalMemberId) {
          throw new Error("개인 메모를 위한 멤버 ID가 필요합니다");
        }
        formData.append("memberId", personalMemberId);
      } else {
        // 그룹 메모: 선택한 그룹의 멤버 ID 찾기
        const selectedGroupId = data.groupIds[0];
        const selectedGroup = groups.find(g => g.id === selectedGroupId);
        
        if (!selectedGroup) {
          throw new Error("선택한 그룹을 찾을 수 없습니다");
        }
        
        // 서버가 그룹 ID를 받아서 자동으로 멤버 ID를 찾으므로, 그룹 ID만 전송
        formData.append("groupId", selectedGroupId);
        
        // 서버 코드가 memberId를 필수로 요구하지만, 그룹 ID가 있으면 서버가 자동으로
        // 해당 그룹의 멤버 ID를 찾아서 사용하므로, 여기서는 임시 값이라도 전송해야 함
        // 서버는 그룹 ID가 있으면 memberId를 무시하고 그룹의 멤버 ID를 사용함
        // 하지만 유효성 검사를 통과하기 위해 personalMemberId를 전송 (서버가 덮어씀)
        if (personalMemberId) {
          formData.append("memberId", personalMemberId);
        } else if (currentMemberId) {
          formData.append("memberId", currentMemberId);
        } else {
          // 최후의 수단: 빈 문자열이 아닌 임시 값 (서버가 그룹 ID로 덮어씀)
          throw new Error("멤버 ID가 필요합니다. 잠시 후 다시 시도해주세요.");
        }
      }

      data.photos.forEach((photo: File) => {
        formData.append("photos", photo);
      });

      if (data.mainPhotoIndex !== undefined) {
        formData.append("mainPhotoIndex", data.mainPhotoIndex.toString());
      }

      return apiRequest("POST", "/api/memos", formData);
    },
    onSuccess: async () => {
      console.log("[CREATE MEMO API] onSuccess called");
      // 즉시 refetch하여 지연 최소화
      await queryClient.refetchQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.memoCreated,
        description: t.toast.memoCreatedDesc,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("[CREATE MEMO API] onError called:", error);
      
      // 401 에러인 경우 특별 처리
      if (error.status === 401) {
        console.error("[CREATE MEMO API] Authentication error - user may need to re-login");
        toast({
          title: "인증 오류",
          description: error.error || "세션이 만료되었습니다. 페이지를 새로고침하거나 다시 로그인해주세요.",
          variant: "destructive",
        });
      } else {
        // 다른 에러는 기본 처리
        toast({
          title: "메모 생성 실패",
          description: error.error || error.message || "메모 생성에 실패했습니다.",
          variant: "destructive",
        });
      }
    },
  });

  const updateMemoMutation = useMutation({
    mutationFn: async ({ memoId, data }: { memoId: string; data: any }) => {
      console.log("[UPDATE MEMO API] ========== STARTING UPDATE ==========");
      console.log("[UPDATE MEMO API] Memo ID:", memoId);
      console.log("[UPDATE MEMO API] Data keys:", Object.keys(data));
      console.log("[UPDATE MEMO API] Platform:", (window as any).Capacitor?.isNativePlatform?.() ? 'Native' : 'Web');
      
      // 데이터 검증
      if (!memoId) {
        const error = new Error("메모 ID가 없습니다.");
        console.error("[UPDATE MEMO API] Validation failed:", error.message);
        throw error;
      }
      
      if (!data.buildingName || !data.address || !data.content) {
        const error = new Error("필수 필드가 누락되었습니다.");
        console.error("[UPDATE MEMO API] Validation failed:", error.message);
        throw error;
      }
      
      try {
        const formData = new FormData();
        formData.append("buildingName", data.buildingName || "");
        formData.append("address", data.address || "");
        formData.append("content", data.content || "");

        if (data.markerIcon) {
          formData.append("markerIcon", data.markerIcon);
        }

        if (data.rating !== undefined) {
          formData.append("rating", data.rating.toString());
        }

        // Only send groupId if a group is selected
        if (data.groupIds && data.groupIds.length > 0) {
          formData.append("groupId", data.groupIds[0]);
          console.log("[UPDATE MEMO API] Setting groupId:", data.groupIds[0]);
        }
        // If no group selected, explicitly send empty string to clear group
        else {
          formData.append("groupId", "");
          console.log("[UPDATE MEMO API] Clearing groupId (empty string)");
        }

        if (data.deletedPhotoIds && data.deletedPhotoIds.length > 0) {
          formData.append("deletedPhotoIds", JSON.stringify(data.deletedPhotoIds));
          console.log("[UPDATE MEMO API] Deleted photo IDs:", data.deletedPhotoIds);
        }

        if (data.photoOrders && data.photoOrders.length > 0) {
          formData.append("photoOrders", JSON.stringify(data.photoOrders));
          console.log("[UPDATE MEMO API] Photo orders:", data.photoOrders);
        }

        // photos가 있을 때만 처리
        if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
          data.photos.forEach((photo: File, index: number) => {
            formData.append("photos", photo);
            console.log(`[UPDATE MEMO API] Added photo ${index + 1}:`, photo.name, photo.size);
          });
        }

        if (data.mainPhotoId) {
          formData.append("mainPhotoId", data.mainPhotoId);
          console.log("[UPDATE MEMO API] Main photo ID:", data.mainPhotoId);
        } else if (data.mainPhotoIndex !== undefined) {
          formData.append("mainPhotoIndex", data.mainPhotoIndex.toString());
          console.log("[UPDATE MEMO API] Main photo index:", data.mainPhotoIndex);
        }

        // FormData 내용 로깅 (디버깅용)
        console.log("[UPDATE MEMO API] FormData prepared, calling API");
        
        // 절대 URL 구성 (Android WebView에서 localhost 문제 해결)
        // apiRequest가 내부에서 getApiBaseUrl()을 호출하지만, 
        // Android WebView에서 확실하게 절대 URL을 사용하도록 여기서도 명시적으로 처리
        const { getApiBaseUrl } = await import("@/lib/api-config");
        const baseUrl = getApiBaseUrl();
        const apiPath = `/api/memos/${memoId}`;
        
        // 절대 URL 구성: getApiBaseUrl()이 항상 값을 반환하므로 항상 절대 URL이 됨
        // 프로덕션: https://memoway-production.up.railway.app/api/memos/${memoId}
        // 개발: http://localhost:5000/api/memos/${memoId}
        const fullUrl = `${baseUrl}${apiPath}`;
        
        const isNativePlatform = (window as any).Capacitor?.isNativePlatform?.() ?? false;
        
        console.log("[UPDATE MEMO API] ========== REQUEST URL INFO ==========");
        console.log("[UPDATE MEMO API] Base URL:", baseUrl || "(empty - using relative path)");
        console.log("[UPDATE MEMO API] API path:", apiPath);
        console.log("[UPDATE MEMO API] Full URL:", fullUrl);
        console.log("[UPDATE MEMO API] Platform:", isNativePlatform ? 'Native (Capacitor)' : 'Web Browser');
        console.log("[UPDATE MEMO API] ======================================");
        
        // apiRequest에 전달 (apiRequest 내부에서도 baseUrl을 추가하지만, 
        // 이미 절대 URL이면 추가하지 않으므로 안전)
        const result = await apiRequest("PATCH", fullUrl, formData);
        
        console.log("[UPDATE MEMO API] ========== UPDATE SUCCESS ==========");
        console.log("[UPDATE MEMO API] Result:", result);
        return result;
      } catch (error: any) {
        console.error("[UPDATE MEMO API] ========== UPDATE FAILED ==========");
        console.error("[UPDATE MEMO API] Error name:", error.name);
        console.error("[UPDATE MEMO API] Error message:", error.message);
        console.error("[UPDATE MEMO API] Error status:", error.status);
        console.error("[UPDATE MEMO API] Error error:", error.error);
        if (error.response) {
          console.error("[UPDATE MEMO API] Error response:", error.response);
        }
        if (error.stack) {
          console.error("[UPDATE MEMO API] Error stack:", error.stack);
        }
        console.error("[UPDATE MEMO API] ==================================");
        
        // 에러를 다시 던져서 호출자가 처리할 수 있도록
        throw error;
      }
    },
    onSuccess: async () => {
      // 즉시 refetch하여 지연 최소화
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/memos"] }),
        queryClient.refetchQueries({ queryKey: ["/api/groups"] }),
      ]);
      // mutateAsync를 사용할 때는 onSuccess가 호출되지 않으므로
      // home.tsx에서 직접 토스트를 표시하거나
      // mutate를 사용할 때만 여기서 토스트 표시
      // mutateAsync를 사용하는 경우를 위해 주석 처리
      // toast({
      //   title: t.toast.memoEditSuccess,
      //   description: t.toast.memoEditSuccessDesc,
      // });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("메모 업데이트 실패:", error);
      // mutateAsync를 사용할 때는 onError가 호출되지 않으므로
      // home.tsx에서 직접 에러 처리
      // toast({
      //   title: t.toast.memoEditError,
      //   description: error.message || t.toast.memoEditErrorDesc,
      //   variant: "destructive",
      // });
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
        title: t.toast.mainMemoSet,
        description: t.toast.mainMemoSetDesc,
      });
    },
  });

  const copyMemoMutation = useMutation({
    mutationFn: async (memoId: string) => {
      return apiRequest("POST", `/api/memos/${memoId}/copy`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      // Points update
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: t.common.copy || "복사 완료",
        description: "내 개인 메모로 복사되었습니다. (10포인트 차감)",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "복사 실패",
        description: error.message || "메모 복사에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  return {
    createMemoMutation,
    updateMemoMutation,
    deleteMemoMutation,
    setMainMemoMutation,
    copyMemoMutation,
  };
}

