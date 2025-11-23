import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React and React DOM
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // TanStack Query
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }
          
          // Framer Motion
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          
          // Google Maps
          if (id.includes('@googlemaps') || id.includes('google.maps')) {
            return 'google-maps';
          }
          
          // Capacitor (for mobile)
          if (id.includes('@capacitor')) {
            return 'capacitor';
          }
          
          // DnD Kit
          if (id.includes('@dnd-kit')) {
            return 'dnd-kit';
          }
          
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          
          // Other large dependencies
          if (id.includes('node_modules')) {
            // Check for other large libraries
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('date-fns')) {
              return 'date-fns';
            }
            if (id.includes('react-hook-form')) {
              return 'react-hook-form';
            }
            if (id.includes('zod')) {
              return 'zod';
            }
            // All other node_modules
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
