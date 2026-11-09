import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forceLand, land, restart } from '../src/game/actions'
import {
  closeHistoryReview,
  openHistoryForStage,
  openHistoryReview,
  recordIndexForStage,
} from '../src/game/history'
import { register } from '../src/game/options'
import type { Stage, WheelOption } from '../src/game/types'
import { createInitialGameState, gameStore } from '../src/store/gameStore'

function option(id: string, base = 1, extra: Partial<WheelOption> = {}): WheelOption {
  return { id, label: `选项-${id}`, base, ...extra }
}

function stage(id: string, options: WheelOption[], extra: Partial<Stage> = {}): Stage {
  return {
    id,
    name: `轮次-${id}`,
    desc: `说明-${id}`,
    kind: 'core',
    tag: '测试',
    options,
    ...extra,
  }
}

function setFlow(stages: Stage[]): void {
  stages.forEach(register)
  gameStore.setState({
    ...createInitialGameState(),
    stages,
  })
}

function viewOf(): {
  wheelIndex: number
  displayIndex: number
  rot: number
  highlight: string | null
  spinDuration: number
} {
  const state = gameStore.getState()
  return {
    wheelIndex: state.wheelIndex,
    displayIndex: state.displayIndex,
    rot: state.rot,
    highlight: state.highlight,
    spinDuration: state.spinDuration,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
})

