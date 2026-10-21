// The phone's build (T305, T307): the computers' renderer and the data store of `src/main/datastore/` in one web app for
// Capacitor (`out/mobile` → `ios/`), Node's modules replaced by the phone's (`scripts/mobile-aliases.mjs`).
// `--mode e2e`: the tests' fake OneDrive on 127.0.0.1 allowed by the CSP.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mobileNodeAliases } from './scripts/mobile-aliases.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const version = (JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string }).version

/**
 * The app's own files only; the network to Microsoft (Graph, the sign-in) and the files' download links of OneDrive
 * (their hosts change – any https).
 */
function csp(mode: string): string {
  const local = mode === 'e2e' ? ' http://127.0.0.1:* http://localhost:*' : ''
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' https:${local}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ')
}

function cspPlugin(mode: string): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html: string) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp(mode)}" />`)
    }
  }
}

export default defineConfig(({ mode }) => ({
  root: resolve(root, 'src/mobile'),
  base: './',
  resolve: {
    alias: [...mobileNodeAliases(root), { find: '@shared', replacement: resolve(root, 'src/shared') }, { find: '@renderer', replacement: resolve(root, 'src/renderer') }]
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    // The data store's checks of the computers: the phone's file system is case-insensitive like OneDrive's.
    'process.platform': JSON.stringify('ios'),
    'process.env.FI_VERIFY_VIEWS': 'undefined'
  },
  plugins: [react(), tailwindcss(), cspPlugin(mode)],
  build: {
    outDir: resolve(root, 'out/mobile'),
    emptyOutDir: true,
    // iOS 16 and newer (Object.hasOwn, Array.prototype.at and structuredClone are in its WebKit).
    target: 'safari16',
    chunkSizeWarningLimit: 4000,
    minify: 'esbuild'
  },
  server: { port: 5174 }
}))
