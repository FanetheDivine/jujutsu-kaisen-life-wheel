import { describe, expect, it } from 'vitest'
import '../src/game/registry'
import type { Stage } from '../src/game/types'
import { BASE_VIDEO_FLOW } from '../src/game/video/flow'
import { ENDING_STAGES } from '../src/game/video/plot'

function stageByName(name: string): Stage {
  const stage = ENDING_STAGES.find((item) => item.name === name)
  if (!stage) throw new Error('找不到终局轮次：' + name)
  return stage
}

function pickOf(stage: Stage, label: string): string {
  const option = stage.options.find((item) => item.label.startsWith(label))
  if (!option) throw new Error(`轮次 ${stage.name} 没有「${label}」`)
  return option.id
}

const alive = stageByName('是否活到68年后')

describe('结局与彩蛋（P6）：终局轮次', () => {
  it('16 个终局轮次，首轮判生死、末轮问投币', () => {
    expect(ENDING_STAGES.length).toBe(16)
    expect(ENDING_STAGES[0].id).toBe('ending')
    expect(ENDING_STAGES[0].kind).toBe('ending')
    expect(ENDING_STAGES[0].name).toBe('是否活到68年后')
    expect(ENDING_STAGES.at(-1)!.id).toBe('legacy')
    expect(ENDING_STAGES.at(-1)!.kind).toBe('legacy')
  })

  it('四个结局轮次组都在，且每轮至少两个扇面', () => {
    const names = ENDING_STAGES.map((stage) => stage.name)
    expect(names).toEqual(
      expect.arrayContaining([
        '在哪里·68年后',
        '68年后人类是否存在',
        '68年后声望',
        '68年后是否参加战斗',
        '主角死后·五宿对决胜利者是',
        '主角死后·索和夏油是谁对付的',
        '逆转时间·虎杖回来的方式是',
        '逆转时间·虎杖回到的时间点是',
        '逆转时间·时间是否继续回溯',
        '逆转时间·虎杖能否回到68年后',
        '逆转时间·回不去了·决定',
      ]),
    )
    for (const stage of ENDING_STAGES) {
      expect(stage.options.length).toBeGreaterThanOrEqual(2)
      expect(stage.options.every((option) => option.base > 0)).toBe(true)
    }
  })

  it('终局接在结算之后，是主干的最后一段', () => {
    const ids = BASE_VIDEO_FLOW.map((stage) => stage.id)
    expect(ids.at(-1)).toBe('legacy')
    expect(ids.indexOf('ending')).toBeGreaterThan(ids.indexOf('s07'))
    expect(ids.indexOf('ending')).toBeGreaterThan(ids.indexOf('b_target'))
  })
})

describe('结局与彩蛋（P6）：活没活到 68 年后', () => {
  it('活到 68 年后才播「在哪里 / 人类是否存在 / 声望 / 是否参战」', () => {
    const yes = { [alive.id]: pickOf(alive, '是') }
    expect(stageByName('在哪里·68年后').skipIf?.(yes)).toBe(false)
    expect(stageByName('68年后声望').skipIf?.(yes)).toBe(false)
    expect(stageByName('68年后是否参加战斗').skipIf?.(yes)).toBe(false)
    expect(stageByName('主角死后·五宿对决胜利者是').skipIf?.(yes)).toBe(true)
    expect(stageByName('逆转时间·虎杖回来的方式是').skipIf?.(yes)).toBe(true)
  })

  it('没活到 68 年后才播「主角死后」与「逆转时间」两条线', () => {
    const no = { [alive.id]: pickOf(alive, '否') }
    expect(stageByName('主角死后·五宿对决胜利者是').skipIf?.(no)).toBe(false)
    expect(stageByName('主角死后·索和夏油是谁对付的').skipIf?.(no)).toBe(false)
    expect(stageByName('逆转时间·虎杖回到的时间点是').skipIf?.(no)).toBe(false)
    expect(stageByName('逆转时间·回不去了·决定').skipIf?.(no)).toBe(false)
    expect(stageByName('68年后声望').skipIf?.(no)).toBe(true)
  })

  it('彩蛋盘与投币盘不挑结局，谁都会播', () => {
    for (const name of [
      '我掌握了咒力的核心!',
      '宿把手机砍坏了怎么办',
      '打架前先恰个饭',
      '观众看完会不会投币',
    ]) {
      const stage = stageByName(name)
      expect(stage.skipIf?.({})).toBe(false)
      expect(stage.skipIf?.({ [alive.id]: pickOf(alive, '否') })).toBe(false)
    }
  })

  it('68 年后声望是录像的评级扇面，投币盘保留四个彩蛋结果', () => {
    expect(stageByName('68年后声望').options.length).toBeGreaterThanOrEqual(10)
    expect(stageByName('观众看完会不会投币').options.length).toBe(5)
  })
})
