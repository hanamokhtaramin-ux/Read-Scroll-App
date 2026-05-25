import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// './' works for both Capacitor (file://) and GitHub Pages (relative URL)
export default defineConfig({
  plugins: [react()],
  base: './',
  worker: {
    format: 'es',
  },
})
