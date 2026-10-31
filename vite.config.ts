import { defineConfig } from 'vite'

const BASE = '/playground/'

export default defineConfig({
  base: BASE,
  build: { outDir: `dist${BASE}`, emptyOutDir: true },
  server: {
    host: true,
    proxy: { [`${BASE}api`]: { target: 'http://localhost:8790', ws: true } },
  },
})
