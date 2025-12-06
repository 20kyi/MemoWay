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

      console.log(`[EMAIL REGISTER] Attempting to login user: ${user.id}`);
      console.log(`[EMAIL REGISTER] Request origin:`, req.headers.origin);
      console.log(`[EMAIL REGISTER] Request host:`, req.headers.host);
      
      // Android WebView 쿠키 저장을 위해 항상 SameSite=None + Secure=true 사용
      console.log(`[EMAIL REGISTER] Environment - NODE_ENV: ${process.env.NODE_ENV}, RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`);
      
      // ★ SessionID 강제 로그 출력 (세션 미들웨어가 세션을 생성했는지 확인)
      console.log(`[EMAIL REGISTER] ========== BEFORE LOGIN ==========`);
      console.log(`[EMAIL REGISTER] Session ID before login: ${req.sessionID || 'NOT GENERATED YET'}`);
      console.log(`[EMAIL REGISTER] Session exists:`, !!req.session);
      if (req.session) {
        console.log(`[EMAIL REGISTER] Session cookie config:`, {
          secure: req.session.cookie.secure,
          sameSite: req.session.cookie.sameSite,
          httpOnly: req.session.cookie.httpOnly,
          path: req.session.cookie.path,
          maxAge: req.session.cookie.maxAge,
        });
      }
      console.log(`[EMAIL REGISTER] ===================================`);
      
      (req as any).login(userSession, (err: any) => {
        if (err) {
          console.error("[EMAIL REGISTER] Session creation failed:", err);
          return res.status(500).json({ error: "세션 생성에 실패했습니다" });
        }

        console.log(`[EMAIL REGISTER] ========== AFTER LOGIN ==========`);
        console.log(`[EMAIL REGISTER] Login successful, saving session for user: ${user.id}`);
        console.log(`[EMAIL REGISTER] Session ID after login: ${req.sessionID}`);
        console.log(`[EMAIL REGISTER] Session exists:`, !!req.session);
        console.log(`[EMAIL REGISTER] ===================================`);
        
        // 세션 데이터를 명시적으로 설정하여 변경 감지 (쿠키 설정 보장)
        // saveUninitialized: false일 때 세션에 변경이 있어야 쿠키가 생성됨
        req.session.userId = user.id;
        // 세션을 "dirty" 상태로 만들어서 반드시 저장되도록 함
        req.session.touch();
        
        // 세션 저장 후 명시적으로 쿠키 설정
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[EMAIL REGISTER] Session save failed:", saveErr);
            return res.status(500).json({ error: "세션 저장에 실패했습니다" });
          }

          console.log(`[EMAIL REGISTER] ========== REGISTRATION SUCCESS ==========`);
          console.log(`[EMAIL REGISTER] User ID: ${user.id}`);
          console.log(`[EMAIL REGISTER] Session ID after save: ${req.sessionID}`);
          console.log(`[EMAIL REGISTER] Cookie config:`, {
            secure: req.session.cookie.secure,
            sameSite: req.session.cookie.sameSite,
            httpOnly: req.session.cookie.httpOnly,
            path: req.session.cookie.path,
            maxAge: req.session.cookie.maxAge,
          });
          
          // Android WebView 쿠키 저장을 위해 항상 SameSite=None + Secure=true 사용
          const cookieValue = req.sessionID;
          const cookieOptions = {
            httpOnly: true,
            secure: true, // 항상 true - HTTPS 필수 (Android WebView 지원)
            sameSite: "none" as const, // 항상 "none" - Android WebView cross-site 쿠키 지원
            path: "/",
            maxAge: req.session.cookie.maxAge || 7 * 24 * 60 * 60 * 1000,
          };
          
          console.log(`[EMAIL REGISTER] Setting cookie manually:`, {
            name: 'connect.sid',
            value: cookieValue,
            options: cookieOptions,
          });
          
          res.cookie("connect.sid", cookieValue, cookieOptions);
          
          const setCookieHeader = res.getHeader('Set-Cookie');
          console.log(`[EMAIL REGISTER] Set-Cookie header after manual set:`, setCookieHeader);
          console.log(`[EMAIL REGISTER] All response headers:`, res.getHeaders());
          console.log(`[EMAIL REGISTER] =========================================`);
          
          return res.json({ success: true, user });
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

      console.log(`[EMAIL LOGIN] Attempting to login user: ${user.id}`);
      console.log(`[EMAIL LOGIN] Request origin:`, req.headers.origin);
      console.log(`[EMAIL LOGIN] Request host:`, req.headers.host);
      
      // Android WebView 쿠키 저장을 위해 항상 SameSite=None + Secure=true 사용
      console.log(`[EMAIL LOGIN] Environment - NODE_ENV: ${process.env.NODE_ENV}, RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`);
      
      // ★ SessionID 강제 로그 출력 (세션 미들웨어가 세션을 생성했는지 확인)
      console.log(`[EMAIL LOGIN] ========== BEFORE LOGIN ==========`);
      console.log(`[EMAIL LOGIN] Session ID before login: ${req.sessionID || 'NOT GENERATED YET'}`);
      console.log(`[EMAIL LOGIN] Session exists:`, !!req.session);
      if (req.session) {
        console.log(`[EMAIL LOGIN] Session cookie config:`, {
          secure: req.session.cookie.secure,
          sameSite: req.session.cookie.sameSite,
          httpOnly: req.session.cookie.httpOnly,
          path: req.session.cookie.path,
          maxAge: req.session.cookie.maxAge,
        });
      }
      console.log(`[EMAIL LOGIN] ===================================`);
      
      // 세션 보안 강화: 로그인 전 세션 재생성 (세션 고정 공격 방지 및 기존 쿠키 정리)
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error("[EMAIL LOGIN] Session regeneration failed:", regenErr);
          return res.status(500).json({ error: "세션 생성에 실패했습니다 (regenerate)" });
        }
        
        console.log(`[EMAIL LOGIN] Session regenerated. New ID: ${req.sessionID}`);

        (req as any).login(userSession, (err: any) => {
          if (err) {
            console.error("[EMAIL LOGIN] Session creation failed:", err);
            return res.status(500).json({ error: "세션 생성에 실패했습니다" });
          }

          console.log(`[EMAIL LOGIN] ========== AFTER LOGIN ==========`);
          console.log(`[EMAIL LOGIN] Login successful, saving session for user: ${user.id}`);
          console.log(`[EMAIL LOGIN] Session ID after login: ${req.sessionID}`);
          console.log(`[EMAIL LOGIN] Session exists:`, !!req.session);
          console.log(`[EMAIL LOGIN] ===================================`);
          
          // 세션 데이터를 명시적으로 설정하여 변경 감지 (쿠키 설정 보장)
          // saveUninitialized: false일 때 세션에 변경이 있어야 쿠키가 생성됨
          req.session.userId = user.id;
          // 세션을 "dirty" 상태로 만들어서 반드시 저장되도록 함
          req.session.touch();
          
          // 세션 저장 후 명시적으로 쿠키 설정
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("[EMAIL LOGIN] Session save failed:", saveErr);
              return res.status(500).json({ error: "세션 저장에 실패했습니다" });
            }

            console.log(`[EMAIL LOGIN] ========== LOGIN SUCCESS ==========`);
            console.log(`[EMAIL LOGIN] User ID: ${user.id}`);
            console.log(`[EMAIL LOGIN] Session ID after save: ${req.sessionID}`);
            console.log(`[EMAIL LOGIN] Cookie config:`, {
              secure: req.session.cookie.secure,
              sameSite: req.session.cookie.sameSite,
              httpOnly: req.session.cookie.httpOnly,
              path: req.session.cookie.path,
              maxAge: req.session.cookie.maxAge,
            });
            
            // Android WebView 쿠키 저장을 위해 항상 SameSite=None + Secure=true 사용
            const cookieValue = req.sessionID;
            const cookieOptions = {
              httpOnly: true,
              secure: true, // 항상 true - HTTPS 필수 (Android WebView 지원)
              sameSite: "none" as const, // 항상 "none" - Android WebView cross-site 쿠키 지원
              path: "/",
              maxAge: req.session.cookie.maxAge || 7 * 24 * 60 * 60 * 1000,
            };
            
            console.log(`[EMAIL LOGIN] Setting cookie manually:`, {
              name: 'connect.sid',
              value: cookieValue,
              options: cookieOptions,
            });
            
            res.cookie("connect.sid", cookieValue, cookieOptions);
            
            const setCookieHeader = res.getHeader('Set-Cookie');
            console.log(`[EMAIL LOGIN] Set-Cookie header after manual set:`, setCookieHeader);
            console.log(`[EMAIL LOGIN] All response headers:`, res.getHeaders());
            console.log(`[EMAIL LOGIN] ===================================`);
            
            return res.json({ success: true, user });
          });
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