afterEach(() => {
  gameStore.setState(createInitialGameState(), true)
  vi.clearAllTimers()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('历史快照', () => {
  it('在落地前记录轮次、记录、结果与当时的概率分布', () => {
    setFlow([
      stage('first', [option('a1'), option('a2')], {
        rules: [
          {
            name: '测试干涉',
            apply: (weights) => {
              weights.a2 += 2
            },
          },
        ],
      }),
      stage('next', [option('n1')]),
    ])

    forceLand(0, true)

    const entry = gameStore.getState().history[0]
    expect(entry).toMatchObject({
      recordIndex: 0,
      stageIndex: 0,
      stageId: 'first',
      results: {},
      records: [],
    })
    expect(entry.distribution.pct).toMatchObject({ a1: 25, a2: 75 })
    expect(entry.distribution.notes.map((note) => note.rule)).toEqual(['测试干涉'])
    expect(entry.battle.log).toEqual([])
  })

  it('快照中的概率与战斗状态不受后续抽选影响', () => {
    setFlow([
      stage('first', [option('a1'), option('a2')]),
      stage('next', [option('n1')]),
      stage('last', [option('l1')]),
    ])

    forceLand(0, true)
    forceLand(1, true)
    forceLand(2, true)

    const entry = gameStore.getState().history[0]
    expect(entry.distribution.pct).toMatchObject({ a1: 50, a2: 50 })
    expect(entry.results).toEqual({})
    expect(entry.records).toEqual([])
    expect(entry.battle.log).toEqual([])
  })

  it('第二份快照保留第一轮结果，但不包含第二轮自己的结果', () => {
    setFlow([
      stage('first', [option('a1')]),
      stage('second', [option('b1')]),
      stage('third', [option('c1')]),
    ])

    forceLand(0, true)
    forceLand(1, true)

    const entry = gameStore.getState().history[1]
    expect(entry.stageId).toBe('second')
    expect(entry.results).toEqual({ first: 'a1' })
    expect(entry.records).toEqual([{ stageId: 'first', value: 'a1', skipped: false }])
  })

  it('跳过轮不产生快照', () => {
    setFlow([
      stage('trigger', [option('skip'), option('keep')]),
      stage('conditional', [option('c1')], {
        skipIf: (context) => context.trigger === 'skip',
      }),
      stage('last', [option('l1')]),
    ])

    land(0, 'skip', true)

    expect(gameStore.getState().records).toEqual([
      { stageId: 'trigger', value: 'skip', skipped: false },
      { stageId: 'conditional', value: null, skipped: true },
    ])
    expect(gameStore.getState().history).toHaveLength(1)
    expect(openHistoryReview(1)).toBe(false)
    expect(openHistoryForStage(1)).toBe(false)
    expect(recordIndexForStage('conditional')).toBe(-1)
  })
})

describe('回看历史', () => {
  it('进入回看只切显示，不修改当前人生', () => {
    setFlow([
      stage('first', [option('a1'), option('a2')]),
      stage('second', [option('b1')]),
      stage('third', [option('c1')]),
    ])
    forceLand(0, true)
    forceLand(1, true)

    const before = gameStore.getState()
    expect(openHistoryReview(0)).toBe(true)
    const reviewing = gameStore.getState()

    expect(reviewing.review).not.toBeNull()
    expect(reviewing.i).toBe(before.i)
    expect(reviewing.results).toBe(before.results)
    expect(reviewing.records).toBe(before.records)
    expect(reviewing.battle).toBe(before.battle)
    expect(reviewing.stages).toBe(before.stages)
    expect(reviewing.done).toBe(before.done)
    expect(reviewing.pendingNext).toBe(before.pendingNext)
    expect(reviewing.wheelIndex).toBe(0)
    expect(reviewing.displayIndex).toBe(0)
    expect(reviewing.highlight).toBe(before.records[0].value)
    expect(reviewing.review?.originalValue).toBe(before.records[0].value)
    expect(reviewing.review?.checkpoint.stageId).toBe('first')
    expect(reviewing.spinDuration).toBeGreaterThan(0)
  })

  it('返回当前后恢复进入前的转盘角度、高亮与轮次', () => {
    setFlow([
      stage('first', [option('a1')]),
      stage('second', [option('b1')]),
      stage('third', [option('c1')]),
    ])
    forceLand(0, true)
    forceLand(1, true)
    const before = viewOf()

    expect(openHistoryReview(0)).toBe(true)
    expect(closeHistoryReview()).toBe(true)

    expect(viewOf()).toEqual(before)
    expect(gameStore.getState().review).toBeNull()
  })

  it('切换回看序号时保留最初进入回看前的视图', () => {
    setFlow([
      stage('first', [option('a1')]),
      stage('second', [option('b1')]),
      stage('third', [option('c1')]),
    ])
    forceLand(0, true)
    forceLand(1, true)
    const before = viewOf()

    expect(openHistoryReview(0)).toBe(true)
    const firstPrevious = gameStore.getState().review?.previous
    expect(openHistoryReview(1)).toBe(true)
    const reviewing = gameStore.getState()

    expect(reviewing.wheelIndex).toBe(1)
    expect(reviewing.review?.previous).toBe(firstPrevious)
    expect(openHistoryReview(2)).toBe(false)
    expect(closeHistoryReview()).toBe(true)
    expect(viewOf()).toEqual(before)
  })

  it('按轮次序号找到对应回看，且跳过轮不可回看', () => {
    setFlow([
      stage('trigger', [option('skip'), option('keep')]),
      stage('conditional', [option('c1')], {
        skipIf: (context) => context.trigger === 'skip',
      }),
      stage('last', [option('l1')]),
    ])
    land(0, 'skip', true)

    expect(recordIndexForStage('trigger')).toBe(0)
    expect(openHistoryForStage(0)).toBe(true)
    expect(gameStore.getState().review?.recordIndex).toBe(0)
  })

  it('旋转或自动连抽中拒绝进入回看', () => {
    setFlow([stage('first', [option('a1')]), stage('second', [option('b1')])])
    forceLand(0, true)

    gameStore.setState({ spinning: true })
    expect(openHistoryReview(0)).toBe(false)
    expect(openHistoryForStage(0)).toBe(false)

    gameStore.setState({ spinning: false, auto: true })
    expect(openHistoryReview(0)).toBe(false)

    gameStore.setState({ auto: false })
    expect(openHistoryReview(0)).toBe(true)
  })

  it('不存在的记录或轮次不能回看', () => {
    setFlow([stage('first', [option('a1')]), stage('second', [option('b1')])])
    forceLand(0, true)

    expect(openHistoryReview(-1)).toBe(false)
    expect(openHistoryReview(99)).toBe(false)
    expect(openHistoryForStage(99)).toBe(false)
    expect(recordIndexForStage('missing')).toBe(-1)
    expect(gameStore.getState().review).toBeNull()
  })
})

describe('历史生命周期', () => {
  it('重新开始清空历史与回看状态', () => {
    setFlow([stage('first', [option('a1')]), stage('second', [option('b1')])])
    forceLand(0, true)
    openHistoryReview(0)
    expect(gameStore.getState().history).toHaveLength(1)
    expect(gameStore.getState().review).not.toBeNull()

    vi.stubGlobal('window', { scrollTo: vi.fn() })
    restart()

    const state = gameStore.getState()
    expect(state.history).toEqual([])
    expect(state.review).toBeNull()
    expect(state.records).toEqual([])
    expect(state.results).toEqual({})
  })
})
