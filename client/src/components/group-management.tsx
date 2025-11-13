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
import { Plus, Share2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const groupFormSchema = z.object({
  name: z.string().min(1, "그룹명을 입력하세요"),
  memberName: z.string().min(1, "이름을 입력하세요"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "유효한 색상 코드를 선택하세요").default('#3b82f6'),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

const PRESET_COLORS = [
  { name: '파랑', value: '#3b82f6' },
  { name: '빨강', value: '#ef4444' },
  { name: '초록', value: '#22c55e' },
  { name: '노랑', value: '#eab308' },
  { name: '보라', value: '#a855f7' },
  { name: '분홍', value: '#ec4899' },
  { name: '주황', value: '#f97316' },
  { name: '청록', value: '#14b8a6' },
];

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  color: string;
  members: Array<{ id: string; name: string }>;
  memoCount?: number;
}

interface GroupManagementProps {
  groups: Group[];
  onCreateGroup: (data: { name: string; memberName: string; color: string }) => void;
  onJoinGroup: (inviteCode: string, memberName: string) => void;
  onLeaveGroup: (groupId: string, memberId: string) => void;
  currentMemberId: string | null;
  isLoading?: boolean;
}

export function GroupManagement({ groups, onCreateGroup, onJoinGroup, onLeaveGroup, currentMemberId, isLoading = false }: GroupManagementProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const { toast } = useToast();

  const createForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      memberName: "",
      color: '#3b82f6',
    },
  });

  const joinForm = useForm<{ inviteCode: string; memberName: string }>({
    resolver: zodResolver(z.object({
      inviteCode: z.string().min(1, "초대 코드를 입력하세요"),
      memberName: z.string().min(1, "이름을 입력하세요"),
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
      title: "초대 링크 복사됨",
      description: "초대 링크가 클립보드에 복사되었습니다",
    });
  };

  return (
    <div className="px-4 py-6 space-y-4 overflow-y-auto h-full">
      <div className="flex gap-3">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1" data-testid="button-create-group">
              <Plus className="h-4 w-4 mr-2" />
              그룹 만들기
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>새 그룹 만들기</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateGroup)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>그룹명</FormLabel>
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
                      <FormLabel>내 이름</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="홍길동" data-testid="input-member-name" />
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
                      <FormLabel>그룹 색상</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-4 gap-2" data-testid="color-picker">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              className={`h-12 rounded-md border-2 transition-all hover-elevate ${
                                field.value === color.value 
                                  ? 'border-foreground ring-2 ring-foreground ring-offset-2' 
                                  : 'border-border'
                              }`}
                              style={{ backgroundColor: color.value }}
                              onClick={() => field.onChange(color.value)}
                              data-testid={`color-option-${color.value}`}
                              aria-label={color.name}
                            />
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-create-group">
                  {isLoading ? "생성 중..." : "만들기"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1" data-testid="button-join-group">
              그룹 참여
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>그룹 참여하기</DialogTitle>
            </DialogHeader>
            <Form {...joinForm}>
              <form onSubmit={joinForm.handleSubmit(handleJoinGroup)} className="space-y-4">
                <FormField
                  control={joinForm.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>초대 코드</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="초대 코드 입력" data-testid="input-invite-code" />
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
          <p className="text-muted-foreground text-lg mb-2">아직 그룹이 없습니다</p>
          <p className="text-muted-foreground text-sm">그룹을 만들거나 초대 코드로 참여하세요</p>
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
                  초대 링크
                </Button>
                {currentMemberId && group.members.some(m => m.id === currentMemberId) && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => onLeaveGroup(group.id, currentMemberId)}
                    data-testid={`button-leave-${group.id}`}
                  >
                    나가기
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
