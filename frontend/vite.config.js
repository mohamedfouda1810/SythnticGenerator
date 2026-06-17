import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react')) {
            return 'react'
          }
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'query'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
