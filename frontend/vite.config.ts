import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chat": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
      "/ai-tutor": "http://127.0.0.1:8000",
      "/learning-path": "http://127.0.0.1:8000",
      "/quiz": "http://127.0.0.1:8000",
      "/topics": "http://127.0.0.1:8000",
    },
  },
})
