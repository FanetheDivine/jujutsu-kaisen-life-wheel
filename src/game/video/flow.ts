import { gameStore, getState } from '../../store/gameStore'
import { labelOf, register } from '../options'
import type { Stage } from '../types'
import {
  ENDING_STAGES,
  ORIGIN_BRANCHES,
  ORIGIN_STAGES,
  TALENT_BRANCHES,
  TALENT_STAGES,
} from './data'

/** 视频流程的主干：出身盘 → 天赋盘 → 终局盘。 */
export const BASE_VIDEO_FLOW: Stage[] = [...ORIGIN_STAGES, ...TALENT_STAGES, ...ENDING_STAGES]

function named(stages: Stage[], id: string): Stage {
  const stage = stages.find((item) => item.id === id)
  if (!stage) throw new Error('视频轮次缺失：' + id)
  return stage
}

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
