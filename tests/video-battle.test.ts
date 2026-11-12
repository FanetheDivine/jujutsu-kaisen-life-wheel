import { describe, expect, it } from 'vitest'
import '../src/game/registry'
import { createBaseFlow } from '../src/game/registry'
import type { Stage } from '../src/game/types'
import {
  BATTLE_ACTIONS,
  BATTLE_DOMAIN,
  BATTLE_GAMBIT,
  BATTLE_STAGES,
  MAX_BATTLE_CARDS,
  MOVE_IDS,
  attachBattleRule,
  battleWinRule,
  cardCount,
  domainShift,
  gambitShift,
  movePower,
  winChance,
} from '../src/game/video/battle'
import { BASE_VIDEO_FLOW } from '../src/game/video/flow'

function stageOf(id: string): Stage {
  const stage = [...BATTLE_STAGES, ...BASE_VIDEO_FLOW].find((item) => item.id === id)
  if (!stage) throw new Error('找不到轮次：' + id)
  return stage
}

function pickOf(stage: Stage, label: string): string {
  const option = stage.options.find((item) => item.label.startsWith(label))
  if (!option) throw new Error(`轮次 ${stage.name} 没有「${label}」`)
  return option.id
}

const actions = stageOf(BATTLE_ACTIONS)
const move1 = stageOf(MOVE_IDS[0])

describe('战斗卡面流程（P5）：卡面顺序', () => {
  it('出招数 → 抽招式 → 博弈 → 领域对抗，然后才结算胜负', () => {
    const ids = BASE_VIDEO_FLOW.map((stage) => stage.id)
    const chain = [BATTLE_ACTIONS, ...MOVE_IDS, BATTLE_GAMBIT, BATTLE_DOMAIN]
    chain.forEach((id, index) => {
      if (index > 0) expect(ids.indexOf(id)).toBeGreaterThan(ids.indexOf(chain[index - 1]))
    })
    expect(ids.indexOf(BATTLE_ACTIONS)).toBeGreaterThan(ids.indexOf('p126'))
    expect(ids.indexOf(BATTLE_DOMAIN)).toBeLessThan(ids.indexOf('s01'))
    expect(MAX_BATTLE_CARDS).toBe(3)
  })

  it('招式卡上带着录像的「胜率+XX」，与扇面文案一致', () => {
    expect(move1.options[0].label).toContain('胜率+23')
    expect(move1.options[0].pw).toBe(23)
    expect(move1.options[3].pw).toBe(30)
    expect(move1.options.every((option) => typeof option.pw === 'number')).toBe(true)
  })
})

describe('战斗卡面流程（P5）：抽卡数与胜率', () => {
  it('抽到几张就只看前几张招式，没抽到按一张算', () => {
    expect(cardCount({})).toBe(1)
    expect(cardCount({ [BATTLE_ACTIONS]: pickOf(actions, '一张') })).toBe(1)
    expect(cardCount({ [BATTLE_ACTIONS]: pickOf(actions, '两张') })).toBe(2)
    expect(cardCount({ [BATTLE_ACTIONS]: pickOf(actions, '三张') })).toBe(3)
  })

  it('只抽一张时，第二、三张招式盘跳过', () => {
    const one = { [BATTLE_ACTIONS]: pickOf(actions, '一张') }
    const three = { [BATTLE_ACTIONS]: pickOf(actions, '三张') }
    const [, second, third] = MOVE_IDS.map(stageOf)

    expect(second.skipIf?.(one)).toBe(true)
    expect(third.skipIf?.(one)).toBe(true)
    expect(second.skipIf?.(three)).toBe(false)
    expect(third.skipIf?.(three)).toBe(false)
  })

  it('两张招式累加胜率，未抽到的招式不计入', () => {
    const context = {
      [BATTLE_ACTIONS]: pickOf(actions, '两张'),
      [MOVE_IDS[0]]: pickOf(move1, '体术·鞭腿'),
      [MOVE_IDS[1]]: pickOf(move1, '打出黑闪'),
      [MOVE_IDS[2]]: pickOf(move1, '自爆式咒力爆发'),
    }
    expect(movePower(context)).toBe(53)
    expect(winChance(context)).toBe(82)
  })

  it('博弈与领域对抗各自微调胜率', () => {
    const gambit = stageOf(BATTLE_GAMBIT)
    const domain = stageOf(BATTLE_DOMAIN)
    const base = {
      [BATTLE_ACTIONS]: pickOf(actions, '一张'),
      [MOVE_IDS[0]]: pickOf(move1, '体术·鞭腿'),
    }

    expect(winChance(base)).toBe(64)
    expect(gambitShift({ ...base, [BATTLE_GAMBIT]: pickOf(gambit, '强弱颠倒') })).toBe(-8)
    expect(winChance({ ...base, [BATTLE_GAMBIT]: pickOf(gambit, '不义游戏') })).toBe(76)
    expect(domainShift({ [BATTLE_DOMAIN]: pickOf(domain, '领域对抗·胜') })).toBe(10)
    expect(winChance({ ...base, [BATTLE_DOMAIN]: pickOf(domain, '没有领域') })).toBe(64)
  })

  it('胜率被夹在 10–90 之间，不会出现必胜或必败', () => {
    const context = {
      [BATTLE_ACTIONS]: pickOf(actions, '三张'),
      [MOVE_IDS[0]]: pickOf(move1, '自爆式咒力爆发'),
      [MOVE_IDS[1]]: pickOf(move1, '自爆式咒力爆发'),
      [MOVE_IDS[2]]: pickOf(move1, '自爆式咒力爆发'),
      [BATTLE_GAMBIT]: pickOf(stageOf(BATTLE_GAMBIT), '不义游戏'),
      [BATTLE_DOMAIN]: pickOf(stageOf(BATTLE_DOMAIN), '领域对抗·胜'),
    }
    expect(winChance(context)).toBe(90)
  })
})

describe('战斗卡面流程（P5）：胜负盘权重', () => {
  it('胜负盘拿到胜率后不再是等权', () => {
    const win = stageOf('s01')
    const context = {
      [BATTLE_ACTIONS]: pickOf(actions, '一张'),
      [MOVE_IDS[0]]: pickOf(move1, '体术·鞭腿'),
    }
    const weights: Record<string, number> = Object.fromEntries(
      win.options.map((option) => [option.id, 1]),
    )
    battleWinRule().apply(weights, context)

    const winOption = win.options.find((option) => option.label.startsWith('胜'))!
    const loseOption = win.options.find((option) => option.label.startsWith('负'))!
    expect(weights[winOption.id]).toBe(64)
    expect(weights[loseOption.id]).toBe(36)
  })

  it('结算盘在主干里已经挂上战斗规则', () => {
    const settle = createBaseFlow().find((stage) => stage.id === 's01')
    expect(settle?.rules?.length).toBe(1)
    expect(attachBattleRule(settle!).rules?.length).toBe(2)
  })

  it('规则名里写清楚抽了几张与胜率，便于界面解释', () => {
    const context = {
      [BATTLE_ACTIONS]: pickOf(actions, '两张'),
      [MOVE_IDS[0]]: pickOf(move1, '体术·鞭腿'),
      [MOVE_IDS[1]]: pickOf(move1, '打出黑闪'),
    }
    const rule = battleWinRule()
    expect(typeof rule.name).toBe('function')
    const name = typeof rule.name === 'function' ? rule.name(context) : rule.name
    expect(name).toContain('抽到 2 张')
    expect(name).toContain('82%')
  })
})
