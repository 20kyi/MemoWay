import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { config } from "dotenv";

// .env 파일 로드
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './', // Capacitor에서 상대 경로 사용
  // Vite는 기본적으로 VITE_* 환경 변수를 자동으로 import.meta.env에 주입합니다
  // 빌드 시 환경 변수가 확실히 포함되도록 define에 명시적으로 추가
  define: {
    'import.meta.env.VITE_REPLIT_URL': JSON.stringify(process.env.VITE_REPLIT_URL || ''),
    'import.meta.env.VITE_KAKAO_API_KEY': JSON.stringify(process.env.VITE_KAKAO_API_KEY || ''),
    'import.meta.env.VITE_KAKAO_NATIVE_APP_KEY': JSON.stringify(process.env.VITE_KAKAO_NATIVE_APP_KEY || ''),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || ''),
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    minify: 'esbuild', // Use esbuild for faster minification
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    cssCodeSplit: true, // Enable CSS code splitting
    reportCompressedSize: false, // Disable compressed size reporting for faster builds
    // manualChunks 제거: Capacitor WebView는 청크 로딩 순서를 보장하지 않음
    // 기본 Vite 청크 분리 로직이 자동으로 의존성 순서를 보장함
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5000,
      clientPort: 5000,
    },
  },
});
