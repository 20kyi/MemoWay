import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Calendar, User, Users, Edit, Trash2, Navigation, X, Plus, ArrowLeft, Star, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ko, enUS, zhCN, ja } from "date-fns/locale";
import type { MemoWithDetails } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";
import { StarRating } from "@/components/ui/star-rating";

interface MemoDetailSheetProps {
  memo: MemoWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onNavigateToLocation?: (lat: number, lng: number) => void;
  onAddNewMemo?: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
  onCopy?: (memoId: string) => void;
  currentUserId?: string; // ⚠️ 추가: 현재 사용자 ID (다른 사용자 메모 판별용)
}

export function MemoDetailSheet({
  memo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onNavigateToLocation,
  onAddNewMemo,
  onCopy,
  currentUserId,
}: MemoDetailSheetProps) {
  const { t, language } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [pendingCopyMemoId, setPendingCopyMemoId] = useState<string | null>(null);

  const dateLocale = language === "ko" ? ko : language === "en" ? enUS : language === "zh" ? zhCN : ja;

  // 스와이프 제스처 처리 (모바일에서 아래로 스와이프하여 닫기)
  useEffect(() => {
    if (!open) return;
    
    // SheetContent의 실제 DOM 요소 찾기 (약간의 딜레이를 두어 DOM이 완전히 렌더링된 후 찾기)
    const findSheetContent = () => {
      const content = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
      return content;
    };
    
    // DOM이 렌더링될 때까지 대기
    const timeoutId = setTimeout(() => {
      const sheetContent = findSheetContent();
      if (!sheetContent) return;

      let startY = 0;
      let startTime = 0;
      let isDragging = false;
      let initialScrollTop = 0;

      const handleTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isDragging = false;
        
        // 스크롤 가능한 영역 찾기
        const scrollableArea = sheetContent.querySelector('[class*="overflow-y-auto"], [class*="overflow-y-scroll"]') as HTMLElement;
        if (scrollableArea) {
          initialScrollTop = scrollableArea.scrollTop;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!startY) return;
        
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        // 스크롤 가능한 영역 확인
        const scrollableArea = sheetContent.querySelector('[class*="overflow-y-auto"], [class*="overflow-y-scroll"]') as HTMLElement;
        
        // 아래로 스와이프만 감지 (양수 = 아래로)
        if (deltaY > 0) {
          // 스크롤 가능한 영역이 있고 스크롤이 맨 위가 아니면 스와이프 무시
          if (scrollableArea && scrollableArea.scrollTop > 0) {
            // 스크롤이 위로 이동하면 스와이프 취소
            if (scrollableArea.scrollTop < initialScrollTop) {
              startY = 0;
              return;
            }
            // 스크롤이 가능한 상태면 스와이프 무시
            return;
          }
          
          isDragging = true;
          
          // Sheet를 아래로 이동시키는 시각적 피드백
          const maxDrag = 200;
          const dragRatio = Math.min(deltaY / maxDrag, 1);
          sheetContent.style.transform = `translateY(${deltaY}px)`;
          sheetContent.style.transition = 'none';
          
          // 배경 투명도 조절
          const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
          if (overlay) {
            overlay.style.opacity = String(0.8 * (1 - dragRatio * 0.5));
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (!startY) return;
        
        const currentY = e.changedTouches[0].clientY;
        const deltaY = currentY - startY;
        const deltaTime = Date.now() - startTime;
        const velocity = deltaTime > 0 ? deltaY / deltaTime : 0;
        
        // 드래그 거리 초기화
        sheetContent.style.transform = '';
        sheetContent.style.transition = '';
        
        const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
        if (overlay) {
          overlay.style.opacity = '';
        }
        
        // 스와이프 감지 조건: 아래로 100px 이상 또는 빠른 속도로 아래로 스와이프
        if (isDragging && (deltaY > 100 || (deltaY > 50 && velocity > 0.3))) {
          onOpenChange(false);
        }
        
        startY = 0;
        isDragging = false;
      };

      sheetContent.addEventListener('touchstart', handleTouchStart, { passive: true });
      sheetContent.addEventListener('touchmove', handleTouchMove, { passive: true });
      sheetContent.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        sheetContent.removeEventListener('touchstart', handleTouchStart);
        sheetContent.removeEventListener('touchmove', handleTouchMove);
        sheetContent.removeEventListener('touchend', handleTouchEnd);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [open, onOpenChange]);

  if (!memo) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={true}>
      <SheetContent 
        side="bottom" 
        className="min-h-[50vh] max-h-[90vh] h-auto rounded-t-2xl sm:rounded-t-3xl p-0 flex flex-col bg-gradient-to-br from-blue-50/30 to-white touch-pan-y"
      >
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col h-full min-h-[50vh] relative w-full">
            {/* 드래그 핸들 */}
            <div className="w-12 h-1 bg-indigo-300/50 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" />

            {/* 헤더 영역 */}
            <div className="px-4 sm:px-5 pt-2 pb-4 flex-shrink-0">
              <SheetHeader className="pr-12 sm:pr-14">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-sky-600 dark:text-sky-500 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20 -ml-2"
                    data-testid="button-back-memo-detail"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:w-5" />
                  </Button>
                  <SheetTitle className="text-lg sm:text-xl md:text-2xl font-bold text-sky-600 dark:text-sky-500 truncate flex-1" data-testid="text-memo-title">
                    {memo.buildingName}
                  </SheetTitle>
                  <div className="flex items-center ml-2 gap-1">
                    <StarRating value={(memo as any).rating || 0} readOnly size="sm" />
                    {(memo as any).rating > 0 && (
                      <span className="text-sm text-muted-foreground font-medium">
                        {(memo as any).rating}
                      </span>
                    )}
                  </div>
                  {onNavigateToLocation && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-sky-600 dark:text-sky-500 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20"
                      onClick={() => {
                        onNavigateToLocation(memo.latitude, memo.longitude);
                        onOpenChange(false);
                      }}
                      data-testid="button-navigate-to-location"
                    >
                      <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate flex-1" data-testid="text-memo-address">{memo.address}</span>
                </div>
              </SheetHeader>
            </div>

            {/* 내용 영역 - 스크롤 가능 */}
            <div className="px-4 sm:px-5 overflow-y-auto flex-1 min-h-0 flex-grow">
              <div className="space-y-4 pb-4">
                {/* 사진 섹션 */}
                {memo.photos && memo.photos.length > 0 && (
                  <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 backdrop-blur-sm border border-indigo-200/50 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                        {t.memoDetail.photos}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {memo.photos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            className="relative rounded-xl sm:rounded-2xl border border-indigo-200/50 bg-white/50 p-1.5 sm:p-2 hover:bg-indigo-50/50 active:bg-indigo-50 transition-all hover:shadow-md"
                            onClick={() => setSelectedPhoto(photo.url)}
                            data-testid={`container-photo-${photo.id}`}
                          >
                            <img
                              src={photo.url}
                              alt={t.memoDetail.photos}
                              className="w-full h-20 sm:h-28 object-cover rounded-lg sm:rounded-xl"
                              data-testid={`img-photo-${photo.id}`}
                            />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 메모 내용 섹션 */}
                <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
                      {t.memoDetail.content}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p 
                      className="leading-relaxed whitespace-pre-wrap text-sm sm:text-base break-words text-foreground" 
                      style={{ fontSize: 'var(--font-size-base, 14px)' }}
                      data-testid="text-memo-content"
                    >
                      {memo.content}
                    </p>
                  </CardContent>
                </Card>

                {/* 메타데이터 섹션 */}
                <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-50/50 via-white to-slate-50/30 backdrop-blur-sm border border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">{t.memoDetail.info}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.author}</p>
                        <p className="font-semibold text-sm sm:text-base text-foreground truncate" data-testid="text-memo-author">{memo.member.name}</p>
                      </div>
                    </div>

                    {memo.group && memo.editorMember && memo.editorMember.id !== memo.member.id && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-200 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.editor}</p>
                          <p className="font-semibold text-sm sm:text-base text-foreground truncate" data-testid="text-memo-editor">{memo.editorMember.name}</p>
                        </div>
                      </div>
                    )}

                    {memo.group && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.group}</p>
                          <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-0.5 mt-1" data-testid="badge-memo-group">
                            {memo.group.name}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.created}</p>
                        <p className="text-sm sm:text-base text-foreground truncate" data-testid="text-memo-created">
                          {format(new Date(memo.createdAt), "PPP p", { locale: dateLocale })}
                        </p>
                      </div>
                    </div>

                    {memo.updatedAt && new Date(memo.updatedAt).getTime() !== new Date(memo.createdAt).getTime() && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.updated}</p>
                          <p className="text-sm sm:text-base text-foreground truncate" data-testid="text-memo-updated">
                            {format(new Date(memo.updatedAt), "PPP p", { locale: dateLocale })}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 하단 고정 영역 - 액션 버튼들 */}
            {(onAddNewMemo || (currentUserId && memo.member.userId !== currentUserId ? !!onCopy : true)) && (
              <div className="mt-auto flex-shrink-0 px-4 sm:px-5 py-4 border-t border-indigo-200/50 bg-gradient-to-br from-indigo-50/30 to-white">
                <div className="flex flex-nowrap gap-1.5 sm:gap-3">
                  {onAddNewMemo && (
                    <Button
                      size="lg"
                      onClick={() => {
                        onAddNewMemo({
                          lat: memo.latitude,
                          lng: memo.longitude,
                          address: memo.address,
                          buildingName: memo.buildingName,
                        });
                        onOpenChange(false);
                      }}
                      className="h-11 sm:h-12 text-xs sm:text-base font-medium bg-gradient-to-br from-sky-200 to-indigo-200 hover:from-sky-300 hover:to-indigo-300 border-2 border-sky-300/60 text-sky-700 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3"
                      data-testid="button-add-memo"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="whitespace-nowrap hidden sm:inline">{t.memoDetail.addMemoHere}</span>
                      <span className="whitespace-nowrap sm:hidden">{t.common.add}</span>
                    </Button>
                  )}
                  {/* ⚠️ 중요: 다른 사용자가 쓴 메모인지 확인 */}
                  {currentUserId && memo.member.userId !== currentUserId ? (
                    // 다른 사용자가 쓴 메모: 복사 버튼만 표시
                    onCopy && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          setPendingCopyMemoId(memo.id);
                          setCopyDialogOpen(true);
                        }}
                        className="h-11 sm:h-12 text-xs sm:text-base font-medium border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3"
                        data-testid="button-copy-memo"
                      >
                        <Copy className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="whitespace-nowrap">{t.common.copy || "복사"}</span>
                      </Button>
                    )
                  ) : (
                    // 내가 쓴 메모: 편집 및 삭제 버튼 표시
                    <>
                      {onCopy && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => {
                            onCopy(memo.id);
                            onOpenChange(false);
                          }}
                          className="h-11 sm:h-12 text-xs sm:text-base font-medium border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3"
                          data-testid="button-copy-memo"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap">{t.common.copy || "복사"}</span>
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => {
                            onEdit(memo.id);
                            onOpenChange(false);
                          }}
                          className="h-11 sm:h-12 text-xs sm:text-base font-medium border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3"
                          data-testid="button-edit-memo"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap">{t.common.edit}</span>
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="lg"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(t.memoDetail.confirmDelete)) {
                              onDelete(memo.id);
                              onOpenChange(false);
                            }
                          }}
                          className="h-11 sm:h-12 text-xs sm:text-base font-medium bg-gradient-to-br from-pink-200 to-rose-200 hover:from-pink-300 hover:to-rose-300 border-2 border-pink-300/60 text-rose-700 flex-1 min-w-0 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3"
                          data-testid="button-delete-memo"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap">{t.common.delete}</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>

    <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
      <DialogContent className="max-w-screen-lg p-0 bg-black/95">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
            data-testid="button-close-photo"
          >
            <X className="w-6 h-6" />
          </Button>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="원본 사진"
              className="w-full h-auto max-h-[90vh] object-contain"
              data-testid="img-photo-fullsize"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* 타인 메모 복사 확인 다이얼로그 */}
    <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
      <AlertDialogContent
        data-testid="dialog-copy-memo"
        className="max-w-sm rounded-3xl border-0 bg-gradient-to-br from-white/95 to-white/90 dark:from-zinc-900/95 dark:to-zinc-900/90 backdrop-blur-xl shadow-2xl"
      >
        <AlertDialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Copy className="h-8 w-8 text-white" />
          </div>
          <AlertDialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {t.common.copy || "복사"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-gray-600 dark:text-gray-400 px-4">
            {t.memoDetail.confirmCopy}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 sm:gap-3 mt-2">
          <AlertDialogCancel
            data-testid="button-cancel-copy"
            className="flex-1 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-700 font-semibold text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg transition-all duration-200 mt-0"
          >
            {t.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-confirm-copy"
            onClick={() => {
              if (pendingCopyMemoId && onCopy) {
                onCopy(pendingCopyMemoId);
                onOpenChange(false);
              }
              setCopyDialogOpen(false);
              setPendingCopyMemoId(null);
            }}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {t.common.copy || "복사"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
