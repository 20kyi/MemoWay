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

type MemoFormValues = {
  buildingName: string;
  address: string;
  content: string;
  groupIds: string[];
  markerIcon: MarkerIconType;
};

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
      className="relative aspect-square bg-card rounded-md sm:rounded-lg overflow-hidden border border-border"
      data-testid={`photo-item-${photo.id}`}
    >
      <img src={photo.url} alt="Photo" className="w-full h-full object-cover" />
      
      {photo.order === 0 && (
        <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 bg-primary text-primary-foreground px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 sm:gap-1">
          <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
          <span className="hidden sm:inline">대표</span>
        </div>
      )}
      
      <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex gap-0.5 sm:gap-1">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-5 w-5 sm:h-6 sm:w-6 rounded-full cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          data-testid={`button-drag-photo-${photo.id}`}
        >
          <GripVertical className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-5 w-5 sm:h-6 sm:w-6 rounded-full"
          onClick={onRemove}
          data-testid={`button-remove-photo-${photo.id}`}
        >
          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl sm:rounded-t-3xl p-0 flex flex-col [&>button]:cursor-default">
        <div className="w-12 h-1 bg-pink-300/50 rounded-full mx-auto mt-3 mb-4" />
        
        <div className="px-4 sm:px-5 flex-shrink-0 pb-2">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-xl sm:text-2xl font-bold text-[#9333ea]">{editMode ? t.memoForm.editMemo : t.memoForm.newMemo}</SheetTitle>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 space-y-4 pb-4">
              <FormField
                control={form.control}
                name="buildingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">{t.memoForm.buildingName}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t.memoForm.buildingNamePlaceholder} className="text-sm h-11 border-pink-200 focus:border-[#9333ea] focus:ring-[#9333ea]" data-testid="input-building-name" />
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
                    <FormLabel className="text-sm font-medium text-gray-700">{t.memoForm.address}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t.memoForm.addressPlaceholder} className="text-sm h-11 border-pink-200 focus:border-[#9333ea] focus:ring-[#9333ea]" data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-sm font-medium text-gray-700">{t.memoForm.photos}</FormLabel>
                <p className="text-xs text-gray-500 mt-1 mb-3">
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
                        <label className="aspect-square border-2 border-dashed border-pink-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-pink-50/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoChange}
                            className="hidden"
                            data-testid="input-photo-upload"
                          />
                          <Camera className="h-6 w-6 text-pink-400" />
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
                    <FormLabel className="text-sm font-medium text-gray-700">{t.memoForm.content}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t.memoForm.contentPlaceholder} 
                        className="min-h-24 sm:min-h-28 resize-none text-sm border-pink-200 focus:border-[#9333ea] focus:ring-[#9333ea]"
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
                    <FormLabel className="text-sm">{t.memoForm.markerIcon}</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                          const Icon = MARKER_ICON_COMPONENTS[type];
                          const isSelected = field.value === type;
                          return (
                            <Button
                              key={type}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className="h-auto py-2 sm:py-2.5 flex flex-col items-center gap-0.5 sm:gap-1"
                              onClick={() => field.onChange(type)}
                              data-testid={`button-marker-${type}`}
                            >
                              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="text-[10px] sm:text-xs">{t.categories[type]}</span>
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
                      <FormLabel className="text-sm">{t.memoForm.groupShare}</FormLabel>
                      <div className="space-y-1.5 sm:space-y-2">
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
                                <FormLabel className="font-normal cursor-pointer text-sm">
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
                <div className="p-2 sm:p-2.5 bg-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground">개인 메모 준비 중...</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-4 sm:px-5 py-4 border-t border-pink-200/50 bg-gradient-to-br from-pink-50/50 to-white flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1 h-11 text-sm font-medium border-pink-200 hover:bg-pink-50"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {t.common.cancel}
              </Button>
              <Button 
                type="submit" 
                size="lg"
                className="flex-1 h-11 text-sm font-medium bg-[#9333ea] hover:bg-[#7e22ce] text-white"
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
