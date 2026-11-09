import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  advance,
  doSpin,
  forceLand,
  resolveBattle,
  restart,
  skipStage,
  SPIN_MS,
  startAuto,
} from '../src/game/actions'
import { applyAction, expandAfter } from '../src/game/flow'
import { enemyActionStage } from '../src/game/data'
import { derived, syncDerivedNames } from '../src/game/derive'
import { register } from '../src/game/options'
import { BASE_FLOW, resetFlow } from '../src/game/registry'
import { power } from '../src/game/rules'
import { distribution, nextActiveIndex } from '../src/game/selectors'
import type { Stage } from '../src/game/types'
import { createInitialGameState, gameStore } from '../src/store/gameStore'

function resetEngine(): void {
  gameStore.setState(createInitialGameState(), true)
  resetFlow()
}

beforeEach(() => {
  resetEngine()
  // Node 测试环境没有 requestAnimationFrame；旋转用例只校验状态，不驱动帧循环。
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

describe('应用生命周期', () => {
  it('手机面板切换不影响当前人生和正在进行的抽选', () => {
    const records = [{ stageId: 'era', value: 'e4', skipped: false }]
    const results = { era: 'e4' }
    gameStore.setState({ records, results, spinning: true, auto: true, i: 1 })

    gameStore.setState({ mobilePanel: 'ledger' })
    gameStore.setState({ mobilePanel: 'stats' })

    expect(gameStore.getState()).toMatchObject({
      mobilePanel: 'stats',
      spinning: true,
      auto: true,
      i: 1,
    })
    expect(gameStore.getState().records).toBe(records)
    expect(gameStore.getState().results).toBe(results)
  })

  it('重开恢复手机抽选面板并清空上一人生', () => {
    gameStore.setState({
      mobilePanel: 'ledger',
      records: [{ stageId: 'era', value: 'e4', skipped: false }],
    })
    vi.stubGlobal('window', { scrollTo: vi.fn() })
    try {
      restart()
      expect(gameStore.getState().mobilePanel).toBe('draw')
      expect(gameStore.getState().records).toEqual([])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('重开一次发布完整基础流程，不产生空轮次中间状态', () => {
    const observedLengths: number[] = []
    const unsubscribe = gameStore.subscribe((state) => {
      observedLengths.push(state.stages.length)
    })
    vi.stubGlobal('window', { scrollTo: vi.fn() })

    try {
      restart()
    } finally {
      unsubscribe()
      vi.unstubAllGlobals()
    }

    expect(observedLengths).toEqual([BASE_FLOW.length])
    expect(gameStore.getState().stages.map((stage) => stage.id)).toEqual(
      BASE_FLOW.map((stage) => stage.id),
    )
  })

  it('连续立即落地能够抵达终局', async () => {
    vi.useFakeTimers()
    try {
      let guard = 0
      while (!gameStore.getState().results.legacy && guard++ < 500) {
        forceLand(gameStore.getState().i, true)
      }
      expect(guard).toBeLessThan(500)
      expect(gameStore.getState().results.ending).toBeTruthy()
      expect(gameStore.getState().results.legacy).toBeTruthy()

      await vi.advanceTimersByTimeAsync(700)

      expect(gameStore.getState().done).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('概率分布与因果规则', () => {
  it('首轮使用原始权重，概率总和为 100', () => {
    const result = distribution(0)

    expect(result.stage.id).toBe('era')
    expect(Object.values(result.pct).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100)
    expect(result.notes).toEqual([])
  })

  it('前置结果会改写后续权重并产生干涉说明', () => {
    const baseline = distribution(1)
    gameStore.setState({ results: { era: 'e4' } })
    const later = distribution(1)

    expect(later.stage.id).toBe('age')
    expect(later.total).toBeGreaterThan(0)
    expect(later.notes.length).toBeGreaterThan(0)
    expect(later.pct).not.toEqual(baseline.pct)
    expect(Object.values(later.pct).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100)
  })

  it('跳过的轮次按需补记，且不重复记录', () => {
    const stages: Stage[] = [
      {
        id: 'future',
        name: '未来',
        desc: '',
        kind: 'core',
        tag: '测试',
        options: [],
        skipIf: (context) => context.era === 'e0',
        skipText: '时代不符',
      },
      {
        id: 'next',
        name: '下一轮',
        desc: '',
        kind: 'core',
        tag: '测试',
        options: [],
      },
    ]
    gameStore.setState({ stages, results: { era: 'e0' } })

    expect(nextActiveIndex(0, true)).toBe(1)
    expect(nextActiveIndex(0, true)).toBe(1)
    expect(gameStore.getState().records).toEqual([
      { stageId: 'future', value: null, skipped: true },
    ])
  })
})

describe('动态流程与战斗', () => {
  it('御三家出身会立刻插入家族轮次', () => {
    const originIndex = BASE_FLOW.findIndex((stage) => stage.id === 'origin')

    expandAfter(originIndex, 'origin', 'o2')

    expect(gameStore.getState().stages[originIndex + 1].id).toBe('clan')
  })

  it('技能数量会展开对应数量的技能轮', () => {
    const index = BASE_FLOW.findIndex((stage) => stage.id === 'skillCount')

    expandAfter(index, 'skillCount', 'kc2')

    expect(
      gameStore
        .getState()
        .stages.slice(index + 1, index + 3)
        .map((stage) => stage.id),
    ).toEqual(['skill1', 'skill2'])
  })

  it('事件战创建回合前已经提交当前敌人', () => {
    gameStore.setState({ results: { ev2: 'ev2_c' } })

    expandAfter(0, 'br2', 'br2_1')

    const state = gameStore.getState()
    const enemy = state.stages[2]
    expect(state.battle.foe?.key).toBe('sorcerer')
    expect(enemy.id).toBe('eactv2e1')
    expect(enemy.options).toEqual(enemyActionStage(enemy.id.slice(4), 1).options)
  })

  it('终局与二番战创建回合前已经清除旧敌人并提交阶段', () => {
    const previous = gameStore.getState().battle
    gameStore.setState({
      results: { battleSide: 'bs_jujutsu', bond: 'b1' },
      battle: { ...previous, foe: { key: 'curse', name: '旧敌人', note: '', bonus: 0 } },
    })

    expandAfter(0, 'battleRounds', 'r3')
    let state = gameStore.getState()
    expect(state.battle.foe).toBeNull()
    expect(state.stages[2].options).toEqual(
      enemyActionStage(state.stages[2].id.slice(4), 1).options,
    )

    expandAfter(0, 'battleRounds2', 'r3')
    state = gameStore.getState()
    expect(state.battle.phase).toBe(2)
    expect(state.stages[2].options).toEqual(
      enemyActionStage(state.stages[2].id.slice(4), 1).options,
    )
  })

  it('攻击累计威力、咒力消耗、分差和日志', () => {
    const stage: Stage = {
      id: 'testAttack',
      name: '测试攻击',
      desc: '',
      kind: 'atk',
      tag: '战斗',
      side: 'p',
      round: 2,
      options: [{ id: 'testHit', label: '测试打击', base: 1, pw: 7 }],
    }
    register(stage)
    gameStore.setState({ stages: [stage] })

    applyAction(stage.id, 'testHit')

    const { battle } = gameStore.getState()
    expect(battle.p).toBe(7)
    expect(battle.diff).toBe(7)
    expect(battle.ce).toBe(2)
    expect(battle.log).toEqual([
      {
        round: 2,
        side: 'p',
        extra: false,
        phase: 1,
        bout: '',
        label: '测试打击',
        pw: 7,
      },
    ])
  })
})

describe('派生', () => {
  const results = {
    era: 'e0',
    dim_ce: 'dim_ce_A',
    dim_ct: 'dim_ct_B',
    dim_tj: 'dim_tj_C',
    dim_bd: 'dim_bd_A',
    dim_lk: 'dim_lk_B',
    dim_in: 'dim_in_S',
  }

  it('战力按六维加权，派生命名由结果确定', () => {
    gameStore.setState({ results })

    expect(power(results)).toBe(47)
    const first = derived()
    const second = derived()

    expect(second).toEqual(first)
    syncDerivedNames()
    expect(gameStore.getState().jutsuName).toMatch(/^「.+」$/)
    expect(gameStore.getState().domainName).not.toBe('')
  })
})

describe('落地停留与推进', () => {
  it('真实抽取落地后停在结果，点箭头直接开始下一轮转动', async () => {
    vi.useFakeTimers()
    try {
      forceLand(gameStore.getState().i)

      const landed = gameStore.getState()
      expect(landed.pendingNext).toBeGreaterThan(0)
      expect(landed.highlight).toBeTruthy()
      expect(landed.i).toBe(0)
      expect(landed.displayIndex).toBe(0)
      expect(landed.wheelIndex).toBe(0)
      expect(landed.spinning).toBe(false)

      const held = landed.pendingNext
      await vi.advanceTimersByTimeAsync(3000)
      expect(gameStore.getState().displayIndex).toBe(0)

      advance()

      expect(gameStore.getState()).toMatchObject({
        pendingNext: null,
        i: held,
        displayIndex: held,
        wheelIndex: held,
        highlight: null,
        spinning: true,
        spinDuration: SPIN_MS.normal,
      })

      await vi.advanceTimersByTimeAsync(2300)

      const nextLanded = gameStore.getState()
      expect(nextLanded).toMatchObject({ i: held, spinning: false })
      expect(nextLanded.highlight).toBeTruthy()
      expect(nextLanded.pendingNext).not.toBeNull()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('重复点箭头只推进一轮，旋转中推进无效', () => {
    vi.useFakeTimers()
    try {
      forceLand(gameStore.getState().i)
      const held = gameStore.getState().pendingNext

      advance()
      advance()

      expect(gameStore.getState()).toMatchObject({
        pendingNext: null,
        i: held,
        displayIndex: held,
        wheelIndex: held,
        highlight: null,
        spinning: true,
      })
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('没有停留时推进无效', () => {
    advance()

    expect(gameStore.getState()).toMatchObject({
      pendingNext: null,
      i: 0,
      displayIndex: 0,
      wheelIndex: 0,
      spinning: false,
    })
  })

  it('最后一轮落地后停留，点箭头直接进入终局', () => {
    const last = gameStore.getState().stages.length - 1
    gameStore.setState({ i: last, displayIndex: last, wheelIndex: last })

    forceLand(last)

    expect(gameStore.getState()).toMatchObject({
      pendingNext: -1,
      displayIndex: last,
      wheelIndex: last,
      done: false,
    })
    expect(gameStore.getState().highlight).toBeTruthy()

    advance()

    expect(gameStore.getState()).toMatchObject({
      pendingNext: null,
      done: true,
      spinning: false,
    })
  })

  it('偏好减少动态时下一轮旋转缩短为 300ms', () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    try {
      forceLand(gameStore.getState().i)
      advance()

      expect(gameStore.getState()).toMatchObject({ spinning: true, spinDuration: 300 })
    } finally {
      vi.clearAllTimers()
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })

  it('自动模式不停留，落地后直接排入下一轮', () => {
    vi.useFakeTimers()
    try {
      gameStore.setState({ auto: true })

      forceLand(gameStore.getState().i)

      const state = gameStore.getState()
      expect(state.pendingNext).toBeNull()
      expect(state.i).toBe(1)
      expect(state.displayIndex).toBe(0)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('立即落地（战斗快进）不停留', () => {
    forceLand(gameStore.getState().i, true)

    expect(gameStore.getState()).toMatchObject({
      pendingNext: null,
      i: 1,
      displayIndex: 1,
      wheelIndex: 1,
      highlight: null,
      spinning: false,
    })
  })

  it('跳过此轮立即落地并停留，点箭头直接开始下一轮转动', () => {
    vi.useFakeTimers()
    try {
      skipStage()

      const landed = gameStore.getState()
      expect(landed.pendingNext).toBeGreaterThan(0)
      expect(landed.highlight).toBeTruthy()
      expect(landed.i).toBe(0)
      expect(landed.displayIndex).toBe(0)
      expect(landed.spinning).toBe(false)
      expect(landed.records).toEqual([
        { stageId: landed.stages[0].id, value: landed.highlight, skipped: false },
      ])

      const held = landed.pendingNext
      advance()

      expect(gameStore.getState()).toMatchObject({
        pendingNext: null,
        i: held,
        displayIndex: held,
        wheelIndex: held,
        spinning: true,
      })
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('停留期间转动、跳过、自动与战斗快进全部无效', () => {
    forceLand(gameStore.getState().i)
    const before = gameStore.getState()

    doSpin(400)
    startAuto()
    skipStage()
    resolveBattle()

    const after = gameStore.getState()
    expect(after).toMatchObject({
      pendingNext: before.pendingNext,
      i: before.i,
      displayIndex: before.displayIndex,
      wheelIndex: before.wheelIndex,
      spinning: false,
      auto: false,
      rot: before.rot,
    })
    expect(after.results).toEqual(before.results)
  })

  it('重新开始会清除停留状态', () => {
    vi.stubGlobal('window', { scrollTo: vi.fn() })
    try {
      forceLand(gameStore.getState().i)
      expect(gameStore.getState().pendingNext).not.toBeNull()

      restart()

      expect(gameStore.getState()).toMatchObject({
        pendingNext: null,
        i: 0,
        displayIndex: 0,
        wheelIndex: 0,
        highlight: null,
        spinning: false,
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
