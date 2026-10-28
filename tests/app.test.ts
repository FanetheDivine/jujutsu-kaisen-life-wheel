import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const bodyMatch = indexHtml.match(/<body>([\s\S]*?)<\/body>/)

if (!bodyMatch) throw new Error('index.html 缺少 body')
const bodyHtml: string = bodyMatch[1]

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const result = document.getElementById(id)
  if (!result) throw new Error(`缺少 #${id}`)
  return result as T
}

async function mountApp() {
  document.body.innerHTML = bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '')
  document.documentElement.dataset.theme = 'light'
  localStorage.clear()
  vi.resetModules()
  await import('../src/app')
}

describe('应用迁移回归', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('初始化首轮、版本号与空命运帖', async () => {
    await mountApp()

    expect(element('stageName').textContent).toBe('入场时期')
    expect(element('ledger').querySelectorAll('.ledger-row')).toHaveLength(0)
    expect(element('ledgerNote').textContent).toMatch(/^0 \/ \d+ 轮$/)
    expect(document.querySelector('.ver')?.textContent).toBe('v6.0')
    expect(document.body.textContent).toContain('Vite · TypeScript · PWA · 离线可用')
    expect(element<HTMLInputElement>('sysPrompt').value).toContain('你是精通《咒术回战》')
  })

  it('跳过当前轮会真实抽选并可重新开始', async () => {
    await mountApp()
    element<HTMLButtonElement>('skipBtn').click()

    expect(element('ledger').querySelectorAll('.ledger-row')).toHaveLength(1)
    expect(element('ledger').querySelector('.ledger-val')?.textContent).not.toBe('——')
    await vi.advanceTimersByTimeAsync(700)
    expect(element('stageName').textContent).not.toBe('入场时期')

    element<HTMLButtonElement>('resetBtn').click()

    expect(element('stageName').textContent).toBe('入场时期')
    expect(element('ledger').querySelectorAll('.ledger-row')).toHaveLength(0)
    expect(element('deliver').hidden).toBe(true)
    expect(element<HTMLButtonElement>('spinBtn').disabled).toBe(false)
  })

  it('主题按钮在明暗主题间切换', async () => {
    await mountApp()
    const button = element<HTMLButtonElement>('themeBtn')

    button.click()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(button.textContent).toBe('夜行性：开')

    button.click()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(button.textContent).toBe('夜行性：关')
  })
})
