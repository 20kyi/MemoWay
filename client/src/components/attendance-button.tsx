import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Check, X, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 출석 상태 조회
  const { data: status } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
    refetchInterval: 60000, 
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/attendance/check");
    },
    onSuccess: (data: CheckResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); // 포인트 업데이트
      
      toast({
        title: t.attendance.checked,
        description: t.attendance.pointsEarned.replace("{points}", data.pointsAdded.toString()),
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: t.toast.locationError, // "Error"
        description: t.attendance.failed,
        variant: "destructive",
      });
    },
  });

  // 버튼 노출 여부 (출석 가능 상태일 때만)
  // 팝업 내에서는 이미 출석했더라도 현황을 볼 수 있어야 하므로, 
  // 버튼 자체는 '출석 가능' 상태일 때만 보이게 하거나, 
  // 기획 의도(항상 보이게 할지, 출석 안했을 때만 보이게 할지)에 따라 다르지만
  // 기존 로직(shouldShow = status?.canCheck)을 유지하되, 
  // 팝업을 통해 출석 후에는 버튼이 사라지는 흐름을 유지.
  const shouldShow = status?.canCheck;

  // 클릭 핸들러: 다이얼로그 오픈
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("[ATTENDANCE BUTTON] clicked - opening dialog");
    setIsDialogOpen(true);
  };

  // 출석하기 액션 (다이얼로그 내부)
  const handleCheckAttendance = async () => {
    if (checkMutation.isPending) return;
    await checkMutation.mutateAsync();
    // 출석 성공 후 다이얼로그 닫기 (약간의 딜레이 후)
    setTimeout(() => {
      setIsDialogOpen(false);
    }, 1500);
  };

  if (!shouldShow && !isDialogOpen) return null;

  // 출석 현황 계산 (1일차 ~ 7일차)
  // streak가 0이면 1일차 도전 중
  // streak가 1이면 2일차 도전 중 (아직 안찍었으면 1일 완료, 2일차 대기)
  // streak값은 '연속 출석 일수'이므로, 
  // canCheck가 true이면: 현재 streak일 완료, 오늘(streak+1일차) 도전
  // canCheck가 false이면: 오늘(streak일차) 완료
  const currentStreak = status?.streak || 0;
  const currentDay = status?.canCheck ? (currentStreak % 7) + 1 : ((currentStreak - 1) % 7) + 1;
  
  // 1~7일차 배열 생성
  const days = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <>
      {shouldShow && (
        <Button
          onClick={handleClick}
          // [수정] 위치 20rem 상향 조정
          // 기존: bottom-[12rem]/[15rem] -> +20rem -> bottom-[32rem]/[35rem]
          // [수정] 색상: 상점(Store) 테마와 동일하게 (Purple/Pink Gradient)
          className={`
            fixed right-4 z-[9999]
            ${isCoupleTheme 
              ? 'bottom-[35rem] h-[60px] w-[60px] rounded-full' 
              : 'bottom-[32rem] h-10 w-10 rounded-lg'
            }
            shadow-lg transition-all hover:shadow-xl
            bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600
            text-white border-2 border-purple-200/50
            flex items-center justify-center
            transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95
            pointer-events-auto touch-manipulation
          `}
          style={{
            position: 'fixed',
            zIndex: 9999,
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
          <CalendarCheck className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} text-white`} />
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-purple-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {t.attendance.daily}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="flex justify-between items-center mb-8 px-2">
              {days.map((day) => {
                const isCompleted = day < currentDay || (day === currentDay && !status?.canCheck);
                const isToday = day === currentDay;
                
                return (
                  <div key={day} className="flex flex-col items-center gap-2 relative">
                    {/* 연결선 (마지막 아이템 제외) */}
                    {day < 7 && (
                      <div 
                        className={cn(
                          "absolute top-4 left-1/2 w-[calc(100%+1.5rem)] h-1 -z-10",
                          isCompleted ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-gray-100"
                        )} 
                      />
                    )}
                    
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300",
                        isCompleted 
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 border-transparent text-white shadow-md scale-100" 
                          : isToday
                            ? "bg-white border-purple-500 text-purple-600 shadow-lg scale-110 animate-pulse"
                            : "bg-gray-50 border-gray-200 text-gray-400"
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : day}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      isToday ? "text-purple-600" : "text-gray-400"
                    )}>
                      {t.attendance.streak.replace("{day}", day.toString())}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-purple-50 rounded-xl p-4 text-center mb-6">
              <p className="text-purple-900 font-medium mb-1">
                {status?.canCheck 
                  ? t.attendance.challenge.replace("{day}", currentDay.toString())
                  : t.attendance.todayCompleted}
              </p>
              <p className="text-sm text-purple-600/80">
                {t.attendance.desc}
              </p>
            </div>

            <Button 
              onClick={handleCheckAttendance}
              disabled={!status?.canCheck || checkMutation.isPending}
              className={cn(
                "w-full h-12 text-lg font-bold rounded-xl shadow-lg transition-all",
                status?.canCheck
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-purple-500/25 hover:scale-[1.02]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {checkMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : status?.canCheck ? (
                t.attendance.check
              ) : (
                t.attendance.completed
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
