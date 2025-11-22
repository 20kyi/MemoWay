/**
 * 메모 클러스터 시트 컴포넌트
 * 
 * 같은 위치에 여러 개의 메모가 있을 때 표시되는 컴포넌트입니다.
 * 마커 클러스터를 클릭하면 이 시트가 열려 해당 위치의 모든 메모를 표시합니다.
 * 
 * 주요 기능:
 * - 같은 위치의 모든 메모 목록 표시
 * - 최신순 정렬
 * - 메모 클릭 시 상세 정보 표시
 * - 그룹 정보 표시
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { MemoWithDetails } from "@shared/schema";

interface MemoClusterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memos: MemoWithDetails[];
  onMemoSelect: (memoId: string) => void;
}

export function MemoClusterSheet({ open, onOpenChange, memos, onMemoSelect }: MemoClusterSheetProps) {
  if (memos.length === 0) return null;

  const location = memos[0];
  
  // 최신순으로 메모 정렬
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
