import { useState, useRef, useEffect, useMemo } from "react";
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
import { MapPin, Calendar, User, Users, Edit, Trash2, Navigation, X, Plus, ArrowLeft, Star, Copy, MoreVertical } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  groups?: Array<{ id: string; members: Array<{ userId?: string; role: string; canEditGroupMemos: boolean }> }>; // 그룹 정보 (관리자 권한 체크용)
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
  groups = [],
}: MemoDetailSheetProps) {
  const { t, language } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [pendingCopyMemoId, setPendingCopyMemoId] = useState<string | null>(null);

  // 관리자 권한 체크 함수 (관리자 또는 방장)
  const isAdmin = useMemo(() => {
    if (!memo || !currentUserId || !memo.groupId) return false;
    const group = groups.find(g => g.id === memo.groupId);
    if (!group) return false;
    const currentMember = group.members.find(m => m.userId === currentUserId);
    return currentMember?.canEditGroupMemos === true || currentMember?.role === 'leader';
  }, [memo, currentUserId, groups]);

  // 방장 권한 체크 함수
  const isLeader = useMemo(() => {
    if (!memo || !currentUserId || !memo.groupId) return false;
    const group = groups.find(g => g.id === memo.groupId);
    if (!group) return false;
    const currentMember = group.members.find(m => m.userId === currentUserId);
    return currentMember?.role === 'leader';
  }, [memo, currentUserId, groups]);

  const dateLocale = language === "ko" ? ko : language === "en" ? enUS : language === "zh" ? zhCN : ja;

  // Android WebView에서 모달이 보이도록 강제 스타일 적용
  useEffect(() => {
    if (!open) return;
    
    // Android WebView 감지
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    
    if (isAndroid) {
      // 모달이 열릴 때 강제로 스타일 적용
      const applyAndroidStyles = () => {
        const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
        const content = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
        
        if (overlay) {
          overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 2147483646 !important;
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            pointer-events: auto !important;
          `;
        }
        
        if (content) {
          content.style.cssText = `
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            z-index: 2147483647 !important;
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            pointer-events: auto !important;
          `;
        }
      };
      
      // 즉시 적용
      applyAndroidStyles();
      
      // DOM이 렌더링될 때까지 대기 후 재적용
      const timeoutId = setTimeout(applyAndroidStyles, 100);
      const timeoutId2 = setTimeout(applyAndroidStyles, 300);
      const timeoutId3 = setTimeout(applyAndroidStyles, 500);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
  }, [open]);

  // 모바일에서 모달이 열릴 때 키보드가 자동으로 나오지 않도록 focus 제거
  useEffect(() => {
    if (!open) return;
    
    // 모바일 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (typeof window !== 'undefined' && window.innerWidth < 768);
    
    if (isMobile) {
      // 모든 input, textarea에서 focus 제거
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        activeElement.blur();
      }
      
      // body에 focus를 이동하여 키보드가 나오지 않도록 함
      if (document.body) {
        // body는 focusable이 아니므로, 대신 다른 방법 사용
        const dummyElement = document.createElement('div');
        dummyElement.setAttribute('tabindex', '-1');
        dummyElement.style.position = 'absolute';
        dummyElement.style.left = '-9999px';
        dummyElement.style.opacity = '0';
        document.body.appendChild(dummyElement);
        dummyElement.focus();
        
        // 잠시 후 제거
        setTimeout(() => {
          if (document.body.contains(dummyElement)) {
            document.body.removeChild(dummyElement);
          }
        }, 100);
      }
      
      // 추가 안전장치: 모든 input/textarea에 blur 이벤트 강제 실행
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach((input) => {
        if (document.activeElement === input) {
          (input as HTMLElement).blur();
        }
      });
    }
  }, [open]);

  // 스와이프 제스처 처리 (모바일에서 아래로 스와이프하여 닫기)
  useEffect(() => {
    if (!open) return;
    
    let cleanup: (() => void) | null = null;
    let observer: MutationObserver | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // setupTouchHandlers 함수 정의
    const setupTouchHandlers = (sheetContent: HTMLElement) => {
      // 디버깅: 모달 DOM 존재 여부 및 z-index 확인
      const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
      const computedContentStyle = window.getComputedStyle(sheetContent);
      const computedOverlayStyle = overlay ? window.getComputedStyle(overlay) : null;
      const contentRect = sheetContent.getBoundingClientRect();
      
      console.log('[MemoDetailSheet] ✅ 모달 디버깅 정보:', {
        contentExists: !!sheetContent,
        overlayExists: !!overlay,
        contentZIndex: computedContentStyle.zIndex,
        overlayZIndex: computedOverlayStyle?.zIndex,
        contentPosition: computedContentStyle.position,
        overlayPosition: computedOverlayStyle?.position,
        contentBoundingBox: {
          top: contentRect.top,
          left: contentRect.left,
          width: contentRect.width,
          height: contentRect.height,
          visible: contentRect.width > 0 && contentRect.height > 0,
        },
        contentParent: sheetContent.parentElement?.tagName,
        contentInBody: document.body.contains(sheetContent),
        stackingContext: {
          transform: computedContentStyle.transform,
          filter: computedContentStyle.filter,
          opacity: computedContentStyle.opacity,
          willChange: computedContentStyle.willChange,
        },
      });
      
      // z-index가 올바르게 설정되지 않은 경우 경고
      const contentZIndex = parseInt(computedContentStyle.zIndex || '0', 10);
      const overlayZIndex = overlay ? parseInt(computedOverlayStyle?.zIndex || '0', 10) : 0;
      
      if (contentZIndex <= overlayZIndex) {
        console.warn('[MemoDetailSheet] ⚠️ z-index 문제 감지: 모달 컨텐츠의 z-index가 오버레이보다 낮거나 같습니다.', {
          contentZIndex,
          overlayZIndex,
        });
      }
      
      // 모달이 보이지 않는 경우 추가 진단
      if (contentRect.width === 0 || contentRect.height === 0) {
        console.warn('[MemoDetailSheet] ⚠️ 모달 컨텐츠가 보이지 않습니다. bounding box가 0입니다.');
      }

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

      cleanup = () => {
        sheetContent.removeEventListener('touchstart', handleTouchStart);
        sheetContent.removeEventListener('touchmove', handleTouchMove);
        sheetContent.removeEventListener('touchend', handleTouchEnd);
      };
    };
    
    // MutationObserver를 사용하여 DOM이 추가될 때 감지
    observer = new MutationObserver((mutations, obs) => {
      const content = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
      if (content) {
        obs.disconnect();
        observer = null;
        setupTouchHandlers(content);
      }
    });

    // body를 관찰하여 DOM 변경 감지
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // DOM이 렌더링될 때까지 대기하고 재시도 (fallback)
    timeoutId = setTimeout(() => {
      const content = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
      
      // 이미 observer에서 처리되었으면 중복 처리 방지
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      
      if (content) {
        setupTouchHandlers(content);
      } else {
        // DOM을 찾지 못한 경우 경고만 출력 (에러가 아닌 경고로 변경)
        console.warn('[MemoDetailSheet] ⚠️ 모달 컨텐츠 DOM 요소를 찾을 수 없습니다. 스와이프 제스처가 작동하지 않을 수 있습니다.');
      }
    }, 500); // 500ms로 증가하여 DOM 렌더링 대기

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [open, onOpenChange]);

  // memo가 없어도 open이 true면 모달을 렌더링하되, 내용은 로딩 상태로 표시
  // 이렇게 하면 상태 업데이트 순서와 관계없이 모달이 열릴 수 있음
  const shouldRender = open; // memo가 없어도 open이 true면 렌더링

  if (!shouldRender) return null;

  return (
    <>
      <Sheet 
        open={open} 
        onOpenChange={onOpenChange} 
        modal={true}
        onOpenAutoFocus={(e) => {
          // 모바일에서 자동 focus를 방지하여 키보드가 나오지 않도록 함
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           (typeof window !== 'undefined' && window.innerWidth < 768);
          if (isMobile) {
            e.preventDefault();
          }
        }}
      >
      <SheetContent 
        side="bottom" 
        className="min-h-[50vh] max-h-[90vh] h-auto rounded-t-2xl sm:rounded-t-3xl p-0 flex flex-col bg-white touch-pan-y relative"
        style={{ backgroundColor: 'rgba(239, 246, 255, 0.98)' }}
      >
        <TooltipProvider delayDuration={300}>
          {!memo ? (
            // memo가 아직 로드되지 않은 경우 로딩 상태 표시
            <div className="flex flex-col h-full min-h-[50vh] relative w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">메모를 불러오는 중...</p>
            </div>
          ) : (
          <div className="flex flex-col h-full min-h-[50vh] relative w-full bg-gradient-to-br from-blue-50 via-white to-blue-50">
            {/* 드래그 핸들 */}
            <div className="w-12 h-1 bg-indigo-300/50 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" />

            {/* 헤더 영역 */}
            <div className="px-4 sm:px-5 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-4 flex-shrink-0">
              <SheetHeader>
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 -ml-2"
                    data-testid="button-back-memo-detail"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:w-5" />
                  </Button>
                  <SheetTitle 
                    className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-white inline-block max-w-[14ch] overflow-hidden text-ellipsis whitespace-nowrap text-left cursor-pointer hover:opacity-70 transition-opacity" 
                    data-testid="text-memo-title"
                    onClick={() => {
                      if (onNavigateToLocation) {
                        onNavigateToLocation(memo.latitude, memo.longitude);
                        onOpenChange(false);
                      }
                    }}
                  >
                    {memo.buildingName}
                  </SheetTitle>
                  <div className="flex items-center ml-auto gap-1 flex-shrink-0">
                    <StarRating value={(memo as any).rating || 0} readOnly size="sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate text-left" data-testid="text-memo-address">{memo.address}</span>
                </div>
              </SheetHeader>
            </div>

            {/* 내용 영역 - 스크롤 가능 */}
            <div className="px-4 sm:px-5 overflow-y-auto flex-1 min-h-0 flex-grow">
              <div className="space-y-4 pb-4">
                {/* 메모 내용 섹션 */}
                <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 backdrop-blur-sm border border-indigo-200/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                        {t.memoDetail.content}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                            data-testid="button-info-menu"
                          >
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 sm:w-80">
                          <div className="p-3 space-y-3">
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
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                        {memo.photos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            className="relative rounded-xl sm:rounded-2xl border border-indigo-200/50 bg-white/50 p-1.5 sm:p-2 hover:bg-indigo-50/50 active:bg-indigo-50 transition-all hover:shadow-md flex-shrink-0"
                            onClick={() => setSelectedPhoto(photo.url)}
                            data-testid={`container-photo-${photo.id}`}
                          >
                            <img
                              src={photo.url}
                              alt={t.memoDetail.photos}
                              className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg sm:rounded-xl"
                              data-testid={`img-photo-${photo.id}`}
                            />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* 하단 고정 영역 - 액션 버튼들 */}
            {(onEdit || onDelete || (currentUserId && memo.member.userId !== currentUserId ? !!onCopy : false)) && (
              <div className="mt-auto flex-shrink-0 px-4 sm:px-5 py-4 border-t border-indigo-200/50 bg-gradient-to-br from-indigo-50/30 to-white">
                <div className="flex flex-nowrap gap-1.5 sm:gap-3">
                  {/* ⚠️ 중요: 다른 사용자가 쓴 메모인지 확인 */}
                  {currentUserId && memo.member.userId !== currentUserId ? (
                    // 다른 사용자가 쓴 메모: 관리자인 경우 복사/편집/삭제 버튼, 아니면 복사 버튼만
                    <>
                      {onCopy && (
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
                      )}
                      {/* 방장인 경우에만 삭제 버튼 표시 - 왼쪽 */}
                      {isLeader && onDelete && (
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
                      {/* 관리자 또는 방장인 경우 편집 버튼 표시 - 오른쪽 */}
                      {isAdmin && onEdit && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => {
                            onEdit(memo.id);
                            onOpenChange(false);
                          }}
                          className="h-11 sm:h-12 text-xs sm:text-base font-medium border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 ml-auto"
                          data-testid="button-edit-memo"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap">{t.common.edit}</span>
                        </Button>
                      )}
                    </>
                  ) : (
                    // 내가 쓴 메모: 삭제(왼쪽) 및 편집(오른쪽) 버튼 표시
                    <>
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
                      {onEdit && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => {
                            onEdit(memo.id);
                            onOpenChange(false);
                          }}
                          className="h-11 sm:h-12 text-xs sm:text-base font-medium border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 ml-auto"
                          data-testid="button-edit-memo"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap">{t.common.edit}</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 플로팅 새 메모 추가 버튼 */}
            {onAddNewMemo && open && memo && (
              <div className="absolute bottom-[5.5rem] right-4 z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={() => {
                        onAddNewMemo({
                          lat: memo.latitude,
                          lng: memo.longitude,
                          address: memo.address,
                          buildingName: memo.buildingName,
                        });
                        onOpenChange(false);
                      }}
                      className="h-10 w-10 rounded-lg shadow-md bg-primary/90 hover:bg-primary border border-primary/20 backdrop-blur-sm transition-all hover:shadow-lg"
                      data-testid="button-add-memo-floating"
                    >
                      <Plus className="h-5 w-5 text-primary-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{t.memoDetail.addMemoHere || "새 메모 추가"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          )}
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
