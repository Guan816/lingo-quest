import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 使用相对路径，这样打包产物既能放 GitHub Pages 子目录，
// 也能被 Capacitor 以 file:// 协议直接加载。
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2018',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // 开发时把前端 /api 请求转发到本地后端（8787），
      // 手机连同一 WiFi 访问 vite 端口时也能自动转发，无需额外配置。
      '/api': 'http://localhost:8787',
    },
  },
});
