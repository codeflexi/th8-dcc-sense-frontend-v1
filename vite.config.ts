// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  // ❌ ของเดิม (ผิด): อาจจะเป็น '/' หรือ '/th8-procurement-ui/'
  // ✅ ของใหม่ (แก้ให้ตรงชื่อ Repo):
  base: '/th8-dcc-frontend-v1/', 
  
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})