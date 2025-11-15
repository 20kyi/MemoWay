// Reference: javascript_database blueprint - updated with app-specific storage
import { 
  groups, 
  members, 
  memos, 
  photos,
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
  // Groups
  createGroup(group: InsertGroup): Promise<Group>;
  getGroupByInviteCode(inviteCode: string): Promise<Group | undefined>;
  getGroups(): Promise<GroupWithMembers[]>;
  deleteGroup(groupId: string): Promise<void>;
  
  // Members
  createMember(member: InsertMember): Promise<Member>;
  getMembersByGroupId(groupId: string): Promise<Member[]>;
  deleteMember(memberId: string): Promise<void>;
  
  // Memos
  createMemo(memo: InsertMemo): Promise<Memo>;
  getMemos(): Promise<MemoWithDetails[]>;
  getMemoById(id: string): Promise<MemoWithDetails | undefined>;
  updateMemo(id: string, memo: Partial<InsertMemo>): Promise<Memo>;
  deleteMemo(id: string): Promise<void>;
  clearGroupFromMemos(groupId: string): Promise<void>;
  
  // Photos
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhotosByMemoId(memoId: string): Promise<Photo[]>;
  deletePhoto(photoId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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

  async getGroups(): Promise<GroupWithMembers[]> {
    const allGroups = await db.query.groups.findMany({
      with: {
        members: true,
      },
    });
    return allGroups;
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

  async deleteGroup(groupId: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, groupId));
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
      .where(eq(photos.memoId, memoId));
  }

  async deletePhoto(photoId: string): Promise<void> {
    await db.delete(photos).where(eq(photos.id, photoId));
  }
}

export const storage = new DatabaseStorage();
