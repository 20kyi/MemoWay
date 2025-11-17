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
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByKakaoId(kakaoId: string): Promise<User | undefined>;
  
  // Groups
  createGroup(group: InsertGroup): Promise<Group>;
  getGroupByInviteCode(inviteCode: string): Promise<Group | undefined>;
  getGroups(userId: string): Promise<GroupWithMembers[]>;
  getGroupById(groupId: string): Promise<GroupWithMembers | undefined>;
  getGroupForUser(groupId: string, userId: string): Promise<GroupWithMembers | undefined>;
  deleteGroup(groupId: string): Promise<void>;
  copyGroupMemosToPersonal(groupId: string, userId: string): Promise<{ group: Group; member: Member; copiedCount: number }>;
  
  // Members
  createMember(member: InsertMember): Promise<Member>;
  getMembersByGroupId(groupId: string): Promise<Member[]>;
  deleteMember(memberId: string): Promise<void>;
  transferLeadership(groupId: string, currentLeaderId: string, newLeaderId: string): Promise<void>;
  
  // Memos
  createMemo(memo: InsertMemo): Promise<Memo>;
  getMemos(): Promise<MemoWithDetails[]>;
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
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
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
    const allGroups = await db.query.groups.findMany({
      with: {
        members: true,
      },
    });
    
    // Filter to only groups where user is a member
    return allGroups.filter(group => 
      group.members.some(member => member.userId === userId)
    );
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

  // Memos
  async createMemo(insertMemo: InsertMemo): Promise<Memo> {
    const [memo] = await db
      .insert(memos)
      .values(insertMemo)
      .returning();
    return memo;
  }

  async getMemos(): Promise<MemoWithDetails[]> {
    const allMemos = await db.query.memos.findMany({
      with: {
        photos: true,
        member: true,
        group: true,
      },
    });
    return allMemos;
  }

  async getMemoById(id: string): Promise<MemoWithDetails | undefined> {
    const memo = await db.query.memos.findFirst({
      where: eq(memos.id, id),
      with: {
        photos: true,
        member: true,
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
    // Get the source group with members
    const sourceGroupData = await db.query.groups.findFirst({
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
    const groupMemos = await db.query.memos.findMany({
      where: eq(memos.groupId, groupId),
      with: {
        photos: true,
      },
    });

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create new group with "{원그룹명} 복사본" format
    const newGroupName = `${sourceGroup.name} 복사본`;
    const [newGroup] = await db
      .insert(groups)
      .values({
        name: newGroupName,
        inviteCode,
        color: sourceGroup.color,
        markerIcon: sourceGroup.markerIcon,
      })
      .returning();

    // Create member for the user in the new group
    const [newMember] = await db
      .insert(members)
      .values({
        name: "나",
        groupId: newGroup.id,
        userId: userId,
      })
      .returning();

    // Copy all memos to the new group
    let copiedCount = 0;
    for (const memo of groupMemos) {
      const [newMemo] = await db
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
          mainPhotoId: null, // Will be set after photos are copied
        })
        .returning();

      // Copy photos
      let newMainPhotoId: string | null = null;
      for (const photo of memo.photos) {
        const [newPhoto] = await db
          .insert(photos)
          .values({
            url: photo.url, // URL stays the same since files are shared
            memoId: newMemo.id,
          })
          .returning();

        // If this was the main photo, track it
        if (memo.mainPhotoId === photo.id) {
          newMainPhotoId = newPhoto.id;
        }
      }

      // Update the main photo ID if there was one
      if (newMainPhotoId) {
        await db
          .update(memos)
          .set({ mainPhotoId: newMainPhotoId })
          .where(eq(memos.id, newMemo.id));
      }

      copiedCount++;
    }

    return { group: newGroup, member: newMember, copiedCount };
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
