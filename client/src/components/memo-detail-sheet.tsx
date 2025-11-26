import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, User, Users, Edit, Trash2, Navigation, X, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ko, enUS, zhCN, ja } from "date-fns/locale";
import type { MemoWithDetails } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

interface MemoDetailSheetProps {
  memo: MemoWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (memoId: string) => void;
  onDelete: (memoId: string) => void;
  onNavigateToLocation?: (lat: number, lng: number) => void;
  onAddNewMemo?: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
}

export function MemoDetailSheet({
  memo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onNavigateToLocation,
  onAddNewMemo,
}: MemoDetailSheetProps) {
  const { t, language } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const dateLocale = language === "ko" ? ko : language === "en" ? enUS : language === "zh" ? zhCN : ja;

  if (!memo) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-xl sm:rounded-t-2xl p-0 flex flex-col [&>button]:cursor-default">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col relative w-full min-h-0">
            {/* 드래그 핸들 */}
            <div className="w-10 h-0.5 sm:h-1 bg-muted rounded-full mx-auto mt-2 sm:mt-2.5 mb-2 sm:mb-2.5 flex-shrink-0" />

            <SheetHeader className="px-3 sm:px-4 pb-2 sm:pb-3 pt-0 flex-shrink-0">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <SheetTitle className="text-base sm:text-lg md:text-xl font-bold truncate flex-1" data-testid="text-memo-title">
                  {memo.buildingName}
                </SheetTitle>
                {onNavigateToLocation && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                    onClick={() => {
                      onNavigateToLocation(memo.latitude, memo.longitude);
                      onOpenChange(false);
                    }}
                    data-testid="button-navigate-to-location"
                  >
                    <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-xs sm:text-sm">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate" data-testid="text-memo-address">{memo.address}</span>
              </div>
            </SheetHeader>

            {/* 내용 영역 - 내용에 따라 높이 자동 조정 */}
            <div className="px-3 sm:px-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3 sm:space-y-4 pb-3 sm:pb-4">
                {memo.photos && memo.photos.length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground">{t.memoDetail.photos}</h3>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {memo.photos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          className="relative rounded-md sm:rounded-lg border border-border bg-card p-1 sm:p-1.5 hover:bg-accent active:bg-accent transition-colors"
                          onClick={() => setSelectedPhoto(photo.url)}
                          data-testid={`container-photo-${photo.id}`}
                        >
                          <img
                            src={photo.url}
                            alt={t.memoDetail.photos}
                            className="w-full h-16 sm:h-24 object-contain rounded"
                            data-testid={`img-photo-${photo.id}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 sm:space-y-2">
                  <h3 className="font-semibold text-xs sm:text-sm text-muted-foreground">{t.memoDetail.content}</h3>
                  <p 
                    className="leading-relaxed whitespace-pre-wrap text-sm sm:text-base break-words" 
                    style={{ fontSize: 'var(--font-size-base, 14px)' }}
                    data-testid="text-memo-content"
                  >
                    {memo.content}
                  </p>
                </div>
              </div>
            </div>

            {/* 액션 버튼들 - 메타데이터 영역 위에 배치 */}
            {(onAddNewMemo || onEdit || onDelete) && (
              <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-t flex-shrink-0">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {onAddNewMemo && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onAddNewMemo({
                          lat: memo.latitude,
                          lng: memo.longitude,
                          address: memo.address,
                          buildingName: memo.buildingName,
                        });
                        onOpenChange(false);
                      }}
                      className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
                      data-testid="button-add-memo"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                      {t.memoDetail.addMemoHere}
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onEdit(memo.id);
                        onOpenChange(false);
                      }}
                      className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
                      data-testid="button-edit-memo"
                    >
                      <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                      {t.common.edit}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm(t.memoDetail.confirmDelete)) {
                          onDelete(memo.id);
                          onOpenChange(false);
                        }
                      }}
                      className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
                      data-testid="button-delete-memo"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
                      {t.common.delete}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t space-y-1 sm:space-y-1.5 flex-shrink-0">
              <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="flex-shrink-0 text-[10px] sm:text-xs">{t.memoDetail.author}:</span>
                  <span className="font-medium text-foreground truncate text-xs sm:text-sm" data-testid="text-memo-author">{memo.member.name}</span>
                </div>

                {memo.group && memo.editorMember && memo.editorMember.id !== memo.member.id && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="flex-shrink-0 text-[10px] sm:text-xs">{t.memoDetail.editor}:</span>
                    <span className="font-medium text-foreground truncate text-xs sm:text-sm" data-testid="text-memo-editor">{memo.editorMember.name}</span>
                  </div>
                )}

                {memo.group && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="flex-shrink-0 text-[10px] sm:text-xs">{t.memoDetail.group}:</span>
                    <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0.5" data-testid="badge-memo-group">
                      {memo.group.name}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="flex-shrink-0 text-[10px] sm:text-xs">{t.memoDetail.created}:</span>
                  <span className="text-foreground truncate text-xs sm:text-sm" data-testid="text-memo-created">
                    {format(new Date(memo.createdAt), "PPP p", { locale: dateLocale })}
                  </span>
                </div>

                {memo.updatedAt && new Date(memo.updatedAt).getTime() !== new Date(memo.createdAt).getTime() && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="flex-shrink-0 text-[10px] sm:text-xs">{t.common.edit}:</span>
                    <span className="text-foreground truncate text-xs sm:text-sm" data-testid="text-memo-updated">
                      {format(new Date(memo.updatedAt), "PPP p", { locale: dateLocale })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
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
    </>
  );
}
