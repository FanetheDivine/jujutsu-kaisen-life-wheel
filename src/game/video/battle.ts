import type { Stage } from '../types'
import { labelOf } from '../options'
import { wheel } from './wheel'

/**
 * 战斗卡面流程（P5）：出招数 → 抽招式（带胜率） → 博弈 → 领域对抗 → 胜负。
 *
 * 视频里的「战斗盘」是一叠卡：先转出发几张，再一张张转招式，招式上写着「胜率+XX」，
 * 中间还会插「博弈·强弱颠倒 / 不义游戏」与「领域对抗」两张盘，最后才开「胜负」。
 * 这里保留本仓库原有的加权随机内核，只把卡面文案与胜率来源换成视频这套：
 * 招式上的 +XX 直接累加进本回合的胜率，胜负盘的权重由这些数字算出来，而不是固定的底权重。
 *
 * 招式的文案与胜率来自 ep74–ep82 战斗盘扇面的可见抽样（OCR 清洗后），
 * 与原作者配置不保证逐字一致；改胜率只改下面的 MOVES 表。
 */

const BATTLE = '战斗'

interface Move {
  label: string
  /** 该招式在录像卡面上的「胜率+XX」 */
  pw: number
  /** 录像里出现的次数 */
  count?: number
}

const MOVES: Move[] = [
  { label: '体术·鞭腿（胜率+23）', pw: 23, count: 1 },
  { label: '术式·疾驰（胜率+12）', pw: 12 },
  { label: '术式·定格（对方本回合随机一招无效）（胜率+9）', pw: 9 },
  { label: '打出黑闪（胜率+30）', pw: 30, count: 1 },
  { label: '简易领域（胜率+7）', pw: 7 },
  { label: '领域展开（胜率+26）', pw: 26 },
  { label: '咒具·天逆鉾（胜率+18）', pw: 18 },
  { label: '自爆式咒力爆发（胜率+34）', pw: 34 },
]

/** 录像里主角一侧的「出招数」最多转到几张。 */
const MAX_CARDS = 3

const ACTION_LABELS = ['一张', '两张', '三张']

export const BATTLE_ACTIONS = 'b_actions'
export const BATTLE_GAMBIT = 'b_gambit'
export const BATTLE_DOMAIN = 'b_domain'
export const MOVE_IDS = ['b_move1', 'b_move2', 'b_move3'] as const

/** 抽到的招式数：读「出招数」的结果文案，没抽到按一张算。 */
export function cardCount(context: Record<string, string | undefined>): number {
  const index = ACTION_LABELS.indexOf(labelOf(context[BATTLE_ACTIONS] ?? ''))
  return index < 0 ? 1 : index + 1
}

/** 本回合累计的「胜率+XX」。 */
export function movePower(context: Record<string, string | undefined>): number {
  return MOVE_IDS.slice(0, cardCount(context)).reduce((sum, id) => {
    const pick = context[id]
    if (!pick) return sum
    const option = MOVES[pickIndex(pick)]
    return sum + (option ? option.pw : 0)
  }, 0)
}

function pickIndex(pick: string): number {
  const index = Number(pick.slice(pick.lastIndexOf('_') + 1))
  return Number.isFinite(index) ? index : -1
}

/** 博弈盘的小幅修正：强弱颠倒靠换位偷鸡，不义游戏靠规则压制。 */
export function gambitShift(context: Record<string, string | undefined>): number {
  const label = labelOf(context[BATTLE_GAMBIT] ?? '')
  if (label.startsWith('强弱颠倒')) return -8
  if (label.startsWith('不义游戏')) return 12
  return 0
}

/** 领域对抗的修正：领域赢了多一成把握，被对方领域压住则要吃亏。 */
export function domainShift(context: Record<string, string | undefined>): number {
  const label = labelOf(context[BATTLE_DOMAIN] ?? '')
  if (label.startsWith('领域对抗·胜')) return 10
  if (label.startsWith('领域对抗·负')) return -6
  return 0
}

