import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Heart, Plane, UtensilsCrossed, Coffee, ShoppingBag, Dumbbell, Briefcase, MapPin, ChevronDown, X, Star, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS, zhCN, ja } from "date-fns/locale";
import type { MemoWithDetails, MarkerIconType } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

interface Group {
  id: string;
  name: string;
  color: string;
}

interface MemoListProps {
  memos: MemoWithDetails[];
  groups?: Group[];
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onBulkDelete?: (memoIds: string[]) => void;
  onMemoClick: (memoId: string) => void;
  onSetMainMemo?: (memoId: string) => void;
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

export function MemoList({ memos, groups = [], onEdit, onDelete, onBulkDelete, onMemoClick, onSetMainMemo }: MemoListProps) {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<MarkerIconType | "all">("all");
  const [selectedGroup, setSelectedGroup] = useState<string | "all">("all");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMemoIds, setSelectedMemoIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const justEnteredSelectionModeRef = useRef<boolean>(false);

  const dateLocale = language === "ko" ? ko : language === "en" ? enUS : language === "zh" ? zhCN : ja;

  const filteredMemos = useMemo(() => {
    let filtered = memos;
    
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
  }, [memos, selectedCategory, selectedGroup]);

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

  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
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
      {/* Selection Mode Header */}
      {isSelectionMode ? (
        <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              data-testid="button-select-all"
            >
              전체 선택
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedMemoIds.size === 0}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              삭제
            </Button>
          </div>
        </div>
      ) : (
        /* Category and Group Filter Dropdowns */
        <div className="px-4 pt-4 pb-2 grid grid-cols-2 gap-2">
          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as MarkerIconType | "all")}
          >
            <SelectTrigger className="w-full" data-testid="category-select-trigger">
              <div className="flex items-center gap-1 w-full">
                <CurrentIcon className="w-4 h-4" />
                <span className="flex-1 text-left truncate">{currentCategory.label}</span>
                <Badge variant="secondary" className="px-1.5 h-5 text-xs">
                  {currentCategory.count}
                </Badge>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="filter-all">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{t.categories.all}</span>
                  <Badge variant="secondary" className="ml-auto px-2 h-5 text-xs">
                    {memos.length}
                  </Badge>
                </div>
              </SelectItem>
              {(Object.keys(categoryIcons) as MarkerIconType[])
                .filter((key) => key !== "default")
                .map((key) => {
                  const Icon = categoryIcons[key];
                  const count = memos.filter(m => m.markerIcon === key).length;
                  if (count === 0) return null;
                  
                  return (
                    <SelectItem key={key} value={key} data-testid={`filter-${key}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{t.categories[key]}</span>
                        <Badge variant="secondary" className="ml-auto px-2 h-5 text-xs">
                          {count}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>

          {/* Group Filter */}
          <Select
            value={selectedGroup}
            onValueChange={(value) => setSelectedGroup(value)}
          >
            <SelectTrigger className="w-full" data-testid="group-select-trigger">
              <div className="flex items-center gap-1 w-full">
                <Users className="w-4 h-4" />
                <span className="flex-1 text-left truncate">
                  {selectedGroup === "all" 
                    ? "전체 그룹" 
                    : selectedGroup === "personal"
                    ? "개인 메모"
                    : groups.find(g => g.id === selectedGroup)?.name || "그룹"}
                </span>
                <Badge variant="secondary" className="px-1.5 h-5 text-xs">
                  {selectedGroup === "all" 
                    ? memos.length
                    : selectedGroup === "personal"
                    ? memos.filter(m => !m.group || m.group.name === "개인 메모").length
                    : memos.filter(m => m.group?.id === selectedGroup).length}
                </Badge>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="filter-group-all">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>전체 그룹</span>
                  <Badge variant="secondary" className="ml-auto px-2 h-5 text-xs">
                    {memos.length}
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem value="personal" data-testid="filter-group-personal">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>개인 메모</span>
                  <Badge variant="secondary" className="ml-auto px-2 h-5 text-xs">
                    {memos.filter(m => !m.group || m.group.name === "개인 메모").length}
                  </Badge>
                </div>
              </SelectItem>
              {groups.map((group) => {
                const count = memos.filter(m => m.group?.id === group.id).length;
                if (count === 0) return null;
                
                return (
                  <SelectItem key={group.id} value={group.id} data-testid={`filter-group-${group.id}`}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: group.color }}
                      />
                      <span>{group.name}</span>
                      <Badge variant="secondary" className="ml-auto px-2 h-5 text-xs">
                        {count}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Memo List */}
      <div className="px-4 py-2 space-y-4 overflow-y-auto flex-1">
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
            <p className="text-sm line-clamp-2 leading-relaxed">{memo.content}</p>
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
    </div>
  );
}
