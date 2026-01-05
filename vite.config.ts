import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      // Deny access to build directories to prevent esbuild from scanning them
      deny: [
        '**/android/build/**',
        '**/android/app/build/**',
        '**/ios/build/**',
      ],
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      // Explicitly set input to only use root index.html
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  // Exclude build directories from dependency optimization
  optimizeDeps: {
    entries: [
      // Only scan the root index.html
      path.resolve(__dirname, 'index.html'),
    ],
  },
}));
