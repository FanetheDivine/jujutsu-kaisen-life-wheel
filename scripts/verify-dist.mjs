// 校验生产 PWA 产物：相对部署路径、Manifest 图标、Workbox 预缓存与旧地址跳转。
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const expectedIcons = [
  { name: 'pwa-192x192.png', size: '192x192', purpose: 'any' },
  { name: 'pwa-512x512.png', size: '512x512', purpose: 'any' },
  { name: 'pwa-maskable-192x192.png', size: '192x192', purpose: 'maskable' },
  { name: 'pwa-maskable-512x512.png', size: '512x512', purpose: 'maskable' },
]

function readRequired(distDir, name, errors) {
  try {
    return readFileSync(path.join(distDir, name))
  } catch {
    errors.push(`缺少生产产物：${name}`)
    return null
  }
}

function pngSize(buffer, name, errors) {
  const signature = '89504e470d0a1a0a'
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== signature ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    errors.push(`图标不是有效 PNG：${name}`)
    return null
  }
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`
}

function verifyManifest(distDir, errors) {
  const source = readRequired(distDir, 'manifest.webmanifest', errors)
  if (!source) return

  let manifest
  try {
    manifest = JSON.parse(source.toString('utf8'))
  } catch {
    errors.push('Manifest 不是有效 JSON')
    return
  }

  for (const field of ['id', 'start_url', 'scope']) {
    if (manifest[field] !== './') {
      errors.push(`Manifest ${field} 必须保持相对路径 "./"`)
    }
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : []
  for (const expected of expectedIcons) {
    const icon = icons.find((item) => item.src === `./${expected.name}`)
    if (!icon) {
      errors.push(`Manifest 缺少图标：${expected.name}`)
    } else {
      if (icon.type !== 'image/png') errors.push(`${expected.name} 的 MIME 必须是 image/png`)
      if (!String(icon.sizes).split(/\s+/).includes(expected.size)) {
        errors.push(`${expected.name} 的 Manifest 尺寸必须包含 ${expected.size}`)
      }
      if (!String(icon.purpose).split(/\s+/).includes(expected.purpose)) {
        errors.push(`${expected.name} 的 purpose 必须包含 ${expected.purpose}`)
      }
    }

    const file = readRequired(distDir, expected.name, errors)
    if (!file) continue
    const actualSize = pngSize(file, expected.name, errors)
    if (actualSize && actualSize !== expected.size) {
      errors.push(`${expected.name} 实际尺寸为 ${actualSize}，应为 ${expected.size}`)
    }
  }
}

function normalizePrecacheUrl(rawUrl, errors) {
  let decodedPathname
  try {
    decodedPathname = rawUrl
      .split(/[?#]/, 1)[0]
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/')
  } catch {
    errors.push(`预缓存 URL 必须是同源相对路径：${rawUrl}`)
    return null
  }

  const hasUnsafeCharacters =
    /\s/.test(rawUrl) ||
    rawUrl.includes('\\') ||
    [...rawUrl].some((character) => {
      const code = character.charCodeAt(0)
      return code <= 0x20 || code === 0x7f
    })
  if (
    !rawUrl ||
    hasUnsafeCharacters ||
    rawUrl.startsWith('/') ||
    /^[a-z][a-z\d+.-]*:/i.test(rawUrl) ||
    decodedPathname.split('/').includes('..')
  ) {
    errors.push(`预缓存 URL 必须是同源相对路径：${rawUrl}`)
    return null
  }

  const base = 'https://precache.invalid/'
  const url = new URL(rawUrl, base)
  if (url.origin !== new URL(base).origin) {
    errors.push(`预缓存 URL 必须是同源相对路径：${rawUrl}`)
    return null
  }
  return { url: `${url.pathname.slice(1)}${url.search}`, filePath: url.pathname.slice(1) }
}

function verifyServiceWorker(distDir, errors) {
  const source = readRequired(distDir, 'sw.js', errors)
  if (!source) return 0
  const sw = source.toString('utf8')

  if (!sw.includes('self.skipWaiting()')) errors.push('Service Worker 缺少 skipWaiting 自动更新')
  if (!sw.includes('clientsClaim()')) errors.push('Service Worker 缺少 clientsClaim')
  if (!/NavigationRoute\(/.test(sw) || !/createHandlerBoundToURL\(["']index\.html["']\)/.test(sw)) {
    errors.push('Service Worker 缺少 index.html 导航回退')
  }

  const match = sw.match(/precacheAndRoute\((\[[\s\S]*?\]),/)
  if (!match) {
    errors.push('Service Worker 缺少可解析的预缓存清单')
    return 0
  }

  let entries
  try {
    // Workbox 生成的是未引用键名的对象字面量；仅补全标识符键名，不执行生成代码。
    const json = match[1].replace(/([{,])([a-zA-Z_$][\w$]*):/g, '$1"$2":')
    entries = JSON.parse(json)
  } catch {
    errors.push('Service Worker 预缓存清单无法解析')
    return 0
  }
  if (!Array.isArray(entries)) {
    errors.push('Service Worker 预缓存清单必须是数组')
    return 0
  }

  const seen = new Set()
  for (const entry of entries) {
    if (!entry || typeof entry.url !== 'string') {
      errors.push('预缓存条目缺少 url')
      continue
    }
    const target = normalizePrecacheUrl(entry.url, errors)
    if (!target) continue
    if (seen.has(target.url)) errors.push(`预缓存 URL 重复：${target.url}`)
    seen.add(target.url)

    const filePath = path.join(distDir, target.filePath)
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      errors.push(`预缓存文件不存在：${target.url}`)
    }
  }

  for (const name of [
    'index.html',
    'jujutsu-life-wheel.html',
    'manifest.webmanifest',
    ...expectedIcons.map((icon) => icon.name),
  ]) {
    if (!seen.has(name)) errors.push(`预缓存清单缺少：${name}`)
  }
  return entries.length
}

function verifyLegacyRedirect(distDir, errors) {
  const source = readRequired(distDir, 'jujutsu-life-wheel.html', errors)
  if (!source) return
  const html = source.toString('utf8')

  const metaRedirect = (html.match(/<meta\b[^>]*>/gi) ?? []).some((tag) => {
    if (!/\bhttp-equiv\s*=\s*(["'])refresh\1/i.test(tag)) return false
    const content = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2]
    return content !== undefined && /^\s*\d+\s*;\s*url\s*=\s*(["']?)\.\/\1\s*$/i.test(content)
  })
  const directScriptRedirect = /window\.location\.replace\s*\(\s*(["'])\.\/\1\s*\)/.test(html)
  const target = html.match(
    /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*new\s+URL\(\s*(["'])\.\/\2\s*,\s*window\.location\.href\s*\)/,
  )
  const replaceTarget = html.match(/window\.location\.replace\s*\(\s*([a-zA-Z_$][\w$]*)\.href\s*\)/)
  const scriptRedirect =
    directScriptRedirect || Boolean(target && replaceTarget && target[1] === replaceTarget[1])
  const valid =
    source.length <= 8 * 1024 &&
    metaRedirect &&
    /<a\s+[^>]*href=["']\.\/["']/i.test(html) &&
    scriptRedirect
  if (!valid) errors.push('旧地址必须保持轻量跳转到 ./，并保留 meta、链接与脚本回退')
}

export function verifyDist(distDir) {
  const errors = []
  verifyManifest(distDir, errors)
  const precacheEntries = verifyServiceWorker(distDir, errors)
  verifyLegacyRedirect(distDir, errors)
  if (errors.length > 0) {
    throw new Error(`生产产物校验失败：\n${errors.map((error) => `- ${error}`).join('\n')}`)
  }
  return { icons: expectedIcons.length, precacheEntries }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const distDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist')
  try {
    const result = verifyDist(distDir)
    console.log(`产物校验通过：${result.icons} 个图标，${result.precacheEntries} 条预缓存。`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