/** 胜负盘里「胜」的权重：五五开为 50，招式与博弈、领域各自加减，夹在 10–90 之间。 */
export function winChance(context: Record<string, string | undefined>): number {
  const raw =
    50 + Math.round(movePower(context) * 0.6) + gambitShift(context) + domainShift(context)
  return Math.max(10, Math.min(90, raw))
}

function moveStage(index: number): Stage {
  const stage = wheel({
    id: MOVE_IDS[index],
    name: index === 0 ? '战斗盘·抽招式' : `战斗盘·抽招式·${index + 1}`,
    tag: BATTLE,
    kind: 'battle',
    desc: index === 0 ? '抽一张招式卡，卡面的「胜率+XX」直接算进这回合。' : '再抽一张。',
    skipIf: (context) => cardCount(context) <= index,
    skipText: '这一回合没抽到这么多张',
    opts: MOVES.map((move) => [move.label, move.count ?? 0] as [string, number]),
  })
  return {
    ...stage,
    options: stage.options.map((option, optionIndex) => ({
      ...option,
      pw: MOVES[optionIndex].pw,
    })),
  }
}

/** 战斗卡面流程；胜负盘本身在剧本线的结算盘里，由 battleWinRule 接管权重。 */
export const BATTLE_STAGES: Stage[] = [
  wheel({
    id: BATTLE_ACTIONS,
    name: '战斗盘·出招数',
    tag: BATTLE,
    kind: 'battle',
    desc: '这一回合能打出几张卡？',
    opts: ACTION_LABELS.map((label) => label as string),
  }),
  moveStage(0),
  moveStage(1),
  moveStage(2),
  wheel({
    id: BATTLE_GAMBIT,
    name: '博弈·强弱颠倒',
    tag: BATTLE,
    kind: 'battle',
    desc: '博弈盘：要不要把强弱对调，或者用不义游戏抢规则。',
    opts: ['按部就班', ['强弱颠倒（把强弱对调）'], ['不义游戏（规则系压制）']],
  }),
  wheel({
    id: BATTLE_DOMAIN,
    name: '领域对抗·胜者是',
    tag: BATTLE,
    kind: 'battle',
    desc: '双方同时展开领域时，谁的领域压住谁。',
    opts: [['领域对抗·胜'], ['领域对抗·负'], ['没有领域，跳过']],
  }),
  wheel({
    id: 'b_target',
    name: '战斗盘·对手',
    tag: BATTLE,
    kind: 'battle',
    desc: '这一场打的是谁。',
    opts: [
      ['宿傩', 1],
      ['五条悟', 1],
      ['羂索', 1],
      ['真人', 1],
      ['漏瑚', 1],
    ],
  }),
]

/**
 * 把「胜负」盘的权重接到战斗卡面算出的胜率上：胜 = winChance，负 = 100 - winChance。
 * 结算盘由脚本生成，这里只挂规则，不动扇面，所以 P4 的轮次数据仍然有效。
 */
export function battleWinRule() {
  return {
    name: (context: Record<string, string>) =>
      `战斗盘结算：抽到 ${cardCount(context)} 张，胜率 ${winChance(context)}%`,
    apply: (weights: Record<string, number>, context: Record<string, string>) => {
      const chance = winChance(context)
      for (const id of Object.keys(weights)) {
        // 扇面文案「胜 / 负」来自录像，按文案而不是下标判断。
        const label = labelOf(id)
        if (label.startsWith('胜')) weights[id] = chance
        else if (label.startsWith('负')) weights[id] = 100 - chance
      }
    },
  }
}

/** 供测试与流程拼接使用：给结算盘挂上胜率规则。 */
export function attachBattleRule(stage: Stage): Stage {
  return { ...stage, rules: [...(stage.rules ?? []), battleWinRule()] }
}

export const MAX_BATTLE_CARDS = MAX_CARDS
