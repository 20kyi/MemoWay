import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, X } from "lucide-react";

const memoFormSchema = z.object({
  buildingName: z.string().min(1, "건물명을 입력하세요"),
  address: z.string().min(1, "주소를 입력하세요"),
  content: z.string().min(1, "메모를 입력하세요"),
  groupIds: z.array(z.string()).default([]),
});

type MemoFormValues = z.infer<typeof memoFormSchema>;

interface MemoFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MemoFormValues & { photos: File[] }) => void;
  initialData?: {
    buildingName: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null;
  groups: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export function MemoFormSheet({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData, 
  groups,
  isLoading = false 
}: MemoFormSheetProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoFormSchema),
    defaultValues: {
      buildingName: initialData?.buildingName || "",
      address: initialData?.address || "",
      content: "",
      groupIds: [],
    },
  });

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

  const handleSubmit = (data: MemoFormValues) => {
    onSubmit({ ...data, photos });
    form.reset();
    setPhotos([]);
    setPhotoPreviews([]);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="w-12 h-1 bg-muted rounded-full mx-auto mt-4 mb-6" />
        
        <div className="px-6 pb-6 h-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">새 메모 추가</SheetTitle>
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
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
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
                </div>
              </div>

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

              {groups.length > 0 && (
                <FormField
                  control={form.control}
                  name="groupIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>그룹 공유</FormLabel>
                      <div className="space-y-2">
                        {groups.map(group => (
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
                  disabled={isLoading}
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
