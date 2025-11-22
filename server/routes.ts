// Reference: javascript_websocket blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGroupSchema, insertMemberSchema, insertMemoSchema, type InsertMemo } from "@shared/schema";
import { randomBytes } from "crypto";
import { z } from "zod";
import { normalizeAddress } from "./utils/address-normalizer";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  const { setupKakaoAuth } = await import("./kakaoAuth");
  const { setupGoogleAuth } = await import("./googleAuth");
  setupKakaoAuth(app);
  setupGoogleAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Points
  app.post("/api/points/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const bodySchema = z.object({
        amount: z.number().positive().int(),
      });
      
      const { amount } = bodySchema.parse(req.body);
      
      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }
      
      // Add points to user
      const updatedUser = await storage.addPoints(userId, amount);
      
      res.json({ 
        success: true, 
        points: updatedUser.points,
        added: amount 
      });
    } catch (error: any) {
      console.error("Error purchasing points:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "유효하지 않은 요청입니다" });
      }
      res.status(500).json({ error: "포인트 구매 중 오류가 발생했습니다" });
    }
  });

  // Groups
  app.post("/api/groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const bodySchema = z.object({
        name: z.string().min(1, "그룹명을 입력하세요").max(100),
        description: z.string().optional(),
        memberName: z.string().min(1, "이름을 입력하세요").max(50),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, "유효한 색상 코드를 선택하세요").default('#3b82f6'),
        markerIcon: z.enum(['default', 'travel', 'love', 'food', 'cafe', 'shopping', 'sport', 'work']).default('default'),
      });
      
      const { name, description, memberName, color, markerIcon } = bodySchema.parse(req.body);
      
      // 6자리 대문자 영숫자 초대 코드 생성
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        const bytes = randomBytes(6);
        for (let i = 0; i < 6; i++) {
          code += chars[bytes[i] % chars.length];
        }
        return code;
      };
      const inviteCode = generateInviteCode();
      
      const group = await storage.createGroup({ name, description, inviteCode, color, markerIcon });
      const member = await storage.createMember({ 
        groupId: group.id, 
        name: memberName,
        userId,
        role: 'leader'
      });
      
      res.json({ group, member });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/groups/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const bodySchema = z.object({
        inviteCode: z.string().min(1, "초대 코드를 입력하세요"),
        memberName: z.string().min(1, "이름을 입력하세요").max(50),
      });
      
      const { inviteCode, memberName } = bodySchema.parse(req.body);
      
      const group = await storage.getGroupByInviteCode(inviteCode);
      if (!group) {
        return res.status(404).json({ error: "그룹을 찾을 수 없습니다" });
      }
      
      // Check if group has reached max members
      const currentMemberCount = await storage.getGroupMemberCount(group.id);
      const maxMembers = group.maxMembers || 20; // Default to 20 if not set
      
      if (currentMemberCount >= maxMembers) {
        return res.status(400).json({ error: `그룹 인원이 가득 찼습니다 (${maxMembers}명 최대)` });
      }
      
      const member = await storage.createMember({ 
        groupId: group.id, 
        name: memberName,
        userId,
        role: 'member'
      });
      
      res.json({ group, member });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getGroups(userId);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/groups/:groupId/copy-to-personal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId } = req.params;

      const result = await storage.copyGroupMemosToPersonal(groupId, userId);
      
      res.json({
        success: true,
        group: result.group,
        member: result.member,
        copiedCount: result.copiedCount,
      });
    } catch (error: any) {
      console.error("Error copying group memos:", error);
      
      if (error.message === "GROUP_NOT_FOUND") {
        return res.status(404).json({ error: "그룹을 찾을 수 없습니다" });
      }
      
      if (error.message === "MEMBERSHIP_REQUIRED") {
        return res.status(403).json({ error: "이 그룹의 멤버만 복사할 수 있습니다" });
      }

      if (error.message === "INSUFFICIENT_POINTS") {
        return res.status(403).json({ error: "포인트가 부족합니다" });
      }

      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  // Leader-only endpoints
  app.patch("/api/groups/:groupId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId } = req.params;

      // Check leader role
      await storage.requireLeaderRole(userId, groupId);

      const bodySchema = z.object({
        name: z.string().min(1, "그룹명을 입력하세요").max(100).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i, "유효한 색상 코드를 선택하세요").optional(),
        markerIcon: z.enum(['default', 'travel', 'love', 'food', 'cafe', 'shopping', 'sport', 'work']).optional(),
      });

      const updateData = bodySchema.parse(req.body);
      const group = await storage.updateGroup(groupId, updateData);

      res.json(group);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      if (error.message === '방장 권한이 필요합니다') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/groups/:groupId/regenerate-code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId } = req.params;

      // Check leader role
      await storage.requireLeaderRole(userId, groupId);

      const newInviteCode = randomBytes(6).toString("hex");
      const group = await storage.regenerateInviteCode(groupId, newInviteCode);

      res.json(group);
    } catch (error: any) {
      if (error.message === '방장 권한이 필요합니다') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/groups/:groupId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId } = req.params;

      // Check leader role
      await storage.requireLeaderRole(userId, groupId);

      // Check if trying to delete personal group
      const group = await storage.getGroupById(groupId);
      
      if (group && group.name === "개인 메모") {
        return res.status(400).json({ error: "개인 메모는 삭제할 수 없습니다" });
      }

      await storage.deleteGroup(groupId);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === '방장 권한이 필요합니다') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/groups/:groupId/transfer-leader", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId } = req.params;

      const bodySchema = z.object({
        newLeaderId: z.string().min(1, "새 방장 멤버 ID가 필요합니다"),
      });

      const { newLeaderId } = bodySchema.parse(req.body);

      // Get current leader member
      const currentLeaderMember = await storage.getMemberByUserAndGroup(userId, groupId);
      if (!currentLeaderMember) {
        return res.status(404).json({ error: "현재 멤버를 찾을 수 없습니다" });
      }

      // Transfer leadership (includes all validation)
      await storage.transferLeadership(groupId, currentLeaderMember.id, newLeaderId);

      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      if (error.message === '방장만 권한을 이양할 수 있습니다' || error.message === '멤버를 찾을 수 없습니다') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/groups/:groupId/members/:memberId/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId, memberId } = req.params;
      
      // Only leader can update member permissions
      await storage.requireLeaderRole(userId, groupId);
      
      const bodySchema = z.object({
        canEditGroupMemos: z.boolean(),
      });
      
      const { canEditGroupMemos } = bodySchema.parse(req.body);
      
      // Update member permissions
      const updatedMember = await storage.updateMemberPermissions(memberId, canEditGroupMemos);
      
      res.json(updatedMember);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      if (error.message === '방장 권한이 필요합니다') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/groups/:groupId/members/:memberId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { groupId, memberId } = req.params;
      
      // Get the member being deleted and current user's member record
      const members = await storage.getMembersByGroupId(groupId);
      const memberToDelete = members.find(m => m.id === memberId);
      const currentUserMember = await storage.getMemberByUserAndGroup(userId, groupId);
      
      if (!memberToDelete) {
        return res.status(404).json({ error: "멤버를 찾을 수 없습니다" });
      }

      // Check if trying to delete a member from the personal group
      const group = await storage.getGroupById(groupId);
      
      if (group && group.name === "개인 메모") {
        return res.status(400).json({ 
          error: "개인 메모 멤버는 삭제할 수 없습니다" 
        });
      }
      
      // Allow self-deletion (leaving group) or require leader role to delete others
      const isSelfDelete = currentUserMember?.id === memberId;
      if (!isSelfDelete) {
        // Only leader can delete other members
        await storage.requireLeaderRole(userId, groupId);
      }

      // Prevent leader from deleting themselves if they're the only leader
      if (isSelfDelete && memberToDelete.role === 'leader') {
        const leaderCount = members.filter(m => m.role === 'leader').length;
        if (leaderCount === 1 && members.length > 1) {
          return res.status(400).json({ 
            error: "방장 권한을 다른 멤버에게 먼저 이양해주세요" 
          });
        }
      }
      
      // Delete the member (memos will be cascade deleted)
      await storage.deleteMember(memberId);
      
      // Check if this was the last member in the group
      const updatedGroup = await storage.getGroupById(groupId);
      
      // If group has no members left and is not the personal group, delete it
      if (updatedGroup && updatedGroup.members.length === 0 && updatedGroup.name !== "개인 메모") {
        await storage.deleteGroup(groupId);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === '방장 권한이 필요합니다') {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Memos
  app.post("/api/memos", isAuthenticated, upload.array("photos", 10), async (req, res) => {
    try {
      const bodySchema = z.object({
        buildingName: z.string().min(1, "건물명을 입력하세요").max(200),
        address: z.string().min(1, "주소를 입력하세요").max(500),
        latitude: z.string().refine((val) => !isNaN(parseFloat(val)), "유효한 위도를 입력하세요"),
        longitude: z.string().refine((val) => !isNaN(parseFloat(val)), "유효한 경도를 입력하세요"),
        content: z.string().min(1, "메모 내용을 입력하세요").max(2000),
        memberId: z.string().min(1, "멤버 ID가 필요합니다"),
        groupId: z.string().optional(),
        markerIcon: z.enum(['default', 'travel', 'love', 'food', 'cafe', 'shopping', 'sport', 'work']).default('default'),
        mainPhotoIndex: z.string().optional(),
      });
      
      let { buildingName, address, latitude, longitude, content, memberId, groupId, markerIcon, mainPhotoIndex } = bodySchema.parse(req.body);
      
      // Verify member and get correct member ID
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "인증이 필요합니다" });
      }
      
      const userGroups = await storage.getGroups(userId);
      
      console.log('메모 생성 요청:', { userId, memberId, groupId, userGroupsCount: userGroups.length });
      
      // If groupId is provided, find the user's member in that group
      if (groupId) {
        const targetGroup = userGroups.find(g => g.id === groupId);
        if (!targetGroup) {
          console.log('그룹을 찾을 수 없음:', groupId);
          return res.status(403).json({ error: "접근 권한이 없는 그룹입니다" });
        }
        
        // Find the user's member in this group
        const userMember = targetGroup.members.find(m => m.userId === userId);
        if (!userMember) {
          console.log('그룹의 멤버가 아님:', { groupId, userId, members: targetGroup.members.map(m => ({ id: m.id, userId: m.userId })) });
          return res.status(403).json({ error: "해당 그룹의 멤버가 아닙니다" });
        }
        
        // Use the correct member ID for this group
        memberId = userMember.id;
        console.log('그룹 메모 생성 - memberId:', memberId);
      } else {
        // For personal memos, verify the provided memberId belongs to the user
        console.log('개인 메모 검증:', { memberId, userId });
        
        // Find all members that belong to this user
        const userMembers = userGroups.flatMap(g => g.members.filter(m => m.userId === userId));
        console.log('사용자의 모든 멤버:', userMembers.map(m => ({ id: m.id, name: m.name, groupId: userGroups.find(g => g.members.some(mem => mem.id === m.id))?.id })));
        
        const memberExists = userMembers.some(m => m.id === memberId);
        if (!memberExists) {
          console.log('멤버를 찾을 수 없음:', { memberId, availableMembers: userMembers.map(m => m.id) });
          return res.status(403).json({ error: "유효하지 않은 멤버입니다" });
        }
        console.log('개인 메모 생성 - 멤버 검증 성공');
      }
      
      // 주소 정규화
      const normalizedAddress = normalizeAddress(address);
      
      const memo = await storage.createMemo({
        buildingName,
        address: normalizedAddress,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        content,
        memberId,
        groupId: groupId || null,
        markerIcon,
        mainPhotoId: null,
      });

      const files = req.files as Express.Multer.File[];
      const photoIds: string[] = [];
      
      if (files && files.length > 0) {
        if (files.length > 10) {
          return res.status(400).json({ error: "최대 10개의 사진만 업로드할 수 있습니다" });
        }
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.size > MAX_FILE_SIZE) {
            return res.status(400).json({ error: "파일 크기는 5MB를 초과할 수 없습니다" });
          }
          
          const photoUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          const photo = await storage.createPhoto({
            memoId: memo.id,
            url: photoUrl,
            order: i,
          });
          photoIds.push(photo.id);
        }
      }
      
      // Automatically set first photo as main photo
      if (photoIds.length > 0) {
        await storage.updateMemo(memo.id, { mainPhotoId: photoIds[0] });
      }

      const memoWithDetails = await storage.getMemoById(memo.id);
      
      // Broadcast to WebSocket clients
      broadcast({ 
        type: "memo_created", 
        memo: memoWithDetails 
      });
      
      res.json(memoWithDetails);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memos = await storage.getMemos(userId);
      res.json(memos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memos/:id", isAuthenticated, async (req, res) => {
    try {
      const memo = await storage.getMemoById(req.params.id);
      if (!memo) {
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      res.json(memo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/memos/:id", isAuthenticated, upload.array("photos", 10), async (req, res) => {
    try {
      const bodySchema = z.object({
        buildingName: z.string().min(1, "건물명을 입력하세요").max(200),
        address: z.string().min(1, "주소를 입력하세요").max(500),
        content: z.string().min(1, "메모 내용을 입력하세요").max(2000),
        groupId: z.string().optional().transform(val => val === "" ? null : val),
        markerIcon: z.enum(['default', 'travel', 'love', 'food', 'cafe', 'shopping', 'sport', 'work']).optional(),
        deletedPhotoIds: z.string().optional(),
        mainPhotoId: z.string().optional(),
        mainPhotoIndex: z.string().optional(),
        photoOrders: z.string().optional(),
      });
      
      const parsed = bodySchema.parse(req.body);
      const { deletedPhotoIds, mainPhotoId, mainPhotoIndex, photoOrders, ...updateData } = parsed;
      
      // 주소 정규화
      const normalizedAddress = normalizeAddress(updateData.address);
      
      // Build update object - latitude/longitude/memberId are not editable
      const memoUpdate: Partial<InsertMemo> = {
        buildingName: updateData.buildingName,
        address: normalizedAddress,
        content: updateData.content,
        groupId: updateData.groupId ?? null,
      };
      
      // Add markerIcon if provided
      if (updateData.markerIcon) {
        memoUpdate.markerIcon = updateData.markerIcon;
      }
      
      // Verify memo exists
      const existingMemo = await storage.getMemoById(req.params.id);
      if (!existingMemo) {
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      
      // Check edit permissions
      const userId = (req as any).user.claims.sub;
      let canEdit = false;
      let currentMember = null;
      
      // Check if user is the original author
      if (existingMemo.member.userId === userId) {
        canEdit = true;
      }
      
      // For group memos, check additional permissions
      if (existingMemo.groupId && !canEdit) {
        currentMember = await storage.getMemberByUserAndGroup(userId, existingMemo.groupId);
        
        if (currentMember) {
          // Allow edit if user is the group leader or has canEditGroupMemos permission
          if (currentMember.role === 'leader' || currentMember.canEditGroupMemos) {
            canEdit = true;
          }
        }
      }
      
      if (!canEdit) {
        return res.status(403).json({ error: "메모를 수정할 권한이 없습니다" });
      }
      
      // Set editorMemberId to the current user's member ID in the memo's group
      if (existingMemo.groupId) {
        if (!currentMember) {
          currentMember = await storage.getMemberByUserAndGroup(userId, existingMemo.groupId);
        }
        if (currentMember) {
          memoUpdate.editorMemberId = currentMember.id;
        }
      }
      
      await storage.updateMemo(req.params.id, memoUpdate);
      
      // Handle photo order updates
      if (photoOrders) {
        const orders = JSON.parse(photoOrders) as Array<{ id: string; order: number }>;
        for (const { id, order } of orders) {
          await storage.updatePhotoOrder(id, order);
        }
      }
      
      // Handle deleted photos
      if (deletedPhotoIds) {
        const photoIds = JSON.parse(deletedPhotoIds);
        for (const photoId of photoIds) {
          await storage.deletePhoto(photoId);
        }
      }
      
      // Handle new photos
      const files = req.files as Express.Multer.File[];
      const newPhotoIds: string[] = [];
      
      if (files && files.length > 0) {
        const currentPhotos = await storage.getPhotosByMemoId(req.params.id);
        if (currentPhotos.length + files.length > 10) {
          return res.status(400).json({ error: "최대 10개의 사진만 업로드할 수 있습니다" });
        }
        
        const maxOrder = currentPhotos.length > 0 
          ? Math.max(...currentPhotos.map(p => p.order || 0))
          : -1;
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.size > MAX_FILE_SIZE) {
            return res.status(400).json({ error: "파일 크기는 5MB를 초과할 수 없습니다" });
          }
          
          const photoUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          const photo = await storage.createPhoto({
            memoId: req.params.id,
            url: photoUrl,
            order: maxOrder + i + 1,
          });
          newPhotoIds.push(photo.id);
        }
      }
      
      // Get all photos to determine main photo
      const allPhotos = await storage.getPhotosByMemoId(req.params.id);
      if (allPhotos.length > 0) {
        const firstPhoto = allPhotos.sort((a, b) => (a.order || 0) - (b.order || 0))[0];
        await storage.updateMemo(req.params.id, { mainPhotoId: firstPhoto.id });
      }
      
      const updatedMemo = await storage.getMemoById(req.params.id);
      if (!updatedMemo) {
        return res.status(500).json({ error: "메모 업데이트 실패" });
      }
      
      // Broadcast to WebSocket clients
      broadcast({ 
        type: "memo_updated", 
        memo: updatedMemo 
      });
      
      res.json(updatedMemo);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/memos/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMemo(req.params.id);
      
      // Broadcast to WebSocket clients
      broadcast({ 
        type: "memo_deleted", 
        memoId: req.params.id 
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/memos/:id/set-main", isAuthenticated, async (req, res) => {
    try {
      const updatedMemo = await storage.setMainMemo(req.params.id);
      
      // Broadcast to WebSocket clients
      broadcast({ 
        type: "memo_updated", 
        memo: await storage.getMemoById(updatedMemo.id)
      });
      
      res.json(updatedMemo);
    } catch (error: any) {
      if (error.message === "MEMO_NOT_FOUND") {
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // 마이그레이션: 기존 메모들의 주소 정규화
  app.post("/api/memos/normalize-addresses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allMemos = await storage.getMemos(userId);
      
      let updatedCount = 0;
      for (const memo of allMemos) {
        const normalizedAddress = normalizeAddress(memo.address);
        if (normalizedAddress !== memo.address) {
          await storage.updateMemo(memo.id, { address: normalizedAddress });
          updatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `${updatedCount}개의 메모 주소가 정규화되었습니다.`,
        updatedCount,
        totalCount: allMemos.length
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time memo updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log('WebSocket client connected. Total clients:', clients.size);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Broadcast to all other clients
        clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected. Total clients:', clients.size);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  return httpServer;
}
