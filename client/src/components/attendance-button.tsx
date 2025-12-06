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
  const { data: status, isLoading } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
    // 1분마다 갱신하여 13:00 리셋 시점에 버튼이 생기도록 유도
    refetchInterval: 60000, 
    staleTime: 30000,
  });

  // 출석 체크 요청
  const checkMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/attendance/check", {});
    },
    onSuccess: (data: CheckResponse) => {
      // 포인트 갱신을 위해 유저 정보 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // 출석 상태 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/status"] });
      
      // 토스트 메시지 표시
      toast({
        title: "출석 체크 완료!",
        description: data.message,
        variant: "default", // 초록색 계열이면 좋겠으나 default 사용
      });

      // 버튼 숨기기 애니메이션
      setIsVisible(false);
    },
    onError: (error: any) => {
      toast({
        title: "출석 체크 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (status?.canCheck) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [status]);

  if (isLoading || !status || !isVisible) return null;

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

