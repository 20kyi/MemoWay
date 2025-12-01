import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <SheetContent side="bottom" className="min-h-[50vh] max-h-[90vh] h-auto rounded-t-2xl sm:rounded-t-3xl p-0 flex flex-col [&>button]:cursor-default bg-gradient-to-br from-blue-50/30 to-white">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col h-full min-h-[50vh] relative w-full">
            {/* 드래그 핸들 */}
            <div className="w-12 h-1 bg-indigo-300/50 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" />

            {/* 헤더 영역 */}
            <div className="px-4 sm:px-5 pt-2 pb-4 flex-shrink-0">
              <SheetHeader className="pr-12 sm:pr-14">
                <div className="flex items-center gap-2 mb-3">
                  <SheetTitle className="text-lg sm:text-xl md:text-2xl font-bold text-sky-600 dark:text-sky-500 truncate flex-1" data-testid="text-memo-title">
                    {memo.buildingName}
                  </SheetTitle>
                  {onNavigateToLocation && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 text-sky-600 dark:text-sky-500 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20"
                      onClick={() => {
                        onNavigateToLocation(memo.latitude, memo.longitude);
                        onOpenChange(false);
                      }}
                      data-testid="button-navigate-to-location"
                    >
                      <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate flex-1" data-testid="text-memo-address">{memo.address}</span>
                </div>
              </SheetHeader>
            </div>

            {/* 내용 영역 - 스크롤 가능 */}
            <div className="px-4 sm:px-5 overflow-y-auto flex-1 min-h-0 flex-grow">
              <div className="space-y-4 pb-4">
                {/* 사진 섹션 */}
                {memo.photos && memo.photos.length > 0 && (
                  <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 backdrop-blur-sm border border-indigo-200/50 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                        {t.memoDetail.photos}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {memo.photos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            className="relative rounded-xl sm:rounded-2xl border border-indigo-200/50 bg-white/50 p-1.5 sm:p-2 hover:bg-indigo-50/50 active:bg-indigo-50 transition-all hover:shadow-md"
                            onClick={() => setSelectedPhoto(photo.url)}
                            data-testid={`container-photo-${photo.id}`}
                          >
                            <img
                              src={photo.url}
                              alt={t.memoDetail.photos}
                              className="w-full h-20 sm:h-28 object-cover rounded-lg sm:rounded-xl"
                              data-testid={`img-photo-${photo.id}`}
                            />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 메모 내용 섹션 */}
                <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50/50 via-white to-pink-50/30 backdrop-blur-sm border border-pink-200/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
                      {t.memoDetail.content}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p 
                      className="leading-relaxed whitespace-pre-wrap text-sm sm:text-base break-words text-foreground" 
                      style={{ fontSize: 'var(--font-size-base, 14px)' }}
                      data-testid="text-memo-content"
                    >
                      {memo.content}
                    </p>
                  </CardContent>
                </Card>

                {/* 메타데이터 섹션 */}
                <Card className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-50/50 via-white to-slate-50/30 backdrop-blur-sm border border-slate-200/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">정보</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.author}</p>
                        <p className="font-semibold text-sm sm:text-base text-foreground truncate" data-testid="text-memo-author">{memo.member.name}</p>
                      </div>
                    </div>

                    {memo.group && memo.editorMember && memo.editorMember.id !== memo.member.id && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 border border-blue-200 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.editor}</p>
                          <p className="font-semibold text-sm sm:text-base text-foreground truncate" data-testid="text-memo-editor">{memo.editorMember.name}</p>
                        </div>
                      </div>
                    )}

                    {memo.group && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.group}</p>
                          <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-0.5 mt-1" data-testid="badge-memo-group">
                            {memo.group.name}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">{t.memoDetail.created}</p>
                        <p className="text-sm sm:text-base text-foreground truncate" data-testid="text-memo-created">
                          {format(new Date(memo.createdAt), "PPP p", { locale: dateLocale })}
                        </p>
                      </div>
                    </div>

                    {memo.updatedAt && new Date(memo.updatedAt).getTime() !== new Date(memo.createdAt).getTime() && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">{t.common.edit}</p>
                          <p className="text-sm sm:text-base text-foreground truncate" data-testid="text-memo-updated">
                            {format(new Date(memo.updatedAt), "PPP p", { locale: dateLocale })}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 하단 고정 영역 - 액션 버튼들 */}
            {(onAddNewMemo || onEdit || onDelete) && (
              <div className="mt-auto flex-shrink-0 px-4 sm:px-5 py-4 border-t border-indigo-200/50 bg-gradient-to-br from-indigo-50/30 to-white">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {onAddNewMemo && (
                    <Button
                      size="lg"
                      onClick={() => {
                        onAddNewMemo({
                          lat: memo.latitude,
                          lng: memo.longitude,
                          address: memo.address,
                          buildingName: memo.buildingName,
                        });
                        onOpenChange(false);
                      }}
                      className="h-11 sm:h-12 text-sm sm:text-base font-medium bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white flex-1 sm:flex-initial shadow-md hover:shadow-lg transition-all"
                      data-testid="button-add-memo"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {t.memoDetail.addMemoHere}
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        onEdit(memo.id);
                        onOpenChange(false);
                      }}
                      className="h-11 sm:h-12 text-sm sm:text-base font-medium border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 flex-1 sm:flex-initial shadow-sm hover:shadow-md transition-all"
                      data-testid="button-edit-memo"
                    >
                      <Edit className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {t.common.edit}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={() => {
                        if (confirm(t.memoDetail.confirmDelete)) {
                          onDelete(memo.id);
                          onOpenChange(false);
                        }
                      }}
                      className="h-11 sm:h-12 text-sm sm:text-base font-medium flex-1 sm:flex-initial shadow-sm hover:shadow-md transition-all"
                      data-testid="button-delete-memo"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {t.common.delete}
                    </Button>
                  )}
                </div>
              </div>
            )}
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
