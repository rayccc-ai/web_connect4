import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 纯静态产物，便于部署到不同域名以复现四种 verify tag。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
