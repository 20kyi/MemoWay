import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { performanceMonitor, startPerformanceMonitoring } from "./utils/performance-monitor";
import { getSession } from "./replitAuth";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// ★ 중요: 미들웨어 순서
// 0. trust proxy 설정 (세션 미들웨어보다 먼저 설정해야 함)
app.set("trust proxy", 1);

// 1. cookie-parser (쿠키 파싱)
app.use(cookieParser());

// 2. CORS 디버깅 로그 미들웨어 (응답 헤더 추적)
app.use((req, res, next) => {
  // CORS 응답 헤더를 추적하기 위해 setHeader 래핑
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name: string, value: string | string[] | number) {
    originalSetHeader(name, value);
    if (name.toLowerCase() === "access-control-allow-origin") {
      console.log(`[CORS] Access-Control-Allow-Origin: ${value}`);
    }
    if (name.toLowerCase() === "access-control-allow-credentials") {
      console.log(`[CORS] Access-Control-Allow-Credentials: ${value}`);
    }
  };
  
  // 응답 완료 후 최종 CORS 헤더 확인
  res.on("finish", () => {
    const corsOrigin = res.getHeader("access-control-allow-origin");
    const corsCredentials = res.getHeader("access-control-allow-credentials");
    if (corsOrigin || corsCredentials) {
      console.log(`[CORS] Response headers - Origin: ${corsOrigin || 'not set'}, Credentials: ${corsCredentials || 'not set'}`);
    }
  });
  
  next();
});

// 3. CORS 설정 - 허용할 origin 목록 (Android WebView 및 모든 클라이언트 지원)
const allowedOrigins = [
  "https://memoway-production.up.railway.app", // Railway 프로덕션 서버
  "https://memoway.replit.app",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost",
  "https://localhost", // Android WebView Origin (Capacitor)
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost:8080",
  "http://localhost:3000",
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
    // origin이 없을 때 (같은 origin 요청, Postman 등) 허용
    if (!origin) {
      console.log(`[CORS] Request with no origin (same-origin or mobile app) - ALLOWED`);
      callback(null, true);
      return;
    }
    
    // 허용 목록에 있는 origin은 명시적으로 허용 (origin 값 반환)
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Request origin: ${origin} - ALLOWED (in allowed list)`);
      callback(null, origin); // 실제 origin 값을 반환하여 Access-Control-Allow-Origin에 설정
      return;
    }
    
    // 개발 환경에서는 모든 origin 허용 (디버깅용)
    if (process.env.NODE_ENV === "development") {
      console.log(`[CORS] Request origin: ${origin} - ALLOWED (development mode)`);
      callback(null, origin);
      return;
    }
    
    // 프로덕션 환경에서도 모든 origin 허용 (안드로이드 WebView 등 대응)
    console.log(`[CORS] Request origin: ${origin} - ALLOWED (all origins allowed)`);
    callback(null, origin); // 실제 origin 값을 반환하여 Access-Control-Allow-Origin에 설정
  },
  credentials: true, // 쿠키 포함 허용
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
  exposedHeaders: ["Content-Type", "Set-Cookie"], // Set-Cookie 헤더 노출
};

app.use(cors(corsOptions));

// 4. OPTIONS preflight 요청 전역 처리
app.options("*", cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
    if (!origin) {
      console.log(`[CORS] OPTIONS preflight request - no origin - ALLOWED`);
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] OPTIONS preflight request from origin: ${origin} - ALLOWED (in allowed list)`);
      callback(null, origin);
      return;
    }
    
    // 모든 origin 허용
    console.log(`[CORS] OPTIONS preflight request from origin: ${origin} - ALLOWED`);
    callback(null, origin);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
}));

// 5. 세션 미들웨어 (라우터보다 먼저 설정되어야 함)
app.use(getSession());

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
      // 성능 모니터에 로그 추가
      performanceMonitor.log(req.method, path, duration, res.statusCode);
      
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
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // 성능 모니터링 시작 (개발 모드에서만)
    if (app.get("env") === "development") {
      startPerformanceMonitoring(10); // 10분마다 리포트
      log("성능 모니터링이 활성화되었습니다. 10분마다 리포트가 출력됩니다.");
    }
    
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
