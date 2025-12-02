// Reference: javascript_database blueprint - updated with app-specific storage
import { 
  users,
  groups, 
  members, 
  memos, 
  photos,
  type User,
  type UpsertUser,
  type Group, 
  type Member, 
  type Memo, 
  type Photo,
  type InsertGroup, 
  type InsertMember, 
  type InsertMemo, 
  type InsertPhoto,
  type MemoWithDetails,
  type GroupWithMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, count, inArray, or, isNull } from "drizzle-orm";

export interface IStorage {
  // Users (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByKakaoId(kakaoId: string): Promise<User | undefined>;
  addPoints(userId: string, amount: number): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  
  // Groups
  createGroup(group: InsertGroup): Promise<Group>;
  getGroupByInviteCode(inviteCode: string): Promise<Group | undefined>;
  getGroups(userId: string): Promise<GroupWithMembers[]>;
  getGroupById(groupId: string): Promise<GroupWithMembers | undefined>;
  getGroupForUser(groupId: string, userId: string): Promise<GroupWithMembers | undefined>;
  getGroupMemberCount(groupId: string): Promise<number>;
  updateGroup(groupId: string, updateData: Partial<InsertGroup>): Promise<Group>;
  deleteGroup(groupId: string): Promise<void>;
  copyGroupMemosToPersonal(groupId: string, userId: string): Promise<{ group: Group; member: Member; copiedCount: number }>;
  
  // Members
  createMember(member: InsertMember): Promise<Member>;
  getMembersByGroupId(groupId: string): Promise<Member[]>;
  deleteMember(memberId: string): Promise<void>;
  transferLeadership(groupId: string, currentLeaderId: string, newLeaderId: string): Promise<void>;
  updateMemberPermissions(memberId: string, canEditGroupMemos: boolean): Promise<Member>;
  
  // Memos
  createMemo(memo: InsertMemo): Promise<Memo>;
  getMemos(userId: string): Promise<MemoWithDetails[]>;
  getMemoById(id: string): Promise<MemoWithDetails | undefined>;
  updateMemo(id: string, memo: Partial<InsertMemo>): Promise<Memo>;
  deleteMemo(id: string): Promise<void>;
  clearGroupFromMemos(groupId: string): Promise<void>;
  setMainMemo(memoId: string): Promise<Memo>;
  
