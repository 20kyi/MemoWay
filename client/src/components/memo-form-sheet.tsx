/**
 * 메모 생성/수정 폼 시트 컴포넌트
 * 
 * 주요 기능:
 * - 새 메모 생성 또는 기존 메모 수정
 * - 위치 정보 입력 (건물명, 주소)
 * - 메모 내용 작성
 * - 사진 업로드 (드래그 앤 드롭으로 순서 변경 가능)
 * - 대표 사진 설정
 * - 그룹 선택 (여러 그룹에 동시에 공유 가능)
 * - 카테고리 선택 (마커 아이콘)
 * 
 * 하단에서 슬라이드 업되는 시트 형태의 모달입니다.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, X, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase, GripVertical, Star } from "lucide-react";
import { markerIconTypes, type MarkerIconType } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 마커 아이콘 타입별 Lucide 아이콘 컴포넌트 매핑
const MARKER_ICON_COMPONENTS: Record<MarkerIconType, any> = {
  default: MapPin,
  travel: Plane,
  love: Heart,
  food: Utensils,
  cafe: Coffee,
  shopping: ShoppingBag,
  sport: Trophy,
  work: Briefcase,
};

// 메모 폼 데이터 타입
type MemoFormValues = {
  buildingName: string;
  address: string;
  content: string;
  groupIds: string[];
  markerIcon: MarkerIconType;
};

// 사진 아이템 타입 (새로 업로드한 파일 또는 기존 사진)
type PhotoItem = {
  id: string;
  url: string;
  file?: File;
  isExisting: boolean;
  order: number;
};

interface MemoFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MemoFormValues & { photos: File[]; deletedPhotoIds?: string[]; mainPhotoId?: string; mainPhotoIndex?: number; photoOrders?: { id: string; order: number }[] }) => void;
  initialData?: {
    buildingName: string;
    address: string;
    latitude: number;
    longitude: number;
    content?: string;
    groupIds?: string[];
    markerIcon?: string;
    mainPhotoId?: string;
    existingPhotos?: Array<{ id: string; url: string; order?: number }>;
  } | null;
  groups: Array<{ id: string; name: string }>;
  isLoading?: boolean;
  isPersonalMemberReady: boolean;
  currentMemberId: string | null;
  editMode?: boolean;
}

/**
 * 드래그 가능한 사진 아이템 컴포넌트
 * dnd-kit을 사용하여 사진 순서를 변경할 수 있습니다.
 */
