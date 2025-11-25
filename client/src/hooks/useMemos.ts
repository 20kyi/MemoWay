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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.memoCreated,
        description: t.toast.memoCreatedDesc,
      });
      onSuccess?.();
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
      onSuccess?.();
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

  return {
    createMemoMutation,
    updateMemoMutation,
    deleteMemoMutation,
    setMainMemoMutation,
  };
}

