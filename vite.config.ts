import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Inline plugin: replaces __WORKER_URL__ in any file copied from public/
  // at build time. In dev (vite serve) the file is served as-is from public/
  // so the token stays — cloudflareTransport falls back to the VITE_WORKER_URL
  // env var at runtime via a small shim (see public/party-arena/index.html).
  const workerUrlPlugin = {
    name: 'replace-worker-url',
    apply: 'build' as const,
    closeBundle() {
      const target = path.resolve(__dirname, 'dist/party-arena/index.html')
      if (!fs.existsSync(target)) return
      const workerUrl = env.VITE_WORKER_URL || ''
      const content = fs.readFileSync(target, 'utf8')
      fs.writeFileSync(target, content.replaceAll('__WORKER_URL__', workerUrl))
      console.log(`[replace-worker-url] WORKER_URL = "${workerUrl}"`)
    },
  }

  return {
    plugins: [react(), workerUrlPlugin],
    base: '/',
  }
})

