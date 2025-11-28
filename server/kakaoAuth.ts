import type { Express } from "express";
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
  // Support multiple hosting options:
  // - APP_DOMAIN: Custom domain (e.g., https://memoway.replit.app, yourdomain.com)
  // - REPLIT_DEV_DOMAIN: Replit dev domain
  // - REPL_SLUG: Replit app name (auto-detect published domain: https://{REPL_SLUG}.replit.app)
  // - HOST: Fallback host
  // - req.get('host'): Auto-detect from request
  // For local development (NODE_ENV=development and no domain env vars), always use localhost:5000
  
  // Replit published domain auto-detection
  let detectedReplitDomain: string | undefined;
  if (process.env.REPL_SLUG && !process.env.APP_DOMAIN && !process.env.REPLIT_DEV_DOMAIN) {
    detectedReplitDomain = `https://${process.env.REPL_SLUG}.replit.app`;
  }
  
  const isLocalDev = process.env.NODE_ENV === 'development' && 
                     !process.env.APP_DOMAIN && 
                     !process.env.REPLIT_DEV_DOMAIN &&
                     !detectedReplitDomain;
  const appDomain = process.env.APP_DOMAIN || process.env.REPLIT_DEV_DOMAIN || detectedReplitDomain;
  const useHttps = process.env.APP_DOMAIN ? (process.env.APP_USE_HTTPS !== 'false') : 
                    (!!process.env.REPLIT_DEV_DOMAIN || !!detectedReplitDomain);
  
  // Log configuration status
  console.log('=== Kakao OAuth Configuration ===');
  console.log('KAKAO_CLIENT_ID:', clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET');
  console.log('KAKAO_CLIENT_SECRET:', clientSecret ? 'SET' : 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('isLocalDev:', isLocalDev);
  console.log('APP_DOMAIN:', appDomain || 'NOT SET');
  console.log('REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN || 'NOT SET');
  console.log('REPL_SLUG:', process.env.REPL_SLUG || 'NOT SET');
  console.log('Detected Replit Domain:', detectedReplitDomain || 'NOT SET');
  console.log('useHttps:', useHttps);
  console.log('===================================');
  
  if (!clientId || !clientSecret) {
    console.error("❌ Kakao OAuth credentials not configured. Kakao login will be unavailable.");
    console.error("   Please set KAKAO_CLIENT_ID and KAKAO_CLIENT_SECRET in .env file");
    return;
  }
  
  console.log("✅ Kakao OAuth configured successfully");
  
  // Add health check endpoint for debugging
  app.get("/api/kakao/health", (_req, res) => {
    const expectedRedirectUri = isLocalDev 
      ? 'http://localhost:5000/api/kakao/callback'
      : `${useHttps ? 'https' : 'http'}://${appDomain || 'unknown'}/api/kakao/callback`;
    
    res.json({
      configured: !!(clientId && clientSecret),
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      isLocalDev,
      expectedRedirectUri,
      nodeEnv: process.env.NODE_ENV,
      // 환경 변수 정보 추가 (디버깅용)
      environmentVariables: {
        APP_DOMAIN: process.env.APP_DOMAIN || 'NOT SET',
        REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN || 'NOT SET',
        REPL_SLUG: process.env.REPL_SLUG || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
      },
      resolved: {
        appDomain: appDomain || 'NOT SET',
        detectedReplitDomain: detectedReplitDomain || 'NOT SET',
        useHttps,
      },
    });
  });

  // Kakao login initiation
  app.get("/api/kakao/login", (req, res) => {
    // Get language and platform from query parameter
    const lang = req.query.lang || 'ko';
    const platform = req.query.platform || 'web';
    
    // 안드로이드 앱 요청 감지 (User-Agent 또는 X-Platform 헤더 확인)
    const userAgent = req.get('user-agent') || '';
    const xPlatform = req.get('x-platform');
    const isAndroidApp = platform === 'android' || 
                         xPlatform === 'android' ||
                         userAgent.includes('wv') || // WebView
                         (userAgent.includes('Android') && !userAgent.includes('Chrome'));
    
    // Generate CSRF state token with language and platform info
    const stateData = {
      token: randomBytes(32).toString("hex"),
      lang: lang,
      platform: platform
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Store state in session for verification
    (req.session as any).kakaoState = state;
    
    // Determine host and protocol
    // For local development, always use localhost:5000 to ensure consistency with Kakao Developer Console
    let host: string;
    let protocol: string;
    
    if (isLocalDev) {
      // Local development: always use localhost:5000
      host = 'localhost:5000';
      protocol = 'http';
    } else {
      // Production/Replit: use configured domain or detect from request
      // If appDomain is a full URL, extract hostname
      let resolvedHost = appDomain;
      if (resolvedHost && (resolvedHost.startsWith('http://') || resolvedHost.startsWith('https://'))) {
        try {
          const url = new URL(resolvedHost);
          resolvedHost = url.hostname + (url.port ? `:${url.port}` : '');
        } catch (e) {
          // Invalid URL, use as-is
        }
      }
      
      // Replit 개발 도메인(*.riker.replit.dev)은 동적으로 생성되므로 Kakao에 등록할 수 없음
      // 프로덕션 도메인(*.replit.app)을 우선적으로 사용
      const requestHost = req.get('host') || '';
      const isReplitDevDomain = requestHost.includes('.riker.replit.dev');
      
      // 안드로이드 앱 요청일 경우 항상 memo-way.replit.app 사용 (Kakao에 등록된 도메인)
      // REPL_SLUG을 무시하고 하드코딩된 도메인 사용 (등록된 URI와 일치해야 함)
      if (isAndroidApp || (isReplitDevDomain && isAndroidApp)) {
        resolvedHost = 'memo-way.replit.app';
        console.log('Android app detected - using registered domain:', resolvedHost);
      } else {
        // 프로덕션 도메인 우선 사용 (REPL_SLUG이 있으면 프로덕션 도메인 사용)
        if (!resolvedHost && !process.env.REPLIT_DEV_DOMAIN) {
          if (process.env.REPL_SLUG) {
            // Replit 프로덕션 도메인 사용
            resolvedHost = `${process.env.REPL_SLUG}.replit.app`;
          } else if (isReplitDevDomain) {
            // 개발 도메인을 사용 중이지만 프로덕션 도메인을 찾을 수 없음
            // 기본 프로덕션 도메인 사용
            resolvedHost = 'memo-way.replit.app';
          }
        }
      }
      
      // Fallback to configured domain or request host (if not dev domain)
      host = resolvedHost || process.env.REPLIT_DEV_DOMAIN || 
             (isReplitDevDomain ? 'memo-way.replit.app' : (requestHost || process.env.HOST || 'memo-way.replit.app'));
      // Use HTTPS for Replit production domain
      protocol = useHttps || host.includes('.replit.app') ? 'https' : (req.protocol || 'http');
    }
    
    const redirectUri = `${protocol}://${host}/api/kakao/callback`;
    
    console.log('Kakao OAuth Redirect URI:', redirectUri);
    console.log('Kakao OAuth - Request details:', {
      isLocalDev,
      isAndroidApp,
      platform,
      userAgent: userAgent.substring(0, 100), // 일부만 로그 (너무 길 수 있음)
      xPlatform,
      host: req.get('host'),
      protocol: req.protocol,
      appDomain,
      resolvedHost: host,
      resolvedProtocol: protocol,
      NODE_ENV: process.env.NODE_ENV
    });
    
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    
    // 서버 측 리다이렉트로 직접 이동 (더 안정적)
    // 안드로이드 앱의 외부 브라우저에서도 작동
    console.log('Redirecting to Kakao OAuth:', kakaoAuthUrl);
    res.redirect(kakaoAuthUrl);
  });

  // Kakao OAuth callback
  app.get("/api/kakao/callback", async (req, res) => {
    console.log('=== Kakao OAuth Callback Received ===');
    console.log('Request URL:', req.url);
    console.log('Request Host:', req.get('host'));
    console.log('Request Protocol:', req.protocol);
    console.log('Query params:', { 
      code: req.query.code ? 'present' : 'missing', 
      state: req.query.state ? 'present' : 'missing',
      error: req.query.error || 'none',
      error_description: req.query.error_description || 'none'
    });
    
    // Check for OAuth errors
    if (req.query.error) {
      console.error('Kakao OAuth error:', req.query.error);
      console.error('Error description:', req.query.error_description || 'No description');
      return res.redirect(`/?error=oauth_failed&provider=kakao&message=${encodeURIComponent(req.query.error_description as string || req.query.error as string)}`);
    }
    
    const { code, state } = req.query;

    // Verify CSRF state token
    const sessionState = (req.session as any).kakaoState;
    console.log('Session state:', sessionState ? 'present' : 'missing');
    console.log('Request state:', state ? 'present' : 'missing');
    
    if (!state || state !== sessionState) {
      console.error('❌ State mismatch - possible CSRF attack or session expired');
      console.error('   Session state:', sessionState);
      console.error('   Request state:', state);
      return res.status(403).json({ error: "Invalid state parameter - possible CSRF attack" });
    }
    
    // Extract language and platform from state
    let lang = 'ko';
    let platform = 'web';
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      lang = stateData.lang || 'ko';
      platform = stateData.platform || 'web';
    } catch (e) {
      console.error('Failed to parse state:', e);
    }
    
    // Clear state from session
    delete (req.session as any).kakaoState;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Authorization code is missing" });
    }

    // Determine redirect URI before try block so it's available in catch block
    // 안드로이드 앱 요청 감지 (콜백에서도 동일한 로직 적용)
    const userAgentCallback = req.get('user-agent') || '';
    const xPlatformCallback = req.get('x-platform');
    const isAndroidAppCallback = platform === 'android' || 
                                  xPlatformCallback === 'android' ||
                                  userAgentCallback.includes('wv') || // WebView
                                  (userAgentCallback.includes('Android') && !userAgentCallback.includes('Chrome'));
    
    let host: string;
    let protocol: string;
    
    if (isLocalDev) {
      // Local development: always use localhost:5000
      host = 'localhost:5000';
      protocol = 'http';
    } else {
      // Production/Replit: use configured domain or detect from request
      // Re-detect Replit domain in callback (same logic as above)
      let detectedReplitDomain: string | undefined;
      if (process.env.REPL_SLUG && !process.env.APP_DOMAIN && !process.env.REPLIT_DEV_DOMAIN) {
        detectedReplitDomain = `https://${process.env.REPL_SLUG}.replit.app`;
      }
      const appDomainCallback = process.env.APP_DOMAIN || process.env.REPLIT_DEV_DOMAIN || detectedReplitDomain;
      const useHttpsCallback = process.env.APP_DOMAIN ? (process.env.APP_USE_HTTPS !== 'false') : 
                                (!!process.env.REPLIT_DEV_DOMAIN || !!detectedReplitDomain);
      
      // If appDomain is a full URL, extract hostname
      let resolvedHost = appDomainCallback;
      if (resolvedHost && (resolvedHost.startsWith('http://') || resolvedHost.startsWith('https://'))) {
        try {
          const url = new URL(resolvedHost);
          resolvedHost = url.hostname + (url.port ? `:${url.port}` : '');
        } catch (e) {
          // Invalid URL, use as-is
        }
      }
      
      // Replit 개발 도메인(*.riker.replit.dev)은 동적으로 생성되므로 Kakao에 등록할 수 없음
      // 프로덕션 도메인(*.replit.app)을 우선적으로 사용
      const requestHost = req.get('host') || '';
      const isReplitDevDomain = requestHost.includes('.riker.replit.dev');
      
      // 안드로이드 앱 요청일 경우 항상 memo-way.replit.app 사용 (Kakao에 등록된 도메인)
      // REPL_SLUG을 무시하고 하드코딩된 도메인 사용 (등록된 URI와 일치해야 함)
      if (isAndroidAppCallback) {
        resolvedHost = 'memo-way.replit.app';
        console.log('Android app callback detected - using registered domain:', resolvedHost);
      } else {
        // 프로덕션 도메인 우선 사용 (REPL_SLUG이 있으면 프로덕션 도메인 사용)
        if (!resolvedHost && !process.env.REPLIT_DEV_DOMAIN) {
          if (process.env.REPL_SLUG) {
            // Replit 프로덕션 도메인 사용
            resolvedHost = `${process.env.REPL_SLUG}.replit.app`;
          } else if (isReplitDevDomain) {
            // 개발 도메인을 사용 중이지만 프로덕션 도메인을 찾을 수 없음
            // 기본 프로덕션 도메인 사용
            resolvedHost = 'memo-way.replit.app';
          }
        }
      }
      
      // Fallback to configured domain or request host (if not dev domain)
      host = resolvedHost || 
             (isReplitDevDomain ? 'memo-way.replit.app' : (requestHost || process.env.HOST || 'memo-way.replit.app'));
      // Use HTTPS for Replit production domain
      protocol = useHttpsCallback || host.includes('.replit.app') ? 'https' : (req.protocol || 'http');
    }
    
    const redirectUri = `${protocol}://${host}/api/kakao/callback`;

    try {
      // Exchange code for access token (must match the redirect_uri used in authorization request)
      
      console.log('Token exchange with Redirect URI:', redirectUri);
      console.log('Token exchange - Request details:', {
        isLocalDev,
        host: req.get('host'),
        protocol: req.protocol,
        resolvedHost: host,
        resolvedProtocol: protocol,
        NODE_ENV: process.env.NODE_ENV
      });
      
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
        console.error("Token exchange details:", {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          redirectUri,
          hasCode: !!code,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
        });
        return res.status(500).json({ 
          error: "Failed to exchange authorization code",
          details: error,
          redirectUri: redirectUri,
          hint: "Check if the redirect URI matches the one registered in Kakao Developer Console"
        });
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
          
          // Explicitly save session before redirecting
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session save failed:", saveErr);
              return res.status(500).json({ error: "Failed to save session" });
            }
            console.log(`Kakao login successful for user ID: ${user.id}`);
            
            // Check if request is from Android app
            const userAgent = req.get('user-agent') || '';
            const isAndroidApp = platform === 'android' || 
                                 userAgent.includes('wv') || // WebView
                                 (userAgent.includes('Android') && !userAgent.includes('Chrome'));
            
            if (isAndroidApp) {
              // Redirect to intermediate page that will redirect to app via Deep Link
              // This provides better UX with a loading message
              res.redirect(`/api/kakao/redirect?lang=${lang}`);
            } else {
              // Redirect to web with language parameter
              res.redirect(`/?lang=${lang}`);
            }
          });
        }
      );
    } catch (error) {
      console.error("Kakao OAuth error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Kakao OAuth error details:", {
        message: errorMessage,
        stack: errorStack,
        redirectUri,
        host,
        protocol,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      res.status(500).json({ 
        error: "Kakao OAuth failed",
        details: errorMessage,
        // 개발 환경에서만 상세 정보 제공
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      });
    }
  });

  // Intermediate redirect page for Android app (shows loading message then redirects to app)
  app.get("/api/kakao/redirect", async (req, res) => {
    const lang = req.query.lang || 'ko';
    
    // 세션 확인 및 로그
    const isAuthenticated = req.isAuthenticated();
    const userId = req.user ? (req.user as any).id : null;
    console.log('Kakao redirect page - Auth status:', {
      isAuthenticated,
      userId,
      hasSession: !!req.session,
      sessionID: req.session?.id?.substring(0, 10)
    });
    
    // 세션이 없으면 로그인 실패로 처리
    if (!isAuthenticated || !userId) {
      console.error('Kakao redirect - No authenticated session found');
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>로그인 실패</title>
            <script>
              alert('로그인에 실패했습니다. 다시 시도해주세요.');
              setTimeout(() => {
                window.location.href = 'com.memoway.app://login?error=session_failed';
              }, 1000);
            </script>
          </head>
          <body>
            <p>로그인에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
          </body>
        </html>
      `);
    }
    
    // 세션이 있으면 Deep Link로 리다이렉트
    // 세션 쿠키가 WebView에 전달되도록 명시적으로 설정
    const appDeepLink = `com.memoway.app://login?lang=${lang}&session_ok=true`;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>로그인 완료</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            .spinner {
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top: 4px solid white;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h1 {
              margin: 20px 0;
              font-size: 24px;
            }
            p {
              margin: 10px 0;
              opacity: 0.9;
              font-size: 16px;
            }
            .fallback-link {
              margin-top: 30px;
              padding: 12px 24px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              color: white;
              text-decoration: none;
              display: inline-block;
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
            .fallback-link:hover {
              background: rgba(255, 255, 255, 0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h1>로그인 완료!</h1>
            <p>앱으로 돌아가는 중...</p>
            <p style="font-size: 14px; opacity: 0.7; margin-top: 20px;">
              자동으로 이동되지 않으면 아래 버튼을 클릭하세요
            </p>
            <a href="${appDeepLink}" class="fallback-link">앱으로 돌아가기</a>
          </div>
          <script>
            // 세션 쿠키를 WebView에 설정하기 위해 API 호출
            // 이렇게 하면 쿠키가 WebView의 쿠키 저장소에 저장됩니다
            (async function() {
              try {
                // 세션을 확인하는 API 호출로 쿠키 동기화
                const response = await fetch('${baseUrl}/api/auth/user', {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Accept': 'application/json',
                  }
                });
                
                if (response.ok) {
                  console.log('Session cookie synced to WebView');
                  // 쿠키가 설정된 후 Deep Link로 리다이렉트
                  setTimeout(() => {
                    try {
                      window.location.href = ${JSON.stringify(appDeepLink)};
                    } catch (e) {
                      console.error('Failed to redirect:', e);
                    }
                  }, 500);
                } else {
                  console.error('Session sync failed:', response.status);
                  // 세션 동기화 실패 시에도 Deep Link로 리다이렉트 (앱에서 처리)
                  setTimeout(() => {
                    window.location.href = ${JSON.stringify(appDeepLink)};
                  }, 500);
                }
              } catch (error) {
                console.error('Failed to sync session cookie:', error);
                // 에러 발생 시에도 Deep Link로 리다이렉트
                setTimeout(() => {
                  window.location.href = ${JSON.stringify(appDeepLink)};
                }, 500);
              }
            })();
            
            // Fallback: if not redirected after 3 seconds, show manual link
            setTimeout(() => {
              const link = document.querySelector('.fallback-link');
              if (link) {
                link.style.display = 'block';
              }
            }, 3000);
          </script>
        </body>
      </html>
    `);
  });

  // Android 네이티브 로그인 엔드포인트
  app.post("/api/kakao/android-login", async (req, res) => {
    const { accessToken, kakaoId, email, nickname, profileImage } = req.body;

    if (!accessToken || !kakaoId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 카카오 토큰 검증 (선택사항 - 보안 강화)
      const userInfoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        return res.status(401).json({ error: "Invalid access token" });
      }

      const userInfo: KakaoUserInfo = await userInfoResponse.json();

      // 사용자 정보 저장
      const user = await storage.upsertUser({
        id: `kakao_${kakaoId}`,
        email: email || userInfo.kakao_account?.email || `kakao_${kakaoId}@placeholder.com`,
        firstName: nickname || userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || "Kakao User",
        lastName: "",
        profileImageUrl: profileImage || userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image || null,
        provider: "kakao",
        kakaoId: kakaoId.toString(),
      });

      // 세션 생성
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
          
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session save failed:", saveErr);
              return res.status(500).json({ error: "Failed to save session" });
            }
            console.log(`Android Kakao login successful for user ID: ${user.id}`);
            res.json({ success: true, user });
          });
        }
      );
    } catch (error) {
      console.error("Android Kakao login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}
