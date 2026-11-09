import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expandAfter } from '../src/game/flow'
import { BY, register, resetOptions } from '../src/game/options'
import type { Stage, WheelOption } from '../src/game/types'
import { createInitialGameState, gameStore } from '../src/store/gameStore'

function option(id: string): WheelOption {
  return { id, label: `选项-${id}`, base: 1 }
}

function stage(id: string, options: WheelOption[]): Stage {
  return { id, name: `轮次-${id}`, desc: '', kind: 'core', tag: '测试', options }
}

function setFlow(stages: Stage[]): void {
  stages.forEach(register)
  gameStore.setState({ ...createInitialGameState(), stages })
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
})

afterEach(() => {
  gameStore.setState(createInitialGameState(), true)
  resetOptions()
  vi.unstubAllGlobals()
})

describe('事件轮选项注册', () => {
  it('时代轮插入事件后重新注册事件选项文案', () => {
    setFlow([stage('era', [option('e0'), option('e1')]), stage('battleRounds', [option('br')])])
    resetOptions()

    expandAfter(0, 'era', 'e0')

    const events = gameStore.getState().stages.filter((item) => item.kind === 'event')
    expect(events.length).toBeGreaterThan(0)
    expect(BY.ev0_c?.label).toBe('被卷入的普通人')
    expect(BY.ev0_c?.id).toBe('ev0_c')
  })
})
