import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',  // Use IPv4 explicitly — Node 18+ resolves 'localhost' as ::1 (IPv6) which causes ECONNREFUSED
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

