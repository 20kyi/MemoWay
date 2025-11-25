import type { Express } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import { storage } from "./storage";

export function setupGoogleAuth(app: Express) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // Support multiple hosting options:
  // - APP_DOMAIN: Custom domain (e.g., https://memoway.replit.app, yourdomain.com)
  // - REPLIT_DEV_DOMAIN: Replit dev domain
  // - REPL_SLUG: Replit app name (auto-detect published domain: https://{REPL_SLUG}.replit.app)
  // - HOST: Fallback host
  
  // Replit published domain auto-detection
  let detectedReplitDomain: string | undefined;
  if (process.env.REPL_SLUG && !process.env.APP_DOMAIN && !process.env.REPLIT_DEV_DOMAIN) {
    detectedReplitDomain = `https://${process.env.REPL_SLUG}.replit.app`;
  }
  
  // 로컬 개발 환경 감지 (카카오와 동일한 로직)
  const isLocalDev = process.env.NODE_ENV === 'development' && 
                     !process.env.APP_DOMAIN && 
                     !process.env.REPLIT_DEV_DOMAIN &&
                     !detectedReplitDomain;
  
  const appDomain = process.env.APP_DOMAIN || process.env.REPLIT_DEV_DOMAIN || detectedReplitDomain;
  const useHttps = process.env.APP_DOMAIN ? (process.env.APP_USE_HTTPS !== 'false') : 
                    (!!process.env.REPLIT_DEV_DOMAIN || !!detectedReplitDomain);
  
  if (!clientId || !clientSecret) {
    console.warn("Google OAuth credentials not configured. Google login will be unavailable.");
    return;
  }

  // Determine callback URL
  // Note: For Google OAuth, callbackURL must match the one registered in Google Cloud Console
  // For local development, always use localhost:5000 to ensure consistency with Google Cloud Console
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
    // Fallback to Replit production domain if no domain is configured
    host = resolvedHost || process.env.HOST || 'memoway.replit.app';
    // Use HTTPS for Replit production domain
    protocol = useHttps || host === 'memoway.replit.app' ? 'https' : 'http';
  }
  
  const callbackURL = `${protocol}://${host}/api/google/callback`;
  
  console.log('=== Google OAuth Configuration ===');
  console.log('GOOGLE_CLIENT_ID:', clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET');
  console.log('GOOGLE_CLIENT_SECRET:', clientSecret ? 'SET' : 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('isLocalDev:', isLocalDev);
  console.log('APP_DOMAIN:', appDomain || 'NOT SET');
  console.log('REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN || 'NOT SET');
  console.log('REPL_SLUG:', process.env.REPL_SLUG || 'NOT SET');
  console.log('Detected Replit Domain:', detectedReplitDomain || 'NOT SET');
  console.log('Callback URL:', callbackURL);
  console.log('useHttps:', useHttps);
  console.log('===================================');

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL,
        passReqToCallback: true,
      },
      async (_req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails?.[0]?.value || `google_${profile.id}@placeholder.com`;
          const firstName = profile.name?.givenName || "";
          const lastName = profile.name?.familyName || "";
          const profileImage = profile.photos?.[0]?.value;

          // Upsert user with Google data
          const user = await storage.upsertUser({
            id: `google_${profile.id}`,
            email,
            firstName,
            lastName,
            profileImageUrl: profileImage || null,
            provider: "google",
            googleId: profile.id,
          });

          // Create user session object
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

          console.log(`Google login successful for user ID: ${user.id}`);
          done(null, userSession);
        } catch (error) {
          console.error("Google OAuth error:", error);
          done(error);
        }
      }
    )
  );

  // Google login initiation
  app.get(
    "/api/google/login",
    (req, _res, next) => {
      // Store language in session
      const lang = req.query.lang || 'ko';
      (req.session as any).loginLang = lang;
      
      // Save session before redirecting to Google
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
        }
        next();
      });
    },
    passport.authenticate("google", {
      scope: ["profile", "email"],
      accessType: 'offline',
      prompt: 'consent',
    })
  );

  // Google OAuth callback
  app.get(
    "/api/google/callback",
    (req, res, next) => {
      console.log('=== Google OAuth Callback Received ===');
      console.log('Request URL:', req.url);
      console.log('Request Host:', req.get('host'));
      console.log('Request Protocol:', req.protocol);
      console.log('Query params:', { code: req.query.code ? 'present' : 'missing', error: req.query.error || 'none' });
      
      if (req.query.error) {
        console.error('Google OAuth error:', req.query.error);
        console.error('Error description:', req.query.error_description || 'No description');
        return res.redirect(`/?error=oauth_failed&provider=google&message=${encodeURIComponent(req.query.error_description as string || req.query.error as string)}`);
      }
      
      passport.authenticate("google", {
        failureRedirect: "/?error=oauth_failed&provider=google",
        failureMessage: true,
      })(req, res, next);
    },
    (req, res) => {
      console.log('Google authentication successful');
      // Retrieve language from session
      const lang = (req.session as any).loginLang || 'ko';
      delete (req.session as any).loginLang;
      
      // Check if request is from Android app
      const userAgent = req.get('user-agent') || '';
      const isAndroidApp = userAgent.includes('wv') || // WebView
                           (userAgent.includes('Android') && !userAgent.includes('Chrome'));
      
      if (isAndroidApp) {
        // Redirect to intermediate page that will redirect to app via Deep Link
        res.redirect(`/api/google/redirect?lang=${lang}`);
      } else {
        // Redirect to web with language parameter
        res.redirect(`/?lang=${lang}`);
      }
    }
  );

  // Intermediate redirect page for Android app (Google OAuth)
  app.get("/api/google/redirect", (req, res) => {
    const lang = req.query.lang || 'ko';
    const appDeepLink = `com.memoway.app://login?lang=${lang}`;
    
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
            // Try to redirect to app immediately
            try {
              window.location.href = ${JSON.stringify(appDeepLink)};
            } catch (e) {
              console.error('Failed to redirect:', e);
            }
            
            // Fallback: if not redirected after 2 seconds, show manual link
            setTimeout(() => {
              const link = document.querySelector('.fallback-link');
              if (link) {
                link.style.display = 'block';
              }
            }, 2000);
          </script>
        </body>
      </html>
    `);
  });
}
