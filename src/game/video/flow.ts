import { gameStore, getState } from '../../store/gameStore'
import { labelOf, register } from '../options'
import type { Stage } from '../types'
import {
  ENDING_STAGES,
  GEAR_STAGES,
  ORIGIN_BRANCHES,
  ORIGIN_STAGES,
  RATING_STAGES,
  TALENT_BRANCHES,
  TALENT_STAGES,
  VOW_STAGES,
} from './data'

/**
 * 视频流程的主干顺序：出身 → 天赋 → 装备 → 束缚 → 评级 → 终局。
 * 条件子盘不进主干，落地后由 VIDEO_BRANCHES 插入。
 */
export const VIDEO_MAIN_ORDER = [
  'origin',
  'place',
  'era',
  'sex',
  'age',
  'face',
  'moral',
  'hasTechnique',
  'technique',
  'curseTotal',
  'physique',
  'ceEff',
  'taijutsu',
  'ceCtrl',
  'talent',
  'gearCount',
  'gearKind',
  'gearEffect',
  'special',
  'vowMade',
  'ultimate',
  'rating',
  'domainType',
  'domainFx',
  'ending',
  'legacy',
] as const

function named(stages: Stage[], id: string): Stage {
  const stage = stages.find((item) => item.id === id)
  if (!stage) throw new Error('视频轮次缺失：' + id)
  return stage
}

const ALL = [
  ...ORIGIN_STAGES,
  ...TALENT_STAGES,
  ...GEAR_STAGES,
  ...VOW_STAGES,
  ...RATING_STAGES,
  ...ENDING_STAGES,
]

export const BASE_VIDEO_FLOW: Stage[] = VIDEO_MAIN_ORDER.map((id) => named(ALL, id))

const ORIGIN_IDS = { fear: 'fear', bornState: 'bornState', intellect: 'intellect' }

/**
 * 条件插盘表：键为「来源轮次|该轮结果文案」，值为紧跟其后的子盘。
 * 用文案而不是选项 id 作键，重排扇面时不会静默失效。
 */
export const VIDEO_BRANCHES: Record<string, Stage[]> = {
  'origin|咒灵': [
    named(ORIGIN_BRANCHES, ORIGIN_IDS.fear),
    named(ORIGIN_BRANCHES, ORIGIN_IDS.bornState),
    named(ORIGIN_BRANCHES, ORIGIN_IDS.intellect),
  ],
  'origin|咒术高层': [named(ORIGIN_BRANCHES, 'heredity')],
  'origin|诅咒师': [named(ORIGIN_BRANCHES, 'persecution')],
  'origin|魂穿原著角色': [named(ORIGIN_BRANCHES, 'soulRole')],
  'place|日本': [named(ORIGIN_BRANCHES, 'placeJp')],
  'place|亚洲除日本外其他地方': [named(ORIGIN_BRANCHES, 'placeAsia')],
  'place|欧洲': [named(ORIGIN_BRANCHES, 'placeEu')],
  'technique|自定义术式': [
    named(TALENT_BRANCHES, 'customCount'),
    named(TALENT_BRANCHES, 'customEffect'),
    named(TALENT_BRANCHES, 'customAttr'),
    named(TALENT_BRANCHES, 'selfAttr'),
  ],
  'hasTechnique|否': [named(TALENT_BRANCHES, 'noTechSkill')],
  'special|是': [named(TALENT_BRANCHES, 'specialKind')],
  'specialKind|天与咒缚': [named(TALENT_BRANCHES, 'vowType')],
  'vowMade|是': [named(VOW_STAGES, 'vowCost'), named(VOW_STAGES, 'vowGain')],
}

/** 落地后按「来源轮次 + 结果文案」插入条件子盘；命中返回 true。 */
export function videoExpandAfter(idx: number, stageId: string, pick: string): boolean {
  const branch = VIDEO_BRANCHES[stageId + '|' + labelOf(pick)]
  if (!branch || !branch.length) return false
  branch.forEach(register)
  const stages = getState().stages
  gameStore.setState({
    stages: [...stages.slice(0, idx + 1), ...branch, ...stages.slice(idx + 1)],
  })
  return true
}

/** 供数据测试核对：所有登记过的轮次要么在主干，要么在某个条件子盘里。 */
export const BRANCH_STAGE_IDS: string[] = Object.values(VIDEO_BRANCHES).flatMap((stages) =>
  stages.map((stage) => stage.id),
)
