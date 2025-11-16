import { useState, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Heart, Plane, UtensilsCrossed, Coffee, ShoppingBag, Dumbbell, Briefcase, MapPin, ChevronDown, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS, zhCN, ja } from "date-fns/locale";
import type { MemoWithDetails, MarkerIconType } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

interface MemoListProps {
  memos: MemoWithDetails[];
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onBulkDelete?: (memoIds: string[]) => void;
  onMemoClick: (memoId: string) => void;
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

export function MemoList({ memos, onEdit, onDelete, onBulkDelete, onMemoClick }: MemoListProps) {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<MarkerIconType | "all">("all");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMemoIds, setSelectedMemoIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const justEnteredSelectionModeRef = useRef<boolean>(false);

  const dateLocale = language === "ko" ? ko : language === "en" ? enUS : language === "zh" ? zhCN : ja;

  const filteredMemos = selectedCategory === "all" 
    ? memos 
    : memos.filter(memo => memo.markerIcon === selectedCategory);

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
        /* Category Filter Dropdown */
        <div className="px-4 pt-4 pb-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as MarkerIconType | "all")}
          >
            <SelectTrigger className="w-full" data-testid="category-select-trigger">
              <div className="flex items-center gap-2 w-full">
                <CurrentIcon className="w-4 h-4" />
                <span className="flex-1 text-left">{currentCategory.label}</span>
                <Badge variant="secondary" className="px-2 h-5 text-xs">
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
              className={`rounded-2xl cursor-pointer hover-elevate ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
                    <h3 className="text-lg font-medium truncate">{memo.buildingName}</h3>
                    <p className="text-sm text-muted-foreground truncate">{memo.address}</p>
                  </div>
                  {memo.group && memo.group.name !== "개인 메모" ? (
                    <Badge variant="secondary" className="shrink-0">
                      {memo.group.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      {t.common.personal}
                    </Badge>
                  )}
                </div>
              </CardHeader>

          {memo.photos.length > 0 && (
            <CardContent className="pb-3">
              <div className="grid grid-cols-3 gap-2">
                {memo.photos.slice(0, 3).map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden">
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
            <p className="text-sm line-clamp-2">{memo.content}</p>
          </CardContent>

          <CardFooter className="flex items-center justify-between pt-0">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(memo.createdAt), { addSuffix: true, locale: dateLocale })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.memoDetail.author}: {memo.member.name}
              </p>
            </div>
            {!isSelectionMode && (
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
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
