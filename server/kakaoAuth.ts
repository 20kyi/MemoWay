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
    // ⚠️ 중요: redirectUri를 /api/kakao/redirect로 통일
    const expectedRedirectUri = isLocalDev 
      ? 'http://localhost:5000/api/kakao/redirect'
      : `${useHttps ? 'https' : 'http'}://${appDomain || 'unknown'}/api/kakao/redirect`;
    
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

  // ============================================================================
  // [KAKAO LOGIN FLOW] 라우트 1: GET /api/kakao/login
  // ============================================================================
  // 목적: 카카오 OAuth 인증 시작
  // 리디렉션: 카카오 인증 URL (https://kauth.kakao.com/oauth/authorize)로 302 리다이렉트
  // 절대 자기 자신(/api/kakao/login)으로 리다이렉트하지 않음
  // ============================================================================
  app.get("/api/kakao/login", (req, res) => {
    console.log('[KAKAO FLOW]', req.method, req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] ========== GET /api/kakao/login ==========');
    console.log('[KAKAO LOGIN FLOW] Method:', req.method);
    console.log('[KAKAO LOGIN FLOW] Original URL:', req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] Query params:', req.query);
    console.log('[KAKAO LOGIN FLOW] User-Agent:', req.get('user-agent')?.substring(0, 100));
    console.log('[KAKAO LOGIN FLOW] X-Platform:', req.get('x-platform'));
    console.log('[KAKAO LOGIN FLOW] Referer:', req.get('referer'));
    
    // ⚠️ 무한 루프 방지: 이미 code와 state가 있으면 에러 반환
    if (req.query.code || req.query.state) {
      console.error('[KAKAO FLOW] ❌ /api/kakao/login called with code/state - possible redirect loop');
      return res.status(400).json({ 
        error: "Invalid request: /api/kakao/login should not be called with code or state parameters",
        hint: "If you have a code and state, use /api/kakao/redirect or /api/kakao/exchange-code"
      });
    }
    
    // Get language and platform from query parameter
    const lang = req.query.lang || 'ko';
    const platform = req.query.platform || 'web';
    
    console.log('[KAKAO LOGIN FLOW] Platform from query:', platform);
    console.log('[KAKAO LOGIN FLOW] Language:', lang);
    
    // 안드로이드 앱 요청 감지 (User-Agent 또는 X-Platform 헤더 확인)
    const userAgent = req.get('user-agent') || '';
    const xPlatform = req.get('x-platform');
    const isAndroidApp = platform === 'android' || 
                         xPlatform === 'android' ||
                         userAgent.includes('wv') || // WebView
                         (userAgent.includes('Android') && !userAgent.includes('Chrome'));
    
    console.log('[KAKAO LOGIN FLOW] isAndroidApp detected:', isAndroidApp);
    
    // Android 플랫폼인 경우 redirect-flow 비활성화하고 JSON 응답 반환
    // 하지만 platform=web으로 강제 변경했으므로 이 분기는 실행되지 않음
    if (isAndroidApp && platform === 'android') {
      console.log('[KAKAO LOGIN FLOW] ❌ Android platform detected - returning JSON (no redirect)');
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
    
    // ⚠️ 중요: redirectUri를 /api/kakao/redirect로 설정하여 서버에서 직접 처리
    // /api/kakao/callback은 프런트엔드로 넘어가면서 무한 루프가 발생할 수 있으므로
    // /api/kakao/redirect로 통일하여 서버에서 모든 것을 처리
    const redirectUri = `${protocol}://${host}/api/kakao/redirect`;
    
    console.log('[KAKAO LOGIN FLOW] Request details:', {
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
    
    console.log('[KAKAO FLOW] redirectUri:', redirectUri);
    console.log('[KAKAO FLOW] redirect to:', kakaoAuthUrl);
    console.log('[KAKAO LOGIN FLOW] ✅ Redirect URI (카카오 콜백):', redirectUri);
    console.log('[KAKAO LOGIN FLOW] ✅ Kakao OAuth URL (리다이렉트 대상):', kakaoAuthUrl);
    console.log('[KAKAO LOGIN FLOW] ⚠️  중요: 카카오 인증 URL로만 리다이렉트합니다. 절대 /api/kakao/login으로 돌아오지 않습니다.');
    console.log('[KAKAO LOGIN FLOW] ⚠️  중요: redirectUri는 /api/kakao/redirect로 설정되어 서버에서 직접 처리됩니다.');
    
    // 명시적으로 세션 저장 후 리다이렉트 (Android WebView에서 세션 쿠키가 제대로 설정되도록)
    // 세션 저장이 완료된 후에만 리다이렉트하여 쿠키가 제대로 설정되도록 보장
    req.session.save((err) => {
      if (err) {
        console.error('[KAKAO LOGIN FLOW] ❌ Failed to save session before redirect:', err);
        return res.status(500).json({ error: "Failed to save session" });
      }
      
      console.log('[KAKAO LOGIN FLOW] ✅ Session saved successfully');
      console.log('[KAKAO LOGIN FLOW] Session ID:', req.session?.id?.substring(0, 10));
      
      // 서버 측 리다이렉트로 직접 이동 (더 안정적)
      // 안드로이드 앱의 외부 브라우저에서도 작동
      // ⚠️ 중요: 카카오 인증 URL로만 리다이렉트. 절대 자기 자신(/api/kakao/login)으로 리다이렉트하지 않음
      console.log('[KAKAO FLOW] redirect to:', kakaoAuthUrl);
      console.log('[KAKAO LOGIN FLOW] 🔄 Redirecting to Kakao OAuth (302) - External URL');
      res.redirect(kakaoAuthUrl);
    });
  });

  // ============================================================================
  // [KAKAO LOGIN FLOW] 라우트 2: POST /api/kakao/exchange-code
  // ============================================================================
  // 목적: 프런트엔드에서 받은 인가 코드를 토큰으로 교환하고 세션 생성
  // 리디렉션: 없음 (JSON 응답만 반환)
  // ============================================================================
  app.post("/api/kakao/exchange-code", async (req, res) => {
    console.log('[KAKAO FLOW]', req.method, req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] ========== POST /api/kakao/exchange-code ==========');
    console.log('[KAKAO LOGIN FLOW] Method:', req.method);
    console.log('[KAKAO LOGIN FLOW] Original URL:', req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] Request body:', {
      hasCode: !!req.body.code,
      hasState: !!req.body.state,
      lang: req.body.lang
    });
    console.log('[KAKAO LOGIN FLOW] ⚠️  중요: 이 엔드포인트는 리다이렉트하지 않습니다. JSON만 반환합니다.');
    console.log('[KAKAO FLOW] ⚠️  무한 루프 방지: 이 엔드포인트는 절대 /api/kakao/login으로 리다이렉트하지 않습니다.');
    
    const { code, state, lang = 'ko' } = req.body;
    
    // 인가 코드 검증
    if (!code || typeof code !== "string") {
      console.error('[KAKAO EXCHANGE] ❌ Missing authorization code');
      return res.status(400).json({ error: "Authorization code is required" });
    }
    
    // CSRF state 검증 (세션에 저장된 state와 비교)
    const sessionState = (req.session as any).kakaoState;
    if (state && state !== sessionState) {
      console.error('[KAKAO EXCHANGE] ❌ State mismatch - possible CSRF attack');
      return res.status(403).json({ error: "Invalid state parameter - possible CSRF attack" });
    }
    
    // State에서 언어 및 플랫폼 정보 추출
    let platform = 'web';
    try {
      if (state) {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
        platform = stateData.platform || 'web';
      }
    } catch (e) {
      console.warn('[KAKAO EXCHANGE] Failed to parse state, using defaults');
    }
    
    // Clear state from session
    if (sessionState) {
      delete (req.session as any).kakaoState;
    }
    
    // Redirect URI 결정 (콜백과 동일한 로직)
    const userAgent = req.get('user-agent') || '';
    const xPlatform = req.get('x-platform');
    const isAndroidApp = platform === 'android' || 
                         xPlatform === 'android' ||
                         userAgent.includes('wv') ||
                         (userAgent.includes('Android') && !userAgent.includes('Chrome'));
    
    let host: string;
    let protocol: string;
    const requestHost = req.get('host') || '';
    const isRailway = !!process.env.RAILWAY_ENVIRONMENT || 
                      !!process.env.RAILWAY_ENVIRONMENT_NAME ||
                      !!process.env.RAILWAY_SERVICE_NAME ||
                      requestHost.includes('.up.railway.app');
    
    if (isLocalDev) {
      host = 'localhost:5000';
      protocol = 'http';
    } else {
      const isReplitDevDomain = requestHost.includes('.riker.replit.dev');
      
      if (isRailway) {
        host = requestHost || 'memoway-production.up.railway.app';
        protocol = 'https';
      } else if (isAndroidApp) {
        host = 'memo-way.replit.app';
        protocol = 'https';
      } else {
        let resolvedHost = appDomain;
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
               (isReplitDevDomain ? 'memo-way.replit.app' : (requestHost || process.env.HOST || 'memo-way.replit.app'));
        protocol = useHttps || host.includes('.replit.app') ? 'https' : (req.protocol || 'http');
      }
    }
    
    // ⚠️ 중요: redirectUri를 /api/kakao/redirect로 통일
    // /api/kakao/login에서 사용한 redirectUri와 일치해야 함
    const redirectUri = `${protocol}://${host}/api/kakao/redirect`;
    
    try {
      console.log('[KAKAO EXCHANGE] Exchanging code for token...');
      console.log('[KAKAO EXCHANGE] Redirect URI:', redirectUri);
      console.log('[KAKAO FLOW] redirectUri for token exchange:', redirectUri);
      
      // 인가 코드를 액세스 토큰으로 교환
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
        console.error('[KAKAO EXCHANGE] ❌ Token exchange failed:', error);
        return res.status(500).json({ 
          error: "Failed to exchange authorization code",
          details: error
        });
      }

      const tokenData: KakaoTokenResponse = await tokenResponse.json();
      console.log('[KAKAO EXCHANGE] ✅ Token received');

      // 카카오 사용자 정보 가져오기
      const userInfoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        const error = await userInfoResponse.text();
        console.error('[KAKAO EXCHANGE] ❌ User info fetch failed:', error);
        return res.status(500).json({ error: "Failed to fetch user information" });
      }

      // [CRITICAL FIX] 숫자 정밀도 손실 방지를 위해 text로 먼저 받고 ID 추출
      const userInfoText = await userInfoResponse.text();
      let userInfo: KakaoUserInfo;
      try {
        userInfo = JSON.parse(userInfoText);
      } catch (e) {
        console.error('[KAKAO EXCHANGE] ❌ Failed to parse user info JSON:', e);
        return res.status(500).json({ error: "Failed to parse user information" });
      }

      // ID 안전하게 추출 (문자열로 처리)
      let safeKakaoId = String(userInfo.id);
      const idMatch = userInfoText.match(/"id":\s*(\d+)/);
      if (idMatch && idMatch[1]) {
        safeKakaoId = idMatch[1];
      }

      // ⚠️ CRITICAL: kakaoId는 반드시 있어야 합니다
      if (!safeKakaoId || safeKakaoId === 'undefined' || safeKakaoId === 'null' || safeKakaoId === '') {
        console.error('[KAKAO EXCHANGE] ❌ Invalid or missing Kakao ID:', { 
          safeKakaoId, 
          userInfo,
          userInfoId: userInfo.id,
          userInfoText: userInfoText.substring(0, 200)
        });
        return res.status(400).json({ 
          error: "Invalid or missing Kakao User ID. 카카오 사용자 ID를 가져올 수 없습니다."
        });
      }

      console.log('[KAKAO EXCHANGE] ✅ User info retrieved:', { id: safeKakaoId });

      // 사용자 정보 저장/업데이트
      const email = userInfo.kakao_account?.email || `kakao_${safeKakaoId}@placeholder.com`;
      const nickname = userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || "Kakao User";
      const profileImage = userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image;

      console.log(`[KAKAO EXCHANGE] Upserting user with KakaoID: ${safeKakaoId}`);

      const user = await storage.upsertUser({
        id: `kakao_${safeKakaoId}`, // Proposed ID (will be ignored if user exists)
        email,
        firstName: nickname,
        lastName: "",
        profileImageUrl: profileImage || null,
        provider: "kakao",
        kakaoId: safeKakaoId,
      });

      console.log('[KAKAO LOGIN] ✅ ========== KAKAO LOGIN SUCCESS ==========');
      console.log('[KAKAO LOGIN] kakaoId:', safeKakaoId);
      console.log('[KAKAO LOGIN] email:', email);
      console.log('[KAKAO LOGIN] nickname:', nickname);
      console.log('[KAKAO LOGIN] 내부 userId:', user.id);
      console.log('[KAKAO LOGIN] DB kakaoId:', user.kakaoId);
      console.log('[KAKAO LOGIN] provider:', user.provider);
      console.log('[KAKAO LOGIN] ============================================');

      // 세션 생성
      return new Promise<void>((resolve, reject) => {
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
              console.error('[KAKAO EXCHANGE] ❌ Session creation failed:', err);
              return reject(res.status(500).json({ error: "Failed to create session" }));
            }
            
            req.session.save((saveErr: any) => {
              if (saveErr) {
                console.error('[KAKAO EXCHANGE] ❌ Session save failed:', saveErr);
                return reject(res.status(500).json({ error: "Failed to save session" }));
              }
              
              console.log('[KAKAO EXCHANGE] ✅ Session created successfully');
              const sessionId = req.session?.id;
              console.log('[KAKAO EXCHANGE] session userId=', user.id);
              console.log('[KAKAO EXCHANGE] sessionId=', sessionId?.substring(0, 20));
              console.log('[KAKAO EXCHANGE] platform=', platform);
              console.log('[KAKAO EXCHANGE] ⚠️ JWT/세션에 저장된 userId:', user.id);
              
              res.json({ 
                success: true, 
                user: {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  profileImageUrl: user.profileImageUrl,
                },
                sessionId: sessionId?.substring(0, 10), // 일부만 반환 (보안)
                lang: lang,
                platform: platform
              });
              
              resolve();
            });
          }
        );
      });
    } catch (error) {
      console.error('[KAKAO EXCHANGE] ❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: "Kakao OAuth failed",
        details: errorMessage
      });
    }
  });

  // ============================================================================
  // [KAKAO LOGIN FLOW] 라우트 2.5: GET /api/kakao/callback
  // ============================================================================
  // 목적: 카카오 개발자 콘솔에 등록된 redirect_uri가 /api/kakao/callback인 경우를 처리
  // 리디렉션: 프론트엔드 콜백 페이지(/#/kakao-callback)로 단일 리다이렉트
  // ⚠️ 중요: 
  //   1. 카카오에서 /api/kakao/callback?code=...&state=...로 리다이렉트
  //   2. 서버에서 프론트엔드 콜백 페이지(/#/kakao-callback)로 단 한 번만 리다이렉트
  //   3. 절대 /api/kakao/login으로 리다이렉트하지 않음
  //   4. 절대 카카오 authorize URL로 리다이렉트하지 않음
  //   5. 절대 다른 /api/kakao/* 엔드포인트로 리다이렉트하지 않음
  // ============================================================================
  app.get("/api/kakao/callback", (req, res) => {
    console.log('[KAKAO CALLBACK]', req.method, req.originalUrl);
    console.log('[KAKAO CALLBACK] ========== GET /api/kakao/callback ==========');
    console.log('[KAKAO CALLBACK] Query params:', req.query);
    
    // ⚠️ 무한 루프 방지: 절대 /api/kakao/login이나 다른 서버 엔드포인트로 리다이렉트하지 않음
    console.log('[KAKAO CALLBACK] ⚠️  무한 루프 방지: 프론트엔드 콜백 페이지로만 리다이렉트합니다.');
    console.log('[KAKAO CALLBACK] ⚠️  절대 /api/kakao/login으로 리다이렉트하지 않습니다.');
    console.log('[KAKAO CALLBACK] ⚠️  절대 카카오 authorize URL로 리다이렉트하지 않습니다.');
    
    // 카카오에서 받은 code와 state를 프론트엔드 콜백 페이지로 전달
    const { code, state, error, error_description } = req.query;
    
    // OAuth 에러가 있는 경우 에러 파라미터도 전달
    const queryParams = new URLSearchParams();
    if (code) queryParams.append('code', code as string);
    if (state) queryParams.append('state', state as string);
    if (error) queryParams.append('error', error as string);
    if (error_description) queryParams.append('error_description', error_description as string);
    
    // 프로덕션 도메인 결정
    const isLocalDev = process.env.NODE_ENV === 'development' || 
                       (req.get('host')?.includes('localhost') || req.get('host')?.includes('127.0.0.1'));
    
    let baseUrl: string;
    if (isLocalDev) {
      baseUrl = `http://${req.get('host') || 'localhost:5000'}`;
    } else {
      // Railway 프로덕션 환경
      const requestHost = req.get('host') || 'memoway-production.up.railway.app';
      baseUrl = `https://${requestHost}`;
    }
    
    // 프론트엔드 콜백 페이지로 리다이렉트 (단 한 번만)
    const redirectUrl = `${baseUrl}/#/kakao-callback${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('[KAKAO CALLBACK] redirectTo:', redirectUrl);
    console.log('[KAKAO CALLBACK] ✅ 프론트엔드 콜백 페이지로 단일 리다이렉트 수행');
    
    // ⚠️ 중요: 프론트엔드 콜백 페이지로 단 한 번만 리다이렉트하고 끝
    // 절대 /api/kakao/login이나 다른 서버 엔드포인트로 리다이렉트하지 않음
    res.redirect(redirectUrl);
  });

  // ============================================================================
  // [KAKAO LOGIN FLOW] 라우트 3: GET /api/kakao/callback-server (레거시)
  // ============================================================================
  // 목적: 서버 측 콜백 처리 (현재는 사용하지 않음, 프런트엔드에서 처리)
  // 리디렉션: 성공 시 /api/kakao/redirect 또는 /, 실패 시 /?error=...
  // ⚠️ 중요: 이 엔드포인트는 현재 사용되지 않습니다. 카카오는 /api/kakao/callback으로 리다이렉트하지만
  //          서버 엔드포인트가 없으므로 serveStatic이 index.html을 반환하고 프런트엔드가 처리합니다.
  // ============================================================================
  app.get("/api/kakao/callback-server", async (req, res) => {
    console.log('[KAKAO FLOW]', req.method, req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] ========== GET /api/kakao/callback-server (LEGACY) ==========');
    console.log('[KAKAO LOGIN FLOW] Method:', req.method);
    console.log('[KAKAO LOGIN FLOW] Original URL:', req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] Request Host:', req.get('host'));
    console.log('[KAKAO LOGIN FLOW] Request Protocol:', req.protocol);
    console.log('[KAKAO LOGIN FLOW] Query params:', { 
      code: req.query.code ? 'present' : 'missing', 
      state: req.query.state ? 'present' : 'missing',
      error: req.query.error || 'none',
      error_description: req.query.error_description || 'none'
    });
    console.log('[KAKAO LOGIN FLOW] ⚠️  중요: 이 엔드포인트는 레거시입니다. 현재는 사용되지 않습니다.');
    console.log('[KAKAO FLOW] ⚠️  무한 루프 방지: 이 엔드포인트는 절대 /api/kakao/login으로 리다이렉트하지 않습니다.');
    
    // Check for OAuth errors
    if (req.query.error) {
      console.error('[KAKAO LOGIN FLOW] ❌ OAuth error:', req.query.error);
      console.error('[KAKAO LOGIN FLOW] Error description:', req.query.error_description || 'No description');
      const errorRedirect = `/?error=oauth_failed&provider=kakao&message=${encodeURIComponent(req.query.error_description as string || req.query.error as string)}`;
      console.log('[KAKAO FLOW] redirect to:', errorRedirect);
      console.log('[KAKAO LOGIN FLOW] 🔄 Redirecting to:', errorRedirect);
      return res.redirect(errorRedirect);
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
    
    // ⚠️ 중요: redirectUri를 /api/kakao/redirect로 통일
    // /api/kakao/login에서 사용한 redirectUri와 일치해야 함
    const redirectUri = `${protocol}://${host}/api/kakao/redirect`;

    try {
      // Exchange code for access token (must match the redirect_uri used in authorization request)
      
      console.log('[KAKAO FLOW] Token exchange with Redirect URI:', redirectUri);
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

      // ⚠️ CRITICAL: kakaoId는 반드시 있어야 합니다
      const kakaoIdStr = userInfo.id.toString();
      if (!kakaoIdStr || kakaoIdStr === 'undefined' || kakaoIdStr === 'null' || kakaoIdStr === '') {
        console.error('[KAKAO CALLBACK] ❌ Invalid or missing Kakao ID:', { 
          userInfoId: userInfo.id,
          kakaoIdStr
        });
        return res.status(500).json({ 
          error: "Invalid or missing Kakao User ID. 카카오 사용자 ID를 가져올 수 없습니다."
        });
      }
      
      console.log(`[KAKAO CALLBACK] Upserting user with KakaoID: ${kakaoIdStr}`);

      const user = await storage.upsertUser({
        id: `kakao_${kakaoIdStr}`,
        email,
        firstName: nickname,
        lastName: "",
        profileImageUrl: profileImage || null,
        provider: "kakao",
        kakaoId: kakaoIdStr,
      });
      
      console.log('[KAKAO CALLBACK] ✅ User upserted/found:', { id: user.id, kakaoId: user.kakaoId });

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
            console.log('[KAKAO LOGIN FLOW] ✅ Kakao login successful for user ID:', user.id);
            
            // Check if request is from Android app
            const userAgent = req.get('user-agent') || '';
            const isAndroidApp = platform === 'android' || 
                                 userAgent.includes('wv') || // WebView
                                 (userAgent.includes('Android') && !userAgent.includes('Chrome'));
            
            console.log('[KAKAO LOGIN FLOW] Platform check:', {
              platform,
              isAndroidApp,
              userAgent: userAgent.substring(0, 100)
            });
            
            // ⚠️ 중요: /api/kakao/callback-server는 레거시이므로 사용하지 않음
            // 하지만 만약 호출되면 HTML을 반환하여 딥링크로 이동
            // 절대 /api/kakao/login으로 리다이렉트하지 않음
            if (isAndroidApp) {
              // HTML을 반환하여 딥링크로 이동 (서버 레벨 redirect 없음)
              const appDeepLink = `com.memoway.app://login?lang=${lang}&session_ok=true`;
              console.log('[KAKAO FLOW] redirect to (final):', appDeepLink, '(Android app - Deep Link)');
              console.log('[KAKAO LOGIN FLOW] ⚠️  중요: HTML을 반환합니다. 서버 레벨 redirect 없음.');
              return res.send(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <title>로그인 완료</title>
                    <script>
                      setTimeout(() => {
                        window.location.href = '${appDeepLink}';
                      }, 500);
                    </script>
                  </head>
                  <body>
                    <p>로그인 완료. 앱으로 이동 중...</p>
                  </body>
                </html>
              `);
            } else {
              // Redirect to web with language parameter
              const redirectUrl = `/?lang=${lang}`;
              console.log('[KAKAO FLOW] redirect to:', redirectUrl, '(Web)');
              console.log('[KAKAO LOGIN FLOW] 🔄 Redirecting to:', redirectUrl, '(Web)');
              res.redirect(redirectUrl);
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

  // ============================================================================
  // [KAKAO LOGIN FLOW] 라우트 4: GET /api/kakao/redirect
  // ============================================================================
  // 목적: 카카오 OAuth 콜백을 받아서 토큰 교환, 세션 생성, 딥링크로 앱 이동
  // 리디렉션: HTML 페이지 반환 (JavaScript로 딥링크 리다이렉트)
  // ⚠️ 중요: 
  //   1. 카카오에서 인가 코드(code)와 state를 받아서 처리
  //   2. 토큰 교환 및 세션 생성
  //   3. HTML 반환하여 JavaScript로 딥링크 이동
  //   4. 절대 /api/kakao/login으로 리다이렉트하지 않음
  //   5. 절대 서버 레벨에서 추가 redirect를 하지 않음
  // ============================================================================
  app.get("/api/kakao/redirect", async (req, res) => {
    console.log('[KAKAO FLOW]', req.method, req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] ========== GET /api/kakao/redirect ==========');
    console.log('[KAKAO LOGIN FLOW] Method:', req.method);
    console.log('[KAKAO LOGIN FLOW] Original URL:', req.originalUrl);
    console.log('[KAKAO LOGIN FLOW] Query params:', req.query);
    console.log('[KAKAO LOGIN FLOW] User-Agent:', req.get('user-agent')?.substring(0, 100));
    
    // ⚠️ 무한 루프 방지: /api/kakao/login으로 리다이렉트하지 않음
    console.log('[KAKAO FLOW] ⚠️  무한 루프 방지: 이 엔드포인트는 절대 /api/kakao/login으로 리다이렉트하지 않습니다.');
    
    // ⚠️ 무한 루프 방지: 이미 code와 state가 있으면 로그인 처리, 없으면 에러
    const { code, state, error, error_description } = req.query;
    
    // OAuth 에러 처리
    if (error) {
      console.error('[KAKAO FLOW] OAuth error:', error, error_description);
      const errorDeepLink = `com.memoway.app://login?error=oauth_failed&message=${encodeURIComponent(error_description as string || error as string)}`;
      console.log('[KAKAO FLOW] redirect to (error):', errorDeepLink);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>로그인 실패</title>
            <script>
              alert('로그인에 실패했습니다: ${error_description || error}');
              setTimeout(() => {
                window.location.href = '${errorDeepLink}';
              }, 1000);
            </script>
          </head>
          <body>
            <p>로그인에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
          </body>
        </html>
      `);
    }
    
    // 인가 코드가 없으면 에러
    // ⚠️ 중요: code가 없으면 카카오 콜백이 아니므로 에러 처리
    // 절대 /api/kakao/login으로 리다이렉트하지 않음
    if (!code || typeof code !== "string") {
      console.error('[KAKAO FLOW] ❌ No authorization code received');
      console.error('[KAKAO FLOW] ⚠️  무한 루프 방지: /api/kakao/login으로 리다이렉트하지 않습니다.');
      
      // 이미 세션이 있는지 확인 (혹시 다른 경로로 들어온 경우)
      const isAuthenticated = req.isAuthenticated();
      if (isAuthenticated) {
        // 이미 로그인되어 있으면 딥링크로 이동
        const lang = req.query.lang || 'ko';
        const appDeepLink = `com.memoway.app://login?lang=${lang}&session_ok=true`;
        console.log('[KAKAO FLOW] Already authenticated, redirecting to app:', appDeepLink);
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>로그인 완료</title>
              <script>
                setTimeout(() => {
                  window.location.href = '${appDeepLink}';
                }, 500);
              </script>
            </head>
            <body>
              <p>로그인 완료. 앱으로 이동 중...</p>
            </body>
          </html>
        `);
      }
      
      // 세션이 없으면 에러
      const errorDeepLink = 'com.memoway.app://login?error=no_code';
      console.log('[KAKAO FLOW] redirect to (no_code):', errorDeepLink);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>로그인 실패</title>
            <script>
              alert('인가 코드를 받지 못했습니다.');
              setTimeout(() => {
                window.location.href = '${errorDeepLink}';
              }, 1000);
            </script>
          </head>
          <body>
            <p>인가 코드를 받지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          </body>
        </html>
      `);
    }
    
    // State에서 언어 및 플랫폼 정보 추출
    let lang = 'ko';
    let platform = 'web';
    try {
      if (state && typeof state === 'string') {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        lang = stateData.lang || 'ko';
        platform = stateData.platform || 'web';
      }
    } catch (e) {
      console.warn('[KAKAO FLOW] Failed to parse state, using defaults');
    }
    
    // CSRF state 검증
    const sessionState = (req.session as any).kakaoState;
    if (state && state !== sessionState) {
      console.error('[KAKAO FLOW] ❌ State mismatch - possible CSRF attack');
      const errorDeepLink = 'com.memoway.app://login?error=state_mismatch';
      console.log('[KAKAO FLOW] redirect to (state_mismatch):', errorDeepLink);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>로그인 실패</title>
            <script>
              alert('보안 검증에 실패했습니다.');
              setTimeout(() => {
                window.location.href = '${errorDeepLink}';
              }, 1000);
            </script>
          </head>
          <body>
            <p>보안 검증에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
          </body>
        </html>
      `);
    }
    
    // Clear state from session
    if (sessionState) {
      delete (req.session as any).kakaoState;
    }
    
    // Redirect URI 결정 (토큰 교환 시 사용)
    const userAgent = req.get('user-agent') || '';
    const xPlatform = req.get('x-platform');
    const isAndroidApp = platform === 'android' || 
                         xPlatform === 'android' ||
                         userAgent.includes('wv') ||
                         (userAgent.includes('Android') && !userAgent.includes('Chrome'));
    
    let host: string;
    let protocol: string;
    const requestHost = req.get('host') || '';
    const isRailway = !!process.env.RAILWAY_ENVIRONMENT || 
                      !!process.env.RAILWAY_ENVIRONMENT_NAME ||
                      !!process.env.RAILWAY_SERVICE_NAME ||
                      requestHost.includes('.up.railway.app');
    
    if (isLocalDev) {
      host = 'localhost:5000';
      protocol = 'http';
    } else {
      const isReplitDevDomain = requestHost.includes('.riker.replit.dev');
      
      if (isRailway) {
        host = requestHost || 'memoway-production.up.railway.app';
        protocol = 'https';
      } else if (isAndroidApp) {
        host = 'memo-way.replit.app';
        protocol = 'https';
      } else {
        let resolvedHost = appDomain;
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
               (isReplitDevDomain ? 'memo-way.replit.app' : (requestHost || process.env.HOST || 'memo-way.replit.app'));
        protocol = useHttps || host.includes('.replit.app') ? 'https' : (req.protocol || 'http');
      }
    }
    
    const redirectUri = `${protocol}://${host}/api/kakao/redirect`;
    
    console.log('[KAKAO FLOW] Exchanging code for token...');
    console.log('[KAKAO FLOW] redirectUri for token exchange:', redirectUri);
    
    try {
      // 인가 코드를 액세스 토큰으로 교환
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
        console.error('[KAKAO FLOW] ❌ Token exchange failed:', error);
        const errorDeepLink = `com.memoway.app://login?error=token_exchange_failed&message=${encodeURIComponent(error)}`;
        console.log('[KAKAO FLOW] redirect to (token_exchange_failed):', errorDeepLink);
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>로그인 실패</title>
              <script>
                alert('토큰 교환에 실패했습니다.');
                setTimeout(() => {
                  window.location.href = '${errorDeepLink}';
                }, 1000);
              </script>
            </head>
            <body>
              <p>토큰 교환에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
            </body>
          </html>
        `);
      }

      const tokenData: KakaoTokenResponse = await tokenResponse.json();
      console.log('[KAKAO FLOW] ✅ Token received');

      // 카카오 사용자 정보 가져오기
      const userInfoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        const error = await userInfoResponse.text();
        console.error('[KAKAO FLOW] ❌ User info fetch failed:', error);
        const errorDeepLink = `com.memoway.app://login?error=user_info_failed&message=${encodeURIComponent(error)}`;
        console.log('[KAKAO FLOW] redirect to (user_info_failed):', errorDeepLink);
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>로그인 실패</title>
              <script>
                alert('사용자 정보를 가져오는데 실패했습니다.');
                setTimeout(() => {
                  window.location.href = '${errorDeepLink}';
                }, 1000);
              </script>
            </head>
            <body>
              <p>사용자 정보를 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.</p>
            </body>
          </html>
        `);
      }

      // [CRITICAL FIX] 숫자 정밀도 손실 방지를 위해 text로 먼저 받고 ID 추출
      const userInfoText = await userInfoResponse.text();
      let userInfo: KakaoUserInfo;
      try {
        userInfo = JSON.parse(userInfoText);
      } catch (e) {
        console.error('[KAKAO FLOW] ❌ Failed to parse user info JSON:', e);
        return res.send('JSON Parsing Error');
      }

      // ID 안전하게 추출 (문자열로 처리)
      let safeKakaoId = String(userInfo.id);
      const idMatch = userInfoText.match(/"id":\s*(\d+)/);
      if (idMatch && idMatch[1]) {
        safeKakaoId = idMatch[1];
      }

      // ⚠️ CRITICAL: kakaoId는 반드시 있어야 합니다
      if (!safeKakaoId || safeKakaoId === 'undefined' || safeKakaoId === 'null' || safeKakaoId === '') {
        console.error('[KAKAO FLOW] ❌ Invalid or missing Kakao ID:', { 
          safeKakaoId, 
          userInfo,
          userInfoId: userInfo.id,
          userInfoText: userInfoText.substring(0, 200)
        });
        const errorDeepLink = 'com.memoway.app://login?error=invalid_kakao_id&message=카카오 사용자 ID를 가져올 수 없습니다';
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>로그인 실패</title>
              <script>
                alert('카카오 사용자 ID를 가져올 수 없습니다.');
                setTimeout(() => {
                  window.location.href = '${errorDeepLink}';
                }, 1000);
              </script>
            </head>
            <body>
              <p>카카오 사용자 ID를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
            </body>
          </html>
        `);
      }

      console.log('[KAKAO FLOW] ✅ User info retrieved:', { id: safeKakaoId });

      // 사용자 정보 저장/업데이트
      const email = userInfo.kakao_account?.email || `kakao_${safeKakaoId}@placeholder.com`;
      const nickname = userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || "Kakao User";
      const profileImage = userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image;

      console.log(`[KAKAO REDIRECT] Upserting user with KakaoID: ${safeKakaoId}`);

      const user = await storage.upsertUser({
        id: `kakao_${safeKakaoId}`,
        email,
        firstName: nickname,
        lastName: "",
        profileImageUrl: profileImage || null,
        provider: "kakao",
        kakaoId: safeKakaoId,
      });

      console.log('[KAKAO LOGIN] ✅ ========== KAKAO LOGIN SUCCESS ==========');
      console.log('[KAKAO LOGIN] kakaoId:', safeKakaoId);
      console.log('[KAKAO LOGIN] email:', email);
      console.log('[KAKAO LOGIN] nickname:', nickname);
      console.log('[KAKAO LOGIN] 내부 userId:', user.id);
      console.log('[KAKAO LOGIN] DB kakaoId:', user.kakaoId);
      console.log('[KAKAO LOGIN] provider:', user.provider);
      console.log('[KAKAO LOGIN] ============================================');

      // 세션 생성
      return new Promise<void>((resolve, reject) => {
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
              console.error('[KAKAO FLOW] ❌ Session creation failed:', err);
              const errorDeepLink = `com.memoway.app://login?error=session_failed&message=${encodeURIComponent(err.message || 'Session creation failed')}`;
              console.log('[KAKAO FLOW] redirect to (session_failed):', errorDeepLink);
              return reject(res.send(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <title>로그인 실패</title>
                    <script>
                      alert('세션 생성에 실패했습니다.');
                      setTimeout(() => {
                        window.location.href = '${errorDeepLink}';
                      }, 1000);
                    </script>
                  </head>
                  <body>
                    <p>세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
                  </body>
                </html>
              `));
            }
            
            req.session.save((saveErr: any) => {
              if (saveErr) {
                console.error('[KAKAO FLOW] ❌ Session save failed:', saveErr);
                const errorDeepLink = `com.memoway.app://login?error=session_save_failed&message=${encodeURIComponent(saveErr.message || 'Session save failed')}`;
                console.log('[KAKAO FLOW] redirect to (session_save_failed):', errorDeepLink);
                return reject(res.send(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="UTF-8">
                      <title>로그인 실패</title>
                      <script>
                        alert('세션 저장에 실패했습니다.');
                        setTimeout(() => {
                          window.location.href = '${errorDeepLink}';
                        }, 1000);
                      </script>
                    </head>
                    <body>
                      <p>세션 저장에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
                    </body>
                  </html>
                `));
              }
              
              console.log('[KAKAO FLOW] ✅ Session created successfully');
              console.log('[KAKAO FLOW] ✅ Kakao login successful for user ID:', user.id);
              const sessionId = req.session?.id;
              console.log('[KAKAO FLOW] session userId=', user.id);
              console.log('[KAKAO FLOW] sessionId=', sessionId?.substring(0, 20));
              console.log('[KAKAO FLOW] platform=', platform);
              console.log('[KAKAO FLOW] ⚠️ JWT/세션에 저장된 userId:', user.id);
              
              // 플랫폼에 따라 다른 처리
              // android_webview: 앱 내 WebView에서 로그인 중이므로 딥링크 대신 직접 페이지 전환
              // 그 외: Deep Link 사용
              const appDeepLink = `com.memoway.app://login?lang=${lang}&session_ok=true`;
              const baseUrl = `${req.protocol}://${req.get('host')}`;
              
              console.log('[KAKAO FLOW] Platform:', platform);
              console.log('[KAKAO FLOW] redirect to (final):', platform === 'android_webview' ? '/' : appDeepLink);
              console.log('[KAKAO LOGIN FLOW] ⚠️  중요: 이 엔드포인트는 HTML을 반환합니다. 서버 레벨에서 추가 redirect를 하지 않습니다.');
              
              // android_webview: 앱 내 WebView에서 로그인 중이므로 딥링크 대신 직접 홈으로 리다이렉트
              // 이렇게 하면 세션 쿠키가 동일한 WebView 인스턴스에서 유지됨
              if (platform === 'android_webview') {
                console.log('[KAKAO LOGIN FLOW] ✅ android_webview 플랫폼 - 앱 내 WebView에서 직접 홈으로 리다이렉트');
                // 서버 레벨 리다이렉트로 직접 홈으로 이동 (세션 쿠키가 WebView에서 유지됨)
                return res.redirect(`/?lang=${lang}&login_success=true`);
              }
              
              // ⚠️ 무한 루프 방지: 서버 레벨에서는 절대 res.redirect를 사용하지 않음 (외부 브라우저용)
              // HTML만 반환하고 JavaScript로 딥링크 이동
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
              resolve();
            });
          }
        );
      });
    } catch (error) {
      console.error('[KAKAO FLOW] ❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDeepLink = `com.memoway.app://login?error=unexpected_error&message=${encodeURIComponent(errorMessage)}`;
      console.log('[KAKAO FLOW] redirect to (unexpected_error):', errorDeepLink);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>로그인 실패</title>
            <script>
              alert('예기치 않은 오류가 발생했습니다.');
              setTimeout(() => {
                window.location.href = '${errorDeepLink}';
              }, 1000);
            </script>
          </head>
          <body>
            <p>예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          </body>
        </html>
      `);
    }
  });

  // ============================================================================
  // [KAKAO LOGIN FLOW] 라우트 5: POST /api/kakao/android-login
  // ============================================================================
  // 목적: Android 네이티브 앱의 Kakao SDK 로그인 처리
  // 리디렉션: 없음 (JSON 응답만 반환)
  // ⚠️ 중요: 이 엔드포인트는 리다이렉트하지 않습니다. JSON만 반환합니다.
  // ============================================================================
  app.post("/api/kakao/android-login", async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log('[KAKAO FLOW]', req.method, req.originalUrl);
    console.log(`[KAKAO LOGIN FLOW] ========== POST /api/kakao/android-login ==========`);
    console.log(`[KAKAO LOGIN FLOW] Timestamp: ${timestamp}`);
    
    // [CRITICAL FIX] express.json()이 큰 숫자를 파싱할 때 정밀도 손실이 발생하므로
    // req.body.kakaoId를 믿지 않고 rawBody에서 직접 추출합니다.
    let safeKakaoId: string | undefined;
    
    // 1. rawBody에서 추출 시도
    if ((req as any).rawBody) {
      try {
        const rawBodyStr = (req as any).rawBody.toString('utf8');
        console.log('[ANDROID LOGIN] Raw body length:', rawBodyStr.length);
        
        // "kakaoId": 12345... 또는 "kakaoId": "12345..." 패턴 찾기
        const idMatch = rawBodyStr.match(/"kakaoId"\s*:\s*"?(\d+)"?/);
        if (idMatch && idMatch[1]) {
          safeKakaoId = idMatch[1];
          console.log('[ANDROID LOGIN] ✅ Extracted safeKakaoId from rawBody:', safeKakaoId);
        }
      } catch (e) {
        console.error('[ANDROID LOGIN] Failed to parse rawBody:', e);
      }
    }
    
    const { accessToken, kakaoId: unsafeKakaoId, email, nickname, profileImage } = req.body;

    // 2. rawBody 추출 실패 시 req.body 사용 (fallback)
    if (!safeKakaoId && unsafeKakaoId) {
      safeKakaoId = String(unsafeKakaoId);
      console.warn('[ANDROID LOGIN] ⚠️ Using req.body.kakaoId (potential precision loss):', safeKakaoId);
    }

    // ⚠️ CRITICAL: kakaoId는 반드시 있어야 합니다
    if (!accessToken) {
      console.error('[ANDROID LOGIN] ❌ Missing accessToken');
      return res.status(400).json({ 
        error: "Missing required field: accessToken is required"
      });
    }
    
    if (!safeKakaoId || safeKakaoId === 'undefined' || safeKakaoId === 'null' || safeKakaoId === '') {
      console.error('[ANDROID LOGIN] ❌ Missing or invalid kakaoId:', { 
        hasAccessToken: !!accessToken, 
        kakaoId: safeKakaoId,
        unsafeKakaoId: unsafeKakaoId,
        rawBody: (req as any).rawBody?.toString('utf8')?.substring(0, 200)
      });
      return res.status(400).json({ 
        error: "Missing or invalid kakaoId. 카카오 사용자 ID를 가져올 수 없습니다."
      });
    }

    try {
      // 카카오 토큰 검증 (보안 강화)
      console.log('[ANDROID LOGIN] Validating Kakao access token...');
      console.log('[ANDROID LOGIN] KakaoId (Safe):', safeKakaoId);
      
      const userInfoResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('[ANDROID LOGIN] ❌ Invalid access token:', errorText);
        return res.status(401).json({ 
          error: "Invalid access token",
          details: errorText.substring(0, 200)
        });
      }

      // 검증용 사용자 정보 가져오기
      const userInfoText = await userInfoResponse.text();
      let userInfo: KakaoUserInfo;
      try {
        userInfo = JSON.parse(userInfoText);
      } catch (e) {
        userInfo = {} as any; // 에러 무시 (토큰은 유효함)
      }
      
      console.log('[ANDROID LOGIN] ✅ Kakao user info retrieved');

      // 사용자 정보 저장
      const userUpsertStart = Date.now();
      
      console.log(`[ANDROID LOGIN] Upserting user with KakaoID: ${safeKakaoId}`);
      
      const user = await storage.upsertUser({
        id: `kakao_${safeKakaoId}`,
        email: email || userInfo.kakao_account?.email || `kakao_${safeKakaoId}@placeholder.com`,
        firstName: nickname || userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || "Kakao User",
        lastName: "",
        profileImageUrl: profileImage || userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image || null,
        provider: "kakao",
        kakaoId: safeKakaoId, // 정확한 문자열 ID 사용
      });
      const userUpsertTime = Date.now() - userUpsertStart;
      
      console.log('[KAKAO LOGIN] ✅ ========== KAKAO LOGIN SUCCESS (Android) ==========');
      console.log('[KAKAO LOGIN] kakaoId:', safeKakaoId);
      console.log('[KAKAO LOGIN] email:', user.email);
      console.log('[KAKAO LOGIN] nickname:', user.firstName);
      console.log('[KAKAO LOGIN] 내부 userId:', user.id);
      console.log('[KAKAO LOGIN] DB kakaoId:', user.kakaoId);
      console.log('[KAKAO LOGIN] provider:', user.provider);
      console.log('[KAKAO LOGIN] upsertTime:', userUpsertTime + 'ms');
      console.log('[KAKAO LOGIN] ====================================================');

      // 세션 생성
      // 세션 보안 강화: 로그인 전 세션 재생성
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          console.error("[ANDROID LOGIN] Session regeneration failed:", regenErr);
          return res.status(500).json({ error: "Failed to regenerate session" });
        }
        
        console.log(`[ANDROID LOGIN] Session regenerated. New ID: ${req.sessionID}`);

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
              console.log('[ANDROID LOGIN] ⚠️ JWT/세션에 저장된 userId:', user.id);
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
      });
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
