import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, User, Plus } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { MemoWithDetails } from "@shared/schema";

interface MemoClusterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memos: MemoWithDetails[];
  onMemoSelect: (memoId: string) => void;
  onAddMemo?: () => void;
}

export function MemoClusterSheet({ open, onOpenChange, memos, onMemoSelect, onAddMemo }: MemoClusterSheetProps) {
  if (memos.length === 0) return null;

  const location = memos[0];
  
  const sortedMemos = [...memos].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] overflow-hidden flex flex-col"
        data-testid="sheet-memo-cluster"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <div className="flex-1">
              <div className="text-base font-semibold">{location.buildingName}</div>
              <div className="text-sm text-muted-foreground font-normal">{location.address}</div>
            </div>
            <Badge variant="secondary" data-testid="badge-memo-count">
              {memos.length}개
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {onAddMemo && (
          <div className="flex-shrink-0 mt-3">
            <Button
              onClick={() => {
                onAddMemo();
                onOpenChange(false);
              }}
              className="w-full"
              data-testid="button-add-memo-cluster"
            >
              <Plus className="h-4 w-4 mr-2" />
              새 메모 추가
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pb-6">
          {sortedMemos.map((memo) => (
            <Card
              key={memo.id}
              className="p-4 hover-elevate active-elevate-2 cursor-pointer"
              onClick={() => {
                onMemoSelect(memo.id);
                onOpenChange(false);
              }}
              data-testid={`card-cluster-memo-${memo.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm flex-1 whitespace-pre-wrap break-words">
                    {memo.content}
                  </p>
                  {memo.group && (
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${memo.group.color}15`,
                        borderColor: memo.group.color,
                        color: memo.group.color,
                      }}
                      data-testid={`badge-group-${memo.id}`}
                    >
                      {memo.group.name}
                    </Badge>
                  )}
                </div>

                {memo.photos && memo.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {memo.photos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt="메모 사진"
                        className="h-16 w-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{memo.member.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {memo.createdAt ? format(new Date(memo.createdAt), 'M월 d일', { locale: ko }) : '날짜 없음'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
