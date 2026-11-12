import { gameStore, getState } from '../store/gameStore'
import {
  BATTLE_ROUNDS,
  BATTLE_ROUNDS2,
  BATTLE_SIDE,
  CLAN,
  CORE,
  DUEL,
  DUEL2,
  ENDING,
  EVENT_DEFS,
  GEAR_COUNT,
  GROWTH,
  LEGACY,
  LOSS,
  SKILL_COUNT,
  SUKUNA_TRUE,
  VOW_COUNT,
  VOW_GATE,
  absenceStage,
  gearStageFor,
  makeEventStage,
  skillStageFor,
  vowStageFor,
} from './data'
import { register } from './options'
import type { Stage } from './types'
import { BASE_VIDEO_FLOW } from './video/flow'
import { VIDEO_STAGES } from './video/data'
import { BATTLE_STAGES } from './video/battle'
import { PLOT_STAGES, SETTLE_STAGES } from './video/plot'

/** 视频规则主干：出身盘 → 天赋盘 → 装备盘 → 剧本线 → 战斗结算 → 终局盘。 */
export const BASE_FLOW: Stage[] = [...BASE_VIDEO_FLOW]
export const ALL_STAGES: Stage[] = [
  ...VIDEO_STAGES,
  ...PLOT_STAGES,
  ...SETTLE_STAGES,
  ...BATTLE_STAGES,
  ...CORE,
  SKILL_COUNT,
  GEAR_COUNT,
  VOW_GATE,
  VOW_COUNT,
  BATTLE_SIDE,
  LEGACY,
  ...EVENT_DEFS.map(makeEventStage),
  ...EVENT_DEFS.map((d) => absenceStage(d.id)),
  ...[1, 2, 3, 4, 5].map((i) => skillStageFor(i)),
  ...[1, 2, 3, 4].map((i) => gearStageFor(i)),
  ...[1, 2, 3].map((i) => vowStageFor(i)),
  CLAN,
  BATTLE_ROUNDS,
  DUEL,
  SUKUNA_TRUE,
  BATTLE_ROUNDS2,
  DUEL2,
  GROWTH,
  LOSS,
  ENDING,
]

ALL_STAGES.forEach(register)

export function stageById(id: string): Stage {
  const stage =
    getState().stages.find((item) => item.id === id) || ALL_STAGES.find((item) => item.id === id)
  if (!stage) throw new Error('未知轮次：' + id)
  return stage
}

export function createBaseFlow(): Stage[] {
  return BASE_FLOW.map((stage) => stage)
}

export function resetFlow(): void {
  gameStore.setState({ stages: createBaseFlow() })
}
