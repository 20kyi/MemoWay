import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface Memo {
  id: string;
  buildingName: string;
  address: string;
  content: string;
  createdAt: string;
  photos: Array<{ url: string }>;
  group: { name: string } | null;
  member: { name: string };
}

interface MemoListProps {
  memos: Memo[];
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onMemoClick: (memoId: string) => void;
}

export function MemoList({ memos, onEdit, onDelete, onMemoClick }: MemoListProps) {
  if (memos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground text-lg mb-2">아직 메모가 없습니다</p>
        <p className="text-muted-foreground text-sm">지도에서 위치를 선택하여 메모를 추가하세요</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 overflow-y-auto h-full">
      {memos.map(memo => (
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
              {memo.group && (
                <Badge variant="secondary" className="shrink-0">
                  {memo.group.name}
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
      ))}
    </div>
  );
}
