import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, doublePrecision, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Groups table
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  inviteCode: varchar("invite_code").notNull().unique(),
  color: varchar("color").notNull().default('#3b82f6'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Members table (users in groups)
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Memos table
export const memos = pgTable("memos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingName: text("building_name").notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  content: text("content").notNull(),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Photos table
export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memoId: varchar("memo_id").notNull().references(() => memos.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(members),
  memos: many(memos),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  group: one(groups, {
    fields: [members.groupId],
    references: [groups.id],
  }),
  memos: many(memos),
}));

export const memosRelations = relations(memos, ({ one, many }) => ({
  group: one(groups, {
    fields: [memos.groupId],
    references: [groups.id],
  }),
  member: one(members, {
    fields: [memos.memberId],
    references: [members.id],
  }),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  memo: one(memos, {
    fields: [photos.memoId],
    references: [memos.id],
  }),
}));

// Insert schemas
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
}).extend({
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "유효한 색상 코드를 선택하세요").default('#3b82f6'),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  joinedAt: true,
});

export const insertMemoSchema = createInsertSchema(memos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});

// Types
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Memo = typeof memos.$inferSelect;
export type InsertMemo = z.infer<typeof insertMemoSchema>;

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;

// Extended types for frontend use
export type MemoWithPhotos = Memo & { photos: Photo[] };
export type MemoWithDetails = Memo & { 
  photos: Photo[];
  member: Member;
  group: Group | null;
};
export type GroupWithMembers = Group & { members: Member[] };
