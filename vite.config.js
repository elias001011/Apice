import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const appVersion = pkg.version.replace(/\.0$/, '')

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '::',
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
  },
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})
