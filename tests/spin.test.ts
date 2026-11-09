import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SPIN_MS, spinNow, spinTurns, startAuto } from '../src/game/actions'
import { resetFlow } from '../src/game/registry'
import { createInitialGameState, gameStore } from '../src/store/gameStore'

function resetEngine(): void {
  gameStore.setState(createInitialGameState(), true)
  resetFlow()
}

function stubAnimation(reducedMotion = false): void {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('window', {
    matchMedia: vi.fn(() => ({ matches: reducedMotion })),
  })
}

beforeEach(() => {
  resetEngine()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('转动时长', () => {
  it('手动转动默认减半为 2.1 秒', () => {
    stubAnimation()
    spinNow()

    expect(SPIN_MS.normal).toBe(2100)
    expect(gameStore.getState()).toMatchObject({ spinning: true, spinDuration: 2100 })
  })

  it('减少动效时手动转动为 0.3 秒', () => {
    stubAnimation(true)
    spinNow()

    expect(SPIN_MS.reduced).toBe(300)
    expect(gameStore.getState()).toMatchObject({ spinning: true, spinDuration: 300 })
  })

  it('自动连抽每轮为 0.1 秒', () => {
    stubAnimation()
    startAuto()

    expect(SPIN_MS.auto).toBe(100)
    expect(gameStore.getState()).toMatchObject({ auto: true, spinning: true, spinDuration: 100 })
  })

  it('二番战快进与自动接续使用减半后的时长', () => {
    expect(SPIN_MS.battle).toBe(450)
    expect(SPIN_MS.chain).toBe(200)
  })
})

describe('旋转圈数', () => {
  it('正常时长抽 3–5 圈', () => {
    for (let run = 0; run < 200; run++) {
      const turns = spinTurns(SPIN_MS.normal)
      expect(Number.isInteger(turns)).toBe(true)
      expect(turns).toBeGreaterThanOrEqual(3)
      expect(turns).toBeLessThanOrEqual(5)
    }
  })

  it('中短时长为 2 圈，自动连抽等极短时长为 1 圈', () => {
    expect(spinTurns(900)).toBe(2)
    expect(spinTurns(450)).toBe(2)
    expect(spinTurns(400)).toBe(2)
    expect(spinTurns(300)).toBe(1)
    expect(spinTurns(SPIN_MS.chain)).toBe(1)
    expect(spinTurns(SPIN_MS.auto)).toBe(1)
  })
})
