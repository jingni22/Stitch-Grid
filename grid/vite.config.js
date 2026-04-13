import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Stitch-Grid',   // ← replace with your actual repo name
  assetsInclude: ['**/*.svg'],
})