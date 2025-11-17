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
import { Plus, Share2, Users, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase, Copy, Crown, Trash2, Settings, UserMinus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { markerIconTypes, type MarkerIconType } from "@shared/schema";
import { useLanguage } from "@/lib/language-context";

type GroupFormValues = {
  name: string;
  memberName: string;
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
  inviteCode: string;
  color: string;
  markerIcon?: string;
  members: Array<{ id: string; name: string; role: string }>;
  memoCount?: number;
}

interface GroupManagementProps {
  groups: Group[];
  onCreateGroup: (data: { name: string; memberName: string; color: string; markerIcon: string }) => void;
  onJoinGroup: (inviteCode: string, memberName: string) => void;
  onLeaveGroup: (groupId: string, memberId: string) => void;
  onCopyGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onRemoveMember?: (groupId: string, memberId: string) => void;
  onTransferLeadership?: (groupId: string, newLeaderId: string) => void;
  myMemberIds: string[];
  personalMemberId?: string | null;
  isLoading?: boolean;
}

export function GroupManagement({ groups, onCreateGroup, onJoinGroup, onLeaveGroup, onCopyGroup, onDeleteGroup, onRemoveMember, onTransferLeadership, myMemberIds, personalMemberId, isLoading = false }: GroupManagementProps) {
  const { t } = useLanguage();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const { toast } = useToast();

  const groupFormSchema = z.object({
    name: z.string().min(1, t.groups.groupName),
    memberName: z.string().min(1, t.groups.myName),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, t.groups.groupColor).default('#3b82f6'),
    markerIcon: z.enum(markerIconTypes).default('default'),
  });

  const createForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      memberName: "",
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
    <div className="px-4 py-6 space-y-4 overflow-y-auto h-full">
      <div className="flex gap-3">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1" data-testid="button-create-group">
              <Plus className="h-4 w-4 mr-2" />
              {t.groups.createGroup}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
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
                          <div className="grid grid-cols-8 gap-2" data-testid="color-picker">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`h-8 w-8 rounded-md border-2 transition-all ${
                                  field.value.toLowerCase() === color.value.toLowerCase()
                                    ? 'border-foreground ring-2 ring-foreground ring-offset-1' 
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
                        <div className="grid grid-cols-4 gap-2" data-testid="marker-icon-picker">
                          {(Object.keys(MARKER_ICON_COMPONENTS) as MarkerIconType[]).map((type) => {
                            const Icon = MARKER_ICON_COMPONENTS[type];
                            return (
                              <button
                                key={type}
                                type="button"
                                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                                  field.value === type 
                                    ? 'border-foreground bg-accent' 
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
            <Button variant="outline" className="flex-1" data-testid="button-join-group">
              {t.groups.joinGroup}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
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
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full p-6 mb-4">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <p className="text-foreground font-medium text-lg mb-2">{t.groups.noGroups}</p>
          <p className="text-muted-foreground text-sm">{t.groups.noGroupsDesc}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <Card key={group.id} className="rounded-3xl overflow-hidden border-2 border-primary/10 hover:border-primary/30 hover:shadow-xl transition-all hover-elevate" data-testid={`card-group-${group.id}`}>
              <div className="h-3 w-full bg-gradient-to-r opacity-60" style={{ 
                background: `linear-gradient(90deg, ${group.color}40, ${group.color}, ${group.color}40)` 
              }} data-testid={`color-stripe-${group.id}`} />
              <CardHeader className="pb-3 bg-gradient-to-br from-card to-muted/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-md border-2 border-white" 
                      style={{ backgroundColor: `${group.color}40` }}
                      data-testid={`color-dot-${group.id}`}
                    >
                      <Heart className="h-5 w-5" style={{ color: group.color }} />
                    </div>
                    <h3 className="text-xl font-bold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{group.name}</h3>
                    {onCopyGroup && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-primary/10"
                        onClick={() => onCopyGroup(group.id)}
                        data-testid={`button-copy-${group.id}`}
                        title="개인 메모로 복사"
                      >
                        <Copy className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="flex-shrink-0 rounded-full px-3 bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {group.members.length}명
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-3 bg-gradient-to-br from-transparent to-accent/5">
                <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-gradient-to-r from-primary/5 to-secondary/5">
                  <div className="flex -space-x-3">
                    {group.members.slice(0, 5).map((member, index) => (
                      <Avatar key={member.id} className="h-10 w-10 border-3 border-background shadow-md ring-2 ring-white/50">
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/30 to-secondary/30">
                          {member.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {group.members.length > 5 && (
                    <span className="text-sm text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-full">
                      +{group.members.length - 5}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {group.members.map(member => {
                    const isLeader = member.role === 'leader';
                    const isCurrentUser = myMemberIds.includes(member.id);
                    const currentUserMember = group.members.find(m => myMemberIds.includes(m.id));
                    const canRemove = currentUserMember?.role === 'leader' && !isCurrentUser && onRemoveMember;
                    const canTransfer = currentUserMember?.role === 'leader' && !isLeader && onTransferLeadership;

                    return (
                      <div key={member.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/30 transition-colors">
                        <Avatar className="h-7 w-7 shadow-sm">
                          <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-accent/30 to-primary/20">
                            {member.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1">{member.name}</span>
                        {isLeader && (
                          <Badge variant="default" className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">
                            <Crown className="h-3 w-3 mr-1" />
                            방장
                          </Badge>
                        )}
                        {canTransfer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (confirm(`${member.name}님에게 방장 권한을 이양하시겠습니까?`)) {
                                onTransferLeadership(group.id, member.id);
                              }
                            }}
                            title="방장 이양"
                          >
                            <RefreshCw className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onRemoveMember(group.id, member.id)}
                            title="멤버 강퇴"
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              <CardFooter className="pt-0 flex gap-2 bg-gradient-to-r from-transparent via-muted/5 to-transparent">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full border-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => handleCopyInviteCode(group.inviteCode)}
                  data-testid={`button-copy-code-${group.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t.groups.copyInviteCode}
                </Button>
                {(() => {
                  const myMember = group.members.find(m => myMemberIds.includes(m.id));
                  const isPersonalMember = myMember && personalMemberId && myMember.id === personalMemberId;
                  const isLeader = myMember?.role === 'leader';
                  
                  return (
                    <>
                      {myMember && isLeader && !isPersonalMember && onDeleteGroup && (
                        <Button
                          variant="destructive"
                          className="flex-1 rounded-full border-2 hover:shadow-lg"
                          onClick={() => {
                            if (confirm('정말 이 그룹을 삭제하시겠습니까? 그룹의 모든 메모가 삭제됩니다.')) {
                              onDeleteGroup(group.id);
                            }
                          }}
                          data-testid={`button-delete-group-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          그룹 삭제
                        </Button>
                      )}
                      {myMember && !isPersonalMember && (
                        <Button
                          variant="destructive"
                          className="flex-1 rounded-full border-2 hover:shadow-lg"
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
    </div>
  );
}
