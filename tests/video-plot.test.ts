import { describe, expect, it } from 'vitest'
// 触发轮次注册：条件判断依赖 labelOf 能解析选项 id。
import '../src/game/registry'
import { BASE_VIDEO_FLOW } from '../src/game/video/flow'
import { ORIGIN_STAGES } from '../src/game/video/data'
import { PLOT_STAGES, SETTLE_STAGES, ERA_ORDER } from '../src/game/video/plot'
import type { Stage } from '../src/game/types'

function stageByName(name: string): Stage {
  const stage = [...PLOT_STAGES, ...SETTLE_STAGES].find((item) => item.name === name)
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
  it('126 个轮次，id 与名称唯一，每轮至少两个扇面', () => {
    expect(PLOT_STAGES).toHaveLength(126)
    expect(new Set(PLOT_STAGES.map((stage) => stage.id)).size).toBe(126)
    expect(new Set(PLOT_STAGES.map((stage) => stage.name)).size).toBe(126)
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
      (stage) => stage.name.startsWith('是否参加') || stage.name.startsWith('是否参与'),
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

describe('剧本线：死灭回游与新宿决战（P4）', () => {
  it('死灭回游排在涩谷之后，新宿决战排在最后', () => {
    const names = PLOT_STAGES.map((stage) => stage.name)
    expect(names.indexOf('是否参加死灭回游')).toBeGreaterThan(names.indexOf('是否参加涩谷事变'))
    expect(names.indexOf('是否参加新宿决战')).toBeGreaterThan(names.indexOf('是否参加死灭回游'))
    expect(names[names.length - 1]).toBe('诛伏赐死·辩论盘·胜负')
  })

  it('死灭回游没参加时只留参与盘，参加后才有结界内的细节', () => {
    const gate = stageByName('是否参加死灭回游')
    const detail = stageByName('死灭回游·带走天使后')
    const skippedGame = { era: eraPick('死灭回游时期'), [gate.id]: pickOf(gate, '否') }

    expect(skipped(gate, skippedGame)).toBe(false)
    expect(skipped(detail, skippedGame)).toBe(true)
    expect(skipped(detail, { ...skippedGame, [gate.id]: pickOf(gate, '是') })).toBe(false)
  })

  it('新宿决战的加入盘答是才播战场细节，咒灵侧另有专属盘', () => {
    const gate = stageByName('是否参加新宿决战')
    const joined = { era: eraPick('新宿决战时期'), [gate.id]: pickOf(gate, '是') }
    const notJoined = { ...joined, [gate.id]: pickOf(gate, '否') }

    expect(skipped(stageByName('新宿决战·策略'), joined)).toBe(false)
    expect(skipped(stageByName('新宿决战·策略'), notJoined)).toBe(true)
    expect(skipped(stageByName('新宿决战·是否参加·咒灵'), joined)).toBe(true)
    expect(
      skipped(stageByName('新宿决战·是否参加·咒灵'), { ...joined, origin: originPick('咒灵') }),
    ).toBe(false)
  })

  it('时间点在涩谷之后，死灭回游与新宿决战还要继续播；到 68 年后才整段跳过', () => {
    const late = PLOT_STAGES.filter(
      (stage) => stage.name.startsWith('死灭回游') || stage.name.startsWith('新宿决战'),
    )
    expect(late.length).toBeGreaterThan(5)
    for (const name of ['是否参加死灭回游', '是否参加新宿决战', '决战阵营']) {
      expect(skipped(stageByName(name), { era: eraPick('涩谷事变时期') })).toBe(false)
    }
    expect(late.every((stage) => skipped(stage, { era: eraPick('68年后外传') }))).toBe(true)
  })
})

describe('战斗结算三连盘（P4）', () => {
  it('胜负 → 伤势 → 成长，接在剧本线之后、终局之前', () => {
    const ids = BASE_VIDEO_FLOW.map((stage) => stage.id)
    expect(SETTLE_STAGES.map((stage) => stage.name)).toEqual([
      '战斗盘·胜负',
      '战斗盘·伤势·主角',
      '事件伤势',
      '是否得到成长·高天赋',
      '是否得到成长·低天赋',
      '事件成长·SS天赋以上',
      '事件成长·低天赋',
    ])
    expect(ids.indexOf('p126')).toBeLessThan(ids.indexOf('s01'))
    expect(ids.indexOf('s07')).toBeLessThan(ids.indexOf('ending'))
  })

  it('高天赋与低天赋的成长盘按天赋档位二选一', () => {
    const talent = BASE_VIDEO_FLOW.find((stage) => stage.id === 'talent')
    if (!talent) throw new Error('缺少天赋盘')
    const high = { talent: pickOf(talent, 'SSS(五宿、虎杖、乙骨级)') }
    const low = { talent: pickOf(talent, 'C(一般三级术师)') }
    const highGrow = stageByName('是否得到成长·高天赋')
    const lowGrow = stageByName('是否得到成长·低天赋')

    expect(skipped(highGrow, high)).toBe(false)
    expect(skipped(lowGrow, high)).toBe(true)
    expect(skipped(highGrow, low)).toBe(true)
    expect(skipped(lowGrow, low)).toBe(false)
  })

  it('胜负与伤势盘每轮都播，不因时间点被跳过', () => {
    const late = { era: eraPick('68年后外传') }
    const always = SETTLE_STAGES.filter((stage) => !stage.name.includes('成长'))
    expect(always).toHaveLength(3)
    expect(always.every((stage) => !skipped(stage, late))).toBe(true)
  })
})
