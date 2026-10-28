import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forceLand, restart } from '../src/game/actions'
import { applyAction, expandAfter } from '../src/game/flow'
import { enemyActionStage } from '../src/game/data'
import { derived, syncDerivedNames } from '../src/game/derive'
import { buildMarkdown, SYSTEM_PROMPT } from '../src/game/markdown'
import { labelOf, register } from '../src/game/options'
import { BASE_FLOW, resetFlow } from '../src/game/registry'
import { power } from '../src/game/rules'
import { distribution, nextActiveIndex } from '../src/game/selectors'
import type { Stage } from '../src/game/types'
import { createInitialGameState, gameStore } from '../src/store/gameStore'

function resetEngine(): void {
  gameStore.setState(createInitialGameState(), true)
  resetFlow()
}

beforeEach(resetEngine)

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
      ledgerScroll: { following: false, seenCount: 1 },
      storyScroll: { following: false, seenCount: 100 },
      records: [{ stageId: 'era', value: 'e4', skipped: false }],
    })
    vi.stubGlobal('window', { scrollTo: vi.fn() })
    try {
      restart()
      expect(gameStore.getState().mobilePanel).toBe('draw')
      expect(gameStore.getState().records).toEqual([])
      expect(gameStore.getState().ledgerScroll).toEqual({ following: true, seenCount: 0 })
      expect(gameStore.getState().storyScroll).toEqual({ following: true, seenCount: 0 })
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

  it('连续立即落地能够抵达终局并生成完整档案', async () => {
    vi.useFakeTimers()
    try {
      gameStore.setState({ systemPrompt: '上一人生自定义的提示词' })
      let guard = 0
      while (!gameStore.getState().results.legacy && guard++ < 500) {
        forceLand(gameStore.getState().i, true)
      }
      expect(guard).toBeLessThan(500)
      expect(gameStore.getState().results.ending).toBeTruthy()
      expect(gameStore.getState().results.legacy).toBeTruthy()

      await vi.advanceTimersByTimeAsync(700)

      expect(gameStore.getState().done).toBe(true)
      expect(gameStore.getState().systemPrompt).toBe(SYSTEM_PROMPT)
      expect(gameStore.getState().markdown).toContain('# 咒术回战 · 抽选人生')
      expect(gameStore.getState().markdown).toContain(labelOf(gameStore.getState().results.ending))
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

describe('派生与档案', () => {
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

  it('Markdown 保留版本、六维、经历与写作章节', () => {
    gameStore.setState({
      results,
      records: [{ stageId: 'era', value: 'e0', skipped: false }],
    })
    const markdown = buildMarkdown(derived(), 50)

    expect(markdown).toContain('> 生成器版本：v6.1')
    expect(markdown).toContain('## 二、六维性能（E–EX）')
    expect(markdown).toContain('## 六、决战逐回合记录')
    expect(markdown).toContain('## 十二、请为我写故事')
    expect(markdown).toContain('篇幅 3000–5000 字')
  })
})
