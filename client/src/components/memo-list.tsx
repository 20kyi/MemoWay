import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Heart, Plane, UtensilsCrossed, Coffee, ShoppingBag, Dumbbell, Briefcase, MapPin, ChevronDown, X, Star, Users, User, Search, ArrowRight, Check, Calendar, Copy, Coins, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ko, enUS, zhCN, ja } from "date-fns/locale";
import type { MemoWithDetails, MarkerIconType } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

import { StarRating } from "@/components/ui/star-rating";

interface Group {
  id: string;
  name: string;
  color: string;
  members?: Array<{ userId?: string; role: string; canEditGroupMemos: boolean }>;
}

type SavedMap = {
  id: string;
  name: string;
  category: string;
  color: string;
  memoIds: string[];
  createdAt: Date;
};

interface MemoListProps {
  memos: MemoWithDetails[];
  groups?: Group[];
  savedMaps?: SavedMap[];
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onBulkDelete?: (memoIds: string[]) => void;
  onBulkCopy?: (memoIds: string[]) => void;
  onCopy?: (memoId: string) => void; // ⚠️ 추가: 개별 메모 복사 핸들러
  onMemoClick: (memoId: string) => void;
  onSetMainMemo?: (memoId: string) => void;
  onMoveToGroup?: (memoIds: string[], groupId: string) => void;
  onDeleteSavedMap?: (mapId: string) => void;
  hideHeader?: boolean;
  hideFilters?: boolean;
  showAuthorTab?: boolean;
  currentUserId?: string;
  externalSearchQuery?: string; // 외부에서 전달받는 검색어 (그룹 메모 뷰용)
  userPoints?: number; // 사용자 포인트 (타인 메모 복사 확인 팝업용)
}

const categoryIcons: Record<MarkerIconType, any> = {
  default: MapPin,
  travel: Plane,
  love: Heart,
  food: UtensilsCrossed,
  cafe: Coffee,
  shopping: ShoppingBag,
  sport: Dumbbell,
  work: Briefcase,
};

