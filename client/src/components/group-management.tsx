import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Share2, Users, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase, Copy, Crown, Trash2, Settings, UserMinus, RefreshCw, Edit, Search, X, DoorOpen, Coins, AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { markerIconTypes, type MarkerIconType, type MemoWithDetails } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";
import { MemoList } from "@/components/memo-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type GroupFormValues = {
  name: string;
  description: string;
  memberName: string;
  color: string;
  markerIcon: MarkerIconType;
};

type EditGroupFormValues = {
  name: string;
  description: string;
  color: string;
  markerIcon: MarkerIconType;
};

const PRESET_COLORS = [
  { key: 'rose', value: '#ffb3d9' },
  { key: 'pink', value: '#ffc0e8' },
  { key: 'lavender', value: '#d4b5ff' },
  { key: 'peach', value: '#ffd4b3' },
  { key: 'mint', value: '#b3f5d9' },
  { key: 'sky', value: '#b3e5ff' },
  { key: 'lilac', value: '#e8d4ff' },
  { key: 'coral', value: '#ffccb3' },
] as const;

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

interface Group {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  color: string;
  markerIcon?: string;
  maxMembers?: number;
  members: Array<{ id: string; name: string; role: string; userId: string | null; canEditGroupMemos: boolean }>;
  memoCount?: number;
}

interface GroupManagementProps {
  groups: Group[];
  memos?: MemoWithDetails[];
  onCreateGroup: (data: { name: string; description?: string; memberName: string; color: string; markerIcon: string }) => void;
  onUpdateGroup?: (groupId: string, data: { name: string; description?: string; color: string; markerIcon: string }) => void;
  onJoinGroup: (inviteCode: string, memberName: string) => void;
  onLeaveGroup: (groupId: string, memberId: string) => void;
  onCopyGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onRemoveMember?: (groupId: string, memberId: string) => void;
  onTransferLeadership?: (groupId: string, newLeaderId: string) => void;
  onUpdateMemberPermissions?: (groupId: string, memberId: string, canEditGroupMemos: boolean) => void;
  myMemberIds: string[];
  personalMemberId?: string | null;
  userId?: string;
  userPoints?: number;
  isLoading?: boolean;
  onEditMemo?: (memoId: string) => void;
  onDeleteMemo?: (memoId: string) => void;
  onMemoClick?: (memoId: string) => void;
  onSetMainMemo?: (memoId: string) => void;
}

