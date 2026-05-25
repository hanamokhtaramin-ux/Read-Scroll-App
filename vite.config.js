import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Read-Scroll-App/',
  worker: {
    format: 'es',
  },
})
