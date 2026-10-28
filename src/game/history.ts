import { gameStore, getState } from '../store/gameStore'
import type { Distribution } from './selectors'
import type { BattleState, LifeRecord, ResultContext, Stage } from './types'

/** 记录一次实际抽取落地前的完整业务状态，用于只读回看与悔棋。 */
export interface HistoryCheckpoint {
  recordIndex: number
  stageIndex: number
  stageId: string
  stages: Stage[]
  results: ResultContext
  records: LifeRecord[]
  battle: BattleState
  jutsuName: string
  domainName: string
  distribution: Distribution
}

function cloneBattle(battle: BattleState): BattleState {
  return {
    ...battle,
    log: battle.log.map((entry) => ({ ...entry })),
    foe: battle.foe ? { ...battle.foe } : null,
  }
}

export function captureCheckpoint(stageIndex: number, distribution: Distribution): void {
  const state = getState()
  const stage = state.stages[stageIndex]
  if (!stage) return

  const checkpoint: HistoryCheckpoint = {
    recordIndex: state.records.length,
    stageIndex,
    stageId: stage.id,
    stages: [...state.stages],
    results: { ...state.results },
    records: state.records.map((record) => ({ ...record })),
    battle: cloneBattle(state.battle),
    jutsuName: state.jutsuName,
    domainName: state.domainName,
    distribution,
  }
  gameStore.setState({ history: [...state.history, checkpoint] })
}

export function cloneCheckpointBattle(checkpoint: HistoryCheckpoint): BattleState {
  return cloneBattle(checkpoint.battle)
}
