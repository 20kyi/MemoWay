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
import { Camera, X, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase } from "lucide-react";
import { markerIconTypes, type MarkerIconType } from "@shared/schema";

const MARKER_ICONS: Array<{ type: MarkerIconType; name: string; icon: any }> = [
  { type: 'default', name: '기본', icon: MapPin },
  { type: 'travel', name: '여행', icon: Plane },
  { type: 'love', name: '사랑', icon: Heart },
  { type: 'food', name: '맛집', icon: Utensils },
  { type: 'cafe', name: '카페', icon: Coffee },
  { type: 'shopping', name: '쇼핑', icon: ShoppingBag },
  { type: 'sport', name: '운동', icon: Trophy },
  { type: 'work', name: '업무', icon: Briefcase },
];

const memoFormSchema = z.object({
  buildingName: z.string().min(1, "건물명을 입력하세요"),
  address: z.string().min(1, "주소를 입력하세요"),
  content: z.string().min(1, "메모를 입력하세요"),
  groupIds: z.array(z.string()).optional().default([]),
  markerIcon: z.enum(markerIconTypes).default('default'),
});

type MemoFormValues = z.infer<typeof memoFormSchema>;

interface MemoFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MemoFormValues & { photos: File[]; deletedPhotoIds?: string[] }) => void;
  initialData?: {
    buildingName: string;
    address: string;
    latitude: number;
    longitude: number;
    content?: string;
    groupIds?: string[];
    markerIcon?: string;
    existingPhotos?: Array<{ id: string; url: string }>;
  } | null;
  groups: Array<{ id: string; name: string }>;
  isLoading?: boolean;
  isPersonalMemberReady: boolean;
  currentMemberId: string | null;
  editMode?: boolean;
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<{ id: string; url: string }>>(
    initialData?.existingPhotos || []
  );
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);

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

  // Update form when initialData changes
  useEffect(() => {
    if (initialData && open) {
      form.reset({
        buildingName: initialData.buildingName || "",
        address: initialData.address || "",
        content: initialData.content || "",
        groupIds: initialData.groupIds || [],
        markerIcon: (initialData.markerIcon as MarkerIconType) || 'default',
      });
      setExistingPhotos(initialData.existingPhotos || []);
      setDeletedPhotoIds([]);
      setPhotos([]);
      setPhotoPreviews([]);
    }
  }, [initialData, open, form]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
      
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (photoId: string) => {
    setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    setDeletedPhotoIds(prev => [...prev, photoId]);
  };

  const handleSubmit = (data: MemoFormValues) => {
    onSubmit({ ...data, photos, deletedPhotoIds });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-4 mb-6" />
        
        <div className="px-6 pb-6 h-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">{editMode ? "메모 편집" : "새 메모 추가"}</SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="buildingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>건물명</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="건물명" data-testid="input-building-name" />
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
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="주소" data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>사진</FormLabel>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square">
                      <img src={photo.url} alt="Existing photo" className="w-full h-full object-cover rounded-lg" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                        onClick={() => removeExistingPhoto(photo.id)}
                        data-testid={`button-remove-existing-photo-${photo.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {photoPreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative aspect-square">
                      <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-lg" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                        onClick={() => removePhoto(index)}
                        data-testid={`button-remove-photo-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {(existingPhotos.length + photoPreviews.length) < 10 && (
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
              </div>

              <FormField
                control={form.control}
                name="markerIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>마커 아이콘</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-2">
                        {MARKER_ICONS.map((markerIcon) => {
                          const Icon = markerIcon.icon;
                          const isSelected = field.value === markerIcon.type;
                          return (
                            <Button
                              key={markerIcon.type}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className="h-auto py-3 flex flex-col items-center gap-1"
                              onClick={() => field.onChange(markerIcon.type)}
                              data-testid={`button-marker-${markerIcon.type}`}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="text-xs">{markerIcon.name}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="메모를 입력하세요" 
                        className="min-h-32 resize-none"
                        data-testid="input-memo-content"
                      />
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
                      <FormLabel>그룹 공유 (선택 안 하면 개인 메모)</FormLabel>
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

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isLoading || (!isPersonalMemberReady && !currentMemberId)}
                  data-testid="button-save-memo"
                >
                  {isLoading ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
