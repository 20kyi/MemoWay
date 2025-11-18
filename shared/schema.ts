import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, doublePrecision, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // OAuth provider fields
  kakaoId: varchar("kakao_id").unique(),
  googleId: varchar("google_id").unique(),
  // Authentication provider: 'replit', 'kakao', or 'google'
  provider: varchar("provider").notNull().default('replit'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Groups table
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  inviteCode: varchar("invite_code").notNull().unique(),
  color: varchar("color").notNull().default('#3b82f6'),
  markerIcon: varchar("marker_icon").notNull().default('default'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Member roles
export const memberRoles = ['leader', 'member'] as const;
export type MemberRole = typeof memberRoles[number];

// Members table (users in groups)
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: varchar("role").notNull().default('member'),
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
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "set null" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  markerIcon: varchar("marker_icon").notNull().default('default'),
  mainPhotoId: varchar("main_photo_id"),
  isMainMemo: boolean("is_main_memo").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Photos table
export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memoId: varchar("memo_id").notNull().references(() => memos.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  members: many(members),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(members),
  memos: many(memos),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  group: one(groups, {
    fields: [members.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
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

// Marker icon types
export const markerIconTypes = ['default', 'travel', 'love', 'food', 'cafe', 'shopping', 'sport', 'work'] as const;
export type MarkerIconType = typeof markerIconTypes[number];

// Insert schemas
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
}).extend({
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "유효한 색상 코드를 선택하세요").default('#3b82f6'),
  markerIcon: z.enum(markerIconTypes).default('default'),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  joinedAt: true,
}).extend({
  role: z.enum(memberRoles).default('member'),
});

export const insertMemoSchema = createInsertSchema(memos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  markerIcon: z.enum(markerIconTypes).default('default'),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

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
