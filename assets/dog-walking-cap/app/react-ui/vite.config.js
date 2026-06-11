import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Stub for optional @zxing/library (barcode scanner in @ui5/webcomponents-fiori).
// Not installed; prevents Vite crashing on missing import if WC4R is added later.
const stubZxing = {
  name: 'stub-zxing',
  resolveId(id) { if (id.startsWith('@zxing/')) return '\0virtual:zxing' },
  load(id)      { if (id === '\0virtual:zxing') return 'export default {}' },
}

export default defineConfig({
  plugins: [react(), stubZxing],

  // MANDATORY: relative base - assets resolve correctly under /react-ui/ sub-path served by cds watch
  base: './',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // MANDATORY: prevents Vite dep-optimisation timeout in JS preview health-check
  optimizeDeps: {
    exclude: [
      '@ui5/webcomponents-react',
      '@ui5/webcomponents-icons',
      '@ui5/webcomponents',
      '@ui5/webcomponents-fiori',
      '@ui5/webcomponents-base',
    ],
  },

  resolve: { preserveSymlinks: true },

  server: {
    // HMR disabled - UI5 Web Components have known HMR issues
    hmr: false,
    // Proxy only active in standalone Vite mode; inactive in cds watch middleware mode
    proxy: {
      '/api': 'http://localhost:4004',
    },
  },
})