export function MemoList({ memos, groups = [], savedMaps = [], onEdit, onDelete, onBulkDelete, onBulkCopy, onCopy, onMemoClick, onSetMainMemo, onMoveToGroup, onDeleteSavedMap, hideHeader = false, hideFilters = false, showAuthorTab = false, currentUserId, externalSearchQuery, userPoints = 0 }: MemoListProps) {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<MarkerIconType | "all">("all");
  const [selectedGroup, setSelectedGroup] = useState<string | "all">("all");
  const [authorTab, setAuthorTab] = useState<"mine" | "others">("mine");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMemoIds, setSelectedMemoIds] = useState<Set<string>>(new Set());
  const [moveToGroupDialogOpen, setMoveToGroupDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [pendingCopyMemoId, setPendingCopyMemoId] = useState<string | null>(null);
  const [bulkCopyDialogOpen, setBulkCopyDialogOpen] = useState(false);
  const [pendingBulkCopyMemoIds, setPendingBulkCopyMemoIds] = useState<string[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const justEnteredSelectionModeRef = useRef<boolean>(false);
  const pressStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  // 관리자 권한 체크 함수 (관리자 또는 방장)
  const isAdminForMemo = useCallback((memo: MemoWithDetails) => {
    if (!currentUserId || !memo.groupId) return false;
    const group = groups.find(g => g.id === memo.groupId);
    if (!group || !group.members || group.members.length === 0) return false;
    const currentMember = group.members.find((m: any) => m.userId === currentUserId);
    return currentMember?.canEditGroupMemos === true || currentMember?.role === 'leader';
  }, [currentUserId, groups]);

  // 방장 권한 체크 함수
  const isLeaderForMemo = useCallback((memo: MemoWithDetails) => {
    if (!currentUserId || !memo.groupId) return false;
    const group = groups.find(g => g.id === memo.groupId);
    if (!group || !group.members || group.members.length === 0) return false;
    const currentMember = group.members.find((m: any) => m.userId === currentUserId);
    return currentMember?.role === 'leader';
  }, [currentUserId, groups]);

  // 관리자 권한 체크 함수 (방장 제외)
  const isAdminOnlyForMemo = useCallback((memo: MemoWithDetails) => {
    if (!currentUserId || !memo.groupId) return false;
    const group = groups.find(g => g.id === memo.groupId);
    if (!group || !group.members || group.members.length === 0) return false;
    const currentMember = group.members.find((m: any) => m.userId === currentUserId);
    return currentMember?.canEditGroupMemos === true && currentMember?.role !== 'leader';
  }, [currentUserId, groups]);

  const dateLocale = language === "ko" ? ko : language === "en" ? enUS : language === "zh" ? zhCN : ja;

  // 스크롤 컨테이너 참조
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 스크롤 감지: 스크롤 중에는 선택 모드 활성화 방지
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // 스크롤 중임을 표시
      isScrollingRef.current = true;
      
      // 스크롤 중에는 모든 긴 터치 타이머 취소
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // 스크롤이 멈춘 후 일정 시간이 지나면 스크롤 상태 해제
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    scrollContainer.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      scrollContainer.removeEventListener('touchmove', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);

  const filteredMemos = useMemo(() => {
    let filtered = memos;
    
    // 작성자 탭 필터링
    if (showAuthorTab && currentUserId) {
      if (authorTab === "mine") {
        filtered = filtered.filter(memo => memo.member.userId === currentUserId);
      } else {
        filtered = filtered.filter(memo => memo.member.userId !== currentUserId);
      }
    }
    
    // 검색어 필터링 (hideFilters가 false이거나 externalSearchQuery가 있을 때)
    const activeSearchQuery = externalSearchQuery !== undefined ? externalSearchQuery : (!hideFilters ? searchQuery : "");
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase();
      filtered = filtered.filter(memo => {
        // 기본 필드 검색
        const basicMatch = (
          memo.content.toLowerCase().includes(query) ||
          memo.buildingName.toLowerCase().includes(query) ||
          memo.address.toLowerCase().includes(query) ||
          memo.member.name.toLowerCase().includes(query) ||
          (memo.group && memo.group.name.toLowerCase().includes(query))
        );
        
        // 날짜 검색
        if (memo.createdAt) {
          const createdAt = new Date(memo.createdAt);
          const dateFormats = [
            // 기본 형식
            format(createdAt, 'yyyy-MM-dd', { locale: dateLocale }),
            format(createdAt, 'yyyy/MM/dd', { locale: dateLocale }),
            format(createdAt, 'yyyy.MM.dd', { locale: dateLocale }),
            format(createdAt, 'MM-dd', { locale: dateLocale }),
            format(createdAt, 'MM/dd', { locale: dateLocale }),
            format(createdAt, 'MM.dd', { locale: dateLocale }),
            format(createdAt, 'yyyy', { locale: dateLocale }),
            format(createdAt, 'MM', { locale: dateLocale }),
            format(createdAt, 'dd', { locale: dateLocale }),
          ];
          
          // 언어별 날짜 형식 추가
          if (language === 'ko') {
            dateFormats.push(
              format(createdAt, 'yyyy년 MM월 dd일', { locale: dateLocale }),
              format(createdAt, 'yyyy년 MM월', { locale: dateLocale }),
              format(createdAt, 'MM월 dd일', { locale: dateLocale }),
              format(createdAt, 'MM월', { locale: dateLocale })
            );
          } else if (language === 'en') {
            dateFormats.push(
              format(createdAt, 'MMMM d, yyyy', { locale: dateLocale }),
              format(createdAt, 'MMM d, yyyy', { locale: dateLocale }),
              format(createdAt, 'MMMM d', { locale: dateLocale }),
              format(createdAt, 'MMM d', { locale: dateLocale }),
              format(createdAt, 'MMMM', { locale: dateLocale }),
              format(createdAt, 'MMM', { locale: dateLocale })
            );
          } else if (language === 'zh') {
            dateFormats.push(
              format(createdAt, 'yyyy年MM月dd日', { locale: dateLocale }),
              format(createdAt, 'yyyy年MM月', { locale: dateLocale }),
              format(createdAt, 'MM月dd日', { locale: dateLocale }),
              format(createdAt, 'MM月', { locale: dateLocale })
            );
          } else if (language === 'ja') {
            dateFormats.push(
              format(createdAt, 'yyyy年MM月dd日', { locale: dateLocale }),
              format(createdAt, 'yyyy年MM月', { locale: dateLocale }),
              format(createdAt, 'MM月dd日', { locale: dateLocale }),
              format(createdAt, 'MM月', { locale: dateLocale })
            );
          }
          
          const dateMatch = dateFormats.some(dateStr => 
            dateStr.toLowerCase().includes(query)
          );
          
          return basicMatch || dateMatch;
        }
        
        return basicMatch;
      });
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(memo => memo.markerIcon === selectedCategory);
    }
    
    if (selectedGroup !== "all") {
      if (selectedGroup === "personal") {
        filtered = filtered.filter(memo => !memo.group || memo.group.name === "개인 메모");
      } else {
        filtered = filtered.filter(memo => memo.group?.id === selectedGroup);
      }
    }
    
    return filtered;
  }, [memos, selectedCategory, selectedGroup, showAuthorTab, authorTab, currentUserId, hideFilters, searchQuery, externalSearchQuery]);

  // Group memos by location to determine if main memo button should be shown
  const memosByLocation = useMemo(() => {
    const grouped = new Map<string, MemoWithDetails[]>();
    memos.forEach(memo => {
      const key = `${memo.latitude},${memo.longitude}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(memo);
    });
    return grouped;
  }, [memos]);

  const getMemosAtSameLocation = (memo: MemoWithDetails) => {
    const key = `${memo.latitude},${memo.longitude}`;
    return memosByLocation.get(key) || [];
  };

  const handleLongPressStart = (memoId: string, event: React.TouchEvent | React.MouseEvent) => {
    // 터치/마우스 시작 위치 저장
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    pressStartPositionRef.current = { x: clientX, y: clientY };
    pressStartTimeRef.current = Date.now();
    isScrollingRef.current = false;
    
    longPressTimerRef.current = setTimeout(() => {
      // 스크롤 중이 아니고 위치 이동이 적을 때만 선택 모드 활성화
      if (!isScrollingRef.current && pressStartPositionRef.current) {
        setIsSelectionMode(true);
        setSelectedMemoIds(new Set([memoId]));
        justEnteredSelectionModeRef.current = true;
      }
    }, 500);
  };

  const handleLongPressMove = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!pressStartPositionRef.current) return;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    // 이동 거리 계산
    const deltaX = Math.abs(clientX - pressStartPositionRef.current.x);
    const deltaY = Math.abs(clientY - pressStartPositionRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 10px 이상 이동하면 스크롤로 간주
    if (distance > 10) {
      isScrollingRef.current = true;
      // 스크롤 중이면 긴 터치 타이머 취소
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pressStartPositionRef.current = null;
    isScrollingRef.current = false;
  };

  const handleMemoClick = (memoId: string) => {
    if (isSelectionMode) {
      if (justEnteredSelectionModeRef.current) {
        justEnteredSelectionModeRef.current = false;
        return;
      }
      toggleMemoSelection(memoId);
    } else {
      const pressDuration = Date.now() - pressStartTimeRef.current;
      if (pressDuration < 500) {
        onMemoClick(memoId);
      }
    }
  };

  const toggleMemoSelection = (memoId: string) => {
    setSelectedMemoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memoId)) {
        newSet.delete(memoId);
      } else {
        newSet.add(memoId);
      }
      return newSet;
    });
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMemoIds(new Set());
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedMemoIds.size > 0) {
      onBulkDelete(Array.from(selectedMemoIds));
      setIsSelectionMode(false);
      setSelectedMemoIds(new Set());
    }
  };

  const handleBulkCopy = () => {
    if (onBulkCopy && selectedMemoIds.size > 0) {
      // 팝업을 띄우기 위해 선택된 메모 ID 저장
      setPendingBulkCopyMemoIds(Array.from(selectedMemoIds));
      setBulkCopyDialogOpen(true);
    }
  };

  const selectAll = () => {
    setSelectedMemoIds(new Set(filteredMemos.map(m => m.id)));
  };

  const handleMoveToGroup = () => {
    console.log("handleMoveToGroup 호출:", { 
      selectedMemoIdsSize: selectedMemoIds.size, 
      selectedGroupId,
      hasOnMoveToGroup: !!onMoveToGroup 
    });
    
    if (selectedMemoIds.size === 0) {
      console.warn("선택된 메모가 없습니다.");
      return;
    }
    
    if (!selectedGroupId) {
      console.warn("그룹이 선택되지 않았습니다.");
      return;
    }
    
    if (!onMoveToGroup) {
      console.error("onMoveToGroup 핸들러가 없습니다.");
      return;
    }
    
    try {
      onMoveToGroup(Array.from(selectedMemoIds), selectedGroupId);
      // 성공적으로 호출되면 UI 상태 업데이트
      setIsSelectionMode(false);
      setSelectedMemoIds(new Set());
      setMoveToGroupDialogOpen(false);
      setSelectedGroupId("");
    } catch (error) {
      console.error("그룹으로 이동 중 오류:", error);
    }
  };

  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-6 sm:pt-4 px-4 pb-8 text-center">
        <p className="text-muted-foreground text-lg mb-2">{t.memoList.noMemos}</p>
        <p className="text-muted-foreground text-sm">{t.memoList.noMemosDesc}</p>
      </div>
    );
  }

  const getCategoryDisplay = (category: MarkerIconType | "all") => {
    if (category === "all") {
      return { label: t.categories.all, icon: MapPin, count: memos.length };
    }
    const label = t.categories[category];
    const icon = categoryIcons[category];
    const count = memos.filter(m => m.markerIcon === category).length;
    return { label, icon, count };
  };

  const currentCategory = getCategoryDisplay(selectedCategory);
  const CurrentIcon = currentCategory.icon;

  // 선택된 메모들이 모두 다른 사용자의 것인지 확인
  const isAllOthersMemos = useMemo(() => {
    if (!currentUserId || selectedMemoIds.size === 0) return false;
    return Array.from(selectedMemoIds).every(id => {
      const memo = memos.find(m => m.id === id);
      // 메모가 없거나(삭제됨?), 작성자 ID가 현재 사용자 ID와 다르면 true (남의 것)
      // 즉, 내 것이 하나라도 있으면 false
      return memo && memo.member.userId !== currentUserId;
    });
  }, [selectedMemoIds, memos, currentUserId]);

  return (
    <div className="flex flex-col h-full">
      {/* App Name Header */}
      {!hideHeader && (
        <div className="px-4 pt-[calc(env(safe-area-inset-top)-0.3rem)] sm:pt-[calc(env(safe-area-inset-top)-0.3rem)] pb-3 border-b bg-card/95 backdrop-blur-sm flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary text-transparent bg-clip-text">
            MemoWay
          </h1>
        </div>
      )}

      {/* Selection Mode Header */}
      {isSelectionMode ? (
        <div className="px-4 pt-[calc(env(safe-area-inset-top)-0.3rem)] pb-3 bg-muted/50 border-b flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelSelection}
                data-testid="button-cancel-selection"
              >
                <X className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium">
                {t.memoList.selectedCount.replace('{count}', selectedMemoIds.size.toString())}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              data-testid="button-select-all"
            >
              {t.memoList.selectAll}
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-nowrap">
            {onMoveToGroup && groups.length > 0 && (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setSelectedGroupId(""); // 다이얼로그 열 때 선택 초기화
                  setMoveToGroupDialogOpen(true);
                }}
                disabled={selectedMemoIds.size === 0}
                className="flex-1 bg-gradient-to-br from-sky-200 to-indigo-200 hover:from-sky-300 hover:to-indigo-300 border-2 border-sky-300/60 text-sky-700 shadow-sm hover:shadow-md transition-all"
                data-testid="button-move-to-group"
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                {t.memoList.moveToGroup}
              </Button>
            )}
            {onBulkCopy && isAllOthersMemos ? (
              <Button
                size="sm"
                variant="default"
                onClick={handleBulkCopy}
                disabled={selectedMemoIds.size === 0}
                className="flex-1 bg-gradient-to-br from-emerald-200 to-teal-200 hover:from-emerald-300 hover:to-teal-300 border-2 border-emerald-300/60 text-emerald-700 shadow-sm hover:shadow-md transition-all"
                data-testid="button-bulk-copy"
              >
                <Copy className="h-4 w-4 mr-1" />
                {t.common.copy || "복사"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={selectedMemoIds.size === 0}
                className="flex-1 bg-gradient-to-br from-pink-200 to-rose-200 hover:from-pink-300 hover:to-rose-300 border-2 border-pink-300/60 text-rose-700 shadow-sm hover:shadow-md transition-all"
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t.memoList.delete}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 작성자 탭 (그룹 메모 뷰에서만 표시) */}
          {showAuthorTab && currentUserId && (
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex gap-1.5 sm:gap-2 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md border border-primary/20 p-1 sm:p-1.5">
                <button
                  onClick={() => setAuthorTab("mine")}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                    authorTab === "mine"
                      ? "bg-primary/80 text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid="tab-my-memos"
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate">{t.memoList.myMemos}</span>
                  <Badge 
                    variant="secondary" 
                    className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0 h-4 sm:h-5 text-[9px] sm:text-xs shrink-0 ${
                      authorTab === "mine" 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-muted"
                    }`}
                  >
                    {memos.filter(m => m.member.userId === currentUserId).length}
                  </Badge>
                </button>
                <button
                  onClick={() => setAuthorTab("others")}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                    authorTab === "others"
                      ? "bg-primary/80 text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid="tab-others-memos"
                >
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate">{t.memoList.othersMemos}</span>
                  <Badge 
                    variant="secondary" 
                    className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0 h-4 sm:h-5 text-[9px] sm:text-xs shrink-0 ${
                      authorTab === "others" 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-muted"
                    }`}
                  >
                    {memos.filter(m => m.member.userId !== currentUserId).length}
                  </Badge>
                </button>
              </div>
            </div>
          )}
          {/* 검색 바 (메모 탭에서만 표시) */}
          {!hideFilters && (
            <div className="px-4 pt-[calc(0.5rem-0.3rem)] pb-2 flex-shrink-0">
              <div className="flex gap-1.5 sm:gap-2 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md border border-primary/20 p-2 sm:p-2.5">
                <div className="relative flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.memoList.searchPlaceholder}
                    className="pr-10 border-0 focus-visible:ring-0 bg-transparent"
                    data-testid="input-memo-search"
                  />
                  {searchQuery && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                      data-testid="button-clear-search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Memo List */}
      <div ref={scrollContainerRef} className="px-4 space-y-4 overflow-y-auto flex-1 pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))]">
      {filteredMemos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-muted-foreground text-lg mb-2">
            {t.memoList.noCategoryMemos}
          </p>
          <p className="text-muted-foreground text-sm">{t.memoList.noCategoryMemosDesc}</p>
        </div>
      ) : (
        filteredMemos.map(memo => {
          const isSelected = selectedMemoIds.has(memo.id);
          return (
            <Card 
              key={memo.id} 
              className={`rounded-3xl cursor-pointer hover-elevate transition-all overflow-visible shadow-lg border-2 bg-card/80 backdrop-blur-sm ${
                isSelected 
                  ? 'ring-4 ring-primary/50 border-primary shadow-2xl' 
                  : 'border-primary/30 hover:border-primary/50 hover:shadow-2xl'
              }`}
              onClick={() => handleMemoClick(memo.id)}
              onTouchStart={(e) => handleLongPressStart(memo.id, e)}
              onTouchMove={handleLongPressMove}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={(e) => handleLongPressStart(memo.id, e)}
              onMouseMove={handleLongPressMove}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              data-testid={`card-memo-${memo.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  {isSelectionMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMemoSelection(memo.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                      data-testid={`checkbox-memo-${memo.id}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground inline-block max-w-[12ch] overflow-hidden text-ellipsis whitespace-nowrap">
                        {memo.buildingName}
                      </h3>
                      {/* 복사 버튼 (다른 사용자 메모인 경우에만) - 건물명 옆에 배치 */}
                      {currentUserId && memo.member.userId !== currentUserId && onCopy && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full text-muted-foreground hover:text-emerald-600 h-7 w-7 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingCopyMemoId(memo.id);
                            setCopyDialogOpen(true);
                          }}
                          data-testid={`button-copy-${memo.id}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{memo.address}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {memo.group && memo.group.name !== "개인 메모" ? (
                      <Badge 
                        variant="secondary" 
                        className="rounded-full px-3 bg-primary/10 border border-primary/30"
                      >
                        {memo.group.name}
                      </Badge>
                    ) : (
                      <Badge 
                        variant="outline" 
                        className="rounded-full px-3 bg-accent/10 border border-accent/40"
                      >
                        {t.common.personal}
                      </Badge>
                    )}
                    <StarRating value={(memo as any).rating || 0} readOnly size="sm" />
                  </div>
                </div>
              </CardHeader>

          {memo.photos.length > 0 ? (
            <CardContent className="pb-3">
              <div className="flex gap-3">
                {/* 대표사진 */}
                <div className="relative flex-shrink-0">
                  {(() => {
                    const mainPhotoId = (memo as any).mainPhotoId;
                    const mainPhoto = mainPhotoId 
                      ? memo.photos.find((p: any) => p.id === mainPhotoId)
                      : memo.photos[0];
                    const remainingCount = memo.photos.length - 1;
                    
                    return (
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden shadow-sm border-2 border-primary/10">
                        <img 
                          src={mainPhoto?.url || memo.photos[0].url} 
                          alt="Main photo"
                          className="w-full h-full object-cover"
                        />
                        {remainingCount > 0 && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shadow-md border-2 border-background">
                            +{remainingCount}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {/* 메모 내용 (사진 오른쪽) */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-3 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent className="pb-3">
              <p className="text-sm line-clamp-2 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
            </CardContent>
          )}

          {!isSelectionMode && (
            <CardFooter className="flex items-center justify-end pt-0 pb-3">
              <div className="flex gap-1">
                {/* Show main memo button if there are 2+ memos at same location */}
                {getMemosAtSameLocation(memo).length >= 2 && onSetMainMemo && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`rounded-full ${(memo as any).isMainMemo ? 'bg-primary/10' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetMainMemo(memo.id);
                    }}
                    data-testid={`button-set-main-${memo.id}`}
                  >
                    <Star 
                      className={`h-4 w-4 transition-all ${
                        (memo as any).isMainMemo 
                          ? 'fill-primary text-primary animate-pulse' 
                          : 'text-muted-foreground'
                      }`} 
                    />
                  </Button>
                )}
              </div>
            </CardFooter>
          )}
        </Card>
          );
        })
      )}
      </div>

      {/* 그룹으로 이동 다이얼로그 */}
      {onMoveToGroup && (
        <Dialog open={moveToGroupDialogOpen} onOpenChange={setMoveToGroupDialogOpen}>
          <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100%-2rem)] mx-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl">{t.memoList.moveToGroupTitle}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col flex-1 overflow-hidden space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.memoList.moveToGroupDesc.replace('{count}', selectedMemoIds.size.toString())}
              </p>
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 sm:pr-2">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t.memoList.noGroupsAvailable}
                  </p>
                ) : (
                  groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedGroupId === group.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      data-testid={`group-option-${group.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border"
                          style={{
                            backgroundColor: `${group.color}30`,
                            borderColor: `${group.color}60`
                          }}
                        >
                          <Users className="h-4 w-4" style={{ color: group.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{group.name}</p>
                        </div>
                        {selectedGroupId === group.id && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0 pt-3 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setMoveToGroupDialogOpen(false);
                    setSelectedGroupId("");
                  }}
                  data-testid="button-cancel-move"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleMoveToGroup}
                  disabled={!selectedGroupId}
                  data-testid="button-confirm-move"
                >
                  {t.memoList.move}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 타인 메모 복사 확인 다이얼로그 */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100%-2rem)] mx-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Copy className="h-5 w-5 text-primary" />
              {t.common.copy || "복사"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 overflow-y-auto flex-1 max-h-[60vh] pr-1 sm:pr-2">
              <p>
                {t.memoDetail.confirmCopy}
              </p>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.groups.memoCount}</span>
                  <span className="font-semibold">1개</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.groups.requiredPoints}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {(10).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">{t.groups.currentPoints}</span>
                  <span className="font-semibold text-primary">
                    {userPoints.toLocaleString()}
                  </span>
                </div>
              </div>

              {10 > userPoints && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {t.groups.insufficientPoints} {(10).toLocaleString()}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-shrink-0 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
            <AlertDialogCancel data-testid="button-cancel-copy">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCopyMemoId && onCopy) {
                  onCopy(pendingCopyMemoId);
                }
                setCopyDialogOpen(false);
                setPendingCopyMemoId(null);
              }}
              disabled={10 > userPoints}
              data-testid="button-confirm-copy"
              className="bg-primary hover:bg-primary/90"
            >
              <Coins className="h-4 w-4 mr-2" />
              {t.groups.confirmCopy || t.common.copy || "복사"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 다중 메모 복사 확인 다이얼로그 */}
      <AlertDialog open={bulkCopyDialogOpen} onOpenChange={setBulkCopyDialogOpen}>
        <AlertDialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100%-2rem)] mx-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Copy className="h-5 w-5 text-primary" />
              {t.common.copy || "복사"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 overflow-y-auto flex-1 max-h-[60vh] pr-1 sm:pr-2">
              <p>
                선택한 메모를 복사하시겠습니까?
              </p>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.groups.memoCount}</span>
                  <span className="font-semibold">{pendingBulkCopyMemoIds.length}개</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.groups.requiredPoints}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {(pendingBulkCopyMemoIds.length * 10).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">{t.groups.currentPoints}</span>
                  <span className="font-semibold text-primary">
                    {userPoints.toLocaleString()}
                  </span>
                </div>
              </div>

              {pendingBulkCopyMemoIds.length * 10 > userPoints && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {t.groups.insufficientPoints} {(pendingBulkCopyMemoIds.length * 10).toLocaleString()}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-shrink-0 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
            <AlertDialogCancel 
              data-testid="button-cancel-bulk-copy"
              onClick={() => {
                setBulkCopyDialogOpen(false);
                setPendingBulkCopyMemoIds([]);
              }}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onBulkCopy && pendingBulkCopyMemoIds.length > 0) {
                  onBulkCopy(pendingBulkCopyMemoIds);
                  setIsSelectionMode(false);
                  setSelectedMemoIds(new Set());
                }
                setBulkCopyDialogOpen(false);
                setPendingBulkCopyMemoIds([]);
              }}
              disabled={pendingBulkCopyMemoIds.length * 10 > userPoints}
              data-testid="button-confirm-bulk-copy"
              className="bg-primary hover:bg-primary/90"
            >
              <Coins className="h-4 w-4 mr-2" />
              {t.groups.confirmCopy || t.common.copy || "복사"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
