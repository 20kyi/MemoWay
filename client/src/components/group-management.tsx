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
import { Plus, Share2, Users, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase, Copy, Crown, Trash2, Settings, UserMinus, RefreshCw, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { markerIconTypes, type MarkerIconType } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

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
  isLoading?: boolean;
}

export function GroupManagement({ groups, onCreateGroup, onUpdateGroup, onJoinGroup, onLeaveGroup, onCopyGroup, onDeleteGroup, onRemoveMember, onTransferLeadership, onUpdateMemberPermissions, myMemberIds, personalMemberId, userId, isLoading = false }: GroupManagementProps) {
  const { t } = useLanguage();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState<string | null>(null);
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

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 overflow-y-auto h-full relative">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 w-full sm:w-auto" data-testid="button-create-group">
              <Plus className="h-4 w-4 mr-2" />
              {t.groups.createGroup}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-3 sm:mx-0">
            <DialogHeader>
              <DialogTitle>{t.groups.newGroup}</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateGroup)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.groups.groupName}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="예: 친구들" data-testid="input-group-name" />
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
                      <FormLabel>{t.groups.description}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t.groups.descriptionPlaceholder} data-testid="input-group-description" />
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
                      <FormLabel>{t.groups.myName}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t.groups.myNamePlaceholder} data-testid="input-member-name" />
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
                      <FormLabel>{t.groups.groupColor}</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2" data-testid="color-picker">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`h-8 w-8 rounded-md border transition-all ${
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
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-muted-foreground">사용자 정의:</label>
                            <Input
                              type="color"
                              value={field.value}
                              onChange={(e) => {
                                const newColor = e.target.value.toUpperCase();
                                field.onChange(newColor);
                              }}
                              className="w-16 h-9 p-1 cursor-pointer"
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
                              className="flex-1 font-mono"
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
                      <FormLabel>{t.groups.markerShape}</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="marker-icon-picker">
                          {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                            const Icon = MARKER_ICON_COMPONENTS[type];
                            return (
                              <button
                                key={type}
                                type="button"
                                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                                  field.value === type 
                                    ? 'border-primary bg-accent' 
                                    : 'border-border hover:border-foreground/50 hover:bg-accent/50'
                                }`}
                                onClick={() => field.onChange(type)}
                                data-testid={`marker-icon-${type}`}
                                aria-label={t.categories[type]}
                              >
                                <Icon className="h-5 w-5" />
                                <span className="text-xs font-medium">{t.categories[type]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-create-group">
                  {isLoading ? `${t.common.create}...` : t.common.create}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 w-full sm:w-auto" data-testid="button-join-group">
              {t.groups.joinGroup}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-3 sm:mx-0">
            <DialogHeader>
              <DialogTitle>{t.groups.joinGroup}</DialogTitle>
            </DialogHeader>
            <Form {...joinForm}>
              <form onSubmit={joinForm.handleSubmit(handleJoinGroup)} className="space-y-4">
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
                      <FormLabel>내 이름</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="홍길동" data-testid="input-join-member-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-join-group">
                  {isLoading ? "참여 중..." : "참여하기"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="bg-primary/10 rounded-full p-6 mb-4">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <p className="text-foreground font-semibold text-lg mb-2">{t.groups.noGroups}</p>
          <p className="text-muted-foreground text-sm">{t.groups.noGroupsDesc}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <Card key={group.id} className="hover-elevate transition-all shadow-lg border-2 border-primary/30 hover:border-primary/50 rounded-3xl bg-card/80 backdrop-blur-sm hover:shadow-2xl" data-testid={`card-group-${group.id}`}>
              <CardHeader className="pb-3 px-3 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                  <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                    <div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg border-2" 
                      style={{ 
                        backgroundColor: `${group.color}40`,
                        borderColor: `${group.color}80`
                      }}
                      data-testid={`color-dot-${group.id}`}
                    >
                      {(() => {
                        const IconComponent = MARKER_ICON_COMPONENTS[group.markerIcon as MarkerIconType] || MapPin;
                        return <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: group.color }} />;
                      })()}
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold truncate">{group.name}</h3>
                    {onCopyGroup && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => onCopyGroup(group.id)}
                        data-testid={`button-copy-${group.id}`}
                        title="새 그룹으로 복사 (그룹 생성)"
                      >
                        <Copy className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="flex-shrink-0"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {group.members.length}/{group.maxMembers || 20}{t.groups.members}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-3 px-3 sm:px-6">
                {group.description ? (
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/30">
                    <p className="text-xs sm:text-sm text-muted-foreground">{group.description}</p>
                  </div>
                ) : (
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/30">
                    <p className="text-xs sm:text-sm text-muted-foreground italic">{t.groups.noDescription}</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-0 flex flex-col sm:flex-row gap-2 px-3 sm:px-6 pb-4 sm:pb-6">
                <Button
                  variant="outline"
                  className="flex-1 w-full sm:w-auto"
                  onClick={() => handleCopyInviteCode(group.inviteCode)}
                  data-testid={`button-copy-code-${group.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t.groups.copyInviteCode}
                </Button>
                {(() => {
                  const myMember = group.members.find(m => m.userId === userId);
                  const isLeader = myMember?.role === 'leader';
                  
                  return (
                    <>
                      {myMember && isLeader && onUpdateGroup && (
                        <Button
                          variant="outline"
                          className="flex-1 w-full sm:w-auto"
                          onClick={() => handleOpenEditDialog(group)}
                          data-testid={`button-edit-${group.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t.common.edit}
                        </Button>
                      )}
                      {myMember && (
                        <Button
                          variant="outline"
                          className="flex-1 w-full sm:w-auto"
                          onClick={() => setMemberDialogOpen(group.id)}
                          data-testid={`button-members-${group.id}`}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {t.groups.memberCount}
                        </Button>
                      )}
                      {myMember && (
                        <Button
                          variant="destructive"
                          className="flex-1 w-full sm:w-auto rounded-full border-2 hover:shadow-lg"
                          onClick={() => onLeaveGroup(group.id, myMember.id)}
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
          ))}
        </div>
      )}

      {/* 그룹 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] mx-3 sm:mx-0 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t.groups.editGroup}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateGroup)} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                <FormField
                  control={editForm.control}
                  name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.groups.groupName}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="예: 친구들" data-testid="input-edit-group-name" />
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
                    <FormLabel>{t.groups.description}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t.groups.descriptionPlaceholder} data-testid="input-edit-group-description" />
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
                    <FormLabel>{t.groups.groupColor}</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2" data-testid="edit-color-picker">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className={`h-8 w-8 rounded-md border transition-all ${
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
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground">사용자 정의:</label>
                          <Input
                            type="color"
                            value={field.value}
                            onChange={(e) => {
                              const newColor = e.target.value.toUpperCase();
                              field.onChange(newColor);
                            }}
                            className="w-16 h-9 p-1 cursor-pointer"
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
                            className="flex-1 font-mono"
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
                    <FormLabel>{t.groups.markerShape}</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="edit-marker-icon-picker">
                        {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                          const Icon = MARKER_ICON_COMPONENTS[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                                field.value === type 
                                  ? 'border-primary bg-accent' 
                                  : 'border-border hover:border-foreground/50 hover:bg-accent/50'
                              }`}
                              onClick={() => field.onChange(type)}
                              data-testid={`edit-marker-icon-${type}`}
                              aria-label={t.categories[type]}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="text-xs font-medium">{t.categories[type]}</span>
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
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 w-full sm:w-auto"
                  onClick={() => {
                    editForm.reset();
                    setEditDialogOpen(false);
                    setEditingGroup(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  {t.common.cancel}
                </Button>
                <Button type="submit" className="flex-1 w-full sm:w-auto" data-testid="button-submit-edit-group">
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
            <DialogContent className="max-w-md max-h-[85vh] mx-3 sm:mx-0 flex flex-col">
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
                              위임
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
                              내보내기
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
    </div>
  );
}
