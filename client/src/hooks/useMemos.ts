import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import type { SelectedLocation } from "@/types/home";

interface UseMemosProps {
  selectedLocation: SelectedLocation | null;
  personalMemberId: string | null;
  currentMemberId: string | null;
  onSuccess?: () => void;
}

export function useMemos({
  selectedLocation,
  personalMemberId,
  currentMemberId,
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

