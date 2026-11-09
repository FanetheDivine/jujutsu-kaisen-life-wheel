import { gameStore, getState } from '../store/gameStore'
import { register, resetOptions } from './options'
import type {
  BattleState,
  DistributionView,
  GameViewSnapshot,
  HistoryCheckpoint,
  HistoryReview,
} from './types'
import { distributionArcs, rotationForOption } from './wheel'

/** 回看切换时转盘吸附动画时长。 */
export const HISTORY_VIEW_MS = 300

function cloneBattle(battle: BattleState): BattleState {
  return {
    ...battle,
    log: battle.log.map((entry) => ({ ...entry })),
    foe: battle.foe ? { ...battle.foe } : null,
  }
}

function cloneDistribution(distribution: DistributionView): DistributionView {
  return {
    stage: distribution.stage,
    w: { ...distribution.w },
    pct: { ...distribution.pct },
    bpct: { ...distribution.bpct },
    notes: distribution.notes.map((note) => ({
      rule: note.rule,
      changes: note.changes.map((change) => ({ ...change })),
    })),
    total: distribution.total,
  }
}

function viewSnapshot(): GameViewSnapshot {
  const state = getState()
  return {
    wheelIndex: state.wheelIndex,
    displayIndex: state.displayIndex,
    rot: state.rot,
    highlight: state.highlight,
  }
}

/** 在一次实际抽取落地前，冻结当时的完整业务状态与概率分布。 */
export function captureCheckpoint(stageIndex: number, distribution: DistributionView): void {
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
    distribution: cloneDistribution(distribution),
  }
  gameStore.setState({ history: [...state.history, checkpoint] })
}

export function checkpointForRecord(recordIndex: number): HistoryCheckpoint | null {
  return getState().history.find((entry) => entry.recordIndex === recordIndex) || null
}

/** 某轮最近一次实际抽取在命运帖中的位置；跳过或未抽取返回 -1。 */
export function recordIndexForStage(stageId: string): number {
  const records = getState().records
  for (let index = records.length - 1; index >= 0; index--) {
    const record = records[index]
    if (!record.skipped && record.stageId === stageId) return index
  }
  return -1
}

/** 进入历史回看，只切换展示状态，不修改当前人生。 */
export function openHistoryReview(recordIndex: number): boolean {
  const state = getState()
  if (state.spinning || state.auto) return false

  const checkpoint = state.history.find((entry) => entry.recordIndex === recordIndex)
  const record = state.records[recordIndex]
  if (!checkpoint || !record || record.skipped) return false
  if (record.stageId !== checkpoint.stageId) return false
  if (typeof record.value !== 'string' || !record.value) return false

  const previous = state.review ? state.review.previous : viewSnapshot()
  const target = rotationForOption(
    state.rot,
    distributionArcs(checkpoint.distribution),
    record.value,
  )
  const review: HistoryReview = {
    recordIndex,
    checkpoint,
    originalValue: record.value,
    previous,
  }

  gameStore.setState({
    review,
    wheelIndex: checkpoint.stageIndex,
    displayIndex: checkpoint.stageIndex,
    highlight: record.value,
    spinDuration: HISTORY_VIEW_MS,
    ...(target == null ? {} : { rot: target }),
  })
  return true
}

/** 按顶部序号对应的轮次进入回看。 */
export function openHistoryForStage(stageIndex: number): boolean {
  const state = getState()
  const stage = state.stages[stageIndex]
  if (!stage) return false
  const entry = state.history.find(
    (item) => item.stageIndex === stageIndex && item.stageId === stage.id,
  )
  if (!entry) return false
  return openHistoryReview(entry.recordIndex)
}

/** 退出回看，按回看动效时长恢复进入前的轮次、角度与高亮。 */
export function closeHistoryReview(): boolean {
  const state = getState()
  if (!state.review) return false
  const { wheelIndex, displayIndex, rot, highlight } = state.review.previous
  gameStore.setState({
    review: null,
    wheelIndex,
    displayIndex,
    rot,
    highlight,
    spinDuration: HISTORY_VIEW_MS,
  })
  return true
}

/**
 * 恢复到某次抽取之前的业务状态，并清空该轮及其后的历史。
 * 调用方负责随后重新落地新结果；旧计时器由 gen 递增统一失效。
 */
export function restoreCheckpoint(checkpoint: HistoryCheckpoint): boolean {
  const state = getState()
  const stage = checkpoint.stages[checkpoint.stageIndex]
  if (!stage || stage.id !== checkpoint.stageId) return false

  const generation = state.gen + 1
  if (state.raf) cancelAnimationFrame(state.raf)
  resetOptions()
  checkpoint.stages.forEach(register)

  gameStore.setState({
    gen: generation,
    i: checkpoint.stageIndex,
    displayIndex: checkpoint.stageIndex,
    wheelIndex: checkpoint.stageIndex,
    stages: [...checkpoint.stages],
    results: { ...checkpoint.results },
    records: checkpoint.records.map((record) => ({ ...record })),
    battle: cloneBattle(checkpoint.battle),
    jutsuName: checkpoint.jutsuName,
    domainName: checkpoint.domainName,
    history: state.history.filter((entry) => entry.recordIndex < checkpoint.recordIndex),
    review: null,
    spinning: false,
    auto: false,
    done: false,
    pendingNext: null,
    highlight: null,
    spinDuration: 0,
    raf: 0,
  })
  return true
}
