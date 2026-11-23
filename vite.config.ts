import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './', // works on GitHub Pages sub-paths
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: true },
  build: { chunkSizeWarningLimit: 2500 },
})
