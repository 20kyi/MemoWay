import { useState } from "react";
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
import { Plus, Share2, Users, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Trophy, Briefcase, Copy } from "lucide-react";
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
  { key: 'blue', value: '#3b82f6' },
  { key: 'red', value: '#ef4444' },
  { key: 'green', value: '#22c55e' },
  { key: 'yellow', value: '#eab308' },
  { key: 'purple', value: '#a855f7' },
  { key: 'pink', value: '#ec4899' },
  { key: 'orange', value: '#f97316' },
  { key: 'teal', value: '#14b8a6' },
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
  members: Array<{ id: string; name: string }>;
  memoCount?: number;
}

interface GroupManagementProps {
  groups: Group[];
  onCreateGroup: (data: { name: string; memberName: string; color: string; markerIcon: string }) => void;
  onJoinGroup: (inviteCode: string, memberName: string) => void;
  onLeaveGroup: (groupId: string, memberId: string) => void;
  onCopyGroup?: (groupId: string) => void;
  myMemberIds: string[];
  personalMemberId?: string | null;
  isLoading?: boolean;
}

export function GroupManagement({ groups, onCreateGroup, onJoinGroup, onLeaveGroup, onCopyGroup, myMemberIds, personalMemberId, isLoading = false }: GroupManagementProps) {
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

  const handleShareInvite = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}?join=${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: t.groups.inviteLinkCopied,
      description: t.groups.inviteLinkCopied,
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
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">{t.groups.noGroups}</p>
          <p className="text-muted-foreground text-sm">{t.groups.noGroupsDesc}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <Card key={group.id} className="rounded-2xl overflow-hidden" data-testid={`card-group-${group.id}`}>
              <div className="h-2 w-full" style={{ backgroundColor: group.color }} data-testid={`color-stripe-${group.id}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: group.color }}
                      data-testid={`color-dot-${group.id}`}
                    />
                    <h3 className="text-xl font-medium truncate">{group.name}</h3>
                    {onCopyGroup && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={() => onCopyGroup(group.id)}
                        data-testid={`button-copy-${group.id}`}
                        title="개인 메모로 복사"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {group.members.length}명
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 5).map(member => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                        <AvatarFallback className="text-xs">
                          {member.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {group.members.length > 5 && (
                    <span className="text-sm text-muted-foreground">
                      +{group.members.length - 5}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {group.members.map(member => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {member.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-0 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleShareInvite(group.inviteCode)}
                  data-testid={`button-share-${group.id}`}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {t.groups.copyInviteLink}
                </Button>
                {(() => {
                  const myMember = group.members.find(m => myMemberIds.includes(m.id));
                  // Don't show "leave" button for personal member
                  const isPersonalMember = myMember && personalMemberId && myMember.id === personalMemberId;
                  return myMember && !isPersonalMember && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => onLeaveGroup(group.id, myMember.id)}
                      data-testid={`button-leave-${group.id}`}
                    >
                      {t.common.leave}
                    </Button>
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
