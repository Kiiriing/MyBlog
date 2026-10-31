import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'

// Vue plugin is kept until the React migration is finished; it is removed at cutover.
export default defineConfig({
  plugins: [react(), vue()],
  server: {
    port: 5173,
    host: true
  }
})
