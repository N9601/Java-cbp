import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Dev: the UI runs on Vite and proxies /api to Spring Boot on 8080.
// Build: output goes into the backend's static folder so one jar serves both.
export default defineConfig({
  root,
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: false },
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../backend/src/main/resources/static', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
});
