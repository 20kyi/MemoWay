/**
 * Express 서버 진입점
 * 
 * 주요 기능:
 * - 환경 변수 로드 (dotenv)
 * - Express 미들웨어 설정
 * - API 라우트 등록
 * - Vite 개발 서버 또는 정적 파일 서빙
 * - WebSocket 서버 설정
 */

import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// HTTP 요청에 rawBody 속성 추가 (일부 인증 미들웨어에서 필요)
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// JSON 요청 본문 파싱 (rawBody 저장 포함)
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

// URL 인코딩된 요청 본문 파싱
app.use(express.urlencoded({ extended: false }));

// API 요청 로깅 미들웨어 (응답 시간 및 상태 코드 기록)
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

/**
 * 서버 초기화 및 시작
 * - 모든 라우트 등록 후 Vite 설정
 * - 개발 모드: Vite HMR 서버 사용
 * - 프로덕션 모드: 정적 파일 서빙
 */
(async () => {
  // 모든 API 라우트 및 WebSocket 서버 등록
  const server = await registerRoutes(app);

  // 전역 에러 핸들러
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // 개발 모드: Vite 개발 서버 설정 (HMR 지원)
  // 프로덕션 모드: 빌드된 정적 파일 서빙
  // 중요: 모든 라우트 등록 후에 설정해야 catch-all 라우트가 다른 라우트를 방해하지 않음
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 서버 시작
  // 환경 변수 PORT 사용 (기본값: 5000)
  // 0.0.0.0으로 바인딩하여 모든 네트워크 인터페이스에서 접근 가능
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
