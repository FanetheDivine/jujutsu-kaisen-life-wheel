import { describe, expect, it } from 'vitest'
// 触发轮次注册：条件判断依赖 labelOf 能解析选项 id。
import '../src/game/registry'
import { BASE_VIDEO_FLOW } from '../src/game/video/flow'
import { ORIGIN_STAGES } from '../src/game/video/data'
import { PLOT_STAGES, ERA_ORDER } from '../src/game/video/plot'
import type { Stage } from '../src/game/types'

function stageByName(name: string): Stage {
  const stage = PLOT_STAGES.find((item) => item.name === name)
  if (!stage) throw new Error('找不到剧本线轮次：' + name)
  return stage
}

function pickOf(stage: Stage, label: string): string {
  const option = stage.options.find((item) => item.label === label)
  if (!option) throw new Error(`轮次 ${stage.name} 没有扇面 ${label}`)
  return option.id
}

/** 时间点扇面在录像里的顺序：0 千年前 … 8 六十八年后外传。 */
function eraPick(label: string): string {
  const stage = BASE_VIDEO_FLOW.find((item) => item.id === 'era')
  if (!stage) throw new Error('缺少时间点轮次')
  return pickOf(stage, label)
}

function originPick(label: string): string {
  const stage = ORIGIN_STAGES.find((item) => item.id === 'origin')
  if (!stage) throw new Error('缺少出身轮次')
  return pickOf(stage, label)
}

function skipped(stage: Stage, results: Record<string, string>): boolean {
  return stage.skipIf ? stage.skipIf(results) : false
}

describe('剧本线：轮次数据', () => {
  it('82 个轮次，id 与名称唯一，每轮至少两个扇面', () => {
    expect(PLOT_STAGES).toHaveLength(82)
    expect(new Set(PLOT_STAGES.map((stage) => stage.id)).size).toBe(82)
    expect(new Set(PLOT_STAGES.map((stage) => stage.name)).size).toBe(82)
    for (const stage of PLOT_STAGES) {
      expect(stage.options.length).toBeGreaterThanOrEqual(2)
      expect(stage.options.every((option) => option.base > 0)).toBe(true)
    }
  })

  it('按篇章先后排进主干：四百年前 → 怀玉 → 日常 → 百鬼夜行 → 剧情开始 → 幼鱼 → 交流会 → 涩谷', () => {
    const ids = BASE_VIDEO_FLOW.map((stage) => stage.id)
    const order = [
      '400年前事件',
      '怀玉·是否参加理子保卫战',
      '日常盘·遇见夏油杰',
      '是否参加百鬼夜行',
      '在做什么·剧情开始时',
      '是否参与幼鱼与逆罚',
      '是否参加交流会',
      '是否参加涩谷事变',
    ]
    const marks = order.map((name) => ids.indexOf(stageByName(name).id))
    expect(marks.every((index) => index >= 0)).toBe(true)
    expect([...marks].sort((a, b) => a - b)).toEqual(marks)
  })

  it('时间点排在剧本线之前，终局排在剧本线之后', () => {
    const ids = BASE_VIDEO_FLOW.map((stage) => stage.id)
    expect(ids.indexOf('era')).toBeLessThan(ids.indexOf('p01'))
    expect(ids.indexOf('p82')).toBeLessThan(ids.indexOf('ending'))
  })
})

