import { useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import type { GroupWithMembers } from "@shared/schema";

interface UsePersonalMemberProps {
  personalMemberId: string | null;
  setPersonalMemberId: (id: string | null) => void;
  groups: GroupWithMembers[];
  groupsIsFetched: boolean;
  user: any;
}

export function usePersonalMember({
  personalMemberId,
  setPersonalMemberId,
  groups,
  groupsIsFetched,
  user,
}: UsePersonalMemberProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  // 개인 메모용 멤버 자동 생성 (비동기 처리로 UI 블로킹 방지)
  useEffect(() => {
    // groups 쿼리가 완료될 때까지 대기
    if (!groupsIsFetched || !user) {
      return;
    }

    // 이미 개인 메모 그룹이 있는지 확인
    const existingPersonalGroup = groups.find((g) => g.name === "개인 메모");
    if (existingPersonalGroup && existingPersonalGroup.members.length > 0) {
      // 현재 사용자의 멤버 찾기
      const currentUserId = (user as any).id;
      const myMember = existingPersonalGroup.members.find(
        (m) => m.userId === currentUserId
      );

      if (myMember) {
        // 현재 personalMemberId가 내 멤버 ID와 다르면 업데이트
        if (!personalMemberId || personalMemberId !== myMember.id) {
          console.log("개인 메모 멤버 ID 업데이트:", myMember.id);
          setPersonalMemberId(myMember.id);
          localStorage.setItem("personalMemberId", myMember.id);
        }
        return;
      }
    }

    // 개인 메모 그룹이 없거나 내 멤버가 없으면 생성 (비동기로 처리하여 UI 블로킹 방지)
    const createPersonalMember = async () => {
      try {
        const response = await apiRequest("POST", "/api/groups", {
          name: "개인 메모",
          memberName: "나",
        });
        if (response.member?.id) {
          console.log("개인 메모 멤버 생성 완료:", response.member.id);
          setPersonalMemberId(response.member.id);
          localStorage.setItem("personalMemberId", response.member.id);
          // groups 쿼리를 무효화하지 않고 setQueryData로 직접 업데이트하여 재요청 방지
          queryClient.setQueryData<typeof groups>(["/api/groups"], (oldData) => {
            if (!oldData) return oldData;
            // 새로 생성된 그룹을 기존 데이터에 추가
            const newGroup = response.group;
            if (newGroup && !oldData.some((g) => g.id === newGroup.id)) {
              return [...oldData, newGroup];
            }
            return oldData;
          });
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
    
    // 비동기로 실행하여 UI 블로킹 방지
    createPersonalMember();
  }, [
    personalMemberId,
    groups,
    groupsIsFetched,
    user,
    toast,
    queryClient,
    t,
    setPersonalMemberId,
  ]);
}

