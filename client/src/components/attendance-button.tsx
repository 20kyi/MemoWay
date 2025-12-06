import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Check } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";

interface AttendanceStatus {
  canCheck: boolean;
  streak: number;
  lastCheckDate: string | null;
  nextReset: string;
}

interface CheckResponse {
  success: boolean;
  pointsAdded: number;
  streak: number;
  message: string;
}

export function AttendanceButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { layoutTheme } = useLayoutTheme();
  const isCoupleTheme = layoutTheme === "couple-clay";

  // 출석 상태 조회
  // [수정] isLoading일 때 null을 반환하면, 지도 드래그 등으로 인한 리페치 시 버튼이 깜빡이거나 사라질 수 있음
  // 따라서 refetchOnWindowFocus를 끄고, 렌더링 로직에서 isLoading 체크를 제거함
  const { data: status } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
    refetchInterval: 60000, 
    staleTime: 30000,
    refetchOnWindowFocus: false, // 지도 드래그/포커스 변경 시 깜빡임 방지
    refetchOnMount: false,
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/attendance/check");
    },
    onSuccess: (data: CheckResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/status"] });
      
      toast({
        title: t("attendanceChecked", "Attendance Checked!"),
        description: t("attendancePointsEarned", `You earned ${data.pointsAdded} points!`),
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t("error", "Error"),
        description: t("attendanceFailed", "Failed to check attendance"),
        variant: "destructive",
      });
    },
  });

  // [수정] 로컬 state(isVisible) 제거하고 props/data 기반으로 직접 렌더링
  // 불필요한 useEffect 제거하여 렌더링 타이밍 이슈 해결
  const shouldShow = status?.canCheck;

  // 클릭 핸들러: 로그 추가 및 이벤트 전파 중단
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 지도로 클릭 이벤트가 새지 않도록 방지
    console.log("[ATTENDANCE BUTTON] clicked");
    
    if (checkMutation.isPending) return;
    checkMutation.mutate();
  };

  if (!shouldShow) return null;

  return (
    <Button
      onClick={handleClick}
      disabled={checkMutation.isPending}
      // [수정] 레이아웃 디자인을 지도 잠금 버튼과 동일하게 변경
      // - 커플 테마: 60px 원형, 그림자/테두리 적용
      // - 기본 테마: 40px 둥근 사각형 (rounded-lg), 그림자/테두리 적용
      // - 위치: 지도 잠금 버튼에서 5rem 위로 (기본 테마 기준 7rem + 5rem = 12rem)
      className={`
        fixed right-4 z-[9999]
        ${isCoupleTheme 
          ? 'bottom-[15rem] h-[60px] w-[60px] rounded-full' 
          : 'bottom-[12rem] h-10 w-10 rounded-lg'
        }
        shadow-lg transition-all hover:shadow-xl
        bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
        text-white border-2 border-emerald-200/50
        flex items-center justify-center
        transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95
        pointer-events-auto touch-manipulation
      `}
      style={{
        position: 'fixed',
        zIndex: 9999,
        // 커플 테마일 때 추가 스타일 (그림자 등)
        ...(isCoupleTheme ? {
          boxShadow: `
            inset 0 1px 2px rgba(255, 255, 255, 0.5),
            0 4px 8px rgba(240, 120, 150, 0.25),
            0 0 30px rgba(0, 0, 0, 0.10)
          `
        } : {})
      }}
      data-testid="btn-attendance-check"
    >
      {checkMutation.isPending ? (
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <CalendarCheck className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} text-white`} />
      )}
    </Button>
  );
}

