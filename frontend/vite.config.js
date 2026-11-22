import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        // <emoji-picker> es un web component (emoji-picker-element), no un componente Vue
        compilerOptions: { isCustomElement: (tag) => tag === 'emoji-picker' }
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090',
        changeOrigin: true,
        ws: true
      }
    }
  }
});
