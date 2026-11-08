import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    open: false,
    allowedHosts: true, // ✅ ALLOW SEMUA HOST
  },
  // 🚀 OPTIMASI BUILD DITAMBAHKAN DI SINI
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-maps': ['leaflet', 'react-leaflet'], 
          'vendor-excel': ['xlsx', 'xlsx-js-style', 'file-saver'],
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Hapus console.log agar file lebih kecil
        drop_debugger: true,
      },
    },
  }
});