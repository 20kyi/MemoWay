import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Check } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

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
  const [isVisible, setIsVisible] = useState(false);

  // 출석 상태 조회
  const { data: status, isLoading, error } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
    // 1분마다 갱신하여 13:00 리셋 시점에 버튼이 생기도록 유도
    refetchInterval: 60000, 
    staleTime: 30000,
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
      
      setIsVisible(false);
    },
    onError: (error) => {
      toast({
        title: t("error", "Error"),
        description: t("attendanceFailed", "Failed to check attendance"),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    console.log("[AttendanceButton] Status:", status, "Loading:", isLoading, "Error:", error);
    if (error) {
      console.error("[AttendanceButton] API Error:", error);
    }
    
    if (status?.canCheck) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [status, isLoading, error]);

  // 디버깅용: 에러가 있거나 로딩 중이어도 강제로 보여주기 위한 임시 코드 (테스트 후 삭제)
  // if (isLoading) return null; 
  
  if (isLoading) return null;
  
  // 에러 발생 시에도 null 반환 (콘솔에는 찍힘)
  if (error) return null;
  
  if (!status || !isVisible) return null;

  return (
    <Button
      onClick={() => checkMutation.mutate()}
      disabled={checkMutation.isPending}
      className={`
        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[20000]
        rounded-full shadow-lg
        bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
        text-white border-2 border-emerald-200/50
        w-16 h-16 sm:w-auto sm:h-14 sm:px-6
        flex items-center justify-center gap-2
        transition-all duration-500 ease-in-out transform hover:scale-110 active:scale-95
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}
      `}
      data-testid="btn-attendance-check"
    >
      {checkMutation.isPending ? (
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <CalendarCheck className="w-6 h-6" />
          <span className="hidden sm:inline font-bold text-lg">출석체크</span>
        </>
      )}
    </Button>
  );
}

