import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MANUAL_SNAP_MS, land, manualPick, rewriteRecord } from '../src/game/actions'
import { openHistoryReview } from '../src/game/history'
import { BY, register } from '../src/game/options'
import { distribution } from '../src/game/selectors'
import type { Stage, WheelOption } from '../src/game/types'
import { distributionArcs, mod360, optionAtAngle } from '../src/game/wheel'
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

function draw(stageIndex: number, pick: string, immediate = false): void {
  land(stageIndex, pick, immediate)
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

describe('当前轮手转', () => {
  it('未抽取时直接以手选结果落地并停在结果上', () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('next', [option('n1')])])

    expect(manualPick('a2')).toBe(true)

    const state = gameStore.getState()
    expect(state.records).toEqual([{ stageId: 'first', value: 'a2', skipped: false }])
    expect(state.results).toEqual({ first: 'a2' })
    expect(state.history).toHaveLength(1)
    expect(state.history[0].stageId).toBe('first')
    expect(state.pendingNext).toBe(1)
    expect(state.wheelIndex).toBe(0)
    expect(state.highlight).toBe('a2')
    expect(state.spinDuration).toBe(MANUAL_SNAP_MS)
    expect(state.done).toBe(false)
  })

  it('当前结果相同则完全 no-op，不追加记录也不作废快照', () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('next', [option('n1')])])
    draw(0, 'a1')

    const before = gameStore.getState()
    expect(manualPick('a1')).toBe(false)

    const after = gameStore.getState()
    expect(after.records).toBe(before.records)
    expect(after.results).toBe(before.results)
    expect(after.history).toBe(before.history)
    expect(after.pendingNext).toBe(1)
  })

  it('当前结果不同则替换本轮结果，不追加第二条记录', () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('second', [option('b1')])])
    draw(0, 'a1')

    expect(manualPick('a2')).toBe(true)

    const state = gameStore.getState()
    expect(state.records).toEqual([{ stageId: 'first', value: 'a2', skipped: false }])
    expect(state.results).toEqual({ first: 'a2' })
    expect(state.history).toHaveLength(1)
    expect(state.history[0].recordIndex).toBe(0)
    expect(state.pendingNext).toBe(1)
  })

  it('当前轮手转后转盘角度对准新手选扇区', () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('next', [option('n1')])])

    expect(manualPick('a2')).toBe(true)

    const state = gameStore.getState()
    const arcs = distributionArcs(distribution(0))
    expect(optionAtAngle(arcs, mod360(-state.rot))?.option.id).toBe('a2')
    expect(state.spinDuration).toBe(MANUAL_SNAP_MS)
  })
})

