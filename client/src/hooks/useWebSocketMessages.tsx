import { useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { ToastAction } from "@/components/ui/toast";
import type { MemoWithDetails } from "@shared/schema";

interface UseWebSocketMessagesProps {
  moveToLocation: (lat: number, lng: number, memo?: MemoWithDetails) => void;
  myMemberIds: string[];
}

export function useWebSocketMessages({ moveToLocation, myMemberIds }: UseWebSocketMessagesProps) {
  const { toast } = useToast();
  const { t } = useLanguage();

  // WebSocket for real-time updates
  const handleWebSocketMessage = useCallback(
    (data: any) => {
      if (data.type === "memo_created" || data.type === "memo_deleted" || data.type === "memo_updated") {
        // 즉시 refetch하여 지연 최소화
        queryClient.refetchQueries({ queryKey: ["/api/memos"] });

        if (data.type === "memo_created" && data.memo) {
          // Skip notification if this memo was created by the current user
          if (data.memo.memberId && myMemberIds.includes(data.memo.memberId)) {
            return;
          }
          
          toast({
            title: t.toast.newMemo,
            description: `${data.memo?.buildingName}${t.toast.newMemoDesc}`,
            action: (
              <ToastAction
                altText="위치 보기"
                onClick={() =>
                  moveToLocation(data.memo.latitude, data.memo.longitude, data.memo)
                }
                data-testid="button-view-memo-location"
              >
                위치 보기
              </ToastAction>
            ),
          });
        } else if (data.type === "memo_updated" && data.memo) {
          // Skip notification if this memo was created by the current user
          if (data.memo.memberId && myMemberIds.includes(data.memo.memberId)) {
            return;
          }
          
          toast({
            title: t.toast.memoUpdated,
            description: `${data.memo?.buildingName}${t.toast.memoUpdatedDesc}`,
            action: (
              <ToastAction
                altText="위치 보기"
                onClick={() =>
                  moveToLocation(data.memo.latitude, data.memo.longitude, data.memo)
                }
                data-testid="button-view-memo-location"
              >
                위치 보기
              </ToastAction>
            ),
          });
        }
      } else if (data.type === "group_updated") {
        // 그룹 업데이트 시 즉시 refetch하여 지연 최소화
        queryClient.refetchQueries({ queryKey: ["/api/groups"] });
      }
    },
    [toast, t, moveToLocation, myMemberIds]
  );

  return { handleWebSocketMessage };
}

