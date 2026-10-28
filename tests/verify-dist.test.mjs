// @vitest-environment node
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { verifyDist } from '../scripts/verify-dist.mjs'

const iconNames = [
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-192x192.png',
  'pwa-maskable-512x512.png',
]
const publicDir = fileURLToPath(new URL('../public/', import.meta.url))

function serviceWorker(entries) {
  const literal = `[${entries
    .map((entry) => `{url:${JSON.stringify(entry.url)},revision:${JSON.stringify(entry.revision)}}`)
    .join(',')}]`
  return `self.skipWaiting();self.clientsClaim();precacheAndRoute(${literal},{});new NavigationRoute(createHandlerBoundToURL("index.html"));`
}

function writeValidDist(distDir) {
  const manifest = {
    id: './',
    start_url: './',
    scope: './',
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
  }
  writeFileSync(path.join(distDir, 'manifest.webmanifest'), JSON.stringify(manifest))
  writeFileSync(path.join(distDir, 'index.html'), '<html lang="zh-CN"></html>')
  writeFileSync(
    path.join(distDir, 'jujutsu-life-wheel.html'),
    '<meta http-equiv="refresh" content="0; url=./"><a href="./">新版</a><script>const target = new URL(\'./\', window.location.href);window.location.replace(target.href)</script>',
  )
  for (const name of iconNames) {
    copyFileSync(path.join(publicDir, name), path.join(distDir, name))
  }
  const precache = [
    'index.html',
    'jujutsu-life-wheel.html',
    'manifest.webmanifest',
    ...iconNames,
  ].map((url) => ({ url, revision: 'test' }))
  writeFileSync(path.join(distDir, 'sw.js'), serviceWorker(precache))
}

describe('生产产物校验', () => {
  let distDir

  beforeEach(() => {
    distDir = mkdtempSync(path.join(tmpdir(), 'jjk-dist-'))
    writeValidDist(distDir)
  })

  afterEach(() => {
    rmSync(distDir, { recursive: true, force: true })
  })

  it('接受符合相对部署与 PWA 约束的产物', () => {
    expect(verifyDist(distDir)).toEqual({ icons: 4, precacheEntries: 7 })
  })

  it('拒绝会破坏 GitHub Pages 子目录部署的绝对 Manifest 路径', () => {
    const manifestPath = path.join(distDir, 'manifest.webmanifest')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.start_url = '/jujutsu-kaisen-life-wheel/'
    writeFileSync(manifestPath, JSON.stringify(manifest))

    expect(() => verifyDist(distDir)).toThrowError(/start_url.*相对/)
  })

  it('拒绝尺寸与 Manifest 声明不一致的图标', () => {
    copyFileSync(path.join(publicDir, 'pwa-192x192.png'), path.join(distDir, 'pwa-512x512.png'))

    expect(() => verifyDist(distDir)).toThrowError(/pwa-512x512\.png.*192x192.*512x512/)
  })

  it('拒绝缺少自动更新或导航回退的 Service Worker', () => {
    writeFileSync(path.join(distDir, 'sw.js'), 'precacheAndRoute([],{})')

    expect(() => verifyDist(distDir)).toThrowError(/skipWaiting/)
  })

  it('拒绝规范化后重复的预缓存 URL', () => {
    const entries = [
      'index.html',
      './index.html',
      'jujutsu-life-wheel.html',
      'manifest.webmanifest',
      ...iconNames,
    ].map((url) => ({ url, revision: 'test' }))
    writeFileSync(path.join(distDir, 'sw.js'), serviceWorker(entries))

    expect(() => verifyDist(distDir)).toThrowError(/重复.*index\.html/)
  })

  it('拒绝把模型 API 或缺失文件加入预缓存', () => {
    const entries = [
      'index.html',
      'jujutsu-life-wheel.html',
      'manifest.webmanifest',
      ...iconNames,
      'https://api.example.com/chat/completions',
    ].map((url) => ({ url, revision: 'test' }))
    writeFileSync(path.join(distDir, 'sw.js'), serviceWorker(entries))

    expect(() => verifyDist(distDir)).toThrowError(/同源相对路径/)
  })

  it.each([' https://evil.example/index.html', '%2e%2e/index.html'])(
    '拒绝利用 URL 解析绕过同源相对路径检查：%s',
    (url) => {
      const entries = [url, 'jujutsu-life-wheel.html', 'manifest.webmanifest', ...iconNames].map(
        (entryUrl) => ({ url: entryUrl, revision: 'test' }),
      )
      writeFileSync(path.join(distDir, 'sw.js'), serviceWorker(entries))

      expect(() => verifyDist(distDir)).toThrowError(/同源相对路径/)
    },
  )

  it('拒绝旧地址的 meta refresh 跳转到错误目标', () => {
    writeFileSync(
      path.join(distDir, 'jujutsu-life-wheel.html'),
      '<meta http-equiv="refresh" content="0; url=https://evil.example/"><p>url=./</p><a href="./">新版</a><script>const target = new URL(\'./\', window.location.href);window.location.replace(target.href)</script>',
    )

    expect(() => verifyDist(distDir)).toThrowError(/旧地址.*跳转/)
  })

  it('拒绝旧地址的脚本跳转到错误目标', () => {
    writeFileSync(
      path.join(distDir, 'jujutsu-life-wheel.html'),
      '<meta http-equiv="refresh" content="0; url=./"><a href="./">新版</a><script>const target = new URL(\'https://evil.example/\', window.location.href);window.location.replace(target.href)</script>',
    )

    expect(() => verifyDist(distDir)).toThrowError(/旧地址.*跳转/)
  })

  it('拒绝旧地址退化成非跳转页面', () => {
    writeFileSync(path.join(distDir, 'jujutsu-life-wheel.html'), '<html>完整旧应用</html>')

    expect(() => verifyDist(distDir)).toThrowError(/旧地址.*跳转/)
  })
})