export function GroupManagement({ groups, memos = [], onCreateGroup, onUpdateGroup, onJoinGroup, onLeaveGroup, onCopyGroup, onDeleteGroup, onRemoveMember, onTransferLeadership, onUpdateMemberPermissions, myMemberIds, personalMemberId, userId, userPoints = 0, isLoading = false, onEditMemo, onDeleteMemo, onMemoClick, onSetMainMemo }: GroupManagementProps) {
  const { t } = useLanguage();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copyConfirmGroup, setCopyConfirmGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<"leader" | "member">("leader");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { toast } = useToast();

  const groupFormSchema = z.object({
    name: z.string().min(1, t.groups.groupName),
    description: z.string().optional(),
    memberName: z.string().min(1, t.groups.myName),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, t.groups.groupColor).default('#3b82f6'),
    markerIcon: z.enum(markerIconTypes).default('default'),
  });

  const createForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      memberName: "",
      color: '#3b82f6',
      markerIcon: 'default',
    },
  });

  const editGroupFormSchema = z.object({
    name: z.string().min(1, t.groups.groupName),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, t.groups.groupColor).default('#3b82f6'),
    markerIcon: z.enum(markerIconTypes).default('default'),
  });

  const editForm = useForm<EditGroupFormValues>({
    resolver: zodResolver(editGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: '#3b82f6',
      markerIcon: 'default',
    },
  });

  const joinForm = useForm<{ inviteCode: string; memberName: string }>({
    resolver: zodResolver(z.object({
      inviteCode: z.string().min(1, t.groups.inviteCode),
      memberName: z.string().min(1, t.groups.myName),
    })),
    defaultValues: {
      inviteCode: "",
      memberName: "",
    },
  });

  const handleCreateGroup = (data: GroupFormValues) => {
    onCreateGroup(data);
    createForm.reset();
    setCreateDialogOpen(false);
  };

  const handleOpenEditDialog = (group: Group) => {
    setEditingGroup(group);
    editForm.reset({
      name: group.name,
      description: group.description || "",
      color: group.color || '#3b82f6',
      markerIcon: (group.markerIcon as MarkerIconType) || 'default',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateGroup = (data: EditGroupFormValues) => {
    if (editingGroup && onUpdateGroup) {
      onUpdateGroup(editingGroup.id, data);
      editForm.reset();
      setEditDialogOpen(false);
      setEditingGroup(null);
    }
  };

  const handleJoinGroup = (data: { inviteCode: string; memberName: string }) => {
    onJoinGroup(data.inviteCode, data.memberName);
    joinForm.reset();
    setJoinDialogOpen(false);
  };

  const handleCopyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: t.groups.inviteCodeCopied,
      description: `${t.groups.inviteCode}: ${inviteCode}`,
    });
  };

  // 그룹 필터링 (탭 + 검색)
  const filteredGroups = groups.filter(group => {
    // 탭 필터링
    const myMember = group.members.find(m => m.userId === userId);
    const isLeader = myMember?.role === 'leader';
    
    if (activeTab === "leader" && !isLeader) return false;
    if (activeTab === "member" && (!myMember || isLeader)) return false; // 나를 초대한 그룹 = 멤버이지만 방장이 아닌 그룹
    
    // 검색 필터링
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query) ||
      group.members.some(m => m.name.toLowerCase().includes(query))
    );
  });

  // 탭별 그룹 개수 계산
  const groupCounts = {
    leader: groups.filter(g => {
      const member = g.members.find(m => m.userId === userId);
      return member?.role === 'leader';
    }).length,
    member: groups.filter(g => {
      const member = g.members.find(m => m.userId === userId);
      return !!member && member.role !== 'leader'; // 나를 초대한 그룹 = 멤버이지만 방장이 아닌 그룹
    }).length,
  };

  // 선택된 그룹의 메모 필터링
  const selectedGroup = selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null;
  const groupMemos = selectedGroupId 
    ? memos.filter(memo => memo.group?.id === selectedGroupId)
    : [];

  // 그룹 메모 뷰 표시
  if (selectedGroupId && selectedGroup) {
    return (
      <div className="flex flex-col h-full">
        {/* 그룹 헤더 */}
        <div className="px-4 pt-6 sm:pt-4 pb-3 border-b bg-card/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedGroupId(null)}
              className="h-8 w-8 rounded-full hover:bg-muted"
              data-testid="button-back-to-groups"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm border relative" 
                style={{ 
                  backgroundColor: `${selectedGroup.color}30`,
                  borderColor: `${selectedGroup.color}60`
                }}
              >
                {(() => {
                  const IconComponent = MARKER_ICON_COMPONENTS[selectedGroup.markerIcon as MarkerIconType] || MapPin;
                  return <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: selectedGroup.color }} />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold truncate">{selectedGroup.name}</h2>
                {selectedGroup.description && (
                  <p className="text-xs text-muted-foreground truncate">{selectedGroup.description}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="flex-shrink-0 text-xs px-2 py-1">
              <FileText className="h-3 w-3 mr-1" />
              {groupMemos.length}개
            </Badge>
          </div>
        </div>

        {/* 메모 목록 */}
        <div className="flex-1 overflow-hidden">
          {onEditMemo && onDeleteMemo && onMemoClick ? (
            <MemoList
              memos={groupMemos}
              groups={[]}
              onEdit={onEditMemo}
              onDelete={onDeleteMemo}
              onMemoClick={onMemoClick}
              onSetMainMemo={onSetMainMemo}
              hideHeader={true}
              hideFilters={true}
              showAuthorTab={true}
              currentUserId={userId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-2">메모 목록을 표시할 수 없습니다</p>
              <p className="text-muted-foreground text-sm">필요한 핸들러가 제공되지 않았습니다</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* App Name Header */}
      <div className="px-4 pt-6 sm:pt-4 pb-3 border-b bg-card/95 backdrop-blur-sm flex-shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary text-transparent bg-clip-text">
          MemoWay
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-4 pt-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
        {/* 그룹 검색 바 */}
        <div className="flex gap-1.5 sm:gap-2 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md border border-primary/20 p-2 sm:p-2.5">
        <div className="relative flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.groups.searchPlaceholder || "그룹 이름, 설명, 멤버 검색..."}
            className="pr-10 border-0 focus-visible:ring-0"
            data-testid="input-group-search"
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
              data-testid="button-clear-search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Button
          size="icon"
          disabled={!searchQuery.trim()}
          className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
          data-testid="button-search-group"
        >
          <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </Button>
      </div>

        {/* 탭 전환 버튼 */}
        <div className="flex gap-1.5 sm:gap-2 bg-card/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md border border-primary/20 p-1 sm:p-1.5 sm:p-2">
          <button
            onClick={() => setActiveTab("leader")}
            className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
              activeTab === "leader"
                ? "bg-gradient-to-br from-sky-200 to-indigo-200 hover:from-sky-300 hover:to-indigo-300 border-2 border-sky-300/60 text-sky-700 shadow-sm hover:shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid="tab-leader"
          >
            <Crown className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 shrink-0" fill={activeTab === "leader" ? "currentColor" : "none"} />
            <span className="truncate">내가 초대한 그룹</span>
            <Badge 
              variant="secondary" 
              className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0 h-4 sm:h-5 text-[9px] sm:text-xs shrink-0 ${
                activeTab === "leader" 
                  ? "bg-sky-100/80 text-sky-700 border-sky-300/60" 
                  : "bg-muted"
              } ${groupCounts.leader === 0 ? "opacity-0" : ""}`}
            >
              {groupCounts.leader}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab("member")}
            className={`flex-1 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
              activeTab === "member"
                ? "bg-gradient-to-br from-sky-200 to-indigo-200 hover:from-sky-300 hover:to-indigo-300 border-2 border-sky-300/60 text-sky-700 shadow-sm hover:shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid="tab-member"
          >
            <Users className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 shrink-0" />
            <span className="truncate">나를 초대한 그룹</span>
            <Badge 
              variant="secondary" 
              className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0 h-4 sm:h-5 text-[9px] sm:text-xs shrink-0 ${
                activeTab === "member" 
                  ? "bg-sky-100/80 text-sky-700 border-sky-300/60" 
                  : "bg-muted"
              } ${groupCounts.member === 0 ? "opacity-0" : ""}`}
            >
              {groupCounts.member}
            </Badge>
          </button>
        </div>

      {/* 그룹 만들기 Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100%-2rem)] mx-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-2 sm:pb-3">
            <DialogTitle className="text-lg sm:text-xl">{t.groups.newGroup}</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateGroup)} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-3 sm:space-y-4 overflow-y-auto flex-1 pr-1 sm:pr-2">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">{t.groups.groupName}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="예: 친구들" className="text-sm" data-testid="input-group-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">{t.groups.description}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t.groups.descriptionPlaceholder} className="text-sm" data-testid="input-group-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="memberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">{t.groups.myName}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t.groups.myNamePlaceholder} className="text-sm" data-testid="input-member-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">{t.groups.groupColor}</FormLabel>
                      <FormControl>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2" data-testid="color-picker">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md border transition-all ${
                                  field.value.toLowerCase() === color.value.toLowerCase()
                                    ? 'border-foreground ring-2 ring-primary ring-offset-1' 
                                    : 'border-border hover:border-foreground/50'
                                }`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => {
                                  field.onChange(color.value);
                                }}
                                data-testid={`color-option-${color.value}`}
                                aria-label={t.colors[color.key as keyof typeof t.colors]}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{t.groups.customColor}:</label>
                            <Input
                              type="color"
                              value={field.value}
                              onChange={(e) => {
                                const newColor = e.target.value.toUpperCase();
                                field.onChange(newColor);
                              }}
                              className="w-12 h-8 sm:w-16 sm:h-9 p-0.5 sm:p-1 cursor-pointer"
                              data-testid="color-custom-picker"
                            />
                            <Input
                              type="text"
                              value={field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                                  field.onChange(value.toUpperCase());
                                }
                              }}
                              placeholder="#3B82F6"
                              maxLength={7}
                              className="flex-1 font-mono text-xs sm:text-sm h-8 sm:h-9"
                              data-testid="color-custom-input"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="markerIcon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">{t.groups.markerShape}</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2" data-testid="marker-icon-picker">
                          {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                            const Icon = MARKER_ICON_COMPONENTS[type];
                            return (
                              <button
                                key={type}
                                type="button"
                                className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-2.5 rounded-md sm:rounded-lg border transition-all ${
                                  field.value === type 
                                    ? 'border-primary bg-accent' 
                                    : 'border-border hover:border-foreground/50 hover:bg-accent/50'
                                }`}
                                onClick={() => field.onChange(type)}
                                data-testid={`marker-icon-${type}`}
                                aria-label={t.categories[type]}
                              >
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="text-[10px] sm:text-xs font-medium">{t.categories[type]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex-shrink-0 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
                <Button type="submit" size="sm" className="w-full text-sm" disabled={isLoading} data-testid="button-submit-create-group">
                  {isLoading ? `${t.common.create}...` : t.common.create}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 그룹 참여하기 Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100%-2rem)] mx-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">{t.groups.joinGroup}</DialogTitle>
          </DialogHeader>
          <Form {...joinForm}>
            <form onSubmit={joinForm.handleSubmit(handleJoinGroup)} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto flex-1 pr-1 sm:pr-2">
                <FormField
                  control={joinForm.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.groups.inviteCode}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t.groups.inviteCodePlaceholder} data-testid="input-invite-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={joinForm.control}
                  name="memberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.groups.myName}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t.groups.myNamePlaceholder} data-testid="input-join-member-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex-shrink-0 pt-4 border-t mt-4">
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-join-group">
                  {isLoading ? t.groups.joining : t.groups.joinButton}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-center px-4">
          <div className="bg-primary/10 rounded-full p-4 sm:p-6 mb-3 sm:mb-4">
            <Users className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
          </div>
          {searchQuery ? (
            <>
              <p className="text-foreground font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{t.groups.noSearchResults || "검색 결과가 없습니다"}</p>
              <p className="text-muted-foreground text-xs sm:text-sm">{t.groups.noSearchResultsDesc || "다른 검색어를 시도해보세요"}</p>
            </>
          ) : (
            <>
              <p className="text-foreground font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">{t.groups.noGroups}</p>
              <p className="text-muted-foreground text-xs sm:text-sm">{t.groups.noGroupsDesc}</p>
            </>
          )}
          </div>
        ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {filteredGroups.map(group => {
            const myMember = group.members.find(m => m.userId === userId);
            const isLeader = myMember?.role === 'leader';
            
            return (
              <Card 
                key={group.id} 
                className={`hover-elevate transition-all shadow-md rounded-xl sm:rounded-2xl bg-card/90 backdrop-blur-sm hover:shadow-lg cursor-pointer ${
                  isLeader 
                    ? 'border-2 border-amber-400/60 hover:border-amber-400/80 bg-gradient-to-br from-amber-50/30 to-card/90' 
                    : 'border border-primary/20 hover:border-primary/40'
                }`} 
                onClick={() => setSelectedGroupId(group.id)}
                data-testid={`card-group-${group.id}`}
              >
                <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm border relative" 
                        style={{ 
                          backgroundColor: `${group.color}30`,
                          borderColor: `${group.color}60`
                        }}
                        data-testid={`color-dot-${group.id}`}
                      >
                        {(() => {
                          const IconComponent = MARKER_ICON_COMPONENTS[group.markerIcon as MarkerIconType] || MapPin;
                          return <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: group.color }} />;
                        })()}
                        {isLeader && (
                          <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5 shadow-sm">
                            <Crown className="h-3 w-3 text-amber-900" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base sm:text-lg font-semibold truncate leading-tight">{group.name}</h3>
                          {isLeader && (
                            <Badge 
                              variant="secondary" 
                              className="flex-shrink-0 text-[10px] sm:text-xs px-1.5 py-0.5 bg-amber-400/20 text-amber-700 border-amber-400/40"
                            >
                              <Crown className="h-2.5 w-2.5 mr-0.5" fill="currentColor" />
                              방장
                            </Badge>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
                        )}
                      </div>
                      {onCopyGroup && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCopyConfirmGroup(group);
                          }}
                          data-testid={`button-copy-${group.id}`}
                          title="새 그룹으로 복사 (그룹 생성)"
                        >
                          <Copy className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="flex-shrink-0 text-xs px-2 py-0.5"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {group.members.length}/{group.maxMembers || 20}
                    </Badge>
                  </div>
                </CardHeader>

              <CardFooter className="pt-2 pb-3 sm:pb-4 px-3 sm:px-4 flex flex-wrap gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyInviteCode(group.inviteCode);
                  }}
                  data-testid={`button-copy-code-${group.id}`}
                >
                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                  {t.groups.copyInviteCode}
                </Button>
                {(() => {
                  return (
                    <>
                      {myMember && isLeader && onUpdateGroup && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDialog(group);
                          }}
                          data-testid={`button-edit-${group.id}`}
                        >
                          <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                          {t.common.edit}
                        </Button>
                      )}
                      {myMember && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberDialogOpen(group.id);
                          }}
                          data-testid={`button-members-${group.id}`}
                        >
                          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5" />
                          {t.groups.memberCount}
                        </Button>
                      )}
                      {myMember && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial bg-gradient-to-br from-pink-200 to-rose-200 hover:from-pink-300 hover:to-rose-300 border-2 border-pink-300/60 text-rose-700 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLeaveGroup(group.id, myMember.id);
                          }}
                          data-testid={`button-leave-${group.id}`}
                        >
                          {t.common.leave}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </CardFooter>
            </Card>
            );
          })}
        </div>
        )}
      </div>

      {/* 그룹 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl">
          <DialogHeader className="flex-shrink-0 pb-2 sm:pb-3">
            <DialogTitle className="text-lg sm:text-xl">{t.groups.editGroup}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateGroup)} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-3 sm:space-y-4 overflow-y-auto flex-1 pr-1 sm:pr-2">
                <FormField
                  control={editForm.control}
                  name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t.groups.groupName}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="예: 친구들" className="text-sm" data-testid="input-edit-group-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t.groups.description}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t.groups.descriptionPlaceholder} className="text-sm" data-testid="input-edit-group-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
                <FormField
                  control={editForm.control}
                  name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t.groups.groupColor}</FormLabel>
                    <FormControl>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2" data-testid="edit-color-picker">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md border transition-all ${
                                field.value.toLowerCase() === color.value.toLowerCase()
                                  ? 'border-foreground ring-2 ring-primary ring-offset-1' 
                                  : 'border-border hover:border-foreground/50'
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => {
                                field.onChange(color.value);
                              }}
                              data-testid={`edit-color-option-${color.value}`}
                              aria-label={t.colors[color.key as keyof typeof t.colors]}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">사용자 정의:</label>
                          <Input
                            type="color"
                            value={field.value}
                            onChange={(e) => {
                              const newColor = e.target.value.toUpperCase();
                              field.onChange(newColor);
                            }}
                            className="w-12 h-8 sm:w-16 sm:h-9 p-0.5 sm:p-1 cursor-pointer"
                            data-testid="edit-color-custom-picker"
                          />
                          <Input
                            type="text"
                            value={field.value}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                                field.onChange(value.toUpperCase());
                              }
                            }}
                            placeholder="#3B82F6"
                            maxLength={7}
                            className="flex-1 font-mono text-xs sm:text-sm h-8 sm:h-9"
                            data-testid="edit-color-custom-input"
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
                <FormField
                  control={editForm.control}
                  name="markerIcon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t.groups.markerShape}</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2" data-testid="edit-marker-icon-picker">
                        {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                          const Icon = MARKER_ICON_COMPONENTS[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              className={`h-auto py-2 sm:py-2.5 flex flex-col items-center gap-0.5 sm:gap-1 ${
                                field.value === type 
                                  ? 'bg-gradient-to-br from-primary-200 to-primary-300 hover:from-primary-300 hover:to-primary-400 border-2 border-primary-300/60 text-primary-700' 
                                  : 'border-2 border-border hover:border-foreground/50 hover:bg-accent/50'
                              }`}
                              onClick={() => field.onChange(type)}
                              data-testid={`edit-marker-icon-${type}`}
                              aria-label={t.categories[type]}
                            >
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${field.value === type ? 'text-primary-700' : ''}`} />
                              <span className={`text-[10px] sm:text-xs ${field.value === type ? 'text-primary-700 font-medium' : ''}`}>{t.categories[type]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 pt-3 sm:pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="flex-1 w-full sm:w-auto text-sm"
                  onClick={() => {
                    editForm.reset();
                    setEditDialogOpen(false);
                    setEditingGroup(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="flex-1 w-full sm:w-auto text-sm bg-gradient-to-br from-sky-200 to-sky-300 hover:from-sky-300 hover:to-sky-400 border-2 border-sky-300/60 text-sky-700 shadow-sm" 
                  data-testid="button-submit-edit-group"
                >
                  {t.common.edit}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 참여인원 다이얼로그 */}
      {memberDialogOpen && (() => {
        const group = groups.find(g => g.id === memberDialogOpen);
        if (!group) return null;

        const currentUserMember = group.members.find(m => m.userId === userId);
        const isCurrentUserLeader = currentUserMember?.role === 'leader';

        return (
          <Dialog open={true} onOpenChange={() => setMemberDialogOpen(null)}>
            <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto max-h-[85vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t.groups.memberCount} ({group.members.length}{t.groups.members})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {group.members.map(member => {
                  const isLeader = member.role === 'leader';
                  const isCurrentUser = member.userId === userId;
                  const canRemove = isCurrentUserLeader && !isCurrentUser && onRemoveMember;
                  const canTransfer = isCurrentUserLeader && !isLeader && onTransferLeadership;

                  return (
                    <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                          <AvatarFallback className="text-xs sm:text-sm font-medium bg-muted">
                            {member.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1">{member.name}</span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        {isLeader && (
                          <Badge variant="default" className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">
                            <Crown className="h-3 w-3 mr-1" />
                            {t.groups.leader}
                          </Badge>
                        )}
                        {!isLeader && isCurrentUserLeader && onUpdateMemberPermissions && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 rounded-md">
                            <Checkbox
                              id={`edit-permission-${member.id}`}
                              checked={member.canEditGroupMemos || false}
                              onCheckedChange={(checked) => {
                                onUpdateMemberPermissions(group.id, member.id, checked as boolean);
                              }}
                              data-testid={`checkbox-edit-permission-${member.id}`}
                            />
                            <label
                              htmlFor={`edit-permission-${member.id}`}
                              className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                            >
                              {t.groups.canEditGroupMemos}
                            </label>
                          </div>
                        )}
                        <div className="flex gap-1 flex-1 sm:flex-initial justify-end">
                          {canTransfer && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                              onClick={() => {
                                if (confirm(`${member.name}${t.groups.confirmTransferLeadership}`)) {
                                  onTransferLeadership(group.id, member.id);
                                  setMemberDialogOpen(null);
                                }
                              }}
                              data-testid={`button-transfer-${member.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              {t.groups.transfer}
                            </Button>
                          )}
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 sm:px-3 text-xs sm:text-sm text-destructive hover:text-destructive"
                              onClick={() => {
                                onRemoveMember(group.id, member.id);
                                setMemberDialogOpen(null);
                              }}
                              data-testid={`button-remove-${member.id}`}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              {t.groups.remove}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* 그룹 복사 확인 다이얼로그 */}
      <AlertDialog open={!!copyConfirmGroup} onOpenChange={(open) => !open && setCopyConfirmGroup(null)}>
        <AlertDialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(100%-2rem)] mx-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Copy className="h-5 w-5 text-primary" />
              {t.groups.copyGroup}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 overflow-y-auto flex-1 max-h-[60vh] pr-1 sm:pr-2">
              <p>
                <span className="font-semibold">{copyConfirmGroup?.name}</span> {t.groups.copyGroupDesc}
              </p>
              
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.groups.memoCount}</span>
                  <span className="font-semibold">{copyConfirmGroup?.memoCount || 0}개</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.groups.requiredPoints}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {((copyConfirmGroup?.memoCount || 0) * 10).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">{t.groups.currentPoints}</span>
                  <span className="font-semibold text-primary">
                    {userPoints.toLocaleString()}
                  </span>
                </div>
              </div>

              {(copyConfirmGroup?.memoCount || 0) * 10 > userPoints && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {t.groups.insufficientPoints} {((copyConfirmGroup?.memoCount || 0) * 10).toLocaleString()}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-shrink-0 pt-3 sm:pt-4 border-t mt-3 sm:mt-4">
            <AlertDialogCancel data-testid="button-cancel-copy">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onCopyGroup && copyConfirmGroup) {
                  onCopyGroup(copyConfirmGroup.id);
                }
                setCopyConfirmGroup(null);
              }}
              disabled={(copyConfirmGroup?.memoCount || 0) * 10 > userPoints}
              data-testid="button-confirm-copy"
              className="bg-primary hover:bg-primary/90"
            >
              <Coins className="h-4 w-4 mr-2" />
              {t.groups.confirmCopy}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 플로팅 액션 버튼 */}
      <div className="fixed bottom-[7rem] right-4 flex flex-col gap-2 z-50">
        {/* 그룹 참여하기 버튼 */}
        <Button
          size="icon"
          onClick={() => setJoinDialogOpen(true)}
          className="h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-xl bg-primary hover:bg-primary/90 border-2 border-primary"
          data-testid="button-join-group-fab"
          title={t.groups.joinGroup}
        >
          <DoorOpen className="h-5 w-5 text-primary-foreground" />
        </Button>

        {/* 그룹 만들기 버튼 */}
        <Button
          size="icon"
          onClick={() => setCreateDialogOpen(true)}
          className="h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-xl bg-primary hover:bg-primary/90 border-2 border-primary"
          data-testid="button-create-group-fab"
          title={t.groups.createGroup}
        >
          <Plus className="h-5 w-5 text-primary-foreground" />
        </Button>
      </div>
    </div>
  );
}
