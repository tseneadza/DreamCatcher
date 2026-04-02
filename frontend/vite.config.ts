import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const hubPort = process.env.PORT
const devPort = Number(hubPort ?? '5173')

export default defineConfig({
  plugins: [react()],
  server: {
    // Hub injects `PORT=<web.port>` and probes 127.0.0.1 (IPv4). Binding only ::1
    // from "localhost" makes the Hub think the app never came up.
    host: '0.0.0.0',
    port: devPort,
    // When PORT is set (Hub launch), do not silently move to the next port or the
    // Hub will keep waiting on the declared app.json port.
    strictPort: Boolean(hubPort),
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5111',
        changeOrigin: true,
      },
    },
  },
})