  // Photos
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhotosByMemoId(memoId: string): Promise<Photo[]>;
  deletePhoto(photoId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Remove undefined values and passwordHash for OAuth users
    const cleanedData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => v !== undefined)
    );
    
    // For OAuth users (kakao, google), don't include passwordHash
    if (cleanedData.provider && cleanedData.provider !== 'email') {
      delete cleanedData.passwordHash;
    }
    
    const [user] = await db
      .insert(users)
      .values(cleanedData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...cleanedData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByKakaoId(kakaoId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.kakaoId, kakaoId));
    return user;
  }

  async addPoints(userId: string, amount: number): Promise<User> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({ 
        points: user.points + amount,
        updatedAt: new Date(), // updatedAt도 함께 업데이트
      })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`[Points] Added ${amount} points to user ${userId}. New total: ${updatedUser.points}`);
    
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    // 트랜잭션으로 모든 관련 데이터 삭제
    await db.transaction(async (tx) => {
      // 1. 사용자의 모든 메모의 사진 삭제
      const userMemos = await tx
        .select({ id: memos.id })
        .from(memos)
        .where(eq(memos.userId, userId));
      
      const memoIds = userMemos.map(m => m.id);
      if (memoIds.length > 0) {
        await tx.delete(photos).where(inArray(photos.memoId, memoIds));
      }

      // 2. 사용자의 모든 메모 삭제
      await tx.delete(memos).where(eq(memos.userId, userId));

      // 3. 사용자가 속한 모든 그룹의 멤버 삭제
      const userMembers = await tx
        .select({ groupId: members.groupId })
        .from(members)
        .where(eq(members.userId, userId));
      
      const groupIds = [...new Set(userMembers.map(m => m.groupId))];
      
      // 4. 사용자가 방장인 그룹 처리
      for (const groupId of groupIds) {
        const group = await tx
          .select()
          .from(groups)
          .where(eq(groups.id, groupId))
          .limit(1);
        
        if (group.length > 0) {
          const groupMembers = await tx
            .select()
            .from(members)
            .where(eq(members.groupId, groupId));
          
          const leaderMember = groupMembers.find(m => m.role === 'leader' && m.userId === userId);
          
          if (leaderMember) {
            // 방장인 경우: 다른 멤버가 있으면 첫 번째 멤버에게 방장 권한 이전, 없으면 그룹 삭제
            const otherMembers = groupMembers.filter(m => m.userId !== userId);
            if (otherMembers.length > 0) {
              // 첫 번째 멤버에게 방장 권한 이전
              await tx
                .update(members)
                .set({ role: 'leader' })
                .where(eq(members.id, otherMembers[0].id));
            } else {
              // 그룹에 다른 멤버가 없으면 그룹 삭제
              const groupMemos = await tx
                .select({ id: memos.id })
                .from(memos)
                .where(eq(memos.groupId, groupId));
              
              const groupMemoIds = groupMemos.map(m => m.id);
              if (groupMemoIds.length > 0) {
                await tx.delete(photos).where(inArray(photos.memoId, groupMemoIds));
                await tx.delete(memos).where(eq(memos.groupId, groupId));
              }
              await tx.delete(groups).where(eq(groups.id, groupId));
            }
          }
        }
      }

      // 5. 사용자의 멤버 레코드 삭제
      await tx.delete(members).where(eq(members.userId, userId));

      // 6. 사용자 삭제
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  // Groups
  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db
      .insert(groups)
      .values(insertGroup)
      .returning();
    return group;
  }

  async getGroupByInviteCode(inviteCode: string): Promise<Group | undefined> {
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode));
    return group || undefined;
  }

  async getGroups(userId: string): Promise<GroupWithMembers[]> {
    // Get all member records for this user
    const userMembers = await db.select().from(members).where(eq(members.userId, userId));
    const groupIds = userMembers.map(m => m.groupId);
    
    if (groupIds.length === 0) {
      return [];
    }
    
    // Get only the groups where the user is a member
    const userGroups = await db.query.groups.findMany({
      where: (groups, { inArray }) => inArray(groups.id, groupIds),
      with: {
        members: true,
      },
    });
    
    // Get memo counts for all groups in one query (성능 최적화)
    const memoCountsResults = await db
      .select({ 
        groupId: memos.groupId, 
        count: count() 
      })
      .from(memos)
      .where(inArray(memos.groupId, groupIds))
      .groupBy(memos.groupId);
    
    const memoCountsMap = new Map(
      memoCountsResults.map(r => [r.groupId, Number(r.count)])
    );
    
    // Add memoCount to each group
    const groupsWithMemoCounts = userGroups.map((group) => ({
      ...group,
      memoCount: memoCountsMap.get(group.id) || 0,
    }));
    
    return groupsWithMemoCounts;
  }

  async getGroupById(groupId: string): Promise<GroupWithMembers | undefined> {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
      with: {
        members: true,
      },
    });
    return group || undefined;
  }

  async getGroupForUser(groupId: string, userId: string): Promise<GroupWithMembers | undefined> {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
      with: {
        members: true,
      },
    });
    
    // Verify user is a member of this group
    if (group && group.members.some(member => member.userId === userId)) {
      return group;
    }
    
    return undefined;
  }

  async getGroupMemberCount(groupId: string): Promise<number> {
    const membersList = await db
      .select()
      .from(members)
      .where(eq(members.groupId, groupId));
    return membersList.length;
  }

  // Members
  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db
      .insert(members)
      .values(insertMember)
      .returning();
    return member;
  }

  async getMembersByGroupId(groupId: string): Promise<Member[]> {
    return db
      .select()
      .from(members)
      .where(eq(members.groupId, groupId));
  }

  async deleteMember(memberId: string): Promise<void> {
    await db.delete(members).where(eq(members.id, memberId));
  }

  async transferLeadership(groupId: string, currentLeaderId: string, newLeaderId: string): Promise<void> {
    // Verify both members exist and belong to the group
    const [currentLeader] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, currentLeaderId), eq(members.groupId, groupId)));
    
    const [newLeader] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, newLeaderId), eq(members.groupId, groupId)));

    if (!currentLeader || !newLeader) {
      throw new Error('멤버를 찾을 수 없습니다');
    }

    if (currentLeader.role !== 'leader') {
      throw new Error('방장만 권한을 이양할 수 있습니다');
    }

    // Transfer leadership
    await db.update(members).set({ role: 'member' }).where(eq(members.id, currentLeaderId));
    await db.update(members).set({ role: 'leader' }).where(eq(members.id, newLeaderId));
  }

  async getMemberByUserAndGroup(userId: string, groupId: string): Promise<Member | undefined> {
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.userId, userId), eq(members.groupId, groupId)));
    return member || undefined;
  }

  async checkMemberRole(userId: string, groupId: string, requiredRole: 'leader' | 'member'): Promise<boolean> {
    const member = await this.getMemberByUserAndGroup(userId, groupId);
    if (!member) return false;
    if (requiredRole === 'leader') {
      return member.role === 'leader';
    }
    return member.role === 'leader' || member.role === 'member';
  }

  async requireLeaderRole(userId: string, groupId: string): Promise<void> {
    const isLeader = await this.checkMemberRole(userId, groupId, 'leader');
    if (!isLeader) {
      throw new Error('방장 권한이 필요합니다');
    }
  }

  async updateMemberRole(memberId: string, role: 'leader' | 'member'): Promise<Member> {
    const [member] = await db
      .update(members)
      .set({ role })
      .where(eq(members.id, memberId))
      .returning();
    return member;
  }

  async updateMemberPermissions(memberId: string, canEditGroupMemos: boolean): Promise<Member> {
    const [member] = await db
      .update(members)
      .set({ canEditGroupMemos })
      .where(eq(members.id, memberId))
      .returning();
    return member;
  }

  // Memos
  async createMemo(insertMemo: InsertMemo): Promise<Memo> {
    const [memo] = await db
      .insert(memos)
      .values(insertMemo)
      .returning();
    return memo;
  }

  async getMemos(userId: string): Promise<MemoWithDetails[]> {
    // 1. 사용자가 속한 모든 멤버 ID와 그룹 ID 조회
    const userMembers = await db
      .select()
      .from(members)
      .where(eq(members.userId, userId));
    
    if (userMembers.length === 0) {
      return [];
    }
    
    const memberIds = userMembers.map(m => m.id);
    const groupIds = userMembers.map(m => m.groupId);
    
    // 2. SQL WHERE 절로 필요한 메모만 직접 조회 (성능 최적화)
    // - 사용자가 속한 그룹의 모든 메모 (groupId IN groupIds)
    // - 또는 사용자가 직접 작성한 개인 메모 (groupId IS NULL AND memberId IN memberIds)
    const whereConditions = [];
    if (groupIds.length > 0) {
      whereConditions.push(inArray(memos.groupId, groupIds));
    }
    if (memberIds.length > 0) {
      whereConditions.push(and(
        isNull(memos.groupId),
        inArray(memos.memberId, memberIds)
      ));
    }
    
    const userMemos = whereConditions.length > 0 ? await db.query.memos.findMany({
      where: or(...whereConditions),
      with: {
        photos: true,
        member: true,
        editorMember: true,
        group: true,
      },
    }) : [];
    
    return userMemos;
  }

  async getMemoById(id: string): Promise<MemoWithDetails | undefined> {
    const memo = await db.query.memos.findFirst({
      where: eq(memos.id, id),
      with: {
        photos: true,
        member: true,
        editorMember: true,
        group: true,
      },
    });
    return memo || undefined;
  }

  async updateMemo(id: string, updateData: Partial<InsertMemo>): Promise<Memo> {
    // Filter out undefined values to prevent overwriting existing columns with null
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );
    
    const [memo] = await db
      .update(memos)
      .set({ ...cleanedData, updatedAt: new Date() })
      .where(eq(memos.id, id))
      .returning();
    return memo;
  }

  async deleteMemo(id: string): Promise<void> {
    await db.delete(memos).where(eq(memos.id, id));
  }

  async clearGroupFromMemos(groupId: string): Promise<void> {
    await db
      .update(memos)
      .set({ groupId: null })
      .where(eq(memos.groupId, groupId));
  }

  async setMainMemo(memoId: string): Promise<Memo> {
    // Get the memo to find its location
    const targetMemo = await db.query.memos.findFirst({
      where: eq(memos.id, memoId),
    });

    if (!targetMemo) {
      throw new Error("MEMO_NOT_FOUND");
    }

    // Find all memos at the same location
    const memosAtLocation = await db.query.memos.findMany({
      where: and(
        eq(memos.latitude, targetMemo.latitude),
        eq(memos.longitude, targetMemo.longitude)
      ),
    });

    // Reset isMainMemo for all memos at this location
    for (const memo of memosAtLocation) {
      await db
        .update(memos)
        .set({ isMainMemo: false, updatedAt: new Date() })
        .where(eq(memos.id, memo.id));
    }

    // Set the selected memo as main
    const [updatedMemo] = await db
      .update(memos)
      .set({ isMainMemo: true, updatedAt: new Date() })
      .where(eq(memos.id, memoId))
      .returning();

    return updatedMemo;
  }

  async updateGroup(groupId: string, updateData: Partial<InsertGroup>): Promise<Group> {
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );
    
    const [group] = await db
      .update(groups)
      .set(cleanedData)
      .where(eq(groups.id, groupId))
      .returning();
    return group;
  }

  async regenerateInviteCode(groupId: string, newInviteCode: string): Promise<Group> {
    const [group] = await db
      .update(groups)
      .set({ inviteCode: newInviteCode })
      .where(eq(groups.id, groupId))
      .returning();
    return group;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, groupId));
  }

  async copyGroupMemosToPersonal(
    groupId: string, 
    userId: string
  ): Promise<{ group: Group; member: Member; copiedCount: number }> {
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Get the source group with members
      const sourceGroupData = await tx.query.groups.findFirst({
        where: eq(groups.id, groupId),
        with: {
          members: true,
        },
      });
      
      if (!sourceGroupData) {
        throw new Error("GROUP_NOT_FOUND");
      }

      // Verify user is a member of the source group
      const userMembership = sourceGroupData.members.find(m => m.userId === userId);
      if (!userMembership) {
        throw new Error("MEMBERSHIP_REQUIRED");
      }

      const sourceGroup = sourceGroupData;

      // Get all memos from the source group with photos
      const groupMemos = await tx.query.memos.findMany({
        where: eq(memos.groupId, groupId),
        with: {
          photos: true,
        },
      });

      // Check points: 10 points per memo
      const requiredPoints = groupMemos.length * 10;
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user.points < requiredPoints) {
        throw new Error("INSUFFICIENT_POINTS");
      }

      // Deduct points (will rollback if any subsequent step fails)
      await tx
        .update(users)
        .set({ points: user.points - requiredPoints })
        .where(eq(users.id, userId));

      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create new group with "{원그룹명} 복사본" format
      const newGroupName = `${sourceGroup.name} 복사본`;
      const [newGroup] = await tx
        .insert(groups)
        .values({
          name: newGroupName,
          inviteCode,
          color: sourceGroup.color,
          markerIcon: sourceGroup.markerIcon,
        })
        .returning();

      // Create member for the user in the new group
      const [newMember] = await tx
        .insert(members)
        .values({
          name: "나",
          groupId: newGroup.id,
          userId: userId,
          role: "leader",
        })
        .returning();

      // Copy all memos to the new group (without photos)
      let copiedCount = 0;
      for (const memo of groupMemos) {
        await tx
          .insert(memos)
          .values({
            buildingName: memo.buildingName,
            address: memo.address,
            latitude: memo.latitude,
            longitude: memo.longitude,
            content: memo.content,
            markerIcon: memo.markerIcon,
            memberId: newMember.id,
            groupId: newGroup.id,
            mainPhotoId: null, // No photos are copied
          })
          .returning();

        copiedCount++;
      }

      return { group: newGroup, member: newMember, copiedCount };
    });
  }

  // Photos
  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const [photo] = await db
      .insert(photos)
      .values(insertPhoto)
      .returning();
    return photo;
  }

  async getPhotosByMemoId(memoId: string): Promise<Photo[]> {
    return db
      .select()
      .from(photos)
      .where(eq(photos.memoId, memoId))
      .orderBy(photos.order);
  }

  async updatePhotoOrder(photoId: string, order: number): Promise<void> {
    await db
      .update(photos)
      .set({ order })
      .where(eq(photos.id, photoId));
  }

  async deletePhoto(photoId: string): Promise<void> {
    await db.delete(photos).where(eq(photos.id, photoId));
  }
}

export const storage = new DatabaseStorage();