describe('回看后手转改写', () => {
  it('回看中原结果相同不退出回看，也不修改人生', () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('second', [option('b1')])])
    draw(0, 'a1', true)
    draw(1, 'b1', true)
    expect(openHistoryReview(0)).toBe(true)

    const before = gameStore.getState()
    expect(manualPick('a1')).toBe(false)

    const after = gameStore.getState()
    expect(after.review).not.toBeNull()
    expect(after.review?.recordIndex).toBe(0)
    expect(after.records).toBe(before.records)
    expect(after.results).toBe(before.results)
    expect(after.history).toBe(before.history)
  })

  it('回看中改写历史轮次，退出回看并作废该轮之后的一切', () => {
    setFlow([
      stage('first', [option('a1'), option('a2')]),
      stage('second', [option('b1'), option('b2')]),
      stage('third', [option('c1')]),
    ])
    draw(0, 'a1', true)
    draw(1, 'b1', true)
    draw(2, 'c1', true)
    expect(openHistoryReview(0)).toBe(true)

    expect(manualPick('a2')).toBe(true)

    const state = gameStore.getState()
    expect(state.review).toBeNull()
    expect(state.records).toEqual([{ stageId: 'first', value: 'a2', skipped: false }])
    expect(state.results).toEqual({ first: 'a2' })
    expect(state.history.map((entry) => entry.recordIndex)).toEqual([0])
    expect(state.i).toBe(0)
    expect(state.pendingNext).toBe(1)
    expect(state.stages.map((item) => item.id)).toEqual(['first', 'second', 'third'])
    expect(state.done).toBe(false)
  })

  it('改写中间轮次只保留目标轮及之前的结果和快照', () => {
    setFlow([
      stage('first', [option('a1')]),
      stage('second', [option('b1'), option('b2')]),
      stage('third', [option('c1')]),
    ])
    draw(0, 'a1', true)
    draw(1, 'b1', true)
    draw(2, 'c1', true)

    expect(rewriteRecord(1, 'b2')).toBe(true)

    const state = gameStore.getState()
    expect(state.records).toEqual([
      { stageId: 'first', value: 'a1', skipped: false },
      { stageId: 'second', value: 'b2', skipped: false },
    ])
    expect(state.results).toEqual({ first: 'a1', second: 'b2' })
    expect(state.results.third).toBeUndefined()
    expect(state.history.map((entry) => entry.recordIndex)).toEqual([0, 1])
    expect(state.history[1].results).toEqual({ first: 'a1' })
    expect(state.i).toBe(1)
    expect(state.pendingNext).toBe(2)
    expect(state.wheelIndex).toBe(1)
    expect(state.displayIndex).toBe(1)
  })

  it('改写动态分支后重新按新前缀插入轮次，旧分支不残留', () => {
    setFlow([stage('origin', [option('o1'), option('o2')]), stage('tail', [option('t1')])])
    draw(0, 'o2', true)
    expect(gameStore.getState().stages.some((item) => item.id === 'clan')).toBe(true)
    expect(BY.cl_gojo).toBeTruthy()

    expect(rewriteRecord(0, 'o1')).toBe(true)

    const state = gameStore.getState()
    expect(state.stages.map((item) => item.id)).toEqual(['origin', 'tail'])
    expect(state.records).toEqual([{ stageId: 'origin', value: 'o1', skipped: false }])
    expect(state.history).toHaveLength(1)
    expect(BY.cl_gojo).toBeUndefined()
  })

  it('改写触发器后重新计算跳过记录', () => {
    setFlow([
      stage('trigger', [option('skip'), option('keep')]),
      stage('conditional', [option('c1')], {
        skipIf: (context) => context.trigger === 'skip',
      }),
      stage('last', [option('l1')]),
    ])
    draw(0, 'skip', true)
    expect(gameStore.getState().records).toEqual([
      { stageId: 'trigger', value: 'skip', skipped: false },
      { stageId: 'conditional', value: null, skipped: true },
    ])

    expect(rewriteRecord(0, 'keep')).toBe(true)

    let state = gameStore.getState()
    expect(state.records).toEqual([{ stageId: 'trigger', value: 'keep', skipped: false }])
    expect(state.results).toEqual({ trigger: 'keep' })
    expect(state.i).toBe(0)
    expect(state.pendingNext).toBe(1)

    expect(rewriteRecord(0, 'skip')).toBe(true)

    state = gameStore.getState()
    expect(state.records).toEqual([
      { stageId: 'trigger', value: 'skip', skipped: false },
      { stageId: 'conditional', value: null, skipped: true },
    ])
    expect(state.pendingNext).toBe(2)
  })

  it('倒回攻击轮时恢复抽取前战斗状态并按新手选重新结算', () => {
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
    draw(0, 'hit', true)
    draw(1, 'claw', true)
    expect(gameStore.getState().battle.log).toHaveLength(2)

    expect(rewriteRecord(0, 'guard')).toBe(true)

    const state = gameStore.getState()
    expect(state.battle).toMatchObject({ p: 1, e: 0, diff: 1, ce: 2 })
    expect(state.battle.log).toHaveLength(1)
    expect(state.battle.log[0]).toMatchObject({ side: 'p', label: '选项-guard', pw: 1 })
    expect(state.records).toEqual([{ stageId: 'attack', value: 'guard', skipped: false }])
    expect(state.pendingNext).toBe(1)
  })

  it('终局后改写会重新打开流程并清空旧终局结果', () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('second', [option('b1')])])
    draw(0, 'a1', true)
    draw(1, 'b1', true)
    gameStore.setState({ done: true, pendingNext: null })

    expect(rewriteRecord(0, 'a2')).toBe(true)

    const state = gameStore.getState()
    expect(state.done).toBe(false)
    expect(state.records).toEqual([{ stageId: 'first', value: 'a2', skipped: false }])
    expect(state.results).toEqual({ first: 'a2' })
    expect(state.history).toHaveLength(1)
    expect(state.pendingNext).toBe(1)
  })
})

describe('改写守卫与旧回调失效', () => {
  it('旋转或自动连抽中拒绝手转与改写', () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('next', [option('n1')])])
    draw(0, 'a1')

    gameStore.setState({ auto: true })
    expect(manualPick('a2')).toBe(false)
    expect(rewriteRecord(0, 'a2')).toBe(false)

    gameStore.setState({ auto: false, spinning: true })
    expect(manualPick('a2')).toBe(false)
    expect(rewriteRecord(0, 'a2')).toBe(false)

    gameStore.setState({ spinning: false })
    expect(manualPick('a2')).toBe(true)
  })

  it('拒绝未知选项、不存在记录与跳过记录', () => {
    setFlow([
      stage('trigger', [option('skip'), option('keep')]),
      stage('conditional', [option('c1')], {
        skipIf: (context) => context.trigger === 'skip',
      }),
    ])
    draw(0, 'skip', true)

    expect(manualPick('missing')).toBe(false)
    expect(rewriteRecord(0, 'missing')).toBe(false)
    expect(rewriteRecord(9, 'keep')).toBe(false)
    expect(rewriteRecord(1, 'c1')).toBe(false)
  })

  it('改写后旧终局计时器不会追加记录或关闭人生', async () => {
    setFlow([stage('first', [option('a1'), option('a2')]), stage('second', [option('b1')])])
    draw(0, 'a1', true)
    draw(1, 'b1', true)

    expect(rewriteRecord(0, 'a2')).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)

    const state = gameStore.getState()
    expect(state.done).toBe(false)
    expect(state.records).toEqual([{ stageId: 'first', value: 'a2', skipped: false }])
    expect(state.history).toHaveLength(1)
    expect(state.pendingNext).toBe(1)
  })
})
