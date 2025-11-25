import type { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";

// 회원가입 스키마
const registerSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  firstName: z.string().min(1, "이름을 입력하세요"),
});

// 로그인 스키마
const loginSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export function setupEmailAuth(app: Express) {
  // 이메일 회원가입
  app.post("/api/email/register", async (req, res) => {
    try {
      // 입력 검증
      const validatedData = registerSchema.parse(req.body);
      const { email, password, firstName } = validatedData;

      // 이메일 중복 확인
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
      }

      // 비밀번호 해싱
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      console.log(`Password hashed successfully for email: ${email}`);

      // 사용자 생성
      const user = await storage.upsertUser({
        id: `email_${email}`, // 이메일 기반 ID 생성
        email,
        firstName,
        lastName: "",
        passwordHash,
        provider: "email",
      });

      // 세션 생성
      const userSession = {
        id: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
      };

      console.log(`Attempting to login user: ${user.id}`);
      
      (req as any).login(userSession, (err: any) => {
        if (err) {
          console.error("Session creation failed:", err);
          return res.status(500).json({ error: "세션 생성에 실패했습니다" });
        }

        console.log(`Login successful, saving session for user: ${user.id}`);
        
        // Explicitly save session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save failed:", saveErr);
            return res.status(500).json({ error: "세션 저장에 실패했습니다" });
          }

          console.log(`Email registration successful for user ID: ${user.id}, session ID: ${req.sessionID}`);
          res.json({ success: true, user });
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: error.errors[0]?.message || "입력값이 올바르지 않습니다" 
        });
      }
      console.error("Email registration error:", error);
      res.status(500).json({ error: "회원가입에 실패했습니다" });
    }
  });

  // 이메일 로그인
  app.post("/api/email/login", async (req, res) => {
    try {
      // 입력 검증
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;

      // 사용자 조회
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
      }

      // 이메일 로그인 사용자인지 확인
      if (user.provider !== "email" || !user.passwordHash) {
        return res.status(401).json({ 
          error: "이메일 로그인으로 가입한 계정이 아닙니다. 소셜 로그인을 사용해주세요" 
        });
      }

      // 비밀번호 확인
      if (!user.passwordHash) {
        console.error(`User ${user.id} has no password hash`);
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.log(`Password validation failed for user: ${user.id}`);
        return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
      }
      
      console.log(`Password validation successful for user: ${user.id}`);

      // 세션 생성
      const userSession = {
        id: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
      };

      console.log(`Attempting to login user: ${user.id}`);
      
      (req as any).login(userSession, (err: any) => {
        if (err) {
          console.error("Session creation failed:", err);
          return res.status(500).json({ error: "세션 생성에 실패했습니다" });
        }

        console.log(`Login successful, saving session for user: ${user.id}`);
        
        // Explicitly save session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save failed:", saveErr);
            return res.status(500).json({ error: "세션 저장에 실패했습니다" });
          }

          console.log(`Email login successful for user ID: ${user.id}, session ID: ${req.sessionID}`);
          res.json({ success: true, user });
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: error.errors[0]?.message || "입력값이 올바르지 않습니다" 
        });
      }
      console.error("Email login error:", error);
      console.error("Error stack:", error?.stack);
      res.status(500).json({ 
        error: "로그인에 실패했습니다",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });
}

