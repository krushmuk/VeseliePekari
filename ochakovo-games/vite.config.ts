import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Относительные пути: сборка работает из любой папки — на хостинге VK,
  // на GitHub Pages или в подкаталоге своего сервера.
  base: './',
  // Phaser (~1.4 МБ, 365 КБ gzip) живёт в чанке игры и грузится только при её запуске
  build: { chunkSizeWarningLimit: 1600 },
  server: {
    host: true, // доступ с телефона в той же Wi-Fi сети
  },
})
