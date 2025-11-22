import type { Express } from "express";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import { storage } from "./storage";

export function setupGoogleAuth(app: Express) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  
  if (!clientId || !clientSecret) {
    console.warn("Google OAuth credentials not configured. Google login will be unavailable.");
    return;
  }

  // Use Replit dev domain if available, otherwise use HOST env var or default
  // Note: For Google OAuth, callbackURL must match the one registered in Google Cloud Console
  const callbackURL = replitDevDomain 
    ? `https://${replitDevDomain}/api/google/callback`
    : `${process.env.HOST ? `http://${process.env.HOST}` : 'http://localhost:5000'}/api/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL,
        passReqToCallback: true,
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
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
    (req, res, next) => {
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
      console.log('Google callback received');
      passport.authenticate("google", {
        failureRedirect: "/",
        failureMessage: true,
      })(req, res, next);
    },
    (req, res) => {
      console.log('Google authentication successful');
      // Retrieve language from session
      const lang = (req.session as any).loginLang || 'ko';
      delete (req.session as any).loginLang;
      
      // Redirect to home with language parameter
      res.redirect(`/?lang=${lang}`);
    }
  );
}
