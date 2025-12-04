import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    if (!process.env.REPL_ID) {
      throw new Error("REPL_ID is not set. Replit Auth is only available in Replit environment.");
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const isProduction = process.env.NODE_ENV === "production";
  
  // Replit 환경 감지: Replit은 항상 HTTPS를 사용하므로 secure 쿠키 필요
  const isReplit = !!process.env.REPL_ID || !!process.env.REPL_SLUG;
  // Railway 환경 감지: Railway는 항상 HTTPS를 사용
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT === "production";
  // 프로덕션 환경 또는 HTTPS가 필요한 환경
  // 로컬 개발 환경이 아닐 때만 HTTPS 사용
  const isLocalhost = process.env.NODE_ENV === "development" && !isReplit && !isRailway;
  const isHttps = !isLocalhost && (isProduction || isReplit || isRailway || process.env.ENABLE_SECURE_COOKIES === 'true');
  
  // 테스트용: saveUninitialized 설정 (환경 변수로 제어 가능)
  // saveUninitialized: false는 세션에 변경이 없으면 쿠키가 생성되지 않을 수 있음
  // 테스트를 위해 ENABLE_SAVE_UNINITIALIZED=true로 설정 가능
  const saveUninitialized = process.env.ENABLE_SAVE_UNINITIALIZED === 'true';
  
  // Android WebView에서 쿠키 저장을 위해 SameSite=None + Secure=true 필수
  // Railway HTTPS 환경에서 Android WebView cross-site 쿠키 지원을 위해
  // 모든 환경에서 일관되게 SameSite=None + Secure=true 사용
  const cookieSecure = true; // HTTPS 필수
  const cookieSameSite: "none" = "none"; // Android WebView cross-site 쿠키 지원
  
  console.log('[SESSION CONFIG] ========== SESSION CONFIGURATION ==========');
  console.log('[SESSION CONFIG] NODE_ENV:', process.env.NODE_ENV);
  console.log('[SESSION CONFIG] isProduction:', isProduction);
  console.log('[SESSION CONFIG] isReplit:', isReplit);
  console.log('[SESSION CONFIG] isRailway:', isRailway);
  console.log('[SESSION CONFIG] isLocalhost:', isLocalhost);
  console.log('[SESSION CONFIG] isHttps:', isHttps);
  console.log('[SESSION CONFIG] Cookie secure:', cookieSecure, '(강제: true - Android WebView 지원)');
  console.log('[SESSION CONFIG] Cookie sameSite:', cookieSameSite, '(강제: none - Android WebView cross-site 쿠키)');
  console.log('[SESSION CONFIG] saveUninitialized:', saveUninitialized, '(테스트용 플래그:', process.env.ENABLE_SAVE_UNINITIALIZED || 'not set', ')');
  console.log('[SESSION CONFIG] ===========================================');
  
  // Android WebView에서 쿠키 저장을 위해 SameSite=None + Secure=true 필수
  // Railway HTTPS 환경에서 Android WebView cross-site 쿠키 지원
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: saveUninitialized, // 환경 변수로 제어 가능
    name: 'connect.sid', // 세션 쿠키 이름 명시
    cookie: {
      httpOnly: true,
      secure: cookieSecure, // 항상 true - HTTPS 필수
      maxAge: sessionTtl,
      sameSite: cookieSameSite, // 항상 "none" - Android WebView cross-site 쿠키 지원
      path: "/", // 모든 경로에서 쿠키 사용
    },
    // 세션이 변경되지 않아도 저장하도록 설정 (쿠키 갱신 보장)
    rolling: true,
  });
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    provider: "replit",
  });
}

export async function setupAuth(app: Express) {
  // trust proxy는 이미 server/index.ts에서 설정되어야 함 (세션 미들웨어 이전)
  // 세션 미들웨어는 이미 server/index.ts에서 설정되었으므로 여기서는 제거
  // app.use(getSession()); // 제거 - index.ts에서 이미 설정됨
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup passport serialization/deserialization for all auth methods
  passport.serializeUser((user: Express.User, cb) => {
    const userObj = user as any;
    // For Replit Auth users (with tokens), store full session data
    // For Kakao/Google users, store only ID
    if (userObj.access_token || userObj.expires_at) {
      // Replit Auth user - store tokens for refresh
      cb(null, {
        id: userObj.id,
        access_token: userObj.access_token,
        refresh_token: userObj.refresh_token,
        expires_at: userObj.expires_at,
      });
    } else {
      // Kakao/Google user or simple session - store only ID
      cb(null, { id: userObj.id });
    }
  });
  
  passport.deserializeUser(async (sessionData: any, cb) => {
    try {
      // Handle both object format { id, access_token, ... } and legacy string format
      const userId = typeof sessionData === 'string' ? sessionData : sessionData.id;
      console.log(`Deserializing user session for ID: ${userId}, sessionData:`, JSON.stringify(sessionData));
      
      // Retrieve full user data from database using ID
      const user = await storage.getUser(userId);
      if (!user) {
        // User not found - session is invalid, return null to clear it
        console.warn(`Session deserialization failed: User ${userId} not found`);
        return cb(null, false);
      }
      
      // Reconstruct the user object with claims
      const userObj: any = {
        id: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
      };
      
      // If session data includes tokens (Replit Auth), restore them
      if (typeof sessionData === 'object' && sessionData.access_token) {
        userObj.access_token = sessionData.access_token;
        userObj.refresh_token = sessionData.refresh_token;
        userObj.expires_at = sessionData.expires_at;
      }
      
      console.log(`Deserialized user object for ID: ${userId}, provider: ${user.provider}`);
      cb(null, userObj);
    } catch (error) {
      console.error('Session deserialization error:', error);
      cb(null, false);
    }
  });

  // Skip Replit Auth if REPL_ID is not set (local development)
  if (!process.env.REPL_ID) {
    console.log("REPL_ID not set, skipping Replit Auth setup");
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    if (!claims) {
      return verified(new Error('No claims found in token'));
    }
    const user = {
      id: claims.sub,
      claims,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: claims.exp,
    };
    await upsertUser(claims);
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // 로그아웃 라우트는 routes.ts에서 통합 관리 (중복 방지)
  // app.get("/api/logout", (req, res) => {
  //   req.logout(() => {
  //     res.redirect(
  //       client.buildEndSessionUrl(config, {
  //         client_id: process.env.REPL_ID!,
  //         post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
  //       }).href
  //     );
  //   });
  // });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // 빠른 인증 확인 (세션만 확인)
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  
  // Kakao/Google/Email 사용자는 세션만 확인 (DB 조회 생략하여 성능 향상)
  // 세션에 이미 user 정보가 있으므로 추가 DB 조회 불필요
  if (user.claims && (user.claims.sub?.startsWith('kakao_') || 
                      user.claims.sub?.startsWith('google_') || 
                      user.claims.sub?.startsWith('email_'))) {
    return next();
  }
  
  // Replit Auth 사용자만 DB 조회 및 토큰 갱신 확인
  // Check if user exists in database to verify session is still valid
  const dbUser = await storage.getUser(user.id);
  if (!dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // For Kakao/Google/Email users, no token refresh is needed - just verify user exists
  if (dbUser.provider === 'kakao' || dbUser.provider === 'google' || dbUser.provider === 'email') {
    return next();
  }
  
  // For Replit Auth users, check and refresh OIDC tokens if needed
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    const claims = tokenResponse.claims();
    if (!claims) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    user.claims = claims;
    user.access_token = tokenResponse.access_token;
    user.refresh_token = tokenResponse.refresh_token;
    user.expires_at = claims.exp;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
