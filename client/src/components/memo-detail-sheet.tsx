import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, User, Users, Edit, Trash2, X, Navigation } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { MemoWithDetails } from "@shared/schema";

interface MemoDetailSheetProps {
  memo: MemoWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onNavigateToLocation?: (lat: number, lng: number) => void;
}

export function MemoDetailSheet({
  memo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onNavigateToLocation,
}: MemoDetailSheetProps) {
  if (!memo) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <SheetTitle className="text-2xl font-bold mb-2" data-testid="text-memo-title">
                  {memo.buildingName}
                </SheetTitle>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4" />
                  <span data-testid="text-memo-address">{memo.address}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-detail"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 pb-6">
              {memo.photos && memo.photos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">사진</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {memo.photos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt="메모 사진"
                        className="w-full h-40 object-cover rounded-lg"
                        data-testid={`img-photo-${photo.id}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">메모 내용</h3>
                <p className="text-base leading-relaxed whitespace-pre-wrap" data-testid="text-memo-content">
                  {memo.content}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">작성자:</span>
                  <span className="font-medium" data-testid="text-memo-author">{memo.member.name}</span>
                </div>

                {memo.group && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">그룹:</span>
                    <Badge variant="secondary" data-testid="badge-memo-group">
                      {memo.group.name}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">작성:</span>
                  <span data-testid="text-memo-created">
                    {format(new Date(memo.createdAt), "PPP p", { locale: ko })}
                  </span>
                </div>

                {memo.updatedAt && new Date(memo.updatedAt).getTime() !== new Date(memo.createdAt).getTime() && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">수정:</span>
                    <span data-testid="text-memo-updated">
                      {format(new Date(memo.updatedAt), "PPP p", { locale: ko })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 border-t space-y-3">
            {onNavigateToLocation && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onNavigateToLocation(memo.latitude, memo.longitude);
                  onOpenChange(false);
                }}
                data-testid="button-navigate-to-location"
              >
                <Navigation className="w-4 h-4 mr-2" />
                지도에서 위치 보기
              </Button>
            )}
            <Button
              className="w-full"
              onClick={() => {
                onEdit(memo.id);
                onOpenChange(false);
              }}
              data-testid="button-edit-memo"
            >
              <Edit className="w-4 h-4 mr-2" />
              수정
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                onDelete(memo.id);
                onOpenChange(false);
              }}
              data-testid="button-delete-memo"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
