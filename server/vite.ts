import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // dist/public 경로로 수정 (capacitor.config.ts의 webDir과 일치)
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // 정적 파일 서빙 (assets, favicon 등)
  // 파일이 존재하지 않으면 자동으로 다음 미들웨어로 넘어감
  app.use(express.static(distPath, {
    index: false, // index.html 자동 서빙 비활성화 (아래에서 처리)
    fallthrough: true, // 파일이 없으면 다음 미들웨어로 넘어감
  }));

  // SPA fallback: API 경로와 정적 파일 요청 제외
  app.use("*", (req, res) => {
    // API 경로는 404 반환
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    
    // 정적 파일 경로 또는 확장자가 있는 요청은 404 반환
    // (express.static에서 처리되지 않았다는 것은 파일이 없다는 의미)
    if (req.path.startsWith("/assets/") || 
        req.path.startsWith("/_vite/") ||
        path.extname(req.path)) {
      return res.status(404).send("File not found");
    }
    
    // 그 외의 경우 (SPA 라우트 요청) index.html 반환
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
