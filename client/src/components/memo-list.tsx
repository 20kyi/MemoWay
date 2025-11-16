import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Heart, Plane, UtensilsCrossed, Coffee, ShoppingBag, Dumbbell, Briefcase, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { MemoWithDetails, MarkerIconType } from "@shared/schema";

interface MemoListProps {
  memos: MemoWithDetails[];
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onMemoClick: (memoId: string) => void;
}

const categoryConfig: Record<MarkerIconType, { label: string; icon: any }> = {
  default: { label: "전체", icon: MapPin },
  travel: { label: "여행", icon: Plane },
  love: { label: "사랑", icon: Heart },
  food: { label: "맛집", icon: UtensilsCrossed },
  cafe: { label: "카페", icon: Coffee },
  shopping: { label: "쇼핑", icon: ShoppingBag },
  sport: { label: "운동", icon: Dumbbell },
  work: { label: "업무", icon: Briefcase },
};

export function MemoList({ memos, onEdit, onDelete, onMemoClick }: MemoListProps) {
  const [selectedCategory, setSelectedCategory] = useState<MarkerIconType | "all">("all");

  const filteredMemos = selectedCategory === "all" 
    ? memos 
    : memos.filter(memo => memo.markerIcon === selectedCategory);

  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground text-lg mb-2">아직 메모가 없습니다</p>
        <p className="text-muted-foreground text-sm">지도에서 위치를 선택하여 메모를 추가하세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category Filter */}
      <div className="px-4 pt-4 pb-2">
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="shrink-0"
              data-testid="filter-all"
            >
              <MapPin className="w-4 h-4 mr-1" />
              전체
            </Button>
            {(Object.entries(categoryConfig) as [MarkerIconType, typeof categoryConfig[MarkerIconType]][])
              .filter(([key]) => key !== "default")
              .map(([key, config]) => {
                const Icon = config.icon;
                const count = memos.filter(m => m.markerIcon === key).length;
                if (count === 0) return null;
                
                return (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                    className="shrink-0"
                    data-testid={`filter-${key}`}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {config.label}
                    <Badge variant="secondary" className="ml-1.5 px-1.5 min-w-5 h-5 text-xs">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
          </div>
        </ScrollArea>
      </div>

      {/* Memo List */}
      <div className="px-4 py-2 space-y-4 overflow-y-auto flex-1">
      {filteredMemos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-muted-foreground text-lg mb-2">
            {categoryConfig[selectedCategory as MarkerIconType]?.label || "선택한"} 카테고리에 메모가 없습니다
          </p>
          <p className="text-muted-foreground text-sm">다른 카테고리를 선택하거나 새 메모를 추가하세요</p>
        </div>
      ) : (
        filteredMemos.map(memo => (
        <Card 
          key={memo.id} 
          className="rounded-2xl cursor-pointer hover-elevate"
          onClick={() => onMemoClick(memo.id)}
          data-testid={`card-memo-${memo.id}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
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
                  개인
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
                {formatDistanceToNow(new Date(memo.createdAt), { addSuffix: true, locale: ko })}
              </p>
              <p className="text-xs text-muted-foreground">
                작성자: {memo.member.name}
              </p>
            </div>
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
          </CardFooter>
        </Card>
        ))
      )}
      </div>
    </div>
  );
}
