import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { randomBytes } from "crypto";

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  refresh_token_expires_in: number;
}

interface KakaoUserInfo {
  id: number;
  connected_at?: string;
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account?: {
    profile_nickname_needs_agreement?: boolean;
    profile_image_needs_agreement?: boolean;
    profile?: {
      nickname?: string;
      thumbnail_image_url?: string;
      profile_image_url?: string;
      is_default_image?: boolean;
    };
    has_email?: boolean;
    email_needs_agreement?: boolean;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    email?: string;
  };
}

export function setupKakaoAuth(app: Express) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  
  if (!clientId || !clientSecret) {
    console.warn("Kakao OAuth credentials not configured. Kakao login will be unavailable.");
    return;
  }

  // Kakao login initiation
  app.get("/api/kakao/login", (req, res) => {
    // Generate CSRF state token
    const state = randomBytes(32).toString("hex");
    
    // Store state in session for verification
    (req.session as any).kakaoState = state;
    
    // Use Replit external domain for redirect URI
    const redirectUri = `https://${replSlug}.${replOwner}.repl.co/api/kakao/callback`;
    
    console.log('Kakao OAuth Redirect URI:', redirectUri);
    
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    
    // Break out of Replit preview iframe to avoid X-Frame-Options blocking
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>카카오 로그인으로 이동 중...</title>
        </head>
        <body>
          <p>카카오 로그인 페이지로 이동 중입니다...</p>
          <script>
            window.top.location.href = ${JSON.stringify(kakaoAuthUrl)};
          </script>
        </body>
      </html>
    `);
  });

  // Kakao OAuth callback
  app.get("/api/kakao/callback", async (req, res) => {
    const { code, state } = req.query;

    // Verify CSRF state token
    const sessionState = (req.session as any).kakaoState;
    if (!state || state !== sessionState) {
      return res.status(403).json({ error: "Invalid state parameter - possible CSRF attack" });
    }
    
    // Clear state from session
    delete (req.session as any).kakaoState;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Authorization code is missing" });
    }

    try {
      // Exchange code for access token (must match the redirect_uri used in authorization request)
      const redirectUri = `https://${replSlug}.${replOwner}.repl.co/api/kakao/callback`;
      
      console.log('Token exchange with Redirect URI:', redirectUri);
      
      const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Kakao token exchange failed:", error);
        return res.status(500).json({ error: "Failed to exchange authorization code" });
      }

      const tokenData: KakaoTokenResponse = await tokenResponse.json();

      // Get user info from Kakao
      const userInfoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        const error = await userInfoResponse.text();
        console.error("Kakao user info fetch failed:", error);
        return res.status(500).json({ error: "Failed to fetch user information" });
      }

      const userInfo: KakaoUserInfo = await userInfoResponse.json();

      // Upsert user with Kakao data
      const email = userInfo.kakao_account?.email || `kakao_${userInfo.id}@placeholder.com`;
      const nickname = userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || "Kakao User";
      const profileImage = userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image;

      const user = await storage.upsertUser({
        id: `kakao_${userInfo.id}`,
        email,
        firstName: nickname,
        lastName: "",
        profileImageUrl: profileImage || null,
        provider: "kakao",
        kakaoId: userInfo.id.toString(),
      });

      // Create session
      (req as any).login(
        {
          id: user.id,
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl,
          },
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in,
        },
        (err: any) => {
          if (err) {
            console.error("Session creation failed:", err);
            return res.status(500).json({ error: "Failed to create session" });
          }
          res.redirect("/");
        }
      );
    } catch (error) {
      console.error("Kakao OAuth error:", error);
      res.status(500).json({ error: "Kakao OAuth failed" });
    }
  });
}
