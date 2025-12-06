import { useEffect, useRef } from "react";
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
  const isCreatingRef = useRef(false); // 생성 중 플래그로 중복 실행 방지

  // 개인 메모용 멤버 자동 생성 (비동기 처리로 UI 블로킹 방지)
  useEffect(() => {
    // groups가 로드되고 user가 있을 때만 실행
    // groupsIsFetched 대신 groups.length를 확인하여 더 빠른 반응
    if ((!groupsIsFetched && groups.length === 0) || !user) {
      return;
    }

    // 이미 생성 중이면 무시
    if (isCreatingRef.current) {
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
      // 중복 실행 방지
      if (isCreatingRef.current) {
        return;
      }
      
      isCreatingRef.current = true;
      
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
            // 서버 응답의 response.group에는 members 배열이 없으므로 수동으로 추가해야 함
            // GroupWithMembers 타입 구조에 맞춤
            const newGroup = {
              ...response.group,
              members: [response.member]
            };
            
            if (!oldData) return [newGroup];
            
            // 새로 생성된 그룹을 기존 데이터에 추가
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
      } finally {
        isCreatingRef.current = false;
      }
    };
    
    // 비동기로 실행하여 UI 블로킹 방지
    createPersonalMember();
  }, [
    personalMemberId,
    groups,
    groupsIsFetched,
    user,
    setPersonalMemberId,
    // toast, queryClient, t는 안정적인 참조이므로 의존성에서 제외
  ]);
}

