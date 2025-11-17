import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, User, Users, Edit, Trash2, Navigation, X, Plus } from "lucide-react";
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
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <SheetTitle className="text-2xl font-bold" data-testid="text-memo-title">
                {memo.buildingName}
              </SheetTitle>
              {onNavigateToLocation && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onNavigateToLocation(memo.latitude, memo.longitude);
                    onOpenChange(false);
                  }}
                  data-testid="button-navigate-to-location"
                >
                  <Navigation className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4" />
              <span data-testid="text-memo-address">{memo.address}</span>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 pb-6">
              {memo.photos && memo.photos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">{t.memoDetail.photos}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {memo.photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="relative rounded-lg border border-border bg-card p-2 hover:bg-accent active:bg-accent transition-colors"
                        onClick={() => setSelectedPhoto(photo.url)}
                        data-testid={`container-photo-${photo.id}`}
                      >
                        <img
                          src={photo.url}
                          alt={t.memoDetail.photos}
                          className="w-full h-28 object-contain rounded"
                          data-testid={`img-photo-${photo.id}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">{t.memoDetail.content}</h3>
                <p className="text-base leading-relaxed whitespace-pre-wrap" data-testid="text-memo-content">
                  {memo.content}
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 pt-4 border-t space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{t.memoDetail.author}:</span>
                <span className="font-medium text-foreground" data-testid="text-memo-author">{memo.member.name}</span>
              </div>

              {memo.group && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{t.memoDetail.group}:</span>
                  <Badge variant="secondary" data-testid="badge-memo-group">
                    {memo.group.name}
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{t.memoDetail.created}:</span>
                <span className="text-foreground" data-testid="text-memo-created">
                  {format(new Date(memo.createdAt), "PPP p", { locale: dateLocale })}
                </span>
              </div>

              {memo.updatedAt && new Date(memo.updatedAt).getTime() !== new Date(memo.createdAt).getTime() && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{t.common.edit}:</span>
                  <span className="text-foreground" data-testid="text-memo-updated">
                    {format(new Date(memo.updatedAt), "PPP p", { locale: dateLocale })}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {onAddNewMemo && (
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  onAddNewMemo({
                    lat: memo.latitude,
                    lng: memo.longitude,
                    address: memo.address,
                    buildingName: memo.buildingName,
                  });
                  onOpenChange(false);
                }}
                data-testid="button-add-new-memo"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.memoDetail.addMemoHere}
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
              {t.common.edit}
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
              {t.common.delete}
            </Button>
          </div>
        </div>
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
