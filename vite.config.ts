import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './', // Capacitor에서 상대 경로 사용
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
  },
});
