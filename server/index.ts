import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
// CORS 설정: 네이티브 앱 및 웹 브라우저 지원
app.use(cors({
  origin: (origin, callback) => {
    // origin이 없으면 (같은 도메인 요청 또는 네이티브 앱) 허용
    if (!origin) {
      return callback(null, true);
    }
    
    // 네이티브 앱 (capacitor://, android-app:// 등) 허용
    if (origin.startsWith('capacitor://') || 
        origin.startsWith('android-app://') ||
        origin.startsWith('ionic://') ||
        origin.startsWith('file://')) {
      return callback(null, true);
    }
    
    // 웹 브라우저: Replit 도메인 및 localhost 허용
    const allowedOrigins = [
      'https://memoway.replit.app',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 개발 중에는 모두 허용 (프로덕션에서는 제한 필요)
    // Replit 환경에서는 모든 origin 허용 (네이티브 앱 호환성)
    callback(null, true);
  },
  credentials: true, // 쿠키 전송 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
}));

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    // reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Auto-open browser in development mode
    if (app.get("env") === "development") {
      try {
        const { default: open } = await import("open");
        const url = `http://localhost:${port}`;
        log(`Opening browser at ${url}`);
        await open(url);
      } catch (error) {
        // Silently fail if browser can't be opened
        log(`Failed to open browser automatically: ${error}`);
      }
    }
  });
})();
