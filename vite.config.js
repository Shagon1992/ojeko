import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist'
  },
  // TAMBAHKAN INI untuk Leaflet
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet']
  }
})
