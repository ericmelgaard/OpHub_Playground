import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from the custom domain root: https://ophub.playground.wanddigital.com/
  base: '/',
  // Keep the dep cache out of OneDrive, which locks files and causes EPERM on rmdir
  cacheDir: path.join(os.tmpdir(), 'vite-converge-updates'),
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});