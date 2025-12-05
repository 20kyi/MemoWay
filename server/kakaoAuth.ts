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
  
  // Railway 환경 감지 (환경 변수로 확인, 요청별로는 각 엔드포인트에서 확인)
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT || 
                    !!process.env.RAILWAY_ENVIRONMENT_NAME ||
                    !!process.env.RAILWAY_SERVICE_NAME;
  
  const isLocalDev = process.env.NODE_ENV === 'development' && 
                     !process.env.APP_DOMAIN && 
                     !process.env.REPLIT_DEV_DOMAIN &&
                     !detectedReplitDomain &&
                     !isRailway;
  const appDomain = process.env.APP_DOMAIN || process.env.REPLIT_DEV_DOMAIN || detectedReplitDomain;
  const useHttps = process.env.APP_DOMAIN ? (process.env.APP_USE_HTTPS !== 'false') : 
                    (!!process.env.REPLIT_DEV_DOMAIN || !!detectedReplitDomain || isRailway);
  
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
    
    // Android 플랫폼인 경우 redirect-flow 비활성화하고 JSON 응답 반환
    if (isAndroidApp || platform === 'android') {
      console.log('Android platform detected - redirecting to REST API login');
      return res.status(400).json({ 
        androidAuth: "use /api/kakao/android-login instead",
        message: "Android apps should use Kakao SDK and POST to /api/kakao/android-login"
      });
    }
    
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
      
      // Railway 환경에서는 요청 호스트를 직접 사용
      const requestHost = req.get('host') || '';
      const isReplitDevDomain = requestHost.includes('.riker.replit.dev');
      
      // Railway 환경 감지 (요청 호스트로도 확인)
      const isRailwayRequest = isRailway || requestHost.includes('.up.railway.app');
      
      // Railway 환경 우선 확인 (Android 앱이어도 Railway 환경이면 Railway 도메인 사용)
      if (isRailwayRequest) {
        // Railway 환경: 요청 호스트를 그대로 사용 (memoway-production.up.railway.app)
        host = requestHost || 'memoway-production.up.railway.app';
        protocol = 'https';
        console.log('Railway environment detected - using host:', host);
        console.log('Railway environment - Android app:', isAndroidApp);
        console.log('Railway environment - Request host:', requestHost);
      } else if (isAndroidApp || (isReplitDevDomain && isAndroidApp)) {
        // Replit 안드로이드 앱 요청일 경우 (Railway가 아닐 때만)
        resolvedHost = 'memo-way.replit.app';
        console.log('Android app detected - using registered domain:', resolvedHost);
        host = resolvedHost;
        protocol = 'https';
      } else {
        // Replit 프로덕션 도메인 우선 사용
        if (!resolvedHost && !process.env.REPLIT_DEV_DOMAIN) {
          if (process.env.REPL_SLUG) {
            resolvedHost = `${process.env.REPL_SLUG}.replit.app`;
          } else if (isReplitDevDomain) {
            resolvedHost = 'memo-way.replit.app';
          }
        }
        host = resolvedHost || process.env.REPLIT_DEV_DOMAIN || 
               (isReplitDevDomain ? 'memo-way.replit.app' : (requestHost || process.env.HOST || 'memo-way.replit.app'));
        protocol = useHttps || host.includes('.replit.app') ? 'https' : (req.protocol || 'http');
      }
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
    
    // 명시적으로 세션 저장 후 리다이렉트 (Android WebView에서 세션 쿠키가 제대로 설정되도록)
    // 세션 저장이 완료된 후에만 리다이렉트하여 쿠키가 제대로 설정되도록 보장
    req.session.save((err) => {
      if (err) {
        console.error('Failed to save session before redirect:', err);
        return res.status(500).json({ error: "Failed to save session" });
      }
      
      console.log('Session saved successfully before Kakao OAuth redirect');
      console.log('Session ID:', req.session?.id?.substring(0, 10));
      
      // 서버 측 리다이렉트로 직접 이동 (더 안정적)
      // 안드로이드 앱의 외부 브라우저에서도 작동
      console.log('Redirecting to Kakao OAuth:', kakaoAuthUrl);
      res.redirect(kakaoAuthUrl);
    });
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
    console.log('Session ID:', req.session?.id?.substring(0, 10));
    console.log('Session cookie:', req.headers.cookie ? 'present' : 'missing');
    
    if (!state || state !== sessionState) {
      console.error('❌ State mismatch - possible CSRF attack or session expired');
      console.error('   Session state:', sessionState);
      console.error('   Request state:', state);
      console.error('   Session exists:', !!req.session);
      console.error('   Session ID:', req.session?.id);
      console.error('   Cookies:', req.headers.cookie);
      console.error('   Request host:', req.get('host'));
      console.error('   Request protocol:', req.protocol);
      
      // 세션이 없는 경우 더 명확한 에러 메시지
      if (!req.session || !sessionState) {
        return res.status(403).json({ 
          error: "Session expired or not found. Please try logging in again.",
          details: "The session cookie may not have been saved properly. This can happen in Android WebView if cookies are not properly configured."
        });
      }
      
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
    
    // Railway 환경 감지 (콜백에서도 동일하게, 요청 호스트로도 확인)
    const requestHostCallback = req.get('host') || '';
    const isRailwayCallback = !!process.env.RAILWAY_ENVIRONMENT || 
                              !!process.env.RAILWAY_ENVIRONMENT_NAME ||
                              !!process.env.RAILWAY_SERVICE_NAME ||
                              requestHostCallback.includes('.up.railway.app');
    
    if (isLocalDev) {
      // Local development: always use localhost:5000
      host = 'localhost:5000';
      protocol = 'http';
    } else {
      // Production/Replit/Railway: use configured domain or detect from request
      const isReplitDevDomain = requestHostCallback.includes('.riker.replit.dev');
      
      if (isRailwayCallback) {
        // Railway 환경: 요청 호스트를 그대로 사용
        host = requestHostCallback || 'memoway-production.up.railway.app';
        protocol = 'https';
        console.log('Railway environment detected in callback - using host:', host);
        console.log('Railway callback - Request host:', requestHostCallback);
      } else if (isAndroidAppCallback) {
        // Replit 안드로이드 앱 요청일 경우
        host = 'memo-way.replit.app';
        protocol = 'https';
        console.log('Android app callback detected - using registered domain:', host);
      } else {
        // Replit 프로덕션 도메인 우선 사용
        let detectedReplitDomain: string | undefined;
        if (process.env.REPL_SLUG && !process.env.APP_DOMAIN && !process.env.REPLIT_DEV_DOMAIN) {
          detectedReplitDomain = `https://${process.env.REPL_SLUG}.replit.app`;
        }
        const appDomainCallback = process.env.APP_DOMAIN || process.env.REPLIT_DEV_DOMAIN || detectedReplitDomain;
        const useHttpsCallback = process.env.APP_DOMAIN ? (process.env.APP_USE_HTTPS !== 'false') : 
                                  (!!process.env.REPLIT_DEV_DOMAIN || !!detectedReplitDomain);
        
        let resolvedHost = appDomainCallback;
        if (resolvedHost && (resolvedHost.startsWith('http://') || resolvedHost.startsWith('https://'))) {
          try {
            const url = new URL(resolvedHost);
            resolvedHost = url.hostname + (url.port ? `:${url.port}` : '');
          } catch (e) {
            // Invalid URL, use as-is
          }
        }
        
        if (!resolvedHost && !process.env.REPLIT_DEV_DOMAIN) {
          if (process.env.REPL_SLUG) {
            resolvedHost = `${process.env.REPL_SLUG}.replit.app`;
          } else if (isReplitDevDomain) {
            resolvedHost = 'memo-way.replit.app';
          }
        }
        
        host = resolvedHost || 
               (isReplitDevDomain ? 'memo-way.replit.app' : (requestHostCallback || process.env.HOST || 'memo-way.replit.app'));
        protocol = useHttpsCallback || host.includes('.replit.app') ? 'https' : (req.protocol || 'http');
      }
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
            // 중요: OAuth WebView와 앱의 WebView는 별개의 쿠키 저장소를 사용하므로
            // 앱이 Deep Link로 열릴 때 세션을 다시 확인해야 합니다
            (async function() {
              try {
                console.log('[REDIRECT PAGE] Starting session sync...');
                
                // 세션을 확인하는 API 호출로 쿠키 동기화
                // credentials: 'include'로 쿠키를 받아옵니다
                const response = await fetch('${baseUrl}/api/auth/user', {
                  method: 'GET',
                  credentials: 'include', // 쿠키 포함
                  headers: {
                    'Accept': 'application/json',
                  }
                });
                
                if (response.ok) {
                  const userData = await response.json();
                  console.log('[REDIRECT PAGE] Session cookie synced to WebView, user:', userData?.id);
                  
                  // 쿠키가 설정된 후 Deep Link로 리다이렉트
                  // 앱이 열릴 때 세션을 다시 확인하도록 session_ok=true 전달
                  setTimeout(() => {
                    try {
                      console.log('[REDIRECT PAGE] Redirecting to app via Deep Link...');
                      window.location.href = ${JSON.stringify(appDeepLink)};
                    } catch (e) {
                      console.error('[REDIRECT PAGE] Failed to redirect:', e);
                    }
                  }, 800); // 쿠키 설정을 위한 충분한 시간 확보
                } else {
                  console.error('[REDIRECT PAGE] Session sync failed:', response.status);
                  // 세션 동기화 실패 시에도 Deep Link로 리다이렉트 (앱에서 처리)
                  const errorDeepLink = ${JSON.stringify(appDeepLink.replace('session_ok=true', 'error=session_sync_failed'))};
                  setTimeout(() => {
                    window.location.href = errorDeepLink;
                  }, 500);
                }
              } catch (error) {
                console.error('[REDIRECT PAGE] Failed to sync session cookie:', error);
                // 에러 발생 시에도 Deep Link로 리다이렉트
                const errorDeepLink = ${JSON.stringify(appDeepLink.replace('session_ok=true', 'error=session_sync_failed'))};
                setTimeout(() => {
                  window.location.href = errorDeepLink;
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

  // Android 네이티브 로그인 엔드포인트 (Kakao SDK + REST API 방식)
  // Android 앱은 Kakao SDK로 로그인 후 accessToken을 이 엔드포인트로 전달
  app.post("/api/kakao/android-login", async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [ANDROID LOGIN] ========== Android Kakao login request received ==========`);
    console.log('[ANDROID LOGIN] Request method:', req.method);
    console.log('[ANDROID LOGIN] Request URL:', req.url);
    console.log('[ANDROID LOGIN] Request headers:', {
      origin: req.get('origin'),
      'user-agent': req.get('user-agent')?.substring(0, 100),
      cookie: req.get('cookie') ? 'present' : 'missing',
      'content-type': req.get('content-type'),
      'x-platform': req.get('x-platform'),
      host: req.get('host'),
      referer: req.get('referer')
    });
    console.log('[ANDROID LOGIN] Request body keys:', Object.keys(req.body || {}));
    console.log('[ANDROID LOGIN] Request body (sanitized):', {
      hasAccessToken: !!req.body?.accessToken,
      hasKakaoId: !!req.body?.kakaoId,
      hasEmail: !!req.body?.email,
      hasNickname: !!req.body?.nickname,
      hasProfileImage: !!req.body?.profileImage,
      accessTokenLength: req.body?.accessToken?.length || 0,
      kakaoId: req.body?.kakaoId ? String(req.body.kakaoId).substring(0, 10) + '...' : 'missing'
    });
    
    const { accessToken, kakaoId, email, nickname, profileImage } = req.body;

    if (!accessToken || !kakaoId) {
      console.error('[ANDROID LOGIN] ❌ Missing required fields:', { 
        hasAccessToken: !!accessToken, 
        hasKakaoId: !!kakaoId,
        accessTokenType: typeof accessToken,
        kakaoIdType: typeof kakaoId,
        fullBody: JSON.stringify(req.body).substring(0, 200)
      });
      return res.status(400).json({ 
        error: "Missing required fields: accessToken and kakaoId are required",
        received: {
          hasAccessToken: !!accessToken,
          hasKakaoId: !!kakaoId,
          bodyKeys: Object.keys(req.body || {})
        }
      });
    }

    try {
      // 카카오 토큰 검증 (보안 강화)
      console.log('[ANDROID LOGIN] Validating Kakao access token...');
      console.log('[ANDROID LOGIN] Access token (first 20 chars):', accessToken?.substring(0, 20) + '...');
      console.log('[ANDROID LOGIN] KakaoId:', kakaoId);
      
      const tokenValidationStart = Date.now();
      const userInfoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const tokenValidationTime = Date.now() - tokenValidationStart;
      console.log('[ANDROID LOGIN] Token validation response status:', userInfoResponse.status);
      console.log('[ANDROID LOGIN] Token validation time:', tokenValidationTime + 'ms');

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('[ANDROID LOGIN] ❌ Invalid access token - Status:', userInfoResponse.status);
        console.error('[ANDROID LOGIN] ❌ Invalid access token - Response:', errorText);
        console.error('[ANDROID LOGIN] ❌ Invalid access token - Headers:', Object.fromEntries(userInfoResponse.headers.entries()));
        return res.status(401).json({ 
          error: "Invalid access token",
          status: userInfoResponse.status,
          details: errorText.substring(0, 200)
        });
      }

      const userInfo: KakaoUserInfo = await userInfoResponse.json();
      console.log('[ANDROID LOGIN] ✅ Kakao user info retrieved:', { 
        id: userInfo.id, 
        hasEmail: !!userInfo.kakao_account?.email,
        email: userInfo.kakao_account?.email || 'not provided',
        hasNickname: !!userInfo.kakao_account?.profile?.nickname,
        nickname: userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || 'not provided',
        connectedAt: userInfo.connected_at
      });

      // 사용자 정보 저장
      const userUpsertStart = Date.now();
      const user = await storage.upsertUser({
        id: `kakao_${kakaoId}`,
        email: email || userInfo.kakao_account?.email || `kakao_${kakaoId}@placeholder.com`,
        firstName: nickname || userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || "Kakao User",
        lastName: "",
        profileImageUrl: profileImage || userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image || null,
        provider: "kakao",
        kakaoId: kakaoId.toString(),
      });
      const userUpsertTime = Date.now() - userUpsertStart;
      console.log('[ANDROID LOGIN] ✅ User upserted:', { 
        id: user.id, 
        email: user.email,
        firstName: user.firstName,
        provider: user.provider,
        upsertTime: userUpsertTime + 'ms'
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
            console.error("[ANDROID LOGIN] ❌ Session creation failed:", err);
            console.error("[ANDROID LOGIN] ❌ Session creation error details:", {
              message: err?.message,
              stack: err?.stack,
              name: err?.name,
              userId: user.id
            });
            return res.status(500).json({ 
              error: "Failed to create session",
              details: err?.message || String(err)
            });
          }
          
          console.log('[ANDROID LOGIN] Session created, saving...');
          // 세션 저장 (쿠키가 제대로 설정되도록)
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("[ANDROID LOGIN] ❌ Session save failed:", saveErr);
              console.error("[ANDROID LOGIN] ❌ Session save error details:", {
                message: saveErr?.message,
                stack: saveErr?.stack,
                name: saveErr?.name,
                sessionId: req.session?.id
              });
              return res.status(500).json({ 
                error: "Failed to save session",
                details: saveErr?.message || String(saveErr)
              });
            }
            
            const sessionId = req.session?.id;
            console.log(`[ANDROID LOGIN] ✅ Android Kakao login successful for user ID: ${user.id}`);
            console.log('[ANDROID LOGIN] ✅ Session ID:', sessionId?.substring(0, 20));
            console.log('[ANDROID LOGIN] ✅ Session cookie name:', req.session?.cookie?.name || 'connect.sid');
            console.log('[ANDROID LOGIN] ✅ Session cookie secure:', req.session?.cookie?.secure);
            console.log('[ANDROID LOGIN] ✅ Session cookie sameSite:', req.session?.cookie?.sameSite);
            console.log('[ANDROID LOGIN] ========== Login process completed successfully ==========');
            
            // 세션 쿠키가 제대로 설정되도록 응답
            // CORS와 credentials 설정은 이미 server/index.ts에서 처리됨
            res.json({ 
              success: true, 
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImageUrl: user.profileImageUrl,
              },
              sessionId: sessionId?.substring(0, 10) // 디버깅용 (일부만)
            });
          });
        }
      );
    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [ANDROID LOGIN] ❌ ========== Android Kakao login error ==========`);
      console.error("[ANDROID LOGIN] ❌ Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("[ANDROID LOGIN] ❌ Error message:", error instanceof Error ? error.message : String(error));
      console.error("[ANDROID LOGIN] ❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("[ANDROID LOGIN] ❌ Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2).substring(0, 500));
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      res.status(500).json({ 
        error: "Login failed",
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: errorStack?.substring(0, 500) // 개발 환경에서만 스택 트레이스 제공
        })
      });
    }
  });
}
