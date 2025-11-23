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
        title: "✅ 그룹 복사 완료",
        description: `새로운 그룹 "${data.group.name}"이(가) 생성되었고, ${data.copiedCount}개의 메모가 복사되었습니다 (${pointsUsed} 포인트 사용)`,
      });
    },
    onError: (error: any) => {
      // Handle both error.error (from server) and error.message
      const errorMsg = error.error || error.message || "그룹 메모 복사 중 오류가 발생했습니다";
      const isInsufficientPoints = errorMsg.includes("포인트가 부족합니다");
      toast({
        title: isInsufficientPoints ? "포인트 부족" : "그룹 복사 실패",
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
    mutationFn: async (data: {
      groupId: string;
      name: string;
      description?: string;
      color: string;
      markerIcon: string;
    }) => {
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

