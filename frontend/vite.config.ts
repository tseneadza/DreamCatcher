import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Hub injects `PORT=<web.port>` via environment variables when launching apps.
    // Use it so the Vite server listens on the Hub-discovered web port.
    port: Number(process.env.PORT ?? '5173'),
    proxy: {
      '/api': {
        target: 'http://localhost:5111',
        changeOrigin: true,
      },
    },
  },
})
