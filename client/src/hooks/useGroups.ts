import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";

interface UseGroupsProps {
  setCurrentMemberId: (id: string | null) => void;
  setMyMemberIds: React.Dispatch<React.SetStateAction<string[]>>;
  currentMemberId: string | null;
}

export function useGroups({
  setCurrentMemberId,
  setMyMemberIds,
  currentMemberId,
}: UseGroupsProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  const createGroupMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      memberName: string;
      color: string;
      markerIcon: string;
    }) => {
      return apiRequest("POST", "/api/groups", data);
    },
    onSuccess: (data: any) => {
      // Always invalidate queries first to ensure markerIcon is reflected in UI
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });

      if (data.member?.id) {
        setCurrentMemberId(data.member.id);
        localStorage.setItem("currentMemberId", data.member.id);

        setMyMemberIds((prev) => {
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

        setMyMemberIds((prev) => {
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
      setMyMemberIds((prev) => {
        const newIds = prev.filter((id) => id !== variables.memberId);
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
        title: t.toast.groupLeaveFailed,
        description: error.message || t.toast.groupLeaveFailedDesc,
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
        setMyMemberIds((prev) => {
          if (prev.includes(newMemberId)) return prev;
          const newIds = [...prev, newMemberId];
          localStorage.setItem("myMemberIds", JSON.stringify(newIds));
          return newIds;
        });
      }

      // 그룹 목록 및 사용자 정보 새로고침 (포인트 업데이트)
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      const pointsUsed = data.copiedCount * 10;
      toast({
        title: t.toast.groupCopySuccess,
        description: t.toast.groupCopySuccessDesc
          .replace('{name}', data.group.name)
          .replace('{count}', data.copiedCount.toString())
          .replace('{points}', pointsUsed.toString()),
      });
    },
    onError: (error: any) => {
      // Handle both error.error (from server) and error.message
      const errorMsg = error.error || error.message || "그룹 메모 복사 중 오류가 발생했습니다";
      const isInsufficientPoints = errorMsg.includes("포인트가 부족합니다");
      toast({
        title: isInsufficientPoints ? t.toast.pointsInsufficient : t.toast.groupCopyFailed,
        description: errorMsg,
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
        title: t.toast.memberRemoveSuccess,
        description: t.toast.memberRemoveSuccessDesc,
      });
    },
    onError: (error: any) => {
      toast({
        title: t.toast.memberRemoveFailed,
        description: error.message || t.toast.memberRemoveFailedDesc,
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: {
      groupId: string;
      name: string;
      description?: string;
      color: string;
      markerIcon: string;
    }) => {
      console.log("[UPDATE GROUP API] Starting API call", { 
        groupId: data.groupId, 
        name: data.name,
        description: data.description,
        color: data.color,
        markerIcon: data.markerIcon,
      });
      
      // 데이터 검증
      if (!data.groupId) {
        throw new Error("그룹 ID가 없습니다.");
      }
      
      if (!data.name || !data.name.trim()) {
        throw new Error("그룹 이름을 입력해주세요.");
      }
      
      try {
        const result = await apiRequest("PATCH", `/api/groups/${data.groupId}`, {
          name: data.name,
          description: data.description,
          color: data.color,
          markerIcon: data.markerIcon,
        });
        
        console.log("[UPDATE GROUP API] API call successful", result);
        return result;
      } catch (error: any) {
        console.error("[UPDATE GROUP API] API call failed:", error);
        console.error("[UPDATE GROUP API] Error details:", {
          name: error.name,
          message: error.message,
          status: error.status,
          error: error.error,
        });
        throw error;
      }
    },
    onSuccess: () => {
      console.log("[UPDATE GROUP API] onSuccess called");
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos"] });
      toast({
        title: t.toast.groupUpdateSuccess,
        description: "그룹 정보가 수정되었습니다",
      });
    },
    onError: (error: any) => {
      console.error("[UPDATE GROUP API] onError called:", error);
      const errorMessage = error.error || 
                           error.message || 
                           error.response?.data?.message ||
                           "그룹 수정에 실패했습니다.";
      toast({
        title: "그룹 수정 실패",
        description: errorMessage,
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
    mutationFn: async (data: {
      groupId: string;
      memberId: string;
      canEditGroupMemos: boolean;
    }) => {
      return apiRequest(
        "PATCH",
        `/api/groups/${data.groupId}/members/${data.memberId}/permissions`,
        {
          canEditGroupMemos: data.canEditGroupMemos,
        }
      );
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

  return {
    createGroupMutation,
    joinGroupMutation,
    leaveGroupMutation,
    copyGroupMutation,
    deleteGroupMutation,
    removeMemberMutation,
    updateGroupMutation,
    transferLeadershipMutation,
    updateMemberPermissionsMutation,
  };
}

