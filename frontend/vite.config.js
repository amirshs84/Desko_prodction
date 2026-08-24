import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** APK دانلود وب نباید داخل بیلد Capacitor برود؛ وگرنه حجم اپ هر بار جمع می‌شود. */
function omitApkOnMobile(mode) {
  return {
    name: 'omit-apk-on-mobile',
    apply: 'build',
    closeBundle: {
      order: 'post',
      sequential: true,
      handler() {
        if (mode !== 'mobile') return
        const dist = resolve('dist')
        if (!existsSync(dist)) return
        for (const name of readdirSync(dist)) {
          if (name.toLowerCase().endsWith('.apk')) {
            rmSync(join(dist, name), { force: true })
          }
        }
      },
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  plugins: [
    react(),
    omitApkOnMobile(mode),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        cacheId: 'desko-exam-take-v2',
        globPatterns: ['**/' + '*.{js,css,html,ico,png,svg}'],
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'Desko',
        short_name: 'Desko',
        description: 'اپلیکیشن مدیریت زمان مطالعه و تمرکز',
        theme_color: '#064e3b',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
}))

