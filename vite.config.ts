import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true,
    /* 忽略本地临时产物（截图脚本、headless Chrome profile），避免 Windows 下文件锁触发 EBUSY 监听报错 */
    watch: {
      ignored: ['**/.tmp-*/**', '**/.tmp-*']
    }
  }
})
