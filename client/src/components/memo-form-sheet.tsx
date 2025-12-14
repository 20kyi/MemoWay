import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Camera, X, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase, GripVertical, Star, Users, ChevronDown } from "lucide-react";
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

import { StarRating } from "@/components/ui/star-rating";

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
  rating: number;
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
  onSubmit: (data: MemoFormValues & { photos: File[]; deletedPhotoIds?: string[]; mainPhotoId?: string; mainPhotoIndex?: number; photoOrders?: { id: string; order: number }[] }) => void | Promise<void>;
  onSubmissionComplete?: () => void; // 제출 완료 시 호출 (성공/실패 관계없이)
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
    rating?: number;
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
  onSubmissionComplete,
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
  const [isSubmitting, setIsSubmitting] = useState(false); // 저장 중 상태 관리
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

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
    rating: z.number().min(0).max(5).default(0),
  });

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoFormSchema),
    defaultValues: {
      buildingName: initialData?.buildingName || "",
      address: initialData?.address || "",
      content: initialData?.content || "",
      groupIds: initialData?.groupIds || [],
      markerIcon: (initialData?.markerIcon as MarkerIconType) || 'default',
      rating: initialData?.rating || 0,
    },
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track if form has been initialized for this open session
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // 모바일에서 모달이 열릴 때 키보드가 자동으로 나오지 않도록 focus 제거
  useEffect(() => {
    if (open) {
      // 모바일 감지
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       (typeof window !== 'undefined' && window.innerWidth < 768);
      
      if (isMobile) {
        // 모든 input, textarea에서 focus 제거
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          activeElement.blur();
        }
        
        // body에 focus를 이동하여 키보드가 나오지 않도록 함
        if (document.body) {
          document.body.focus();
          // body는 focusable이 아니므로, 대신 다른 방법 사용
          const dummyElement = document.createElement('div');
          dummyElement.setAttribute('tabindex', '-1');
          dummyElement.style.position = 'absolute';
          dummyElement.style.left = '-9999px';
          dummyElement.style.opacity = '0';
          document.body.appendChild(dummyElement);
          dummyElement.focus();
          
          // 잠시 후 제거
          setTimeout(() => {
            document.body.removeChild(dummyElement);
          }, 100);
        }
        
        // 추가 안전장치: 모든 input/textarea에 blur 이벤트 강제 실행
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach((input) => {
          if (document.activeElement === input) {
            (input as HTMLElement).blur();
          }
        });
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && scrollContainerRef.current) {
      // 약간의 지연 후 스크롤을 맨 위로 올림
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 50);
    }
  }, [open]);

  useEffect(() => {
    if (open && !isFormInitialized && initialData) {
      // Initialize form only once when opening
      form.reset({
        buildingName: initialData.buildingName || "",
        address: initialData.address || "",
        content: initialData.content || "",
        groupIds: initialData.groupIds || [],
        markerIcon: (initialData.markerIcon as MarkerIconType) || 'default',
        rating: initialData.rating || 0,
      });
      // 폼이 열릴 때 저장 중 상태 초기화
      setIsSubmitting(false);
      
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
      setIsSubmitting(false); // 폼이 닫힐 때 저장 중 상태 초기화
    }
  }, [open, isFormInitialized, initialData, form]);

  // 모바일에서 새 메모 창이 열릴 때 자동 포커스 제거
  useEffect(() => {
    // 빈 useEffect를 남겨두거나, 자동 포커스 로직을 완전히 제거합니다.
    // 사용자의 요청에 따라 자동 포커스를 제거하여 모바일 키보드가 올라오지 않게 합니다.
  }, [open, editMode]);

  // 스와이프 제스처 처리 (모바일에서 아래로 스와이프하여 닫기)
  useEffect(() => {
    if (!open) return;
    
    // SheetContent의 실제 DOM 요소 찾기 (약간의 딜레이를 두어 DOM이 완전히 렌더링된 후 찾기)
    const findSheetContent = () => {
      const content = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
      return content;
    };
    
    // DOM이 렌더링될 때까지 대기
    const timeoutId = setTimeout(() => {
      const sheetContent = findSheetContent();
      if (!sheetContent) return;

      let startY = 0;
      let startTime = 0;
      let isDragging = false;
      let initialScrollTop = 0;

      const handleTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        isDragging = false;
        
        // 스크롤 가능한 영역 찾기
        const scrollableArea = sheetContent.querySelector('[class*="overflow-y-auto"], [class*="overflow-y-scroll"]') as HTMLElement;
        if (scrollableArea) {
          initialScrollTop = scrollableArea.scrollTop;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!startY) return;
        
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        // 스크롤 가능한 영역 확인
        const scrollableArea = sheetContent.querySelector('[class*="overflow-y-auto"], [class*="overflow-y-scroll"]') as HTMLElement;
        
        // 아래로 스와이프만 감지 (양수 = 아래로)
        if (deltaY > 0) {
          // 스크롤 가능한 영역이 있고 스크롤이 맨 위가 아니면 스와이프 무시
          if (scrollableArea && scrollableArea.scrollTop > 0) {
            // 스크롤이 위로 이동하면 스와이프 취소
            if (scrollableArea.scrollTop < initialScrollTop) {
              startY = 0;
              return;
            }
            // 스크롤이 가능한 상태면 스와이프 무시
            return;
          }
          
          isDragging = true;
          
          // Sheet를 아래로 이동시키는 시각적 피드백
          const maxDrag = 200;
          const dragRatio = Math.min(deltaY / maxDrag, 1);
          sheetContent.style.transform = `translateY(${deltaY}px)`;
          sheetContent.style.transition = 'none';
          
          // 배경 투명도 조절
          const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
          if (overlay) {
            overlay.style.opacity = String(0.8 * (1 - dragRatio * 0.5));
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (!startY) return;
        
        const currentY = e.changedTouches[0].clientY;
        const deltaY = currentY - startY;
        const deltaTime = Date.now() - startTime;
        const velocity = deltaTime > 0 ? deltaY / deltaTime : 0;
        
        // 드래그 거리 초기화
        sheetContent.style.transform = '';
        sheetContent.style.transition = '';
        
        const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
        if (overlay) {
          overlay.style.opacity = '';
        }
        
        // 스와이프 감지 조건: 아래로 100px 이상 또는 빠른 속도로 아래로 스와이프
        if (isDragging && (deltaY > 100 || (deltaY > 50 && velocity > 0.3))) {
          onOpenChange(false);
        }
        
        startY = 0;
        isDragging = false;
      };

      sheetContent.addEventListener('touchstart', handleTouchStart, { passive: true });
      sheetContent.addEventListener('touchmove', handleTouchMove, { passive: true });
      sheetContent.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        sheetContent.removeEventListener('touchstart', handleTouchStart);
        sheetContent.removeEventListener('touchmove', handleTouchMove);
        sheetContent.removeEventListener('touchend', handleTouchEnd);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [open, onOpenChange]);

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

  const handleSubmit = async (data: MemoFormValues) => {
    // 이미 저장 중이면 중복 실행 방지
    if (isSubmitting) {
      console.warn("[EDIT MEMO] Already submitting, ignoring duplicate submit");
      return;
    }
    
    console.log("[EDIT MEMO] handleSubmit called", { 
      editMode, 
      data, 
      photoItemsCount: photoItems.length,
      deletedPhotoIdsCount: deletedPhotoIds.length 
    });
    
    setIsSubmitting(true); // 저장 시작
    
    try {
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

      const submitData = { 
        ...data, 
        photos: newPhotos, 
        deletedPhotoIds, 
        mainPhotoId,
        mainPhotoIndex,
        photoOrders
      };
      
      console.log("[EDIT MEMO] calling onSubmit with data", submitData);
      
      if (!onSubmit) {
        console.error("[EDIT MEMO] onSubmit handler is not provided!");
        setIsSubmitting(false);
        return;
      }
      
      // onSubmit 호출 (Promise를 반환할 수도 있음)
      const result = onSubmit(submitData);
      
      // Promise인 경우 await
      if (result && typeof result === 'object' && 'then' in result) {
        try {
          await (result as Promise<void>);
          console.log("[EDIT MEMO] onSubmit promise resolved successfully");
          // 성공 시에는 폼이 닫히므로 isSubmitting은 자동으로 초기화됨
          // 하지만 폼이 닫히지 않는 경우를 대비해 onSubmissionComplete 호출
          onSubmissionComplete?.();
        } catch (submitError: any) {
          console.error("[EDIT MEMO] onSubmit promise rejected", submitError);
          setIsSubmitting(false); // 에러 발생 시 상태 해제
          onSubmissionComplete?.(); // 에러 발생 시에도 호출
          throw submitError; // 에러를 다시 던져서 form이 처리할 수 있도록
        }
      } else {
        console.log("[EDIT MEMO] onSubmit called (synchronous)");
        // 동기 함수인 경우, 완료되었다고 가정
        onSubmissionComplete?.();
      }
      
      console.log("[EDIT MEMO] onSubmit called successfully");
    } catch (error: any) {
      console.error("[EDIT MEMO] handleSubmit error", error);
      setIsSubmitting(false); // 에러 발생 시 상태 해제
      onSubmissionComplete?.(); // 에러 발생 시에도 호출
      // 에러를 다시 던져서 form의 onSubmit에서 처리할 수 있도록
      throw error;
    }
  };

  return (
    <Sheet 
      open={open} 
      onOpenChange={onOpenChange} 
      modal={true}
      onOpenAutoFocus={(e) => {
        // 모바일에서 자동 focus를 방지하여 키보드가 나오지 않도록 함
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         (typeof window !== 'undefined' && window.innerWidth < 768);
        if (isMobile) {
          e.preventDefault();
        }
      }}
    >
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-2xl sm:rounded-t-3xl p-0 flex flex-col [&>button]:cursor-default touch-pan-y"
      >
        <div className="w-12 h-1 bg-indigo-300/50 rounded-full mx-auto mt-3 mb-4" />
        
        <div className="px-4 sm:px-5 flex-shrink-0 pb-2">
            <SheetHeader className="mb-4">
            <SheetTitle className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-white">{editMode ? t.memoForm.editMemo : t.memoForm.newMemo}</SheetTitle>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form 
            onSubmit={async (e) => {
              console.log("[EDIT MEMO] form onSubmit event triggered");
              e.preventDefault();
              e.stopPropagation();
              
              // 이미 저장 중이면 무시
              if (isSubmitting) {
                console.warn("[EDIT MEMO] Already submitting, preventing form submit");
                return;
              }
              
              // 버튼이 disabled 상태인지 확인
              const saveButton = e.currentTarget.querySelector('[data-testid="button-save-memo"]') as HTMLButtonElement;
              if (saveButton && saveButton.disabled) {
                console.warn("[EDIT MEMO] Save button is disabled, preventing submit");
                return;
              }
              
              try {
                await form.handleSubmit(
                  async (data) => {
                    console.log("[EDIT MEMO] form validation passed, calling handleSubmit");
                    try {
                      await handleSubmit(data);
                    } catch (submitError: any) {
                      console.error("[EDIT MEMO] handleSubmit threw error", submitError);
                      setIsSubmitting(false);
                      // 에러는 여기서 처리하지 않고 상위로 전파
                      throw submitError;
                    }
                  },
                  (errors) => {
                    console.error("[EDIT MEMO] form validation failed", errors);
                    setIsSubmitting(false); // validation 실패 시 상태 해제
                    // validation 실패 시 사용자에게 알림
                    const firstError = Object.values(errors)[0];
                    if (firstError && 'message' in firstError) {
                      console.error("[EDIT MEMO] First validation error:", firstError.message);
                    }
                  }
                )(e);
              } catch (error: any) {
                console.error("[EDIT MEMO] Form submit error:", error);
                // 에러 발생 시 isSubmitting 상태 해제
                setIsSubmitting(false);
                // 에러를 다시 던지지 않음 (이미 로그에 기록됨)
              }
            }} 
            className="flex flex-col flex-1 min-h-0"
          >
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-4 sm:px-5 space-y-4 pb-4"
            >
              <FormField
                control={form.control}
                name="buildingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-white">{t.memoForm.buildingName}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={t.memoForm.buildingNamePlaceholder} 
                        className="text-sm h-11 border-indigo-200 focus:border-sky-500 focus:ring-sky-500" 
                        data-testid="input-building-name"
                      />
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
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-white">{t.memoForm.address}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t.memoForm.addressPlaceholder} className="text-sm h-11 border-indigo-200 focus:border-sky-500 focus:ring-sky-500" data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-white">{t.memoForm.photos}</FormLabel>
                <p className="text-xs text-gray-500 dark:text-white/80 mt-1 mb-3">
                  {t.memoForm.photoOrderHint}
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
                        <label className="aspect-square border-2 border-dashed border-indigo-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-indigo-50/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoChange}
                            className="hidden"
                            data-testid="input-photo-upload"
                          />
                          <Camera className="h-6 w-6 text-indigo-400" />
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
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-white">{t.memoForm.content}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        ref={(e) => {
                          field.ref(e);
                          contentInputRef.current = e;
                        }}
                        placeholder={t.memoForm.contentPlaceholder} 
                        className="min-h-24 sm:min-h-28 resize-none text-sm border-indigo-200 focus:border-sky-500 focus:ring-sky-500"
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
                    <FormLabel className="text-sm text-gray-700 dark:text-white">{t.memoForm.markerIcon}</FormLabel>
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
                              className={`h-auto py-2 sm:py-2.5 flex flex-col items-center gap-0.5 sm:gap-1 ${
                                isSelected 
                                  ? 'bg-gradient-to-br from-primary-200 to-primary-300 hover:from-primary-300 hover:to-primary-400 border-2 border-primary-300/60 text-primary-700' 
                                  : ''
                              }`}
                              onClick={() => field.onChange(type)}
                              data-testid={`button-marker-${type}`}
                            >
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isSelected ? 'text-primary-700' : ''}`} />
                              <span className={`text-[10px] sm:text-xs ${isSelected ? 'text-primary-700 font-medium' : ''}`}>{t.categories[type]}</span>
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
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-white">{t.memoForm.rating}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3 p-3 border rounded-lg border-indigo-200 bg-white/50">
                        <StarRating
                          value={field.value}
                          onChange={field.onChange}
                          size="lg"
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {field.value > 0 ? t.memoForm.ratingScore.replace('{score}', field.value.toString()) : t.memoForm.noRating}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                  control={form.control}
                  name="groupIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-700 dark:text-white">{t.memoForm.groupShare}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between h-11 text-sm border-indigo-200 hover:bg-indigo-50"
                              data-testid="button-group-select"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Users className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 text-left truncate">
                                  {field.value && field.value.length > 0
                                    ? field.value.length === 1
                                      ? groups.find(g => g.id === field.value[0])?.name || t.memoForm.selectGroup
                                      : t.memoForm.groupsSelected.replace('{count}', field.value.length.toString())
                                    : t.common.personalMemo}
                                </span>
                                {field.value && field.value.length > 0 && (
                                  <Badge variant="secondary" className="px-1.5 h-5 text-xs flex-shrink-0">
                                    {field.value.length}
                                  </Badge>
                                )}
                              </div>
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <div className="max-h-[300px] overflow-y-auto p-2">
                            <div className="space-y-1.5">
                              {/* 개인 메모 옵션 (항상 맨 위에 표시) */}
                              <div
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer border-b border-border/50 pb-3 mb-2"
                                onClick={() => {
                                  // 개인 메모 선택 시: 모든 그룹 선택 해제
                                  field.onChange([]);
                                }}
                                data-testid="option-personal-memo"
                              >
                                <Checkbox
                                  checked={!field.value || field.value.length === 0}
                                  onCheckedChange={(checked) => {
                                    // 개인 메모 선택 시: 모든 그룹 선택 해제
                                    if (checked) {
                                      field.onChange([]);
                                    }
                                  }}
                                  data-testid="checkbox-personal-memo"
                                />
                                <label className="flex-1 text-sm font-normal cursor-pointer font-medium">
                                  {t.common.personalMemo}
                                </label>
                              </div>
                              {/* 그룹 메모 옵션들 */}
                              {groups.filter(g => g.name !== "개인 메모").map(group => (
                                <div
                                  key={group.id}
                                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                  onClick={() => {
                                    const value = field.value || [];
                                    const isSelected = value.includes(group.id);
                                    field.onChange(
                                      isSelected
                                        ? value.filter(id => id !== group.id)
                                        : [...value, group.id]
                                    );
                                  }}
                                  data-testid={`option-group-${group.id}`}
                                >
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
                                  <label className="flex-1 text-sm font-normal cursor-pointer">
                                    {group.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              {!isPersonalMemberReady && !currentMemberId && (
                <div className="p-2 sm:p-2.5 bg-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t.memoForm.personalMemoPreparing}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-4 sm:px-5 py-4 border-t border-indigo-200/50 bg-gradient-to-br from-indigo-50/50 to-white flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1 h-11 text-sm font-medium border-indigo-200 hover:bg-indigo-50"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {t.common.cancel}
              </Button>
              <Button 
                type="submit" 
                size="lg"
                className="flex-1 h-11 text-sm font-medium bg-gradient-to-br from-sky-200 to-sky-300 hover:from-sky-300 hover:to-sky-400 border-2 border-sky-300/60 text-sky-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || isSubmitting || (!isPersonalMemberReady && !currentMemberId)}
                onClick={(e) => {
                  console.log("[EDIT MEMO] save button clicked", { 
                    isLoading, 
                    isSubmitting,
                    isPersonalMemberReady, 
                    currentMemberId,
                    editMode,
                    formState: form.formState,
                    isValid: form.formState.isValid,
                    errors: form.formState.errors
                  });
                  
                  // 모바일에서 form submit이 제대로 작동하지 않을 수 있으므로
                  // 버튼 클릭 시 직접 form submit 트리거
                  if (!isLoading && !isSubmitting && (isPersonalMemberReady || currentMemberId)) {
                    // form의 handleSubmit을 직접 호출
                    const formElement = e.currentTarget.closest('form');
                    if (formElement) {
                      // form submit 이벤트를 트리거
                      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                      formElement.dispatchEvent(submitEvent);
                    }
                  }
                }}
                data-testid="button-save-memo"
              >
                {(isLoading || isSubmitting) ? `${t.common.save}...` : t.common.save}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
