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
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  
  if (!clientId || !clientSecret) {
    console.warn("Kakao OAuth credentials not configured. Kakao login will be unavailable.");
    return;
  }

  // Determine redirect URI based on environment
  const getRedirectUri = () => {
    if (replitDevDomain) {
      return `https://${replitDevDomain}/api/kakao/callback`;
    }
    // Local development
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.HOST || 'localhost:5000';
    return `${protocol}://${host}/api/kakao/callback`;
  };

  // Kakao login initiation
  app.get("/api/kakao/login", (req, res) => {
    // Get language from query parameter
    const lang = req.query.lang || 'ko';
    
    // Generate CSRF state token with language info
    const stateData = {
      token: randomBytes(32).toString("hex"),
      lang: lang
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Store state in session for verification
    (req.session as any).kakaoState = state;
    
    // Use appropriate redirect URI
    const redirectUri = getRedirectUri();
    
    console.log('Kakao OAuth Redirect URI:', redirectUri);
    
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    
    // Break out of Replit preview iframe to avoid X-Frame-Options blocking
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>카카오 로그인으로 이동 중...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fee500;
            }
            .message { margin: 20px; text-align: center; }
            .button {
              background: #000;
              color: #fee500;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="message">
            <p>카카오 로그인 페이지로 이동 중입니다...</p>
            <p>자동으로 이동되지 않으면 아래 버튼을 클릭하세요:</p>
            <a href="${kakaoAuthUrl.replace(/"/g, '&quot;')}" class="button">카카오 로그인하기</a>
          </div>
          <script>
            try {
              // Try multiple redirect methods
              if (window.top !== window.self) {
                // In iframe - try to break out
                try { window.top.location.href = ${JSON.stringify(kakaoAuthUrl)}; } catch(e) {}
              }
              // Fallback: redirect current window
              setTimeout(() => {
                window.location.href = ${JSON.stringify(kakaoAuthUrl)};
              }, 100);
            } catch(e) {
              console.error('Redirect failed:', e);
            }
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
    
    // Extract language from state
    let lang = 'ko';
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      lang = stateData.lang || 'ko';
    } catch (e) {
      console.error('Failed to parse state:', e);
    }
    
    // Clear state from session
    delete (req.session as any).kakaoState;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Authorization code is missing" });
    }

    try {
      // Exchange code for access token (must match the redirect_uri used in authorization request)
      const redirectUri = getRedirectUri();
      
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

      // Create session - passport.serializeUser will store only the user ID
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
        },
        (err: any) => {
          if (err) {
            console.error("Session creation failed:", err);
            return res.status(500).json({ error: "Failed to create session" });
          }
          console.log(`Kakao login successful for user ID: ${user.id}`);
          // Redirect with language parameter
          res.redirect(`/?lang=${lang}`);
        }
      );
    } catch (error) {
      console.error("Kakao OAuth error:", error);
      res.status(500).json({ error: "Kakao OAuth failed" });
    }
  });
}