describe('剧本线：时间点门槛', () => {
  it('时间点晚于某篇章时，该篇章整段跳过', () => {
    const past = stageByName('400年前事件')
    const hidden = stageByName('怀玉·是否参加理子保卫战')
    const shibuya = stageByName('是否参加涩谷事变')

    expect(skipped(past, { era: eraPick('400年前') })).toBe(false)
    expect(skipped(hidden, { era: eraPick('400年前') })).toBe(false)

    expect(skipped(past, { era: eraPick('涩谷事变时期') })).toBe(true)
    expect(skipped(hidden, { era: eraPick('涩谷事变时期') })).toBe(true)
    expect(skipped(shibuya, { era: eraPick('涩谷事变时期') })).toBe(false)
  })

  it('六十八年后外传跳过全部八个篇章', () => {
    const late = { era: eraPick('68年后外传') }
    expect(PLOT_STAGES.every((stage) => skipped(stage, late))).toBe(true)
  })

  it('录像没抽到时间点时按最早算，篇章参与盘都能播', () => {
    const gates = PLOT_STAGES.filter(
      (stage) => stage.name.includes('是否参加') || stage.name.includes('是否参与'),
    )
    expect(gates.length).toBeGreaterThan(3)
    expect(gates.every((stage) => !skipped(stage, {}))).toBe(true)
    expect(ERA_ORDER).toHaveLength(9)
  })
})

describe('剧本线：篇章参与盘', () => {
  it('百鬼夜行没参加时，只有参与盘与替补盘留在流程里', () => {
    const gate = stageByName('是否参加百鬼夜行')
    const member = stageByName('百鬼夜行·遇敌')
    const notJoined = { era: eraPick('0卷时期'), [gate.id]: pickOf(gate, '否') }

    expect(skipped(gate, notJoined)).toBe(false)
    expect(skipped(member, notJoined)).toBe(true)
    expect(skipped(member, { ...notJoined, [gate.id]: pickOf(gate, '是') })).toBe(false)
  })

  it('涩谷没参加时，涩谷的细节盘全部跳过', () => {
    const gate = stageByName('是否参加涩谷事变')
    const notJoined = { era: eraPick('涩谷事变时期'), [gate.id]: pickOf(gate, '否') }
    const shibuyaMembers = PLOT_STAGES.filter(
      (stage) => stage.id !== gate.id && stage.id >= gate.id && stage.name.includes('涩谷'),
    )

    expect(shibuyaMembers.length).toBeGreaterThan(5)
    expect(shibuyaMembers.every((stage) => skipped(stage, notJoined))).toBe(true)
  })

  it('怀玉没参加时走「未与甚尔战斗」的替补盘', () => {
    const gate = stageByName('怀玉·是否参加理子保卫战')
    const notJoined = { era: eraPick('怀玉时期'), [gate.id]: pickOf(gate, '否') }

    expect(skipped(stageByName('未与甚尔战斗·见面情况'), notJoined)).toBe(false)
    expect(skipped(stageByName('怀玉·伏黑甚尔是否刺杀理子'), notJoined)).toBe(true)
  })
})

describe('剧本线：身份与天赋条件', () => {
  it('家族盘只给咒术高层', () => {
    const family = stageByName('特殊事件·加入的家族是')
    expect(skipped(family, { origin: originPick('普通人') })).toBe(true)
    expect(skipped(family, { origin: originPick('咒术高层') })).toBe(false)
  })

  it('涩谷的咒灵专属盘只给咒灵', () => {
    const gate = stageByName('是否参加涩谷事变')
    const joined = { era: eraPick('涩谷事变时期'), [gate.id]: pickOf(gate, '是') }
    const curseOnly = stageByName('涩谷事变·游荡·遇见了谁·咒灵')

    expect(skipped(curseOnly, { ...joined, origin: originPick('普通人') })).toBe(true)
    expect(skipped(curseOnly, { ...joined, origin: originPick('咒灵') })).toBe(false)
  })

  it('无生得术式才播「高级技巧·无生得术式」', () => {
    const stage = stageByName('会哪个高级技巧·无生得术式')
    const hasTech = BASE_VIDEO_FLOW.find((item) => item.id === 'hasTechnique')
    if (!hasTech) throw new Error('缺少是否拥有生得术式轮次')

    expect(skipped(stage, { hasTechnique: pickOf(hasTech, '是') })).toBe(true)
    expect(skipped(stage, { hasTechnique: pickOf(hasTech, '否') })).toBe(false)
  })
})
