import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: './',
        name: '咒术回战 · 抽选人生',
        short_name: '抽选人生',
        description: '数十轮因果彼此干涉，转动轮盘，抽选你在咒术世界的一生。',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#141018',
        theme_color: '#141018',
        icons: [
          { src: './pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: './pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: './pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: './pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{html,js,css,png,svg,webmanifest}'],
        // Manifest 及其中声明的图标会由 PWA 插件自动加入预缓存。
        globIgnores: ['**/manifest.webmanifest', '**/pwa-*.png'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
  },
})
