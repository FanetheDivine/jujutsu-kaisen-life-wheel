import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forceLand, manualSelectPast, redrawPast, restart } from '../src/game/actions'
import { BY, register } from '../src/game/options'
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

function drawCurrent(): void {
  forceLand(gameStore.getState().i, true)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  gameStore.setState(createInitialGameState(), true)
  vi.clearAllTimers()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('历史快照', () => {
  it('保存抽取当时的概率与因果修正，不受后续状态影响', () => {
    const first = stage('first', [option('a1'), option('a2')], {
      rules: [
        {
          name: '测试干涉',
          apply: (weights) => {
            weights.a2 += 2
          },
        },
      ],
    })
    setFlow([first, stage('next', [option('n1')])])

    drawCurrent()

    const entry = gameStore.getState().history[0]
    expect(entry).toMatchObject({ recordIndex: 0, stageIndex: 0, stageId: 'first' })
    expect(entry.distribution.pct).toMatchObject({ a1: 25, a2: 75 })
    expect(entry.distribution.notes.map((note) => note.rule)).toEqual(['测试干涉'])
    const frozenPct = { ...entry.distribution.pct }

    gameStore.setState((state) => ({
      results: { ...state.results, first: 'a2', later: 'n1' },
      battle: { ...state.battle, diff: 99 },
    }))

    expect(gameStore.getState().history[0].distribution.pct).toEqual(frozenPct)
  })

  it('只读查看历史不会修改当前人生', () => {
    setFlow([stage('a', [option('a1')]), stage('b', [option('b1')])])
    drawCurrent()
    drawCurrent()
    const before = gameStore.getState()

    expect(before.history).toHaveLength(2)
    expect(before.records).toHaveLength(2)
    expect(before.history[0].distribution.stage.id).toBe('a')
    expect(before.history[1].distribution.stage.id).toBe('b')
    expect(gameStore.getState().records).toBe(before.records)
    expect(gameStore.getState().results).toBe(before.results)
  })
})

describe('悔棋回退', () => {
  it('重选目标轮时清除该轮原结果与全部后续记录、结果和快照', () => {
    setFlow([
      stage('a', [option('a1'), option('a2')]),
      stage('b', [option('b1'), option('b2')]),
      stage('c', [option('c1')]),
    ])
    drawCurrent()
    drawCurrent()
    drawCurrent()
    expect(gameStore.getState().history.map((entry) => entry.recordIndex)).toEqual([0, 1, 2])

    expect(manualSelectPast(1, 'b2')).toBe(true)

    const state = gameStore.getState()
    expect(state.records.map((record) => record.stageId)).toEqual(['a', 'b'])
    expect(state.records[1].value).toBe('b2')
    expect(state.results.b).toBe('b2')
    expect(state.results.c).toBeUndefined()
    expect(state.history).toHaveLength(2)
    expect(state.history.map((entry) => entry.recordIndex)).toEqual([0, 1])
    expect(state.i).toBe(2)
  })

  it('重抽回到目标轮并重新开始随机抽取，不保留旧后续', () => {
    setFlow([stage('a', [option('a1'), option('a2')]), stage('b', [option('b1')])])
    drawCurrent()
    drawCurrent()
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => undefined)

    expect(redrawPast(0)).toBe(true)

    const state = gameStore.getState()
    expect(state).toMatchObject({ i: 0, spinning: true, spinDuration: 600, auto: false })
    expect(state.records).toEqual([])
    expect(state.results).toEqual({})
    expect(state.history).toEqual([])
  })

  it('悔棋后推进旧计时器不会追加记录或触发旧终局', async () => {
    setFlow([stage('a', [option('a1'), option('a2')]), stage('b', [option('b1')])])
    drawCurrent()
    drawCurrent()

    expect(manualSelectPast(0, 'a2')).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)

    const state = gameStore.getState()
    expect(state.done).toBe(false)
    expect(state.records).toEqual([{ stageId: 'a', value: 'a2', skipped: false }])
    expect(state.history).toHaveLength(1)
  })

  it('旋转或自动抽选中禁止悔棋写操作', () => {
    setFlow([stage('a', [option('a1'), option('a2')]), stage('b', [option('b1')])])
    drawCurrent()
    expect(gameStore.getState().history).toHaveLength(1)

    gameStore.setState({ auto: true })
    expect(redrawPast(0)).toBe(false)
    expect(manualSelectPast(0, 'a2')).toBe(false)
    expect(gameStore.getState().records).toHaveLength(1)

    gameStore.setState({ auto: false, spinning: true })
    expect(redrawPast(0)).toBe(false)
    expect(manualSelectPast(0, 'a2')).toBe(false)
    expect(gameStore.getState().records).toHaveLength(1)
  })

  it('重新开始会清空全部历史快照', () => {
    setFlow([stage('a', [option('a1'), option('a2')]), stage('b', [option('b1')])])
    drawCurrent()
    drawCurrent()
    expect(gameStore.getState().history).toHaveLength(2)

    vi.stubGlobal('window', { scrollTo: () => undefined })
    restart()

    const state = gameStore.getState()
    expect(state.history).toEqual([])
    expect(state.records).toEqual([])
    expect(state.results).toEqual({})
  })

  it('动态插轮只按新前缀展开一次，旧后代不会重复', () => {
    setFlow([stage('origin', [option('o1'), option('o2')]), stage('tail', [option('t1')])])

    drawCurrent()
    expect(manualSelectPast(0, 'o2')).toBe(true)
    expect(gameStore.getState().stages[1].id).toBe('clan')
    expect(gameStore.getState().history).toHaveLength(1)

    drawCurrent()
    expect(gameStore.getState().records).toHaveLength(2)

    expect(manualSelectPast(0, 'o1')).toBe(true)

    const state = gameStore.getState()
    expect(state.records).toHaveLength(1)
    expect(state.results.origin).toBe('o1')
    expect(state.stages.some((item) => item.id === 'clan')).toBe(false)
    expect(state.history).toHaveLength(1)
    const ids = state.stages.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('倒回攻击轮会恢复完整战斗状态并丢弃旧日志', () => {
    const player = stage('attack', [option('hit', 1, { pw: 7 }), option('guard', 1, { pw: 1 })], {
      kind: 'atk',
      side: 'p',
      round: 1,
    })
    const enemy = stage('retaliate', [option('claw', 1, { pw: 3 })], {
      kind: 'atk',
      side: 'e',
      round: 1,
    })
    setFlow([player, enemy, stage('after', [option('next')])])
    drawCurrent()
    drawCurrent()
    expect(gameStore.getState().battle.log).toHaveLength(2)

    expect(manualSelectPast(0, 'hit')).toBe(true)

    const battle = gameStore.getState().battle
    expect(battle).toMatchObject({ p: 7, e: 0, diff: 7, ce: 2 })
    expect(battle.log).toHaveLength(1)
    expect(battle.log[0]).toMatchObject({ side: 'p', label: '选项-hit', pw: 7 })
  })

  it('手选允许指定当时权重为零的选项', () => {
    setFlow([stage('zero', [option('impossible', 0), option('possible', 1)])])
    drawCurrent()
    expect(gameStore.getState().history[0].distribution.w.impossible).toBe(0)

    expect(manualSelectPast(0, 'impossible')).toBe(true)

    expect(gameStore.getState().results.zero).toBe('impossible')
    expect(gameStore.getState().records[0]).toMatchObject({
      stageId: 'zero',
      value: 'impossible',
      skipped: false,
    })
  })

  it('拒绝不属于目标轮的选项，且不修改当前状态', () => {
    setFlow([stage('a', [option('a1')]), stage('b', [option('b1')])])
    drawCurrent()
    drawCurrent()
    const before = gameStore.getState()

    expect(manualSelectPast(0, 'b1')).toBe(false)

    expect(gameStore.getState().records).toBe(before.records)
    expect(gameStore.getState().results).toBe(before.results)
    expect(gameStore.getState().stages).toBe(before.stages)
    expect(gameStore.getState().history).toBe(before.history)
  })

  it('回退后重新注册保留轮次，清除已作废分支的选项覆盖', () => {
    const first = stage('first', [option('shared', 1, { label: '第一轮文案' })])
    const second = stage('second', [option('shared', 1, { label: '第二轮文案' })])
    setFlow([first, second])
    drawCurrent()
    drawCurrent()
    expect(BY.shared.label).toBe('第二轮文案')

    expect(manualSelectPast(0, 'shared')).toBe(true)

    expect(BY.shared.label).toBe('第一轮文案')
  })

  it('按新前缀重新计算跳过记录，既会消失也会重新生成', () => {
    const trigger = stage('trigger', [option('skip'), option('keep')], {
      rules: [],
    })
    const conditional = stage('conditional', [option('c1')], {
      skipIf: (context) => context.trigger === 'skip',
      skipText: '被跳过',
    })
    const last = stage('last', [option('l1')])
    setFlow([trigger, conditional, last])

    drawCurrent()
    expect(manualSelectPast(0, 'skip')).toBe(true)
    expect(gameStore.getState().records).toEqual([
      { stageId: 'trigger', value: 'skip', skipped: false },
      { stageId: 'conditional', value: null, skipped: true },
    ])
    expect(gameStore.getState().i).toBe(2)

    expect(manualSelectPast(0, 'keep')).toBe(true)
    expect(gameStore.getState().records).toEqual([
      { stageId: 'trigger', value: 'keep', skipped: false },
    ])
    expect(gameStore.getState().i).toBe(1)

    expect(manualSelectPast(0, 'skip')).toBe(true)
    expect(
      gameStore.getState().records.filter((record) => record.stageId === 'conditional'),
    ).toHaveLength(1)
  })

  it('终局悔棋重新开放流程，清空旧档案并中止生成', () => {
    setFlow([stage('a', [option('a1'), option('a2')]), stage('b', [option('b1')])])
    drawCurrent()
    const controller = new AbortController()
    const abort = vi.spyOn(controller, 'abort')
    gameStore.setState({
      ctrl: controller,
      done: true,
      markdown: '旧档案',
      story: '旧故事',
      apiStatus: '生成中',
      apiError: true,
      generating: true,
    })

    expect(manualSelectPast(0, 'a2')).toBe(true)

    const state = gameStore.getState()
    expect(abort).toHaveBeenCalledOnce()
    expect(state).toMatchObject({
      ctrl: null,
      done: false,
      markdown: '',
      story: '',
      apiStatus: '',
      apiError: false,
      generating: false,
      spinning: false,
      auto: false,
    })
  })
})
