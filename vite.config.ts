import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { config } from "dotenv";
import { existsSync } from "fs";

// .env 파일 로드 (빌드 시점에 확실히 로드되도록)
const envPath = path.resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const result = config({ path: envPath });
  if (result.error) {
    console.warn('⚠️  .env 파일 로드 중 오류:', result.error);
  } else {
    console.log('✅ .env 파일 로드 완료');
  }
} else {
  console.warn('⚠️  .env 파일을 찾을 수 없습니다. 시스템 환경 변수를 사용합니다.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './', // Capacitor에서 상대 경로 사용
  // Vite는 기본적으로 VITE_* 환경 변수를 자동으로 import.meta.env에 주입합니다
  // 빌드 시 환경 변수가 확실히 포함되도록 define에 명시적으로 추가
  // 중요: 빌드 시점에 환경 변수가 없으면 빈 문자열로 설정되므로, 반드시 .env 파일이 있어야 합니다
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
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: false, // dist 폴더에 server 빌드 결과물도 있으므로 false로 설정
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    minify: false, // Disable minification for debugging
    sourcemap: true, // Enable sourcemaps for debugging
    cssCodeSplit: true, // Enable CSS code splitting
    reportCompressedSize: false, // Disable compressed size reporting for faster builds
    // manualChunks 제거: Capacitor WebView는 청크 로딩 순서를 보장하지 않음
    // 기본 Vite 청크 분리 로직이 자동으로 의존성 순서를 보장함
    commonjsOptions: {
      exclude: ['@capacitor-community/background-geolocation'],
    },
    rollupOptions: {
      // Capacitor 플러그인은 external로 처리 (런타임에 네이티브 코드로 로드됨)
      external: [
        '@capacitor-community/keep-awake',
        '@capacitor-community/background-geolocation',
      ],
      onwarn(warning, warn) {
        // Capacitor 플러그인 동적 import 경고는 무시 (런타임에 로드됨)
        if (warning.code === 'UNRESOLVED_IMPORT' && 
            warning.id && 
            (warning.id.includes('@team-lepisode/capacitor-kakao-login') ||
             warning.id.includes('@capacitor/') ||
             warning.id.includes('@capacitor-community/'))) {
          return; // 경고 무시
        }
        // background-geolocation 관련 경고도 무시
        if (warning.code === 'UNRESOLVED_IMPORT' && 
            warning.id && 
            warning.id.includes('@capacitor-community/background-geolocation')) {
          return; // 경고 무시
        }
        // 환경 변수 관련 경고는 무시하지 않음
        warn(warning);
      },
    },
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
    // 성능 최적화: 파일 시스템 감시 최적화
    watch: {
      usePolling: false,
      interval: 100,
    },
  },
  // 성능 최적화: 의존성 사전 번들링
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: [
      '@capacitor/core', 
      '@capacitor-community/keep-awake',
      '@capacitor-community/background-geolocation',
    ],
  },
});
