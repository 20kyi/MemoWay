import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Heart, Plane, UtensilsCrossed, Coffee, ShoppingBag, Dumbbell, Briefcase, MapPin, ChevronDown, X, Star, Users, User, Search, ArrowRight, Check, FileText, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ko, enUS, zhCN, ja } from "date-fns/locale";
import type { MemoWithDetails, MarkerIconType } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Group {
  id: string;
  name: string;
  color: string;
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
  onMemoClick: (memoId: string) => void;
  onSetMainMemo?: (memoId: string) => void;
  onMoveToGroup?: (memoIds: string[], groupId: string) => void;
  onShowOnMap?: (memoIds: string[]) => void;
  onDeleteSavedMap?: (mapId: string) => void;
  hideHeader?: boolean;
  hideFilters?: boolean;
  showAuthorTab?: boolean;
  currentUserId?: string;
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

export function MemoList({ memos, groups = [], savedMaps = [], onEdit, onDelete, onBulkDelete, onMemoClick, onSetMainMemo, onMoveToGroup, onShowOnMap, onDeleteSavedMap, hideHeader = false, hideFilters = false, showAuthorTab = false, currentUserId }: MemoListProps) {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<MarkerIconType | "all">("all");
  const [selectedGroup, setSelectedGroup] = useState<string | "all">("all");
  const [authorTab, setAuthorTab] = useState<"mine" | "others">("mine");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMemoIds, setSelectedMemoIds] = useState<Set<string>>(new Set());
  const [memoViewTab, setMemoViewTab] = useState<"myMemos" | "myMap">("myMemos");
  const [moveToGroupDialogOpen, setMoveToGroupDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const justEnteredSelectionModeRef = useRef<boolean>(false);

  const dateLocale = language === "ko" ? ko : language === "en" ? enUS : language === "zh" ? zhCN : ja;

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
    
    // 검색어 필터링 (hideFilters가 false일 때만 - 메모 탭에서 사용)
    if (!hideFilters && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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
  }, [memos, selectedCategory, selectedGroup, showAuthorTab, authorTab, currentUserId, hideFilters, searchQuery]);

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

  const handleLongPressStart = (memoId: string) => {
    pressStartTimeRef.current = Date.now();
    longPressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedMemoIds(new Set([memoId]));
      justEnteredSelectionModeRef.current = true;
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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

  const selectAll = () => {
    setSelectedMemoIds(new Set(filteredMemos.map(m => m.id)));
  };

  const handleMoveToGroup = () => {
    if (selectedMemoIds.size === 0 || !selectedGroupId) return;
    if (onMoveToGroup) {
      onMoveToGroup(Array.from(selectedMemoIds), selectedGroupId);
      setIsSelectionMode(false);
      setSelectedMemoIds(new Set());
      setMoveToGroupDialogOpen(false);
      setSelectedGroupId("");
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

  return (
    <div className="flex flex-col h-full">
      {/* App Name Header */}
      {!hideHeader && (
        <div className="px-4 pt-6 sm:pt-4 pb-3 border-b bg-card/95 backdrop-blur-sm flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary text-transparent bg-clip-text">
            MemoWay
          </h1>
        </div>
      )}

      {/* Selection Mode Header */}
      {isSelectionMode ? (
        <div className="px-4 pt-4 pb-3 bg-muted/50 border-b flex flex-col gap-3 flex-shrink-0">
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
                {selectedMemoIds.size}개 선택됨
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              data-testid="button-select-all"
            >
              전체 선택
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onShowOnMap && (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  if (onShowOnMap && selectedMemoIds.size > 0) {
                    onShowOnMap(Array.from(selectedMemoIds));
                    setIsSelectionMode(false);
                    setSelectedMemoIds(new Set());
                  }
                }}
                disabled={selectedMemoIds.size === 0}
                className="flex-1 sm:flex-initial bg-gradient-to-br from-emerald-200 to-teal-200 hover:from-emerald-300 hover:to-teal-300 border-2 border-emerald-300/60 text-emerald-700 shadow-sm hover:shadow-md transition-all"
                data-testid="button-show-on-map"
              >
                <MapPin className="h-4 w-4 mr-1" />
                지도에 표시
              </Button>
            )}
            {onMoveToGroup && groups.length > 0 && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setMoveToGroupDialogOpen(true)}
                disabled={selectedMemoIds.size === 0}
                className="flex-1 sm:flex-initial bg-gradient-to-br from-sky-200 to-indigo-200 hover:from-sky-300 hover:to-indigo-300 border-2 border-sky-300/60 text-sky-700 shadow-sm hover:shadow-md transition-all"
                data-testid="button-move-to-group"
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                그룹으로 이동
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedMemoIds.size === 0}
              className="flex-1 sm:flex-initial bg-gradient-to-br from-pink-200 to-rose-200 hover:from-pink-300 hover:to-rose-300 border-2 border-pink-300/60 text-rose-700 shadow-sm hover:shadow-md transition-all"
              data-testid="button-bulk-delete"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
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
                  <span className="truncate">내가 쓴 메모</span>
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
                  <span className="truncate">다른 사용자가 쓴 메모</span>
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
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex gap-1.5 sm:gap-2 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md border border-primary/20 p-2 sm:p-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="메모 내용, 장소, 주소, 작성자, 날짜 검색..."
                    className="pl-10 pr-10 border-0 focus-visible:ring-0 bg-transparent"
                    data-testid="input-memo-search"
                  />
                  {searchQuery && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery("")}
                      data-testid="button-clear-search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* 탭 전환 버튼 (메모 탭에서만 표시) */}
          {!hideFilters && (
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex gap-1.5 sm:gap-2 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md border border-primary/20 p-1 sm:p-1.5 sm:p-2">
                <button
                  onClick={() => setMemoViewTab("myMemos")}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                    memoViewTab === "myMemos"
                      ? "bg-gradient-to-br from-sky-200 to-indigo-200 hover:from-sky-300 hover:to-indigo-300 border-2 border-sky-300/60 text-sky-700 shadow-sm hover:shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid="tab-my-memos"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 shrink-0" />
                  <span className="truncate">내 메모</span>
                </button>
                <button
                  onClick={() => setMemoViewTab("myMap")}
                  className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
                    memoViewTab === "myMap"
                      ? "bg-gradient-to-br from-sky-200 to-indigo-200 hover:from-sky-300 hover:to-indigo-300 border-2 border-sky-300/60 text-sky-700 shadow-sm hover:shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid="tab-my-map"
                >
                  <MapPin className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 shrink-0" />
                  <span className="truncate">내 지도</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Memo List */}
      <div className="px-4 py-2 space-y-4 overflow-y-auto flex-1">
      {!hideFilters && memoViewTab === "myMap" ? (
        // 내 지도 탭: 저장된 지도 목록을 그룹 형태로 표시
        savedMaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg mb-2">저장된 지도가 없습니다</p>
            <p className="text-muted-foreground text-sm">메모를 선택하고 지도에 표시한 후 저장하세요</p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {savedMaps.map(savedMap => {
              const savedMemos = memos.filter(m => savedMap.memoIds.includes(m.id));
              const memoCount = savedMemos.length;
              
              return (
                <Card
                  key={savedMap.id}
                  className="hover-elevate transition-all shadow-md rounded-xl sm:rounded-2xl bg-card/90 backdrop-blur-sm hover:shadow-lg cursor-pointer border-2"
                  style={{
                    borderColor: `${savedMap.color}60`,
                    background: `linear-gradient(to bottom right, ${savedMap.color}30, rgba(var(--card), 0.9))`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${savedMap.color}80`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${savedMap.color}60`;
                  }}
                  onClick={() => {
                    if (onShowOnMap && savedMap.memoIds.length > 0) {
                      onShowOnMap(savedMap.memoIds);
                    }
                  }}
                  data-testid={`card-saved-map-${savedMap.id}`}
                >
                  <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm border relative"
                          style={{ 
                            backgroundColor: `${savedMap.color}30`,
                            borderColor: `${savedMap.color}60`
                          }}
                        >
                          {(() => {
                            const IconComponent = categoryIcons[savedMap.category as MarkerIconType] || MapPin;
                            return <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: savedMap.color }} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base sm:text-lg font-semibold truncate leading-tight">{savedMap.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {savedMap.createdAt.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        {onDeleteSavedMap && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("정말로 이 저장된 지도를 삭제하시겠습니까?")) {
                                onDeleteSavedMap(savedMap.id);
                              }
                            }}
                            data-testid={`button-delete-saved-map-${savedMap.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="flex-shrink-0 text-xs px-2 py-0.5"
                        style={{
                          backgroundColor: `${savedMap.color}30`,
                          color: savedMap.color,
                          borderColor: `${savedMap.color}60`,
                        }}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {memoCount}개
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-2 pb-3 sm:pb-4 px-3 sm:px-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs sm:text-sm px-2 sm:px-3 w-full border-2 shadow-sm"
                      style={{
                        background: `linear-gradient(to bottom right, ${savedMap.color}40, ${savedMap.color}60)`,
                        borderColor: `${savedMap.color}60`,
                        color: savedMap.color,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(to bottom right, ${savedMap.color}50, ${savedMap.color}70)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `linear-gradient(to bottom right, ${savedMap.color}40, ${savedMap.color}60)`;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onShowOnMap && savedMap.memoIds.length > 0) {
                          onShowOnMap(savedMap.memoIds);
                        }
                      }}
                      data-testid={`button-show-saved-map-${savedMap.id}`}
                    >
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                      지도에서 보기
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )
      ) : filteredMemos.length === 0 ? (
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
              onTouchStart={() => handleLongPressStart(memo.id)}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(memo.id)}
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
                    <h3 className="text-lg font-bold truncate text-foreground">
                      {memo.buildingName}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">{memo.address}</p>
                  </div>
                  {memo.group && memo.group.name !== "개인 메모" ? (
                    <Badge 
                      variant="secondary" 
                      className="shrink-0 rounded-full px-3 bg-primary/10 border border-primary/30"
                    >
                      {memo.group.name}
                    </Badge>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className="shrink-0 rounded-full px-3 bg-accent/10 border border-accent/40"
                    >
                      {t.common.personal}
                    </Badge>
                  )}
                </div>
              </CardHeader>

          {memo.photos.length > 0 && (
            <CardContent className="pb-3">
              <div className="grid grid-cols-3 gap-2">
                {memo.photos.slice(0, 3).map((photo, index) => (
                  <div 
                    key={index} 
                    className="aspect-square rounded-lg overflow-hidden shadow-sm border-2 border-primary/10 hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    <img 
                      src={photo.url} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          )}

          <CardContent className="pb-3">
            <p className="text-sm line-clamp-2 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
          </CardContent>

          <CardFooter className="flex items-center justify-between pt-0">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground font-medium">
                {formatDistanceToNow(new Date(memo.createdAt), { addSuffix: true, locale: dateLocale })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.memoDetail.author}: <span className="font-medium text-foreground/70">{memo.member.name}</span>
              </p>
            </div>
            {!isSelectionMode && (
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
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(memo.id);
                  }}
                  data-testid={`button-edit-${memo.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(memo.id);
                  }}
                  data-testid={`button-delete-${memo.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardFooter>
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
              <DialogTitle className="text-lg sm:text-xl">그룹으로 이동</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col flex-1 overflow-hidden space-y-4">
              <p className="text-sm text-muted-foreground">
                선택한 {selectedMemoIds.size}개의 메모를 이동할 그룹을 선택하세요.
              </p>
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 sm:pr-2">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    이동할 수 있는 그룹이 없습니다.
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
                  취소
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleMoveToGroup}
                  disabled={!selectedGroupId}
                  data-testid="button-confirm-move"
                >
                  이동
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
