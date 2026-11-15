import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O proxy mantém a SPA e a API na mesma origem no navegador, então não é
// preciso habilitar CORS no Django nem adicionar django-cors-headers.
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/webhooks': { target: API_TARGET, changeOrigin: true },
    },
  },
})