function SortablePhotoItem({ photo, onRemove }: { photo: PhotoItem; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square bg-card rounded-lg overflow-hidden border-2 border-border"
      data-testid={`photo-item-${photo.id}`}
    >
      <img src={photo.url} alt="Photo" className="w-full h-full object-cover" />
      
      {photo.order === 0 && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
          <Star className="h-3 w-3 fill-current" />
          대표
        </div>
      )}
      
      <div className="absolute top-1 right-1 flex gap-1">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-6 w-6 rounded-full cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          data-testid={`button-drag-photo-${photo.id}`}
        >
          <GripVertical className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-6 w-6 rounded-full"
          onClick={onRemove}
          data-testid={`button-remove-photo-${photo.id}`}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function MemoFormSheet({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData, 
  groups,
  isLoading = false,
  isPersonalMemberReady,
  currentMemberId,
  editMode = false
}: MemoFormSheetProps) {
  const { t } = useLanguage();
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const memoFormSchema = z.object({
    buildingName: z.string().min(1, t.memoForm.buildingName),
    address: z.string().min(1, t.memoForm.address),
    content: z.string().min(1, t.memoForm.content),
    groupIds: z.array(z.string()).optional().default([]),
    markerIcon: z.enum(markerIconTypes).default('default'),
  });

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoFormSchema),
    defaultValues: {
      buildingName: initialData?.buildingName || "",
      address: initialData?.address || "",
      content: initialData?.content || "",
      groupIds: initialData?.groupIds || [],
      markerIcon: (initialData?.markerIcon as MarkerIconType) || 'default',
    },
  });

  // Track if form has been initialized for this open session
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  useEffect(() => {
    if (open && !isFormInitialized && initialData) {
      // Initialize form only once when opening
      form.reset({
        buildingName: initialData.buildingName || "",
        address: initialData.address || "",
        content: initialData.content || "",
        groupIds: initialData.groupIds || [],
        markerIcon: (initialData.markerIcon as MarkerIconType) || 'default',
      });
      
      const existingPhotoItems: PhotoItem[] = (initialData.existingPhotos || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((photo, index) => ({
          id: photo.id,
          url: photo.url,
          isExisting: true,
          order: index,
        }));
      
      setPhotoItems(existingPhotoItems);
      setDeletedPhotoIds([]);
      setIsFormInitialized(true);
    } else if (!open) {
      // Reset when closing
      setPhotoItems([]);
      setDeletedPhotoIds([]);
      setIsFormInitialized(false);
    }
  }, [open, isFormInitialized, initialData, form]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const currentMaxOrder = photoItems.length > 0 
        ? Math.max(...photoItems.map(p => p.order)) 
        : -1;
      
      newFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newPhotoItem: PhotoItem = {
            id: `new-${Date.now()}-${index}`,
            url: reader.result as string,
            file,
            isExisting: false,
            order: currentMaxOrder + index + 1,
          };
          setPhotoItems(prev => [...prev, newPhotoItem]);
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = '';
  };

  const removePhoto = (photoId: string) => {
    const photo = photoItems.find(p => p.id === photoId);
    if (photo?.isExisting) {
      setDeletedPhotoIds(prev => [...prev, photoId]);
    }
    
    setPhotoItems(prev => {
      const filtered = prev.filter(p => p.id !== photoId);
      return filtered.map((p, index) => ({ ...p, order: index }));
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPhotoItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, order: index }));
      });
    }
  };

  const handleSubmit = (data: MemoFormValues) => {
    const newPhotos = photoItems
      .filter(p => !p.isExisting && p.file)
      .sort((a, b) => a.order - b.order)
      .map(p => p.file!);
    
    const mainPhotoId = photoItems.length > 0 && photoItems[0].isExisting 
      ? photoItems[0].id 
      : undefined;
    
    const mainPhotoIndex = photoItems.length > 0 && !photoItems[0].isExisting
      ? 0
      : undefined;

    const photoOrders = photoItems
      .filter(p => p.isExisting)
      .map(p => ({ id: p.id, order: p.order }));

    onSubmit({ 
      ...data, 
      photos: newPhotos, 
      deletedPhotoIds, 
      mainPhotoId,
      mainPhotoIndex,
      photoOrders
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-4 mb-6" />
        
        <div className="px-6 flex-shrink-0">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">{editMode ? t.memoForm.editMemo : t.memoForm.newMemo}</SheetTitle>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-4">
              <FormField
                control={form.control}
                name="buildingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.memoForm.buildingName}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t.memoForm.buildingNamePlaceholder} data-testid="input-building-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.memoForm.address}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t.memoForm.addressPlaceholder} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>{t.memoForm.photos}</FormLabel>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  첫 번째 사진이 대표 사진으로 표시됩니다. 드래그하여 순서를 변경할 수 있습니다.
                </p>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={photoItems.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {photoItems.map((photo) => (
                        <SortablePhotoItem
                          key={photo.id}
                          photo={photo}
                          onRemove={() => removePhoto(photo.id)}
                        />
                      ))}
                      {photoItems.length < 10 && (
                        <label className="aspect-square border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover-elevate">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoChange}
                            className="hidden"
                            data-testid="input-photo-upload"
                          />
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </label>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.memoForm.content}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t.memoForm.contentPlaceholder} 
                        className="min-h-32 resize-none"
                        data-testid="input-memo-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="markerIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.memoForm.markerIcon}</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-2">
                        {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                          const Icon = MARKER_ICON_COMPONENTS[type];
                          const isSelected = field.value === type;
                          return (
                            <Button
                              key={type}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className="h-auto py-3 flex flex-col items-center gap-1"
                              onClick={() => field.onChange(type)}
                              data-testid={`button-marker-${type}`}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="text-xs">{t.categories[type]}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {groups.filter(g => g.name !== "개인 메모").length > 0 && (
                <FormField
                  control={form.control}
                  name="groupIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t.memoForm.groupShare}</FormLabel>
                      <div className="space-y-2">
                        {groups.filter(g => g.name !== "개인 메모").map(group => (
                          <FormField
                            key={group.id}
                            control={form.control}
                            name="groupIds"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(group.id)}
                                    onCheckedChange={(checked) => {
                                      const value = field.value || [];
                                      field.onChange(
                                        checked
                                          ? [...value, group.id]
                                          : value.filter(id => id !== group.id)
                                      );
                                    }}
                                    data-testid={`checkbox-group-${group.id}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {group.name}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {!isPersonalMemberReady && !currentMemberId && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">개인 메모 준비 중...</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t bg-background flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {t.common.cancel}
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isLoading || (!isPersonalMemberReady && !currentMemberId)}
                data-testid="button-save-memo"
              >
                {isLoading ? `${t.common.save}...` : t.common.save}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
