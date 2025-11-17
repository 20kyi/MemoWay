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
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
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
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: sessionTtl,
      sameSite: isProduction ? "strict" : "lax",
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
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
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

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

  passport.serializeUser((user: Express.User, cb) => {
    const userObj = user as any;
    // For Replit Auth users (with tokens), store full session data
    // For Kakao users, store only ID
    if (userObj.access_token || userObj.expires_at) {
      // Replit Auth user - store tokens for refresh
      cb(null, {
        id: userObj.id,
        access_token: userObj.access_token,
        refresh_token: userObj.refresh_token,
        expires_at: userObj.expires_at,
      });
    } else {
      // Kakao user or simple session - store only ID
      cb(null, { id: userObj.id });
    }
  });
  
  passport.deserializeUser(async (sessionData: any, cb) => {
    try {
      // Handle both object format { id, access_token, ... } and legacy string format
      const userId = typeof sessionData === 'string' ? sessionData : sessionData.id;
      console.log(`Deserializing user session for ID: ${userId}`);
      
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
      
      cb(null, userObj);
    } catch (error) {
      console.error('Session deserialization error:', error);
      cb(null, false);
    }
  });

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

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  
  // Check if user exists in database to verify session is still valid
  const dbUser = await storage.getUser(user.id);
  if (!dbUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // For Kakao users, no token refresh is needed - just verify user exists
  if (dbUser.provider === 'kakao') {
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
