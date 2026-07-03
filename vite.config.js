import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiPlugin } from './server/apiPlugin.js'

export default defineConfig(({ mode }) => {
  // Load every env var (no VITE_ prefix filter) so the Node-side API plugin can
  // read the Spotify/Genius secrets. These stay in the plugin and are not
  // exposed to client bundles.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), apiPlugin(env)],
    // Honor the PORT env var (Vite ignores it by default) so tooling that
    // assigns a port can drive the dev server. Falls back to Vite's default.
    server: { port: process.env.PORT ? Number(process.env.PORT) : 5173 },
  }
})
