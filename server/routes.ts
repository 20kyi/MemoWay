// Reference: javascript_websocket blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { type InsertMemo } from "@shared/schema";
import { randomBytes } from "crypto";
import { z } from "zod";
import { normalizeAddress } from "./utils/address-normalizer";
import * as oidcClient from "openid-client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
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
  const { setupEmailAuth } = await import("./emailAuth");
  setupKakaoAuth(app);
  setupGoogleAuth(app);
  setupEmailAuth(app);

  // Logout route (common for all auth methods - register after Passport is initialized)
  // 항상 JSON 응답만 반환하는 순수 API (절대 redirect 사용하지 않음)
  app.get('/api/logout', async (req, res) => {
    console.log('[LOGOUT] === Logout API called ===');
    
    const isProd = process.env.NODE_ENV === "production";
    
    // 쿠키 옵션 (로그인 시 사용한 옵션과 동일하게)
    // replitAuth.ts의 getSession()에서 사용한 옵션과 일치해야 함
    // domain 옵션은 명시하지 않음 (브라우저가 자동으로 설정)
    // 하지만 안드로이드 WebView의 경우 명시적으로 설정해야 할 수 있음
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'none';
      path: string;
      domain?: string;
    } = {
      httpOnly: true,
      secure: true, // 항상 true - HTTPS 필수 (Android WebView 지원)
      sameSite: 'none' as const, // 항상 "none" - Android WebView cross-site 쿠키 지원
      path: "/",
      // domain은 명시하지 않음 (브라우저가 자동으로 설정)
      // 안드로이드 WebView에서도 동작하도록 domain을 명시하지 않는 것이 안전
    };
    
    // Step 1: Passport logout (있으면)
    const handlePassportLogout = (callback: () => void) => {
      if (typeof (req as any).logout === 'function') {
        console.log('[LOGOUT] Calling req.logout()');
        try {
          (req as any).logout((err: any) => {
            if (err) {
              console.error('[LOGOUT] req.logout() error:', err);
            } else {
              console.log('[LOGOUT] req.logout() completed successfully');
            }
            callback();
          });
        } catch (logoutErr: any) {
          console.error('[LOGOUT] Exception in req.logout():', logoutErr);
          callback();
        }
      } else {
        console.log('[LOGOUT] req.logout() is not available (not a function)');
        callback();
      }
    };

    // Step 2: Destroy session
    const handleSessionDestroy = (callback: () => void) => {
      if (req.session) {
        console.log('[LOGOUT] Destroying session, session ID:', req.sessionID);
        
        // 세션 데이터 명시적으로 제거
        if (req.session.userId) {
          console.log('[LOGOUT] Removing userId from session:', req.session.userId);
          delete req.session.userId;
        }
        if (req.session.passport) {
          console.log('[LOGOUT] Removing passport data from session');
          delete req.session.passport;
        }
        
        try {
          req.session.destroy((destroyErr: any) => {
            if (destroyErr) {
              console.error('[LOGOUT] Session destroy error:', destroyErr);
            } else {
              console.log('[LOGOUT] Session destroyed successfully');
            }
            callback();
          });
        } catch (destroyException: any) {
          console.error('[LOGOUT] Exception in session.destroy():', destroyException);
          callback();
        }
      } else {
        console.log('[LOGOUT] No session to destroy');
        callback();
      }
    };

    // Step 3: Clear cookie and send JSON response
    const sendResponse = () => {
      try {
        console.log('[LOGOUT] Clearing session cookie with options:', cookieOptions);
        res.clearCookie('connect.sid', cookieOptions);
        console.log('[LOGOUT] Session destroyed and cookie cleared');
        
        // 항상 JSON 응답만 반환 (절대 redirect 사용하지 않음)
        return res.status(200).json({ success: true });
      } catch (cookieErr: any) {
        console.error('[LOGOUT] Cookie clear error:', cookieErr);
        // 에러가 발생해도 JSON 응답은 반환
        return res.status(200).json({ success: true });
      }
    };

    // Execute logout flow
    try {
      handlePassportLogout(() => {
        handleSessionDestroy(() => {
          sendResponse();
        });
      });
    } catch (error: any) {
      console.error('[LOGOUT] === Top-level exception ===');
      console.error('[LOGOUT] Error:', error);
      console.error('[LOGOUT] Error message:', error?.message);
      
      // Fallback: try to clean up anyway
      try {
        if (req.session) {
          // 세션 데이터 제거
          if (req.session.userId) delete req.session.userId;
          if (req.session.passport) delete req.session.passport;
          
          req.session.destroy(() => {
            res.clearCookie('connect.sid', cookieOptions);
            return res.status(200).json({ success: true });
          });
        } else {
          res.clearCookie('connect.sid', cookieOptions);
          return res.status(200).json({ success: true });
        }
      } catch (fallbackErr: any) {
        console.error('[LOGOUT] === Fallback cleanup failed ===');
        console.error('[LOGOUT] Fallback error:', fallbackErr);
        // 최종 fallback: 쿠키만 클리어하고 JSON 응답
        try {
          res.clearCookie('connect.sid', cookieOptions);
        } catch (e) {
          // 쿠키 클리어 실패해도 계속 진행
        }
        return res.status(200).json({ 
          success: false, 
          error: error?.message || 'Unknown error'
        });
      }
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // 포인트 정보는 DB에만 있으므로 항상 DB에서 최신 정보 가져오기
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // DB에서 최신 사용자 정보 가져오기 (포인트 포함)
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // 세션의 claims 정보와 DB의 최신 정보를 병합하여 반환
      res.json({
        id: dbUser.id,
        email: dbUser.email || user.claims?.email,
        firstName: dbUser.firstName || user.claims?.first_name,
        lastName: dbUser.lastName || user.claims?.last_name,
        profileImageUrl: dbUser.profileImageUrl || user.claims?.profile_image_url,
        points: dbUser.points, // DB에서 가져온 최신 포인트 정보
        provider: dbUser.provider,
      });
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
      
      console.log(`[Points Purchase] User ${userId} purchased ${amount} points. New total: ${updatedUser.points}`);
      
      // 클라이언트에서 즉시 사용할 수 있도록 전체 사용자 정보 반환
      res.json({ 
        success: true, 
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profileImageUrl: updatedUser.profileImageUrl,
        points: updatedUser.points, // 최신 포인트 정보
        provider: updatedUser.provider,
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

  // Attendance
  app.get("/api/attendance/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = await storage.getAttendanceStatus(userId);
      
      // Calculate next reset time (13:00 KST)
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstTime = new Date(now.getTime() + kstOffset);
      
      // If current KST hour < 13, reset is today 13:00 KST
      // Else, reset is tomorrow 13:00 KST
      let nextResetKST = new Date(kstTime);
      if (kstTime.getUTCHours() >= 13) {
        nextResetKST.setUTCDate(nextResetKST.getUTCDate() + 1);
      }
      nextResetKST.setUTCHours(13, 0, 0, 0);
      
      // Convert back to UTC for client (which handles timezone display) or ISO string
      const nextResetUTC = new Date(nextResetKST.getTime() - kstOffset);
      
      res.json({
        ...status,
        nextReset: nextResetUTC.toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/attendance/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.checkAttendance(userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === "ALREADY_CHECKED_TODAY") {
        return res.status(400).json({ error: "오늘은 이미 출석체크를 완료했습니다." });
      }
      res.status(500).json({ error: error.message });
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

      // Get updated group data for broadcast
      const updatedGroup = await storage.getGroupById(groupId);
      if (updatedGroup) {
        // Broadcast to WebSocket clients
        broadcast({
          type: "group_updated",
          group: updatedGroup,
        });
      }

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
        rating: z.coerce.number().min(0).max(5).default(0),
      });
      
      let { buildingName, address, latitude, longitude, content, memberId, groupId, markerIcon, rating } = bodySchema.parse(req.body);
      
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
        rating,
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

      const memoWithDetails = await storage.getMemoById(memo.id, userId);
      if (!memoWithDetails) {
        return res.status(500).json({ error: "메모를 조회할 수 없습니다" });
      }
      
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
      console.log(`[API:GET /api/memos] 🔍 Fetching memos for userId=${userId}`);
      
      const memos = await storage.getMemos(userId);
      
      console.log(`[API:GET /api/memos] ✅ Found ${memos.length} memos for userId=${userId}`);
      res.json(memos);
    } catch (error: any) {
      console.error(`[API:GET /api/memos] ❌ Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/memos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[API:GET /api/memos/:id] 🔍 Fetching memo ${req.params.id} for userId=${userId}`);
      
      const memo = await storage.getMemoById(req.params.id, userId);
      if (!memo) {
        console.warn(`[API:GET /api/memos/:id] ❌ Memo ${req.params.id} not found or access denied for userId=${userId}`);
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      
      console.log(`[API:GET /api/memos/:id] ✅ Memo ${req.params.id} retrieved successfully for userId=${userId}`);
      res.json(memo);
    } catch (error: any) {
      console.error(`[API:GET /api/memos/:id] ❌ Error:`, error);
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
        rating: z.coerce.number().min(0).max(5).optional(),
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

      // Add rating if provided
      if (updateData.rating !== undefined) {
        memoUpdate.rating = updateData.rating;
      }
      
      // Verify memo exists and user has access
      const userId = (req as any).user.claims.sub;
      const existingMemo = await storage.getMemoById(req.params.id, userId);
      if (!existingMemo) {
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      
      // Check edit permissions
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
      
      // ⚠️ 중요: groupId가 변경될 때 memberId도 업데이트해야 합니다
      const isMovingToGroup = !existingMemo.groupId && updateData.groupId; // 개인 메모 → 그룹 메모
      const isMovingFromGroup = existingMemo.groupId && !updateData.groupId; // 그룹 메모 → 개인 메모
      const isChangingGroup = existingMemo.groupId && updateData.groupId && existingMemo.groupId !== updateData.groupId; // 그룹 A → 그룹 B
      
      if (isMovingToGroup || isChangingGroup) {
        // 개인 메모를 그룹으로 옮기거나 그룹을 변경할 때
        // 새로운 그룹 내의 사용자 멤버 ID를 찾아서 memberId를 업데이트
        const newGroupMember = await storage.getMemberByUserAndGroup(userId, updateData.groupId!);
        if (!newGroupMember) {
          return res.status(403).json({ error: "해당 그룹의 멤버가 아닙니다" });
        }
        memoUpdate.memberId = newGroupMember.id;
        console.log(`[API:PATCH /api/memos/:id] 메모를 그룹으로 이동: memberId ${existingMemo.memberId} → ${newGroupMember.id} (그룹: ${updateData.groupId})`);
      } else if (isMovingFromGroup) {
        // 그룹 메모를 개인 메모로 옮길 때
        // 사용자의 개인 메모용 멤버 ID를 찾아서 memberId를 업데이트
        const userGroups = await storage.getGroups(userId);
        // 개인 메모용 멤버 찾기 (groupId가 null인 멤버 또는 "개인 메모" 그룹의 멤버)
        let personalMember = null;
        for (const group of userGroups) {
          if (group.name === "개인 메모") {
            personalMember = group.members.find(m => m.userId === userId);
            if (personalMember) break;
          }
        }
        // 개인 메모 그룹을 찾지 못한 경우, 사용자의 첫 번째 멤버 사용
        if (!personalMember && userGroups.length > 0) {
          personalMember = userGroups[0].members.find(m => m.userId === userId);
        }
        if (!personalMember) {
          return res.status(404).json({ error: "개인 메모용 멤버를 찾을 수 없습니다" });
        }
        memoUpdate.memberId = personalMember.id;
        console.log(`[API:PATCH /api/memos/:id] 메모를 개인 메모로 이동: memberId ${existingMemo.memberId} → ${personalMember.id}`);
      }
      
      // Set editorMemberId to the current user's member ID in the memo's group
      if (updateData.groupId) {
        // 업데이트 후 그룹이 있는 경우
        const targetGroupMember = await storage.getMemberByUserAndGroup(userId, updateData.groupId);
        if (targetGroupMember) {
          memoUpdate.editorMemberId = targetGroupMember.id;
        }
      } else if (existingMemo.groupId) {
        // 그룹에서 개인 메모로 옮기는 경우 editorMemberId 제거
        memoUpdate.editorMemberId = null;
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
      
      const updatedMemo = await storage.getMemoById(req.params.id, userId);
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

  app.delete("/api/memos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[API:DELETE /api/memos/:id] 🗑️ Attempting to delete memo ${req.params.id} by userId=${userId}`);
      
      await storage.deleteMemo(req.params.id, userId);
      
      console.log(`[API:DELETE /api/memos/:id] ✅ Memo ${req.params.id} deleted successfully by userId=${userId}`);
      
      // Broadcast to WebSocket clients
      broadcast({ 
        type: "memo_deleted", 
        memoId: req.params.id 
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[API:DELETE /api/memos/:id] ❌ Error:`, error);
      
      if (error.message === "PERMISSION_DENIED") {
        return res.status(403).json({ error: "메모를 삭제할 권한이 없습니다" });
      }
      if (error.message === "MEMO_NOT_FOUND") {
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/memos/:id/copy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const memo = await storage.copyMemoToPersonal(id, userId);
      
      // Broadcast to WebSocket clients
      const memoWithDetails = await storage.getMemoById(memo.id, userId);
      broadcast({ 
        type: "memo_created", 
        memo: memoWithDetails 
      });

      res.json(memoWithDetails);
    } catch (error: any) {
      if (error.message === "MEMO_NOT_FOUND") {
        return res.status(404).json({ error: "메모를 찾을 수 없습니다" });
      }
      if (error.message === "INSUFFICIENT_POINTS") {
        return res.status(403).json({ error: "포인트가 부족합니다 (10 포인트 필요)" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/users/me", isAuthenticated, async (req: any, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[DELETE USER:${requestId}] Route hit`);
    
    try {
      // Check user object
      if (!req.user) {
        console.error(`[DELETE USER:${requestId}] req.user is undefined`);
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log(`[DELETE USER:${requestId}] req.user:`, JSON.stringify(req.user, null, 2));

      // Extract User ID safely
      const userId = req.user.id || req.user.claims?.sub;
      console.log(`[DELETE USER:${requestId}] Target userId: ${userId}`);

      if (!userId) {
        console.error(`[DELETE USER:${requestId}] Failed to extract userId`);
        return res.status(400).json({ error: "User ID missing" });
      }

      // 1. DB Deletion
      console.log(`[DELETE USER:${requestId}] Calling storage.deleteUser...`);
      await storage.deleteUser(userId);
      console.log(`[DELETE USER:${requestId}] DB deletion successful`);

      // 2. Session & Cookie Cleanup
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none' as const,
        path: "/",
      };

      console.log(`[DELETE USER:${requestId}] Starting session destruction...`);
      
      // Logout Passport
      req.logout((err: any) => {
        if (err) {
          console.error(`[DELETE USER:${requestId}] req.logout error:`, err);
          // Continue anyway to destroy session
        } else {
          console.log(`[DELETE USER:${requestId}] req.logout successful`);
        }

        // Destroy Session
        if (req.session) {
          req.session.destroy((destroyErr: any) => {
            if (destroyErr) {
              console.error(`[DELETE USER:${requestId}] req.session.destroy error:`, destroyErr);
              return res.status(500).json({ error: "Failed to destroy session" });
            }
            
            console.log(`[DELETE USER:${requestId}] Session destroyed`);
            
            // Clear Cookie
            res.clearCookie('connect.sid', cookieOptions);
            console.log(`[DELETE USER:${requestId}] Cookie 'connect.sid' cleared with options:`, cookieOptions);
            
            // Final Success Response
            return res.status(200).json({ success: true, message: "Account deleted and logged out" });
          });
        } else {
          console.log(`[DELETE USER:${requestId}] No session found to destroy`);
          res.clearCookie('connect.sid', cookieOptions);
          return res.status(200).json({ success: true, message: "Account deleted (no session)" });
        }
      });

    } catch (error: any) {
      console.error(`[DELETE USER:${requestId}] CRITICAL ERROR:`, error);
      console.error(`[DELETE USER:${requestId}] Stack:`, error.stack);
      res.status(500).json({ 
        error: error.message || "Internal Server Error during deletion",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.post("/api/memos/:id/set-main", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updatedMemo = await storage.setMainMemo(req.params.id);
      
      // Broadcast to WebSocket clients
      const memoForBroadcast = await storage.getMemoById(updatedMemo.id, userId);
      if (memoForBroadcast) {
        broadcast({ 
          type: "memo_updated", 
          memo: memoForBroadcast
        });
      }
      
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

  // 성능 모니터링 API (개발 모드에서만)
  if (app.get("env") === "development") {
    app.get("/api/performance/stats", async (req, res) => {
      const { performanceMonitor } = await import("./utils/performance-monitor");
      try {
        const stats = performanceMonitor.getStatsByPath();
        const slowRequests = performanceMonitor.getSlowRequests(20);
        
        res.json({
          stats,
          slowRequests: slowRequests.map(req => ({
            method: req.method,
            path: req.path,
            duration: req.duration,
            statusCode: req.statusCode,
            timestamp: req.timestamp.toISOString(),
          })),
          overallAverage: performanceMonitor.getAverageResponseTime(),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/performance/clear", async (req, res) => {
      try {
        const { performanceMonitor } = await import("./utils/performance-monitor");
        performanceMonitor.clear();
        res.json({ success: true, message: "성능 로그가 초기화되었습니다." });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  const httpServer = createServer(app);

  // HTTP 서버 에러 핸들러 추가
  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      const port = process.env.PORT || '5000';
      console.error(`❌ Port ${port} is already in use.`);
      console.error(`Please either:`);
      console.error(`  1. Stop the process using port ${port}`);
      console.error(`  2. Set a different port using PORT environment variable (e.g., PORT=5001)`);
      console.error(`  3. Wait a few seconds and try again`);
      process.exit(1);
    } else {
      console.error(`❌ HTTP Server error: ${err.message}`);
      throw err;
    }
  });

  // WebSocket server for real-time memo updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocketServer 에러 핸들러 추가
  wss.on('error', (err: Error) => {
    console.error(`❌ WebSocket Server error: ${err.message}`);
    // WebSocketServer 에러는 HTTP 서버 에러와 연관될 수 있으므로
    // HTTP 서버 에러 핸들러가 처리하도록 함
  });

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
