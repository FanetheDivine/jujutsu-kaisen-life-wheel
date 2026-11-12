import { describe, expect, it } from 'vitest'
import { expandAfter } from '../src/game/flow'
import { BASE_FLOW, createBaseFlow } from '../src/game/registry'
import { distribution, nextActiveIndex } from '../src/game/selectors'
import { VIDEO_STAGES } from '../src/game/video/data'
import { gameStore } from '../src/store/gameStore'
import type { Stage } from '../src/game/types'

const stageOf = (id: string): Stage => {
  const stage = VIDEO_STAGES.find((item) => item.id === id)
  if (!stage) throw new Error('缺少轮次：' + id)
  return stage
}

const pickOf = (stageId: string, label: string): string => {
  const option = stageOf(stageId).options.find((item) => item.label === label)
  if (!option) throw new Error(`缺少扇面：${stageId} / ${label}`)
  return option.id
}

const freshStages = (): Stage[] => {
  const stages = createBaseFlow()
  gameStore.setState({ stages, results: {}, records: [] })
  return stages
}

const idxOf = (id: string): number =>
  gameStore.getState().stages.findIndex((stage) => stage.id === id)

const nextIds = (index: number, count: number): string[] =>
  gameStore
    .getState()
    .stages.slice(index + 1, index + 1 + count)
    .map((stage) => stage.id)

describe('视频轮次数据', () => {
  it('每个轮次的 id、选项 id 唯一，且至少两个扇面', () => {
    const stageIds = VIDEO_STAGES.map((stage) => stage.id)
    expect(new Set(stageIds).size).toBe(stageIds.length)

    const optionIds = VIDEO_STAGES.flatMap((stage) => stage.options.map((option) => option.id))
    expect(new Set(optionIds).size).toBe(optionIds.length)

    for (const stage of VIDEO_STAGES) {
      expect(stage.options.length, stage.id).toBeGreaterThanOrEqual(2)
      for (const option of stage.options) {
        expect(option.label.trim(), stage.id).not.toBe('')
        expect(option.base, `${stage.id}/${option.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('主干从出身盘开始，以终局收束', () => {
    expect(BASE_FLOW[0].id).toBe('origin')
    expect(BASE_FLOW[0].name).toBe('穿越后的初始身份')
    expect(BASE_FLOW[BASE_FLOW.length - 1].id).toBe('legacy')
    expect(BASE_FLOW.some((stage) => stage.id === 'ending')).toBe(true)
    expect(BASE_FLOW.some((stage) => stage.kind === 'ending')).toBe(true)
  })
})

describe('条件插盘', () => {
  it('身份不同会插入各自的专属盘', () => {
    const cases: Array<[string, string[]]> = [
      ['咒灵', ['fear', 'bornState', 'intellect']],
      ['咒术高层', ['heredity']],
      ['诅咒师', ['persecution']],
      ['魂穿原著角色', ['soulRole']],
    ]

    for (const [label, expected] of cases) {
      freshStages()
      expandAfter(0, 'origin', pickOf('origin', label))
      expect(nextIds(0, expected.length), label).toEqual(expected)
    }
  })

  it('地点按大洲再插一个地区盘', () => {
    const cases: Array<[string, string]> = [
      ['日本', 'placeJp'],
      ['亚洲除日本外其他地方', 'placeAsia'],
      ['欧洲', 'placeEu'],
    ]

    for (const [label, expected] of cases) {
      freshStages()
      expandAfter(1, 'place', pickOf('place', label))
      expect(nextIds(1, 1), label).toEqual([expected])
    }
  })

  it('普通人身份不插专属盘', () => {
    freshStages()
    expandAfter(0, 'origin', pickOf('origin', '普通人'))
    expect(nextIds(0, 1)).toEqual(['place'])
  })

  it('自定义术式展开成四个子盘', () => {
    freshStages()
    const index = idxOf('technique')
    expandAfter(index, 'technique', pickOf('technique', '自定义术式'))
    expect(nextIds(index, 4)).toEqual(['customCount', 'customEffect', 'customAttr', 'selfAttr'])
  })

  it('特殊天赋连锁：是 → 特殊天赋 → 天与咒缚', () => {
    freshStages()
    const specialIndex = idxOf('special')
    expandAfter(specialIndex, 'special', pickOf('special', '是'))
    expect(nextIds(specialIndex, 1)).toEqual(['specialKind'])

    const kindIndex = idxOf('specialKind')
    expandAfter(kindIndex, 'specialKind', pickOf('specialKind', '天与咒缚'))
    expect(nextIds(kindIndex, 1)).toEqual(['vowType'])
  })
})

describe('无生得术式分支', () => {
  it('没有术式时跳过生得术式并插入高级技巧盘', () => {
    freshStages()
    const no = pickOf('hasTechnique', '否')
    const hasIndex = idxOf('hasTechnique')
    expandAfter(hasIndex, 'hasTechnique', no)
    gameStore.setState({ results: { hasTechnique: no } })

    const techniqueIndex = idxOf('technique')

    expect(nextIds(hasIndex, 1)).toEqual(['noTechSkill'])
    expect(nextActiveIndex(techniqueIndex, false)).toBe(techniqueIndex + 1)
    expect(gameStore.getState().stages[nextActiveIndex(hasIndex + 1, false)].id).toBe('noTechSkill')
  })

  it('有术式时生得术式轮次可抽', () => {
    freshStages()
    const index = gameStore.getState().stages.findIndex((stage) => stage.id === 'technique')
    gameStore.setState({ results: { hasTechnique: pickOf('hasTechnique', '是') } })

    const view = distribution(index)
    expect(view.stage.id).toBe('technique')
    expect(view.total).toBeGreaterThan(0)
  })
})

describe('录像频次权重', () => {
  it('出现次数多的扇面权重更高', () => {
    freshStages()
    const view = distribution(0)
    const common = view.pct[pickOf('origin', '普通人')]
    const rare = view.pct[pickOf('origin', '咒术师')]

    expect(common).toBeCloseTo(rare * 3, 5)
    expect(Object.values(view.pct).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100)
    expect(view.notes).toEqual([])
  })
})
