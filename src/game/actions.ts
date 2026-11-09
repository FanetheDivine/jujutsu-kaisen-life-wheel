import { createInitialGameState, gameStore, getState } from '../store/gameStore'
import { beep } from './audio'
import { syncDerivedNames } from './derive'
import { applyAction, expandAfter } from './flow'
import {
  captureCheckpoint,
  checkpointForRecord,
  recordIndexForStage,
  restoreCheckpoint,
} from './history'
import { createBaseFlow } from './registry'
import { distribution, nextActiveIndex } from './selectors'
import type { Weights } from './types'
import { distributionArcs, rotationForOption } from './wheel'

const mod360 = (angle: number): number => ((angle % 360) + 360) % 360

/** 转动结束到落地结算之间的余量（毫秒）。 */
export const SPIN_SETTLE_MS = 60

/** 各类转动时长（毫秒）：手动、减少动效、自动连抽、战斗快进、自动接续。 */
export const SPIN_MS = {
  normal: 900,
  reduced: 300,
  auto: 100,
  battle: 450,
  chain: 200,
} as const

/** 手转松手后吸附到扇区中心的时长。 */
export const MANUAL_SNAP_MS = 320

/** 按转动时长选择圈数：时长越短圈数越少，避免高速旋转糊成一片。 */
export function spinTurns(duration: number): number {
  if (duration >= 1200) return 3 + Math.floor(Math.random() * 3)
  if (duration >= 400) return 2
  return 1
}

export function pickWeighted(weights: Weights): string | null {
  const ids = Object.keys(weights).filter((key) => weights[key] > 0)
  if (!ids.length) return null
  const total = ids.reduce((sum, key) => sum + weights[key], 0)
  let random = Math.random() * total
  for (const id of ids) {
    random -= weights[id]
    if (random <= 0) return id
  }
  return ids[ids.length - 1]
}

export function doSpin(duration: number): void {
  const state = getState()
  if (state.spinning || state.done || state.pendingNext != null || state.i >= state.stages.length) {
    return
  }
  const idx = state.i
  const dist = distribution(idx)
  const pick = pickWeighted(dist.w)
  const items = dist.stage.options.filter((option) => dist.pct[option.id] > 0.05)
  const sum = items.reduce((total, option) => total + dist.pct[option.id], 0)
  let accumulated = 0
  let arc: { a0: number; size: number } | null = null
  for (const option of items) {
    const size = (dist.pct[option.id] / sum) * 360
    if (option.id === pick) {
      arc = { a0: accumulated, size }
      break
    }
    accumulated += size
  }
  arc = arc || { a0: 0, size: 360 / Math.max(items.length, 1) }
  const margin = Math.min(arc.size * 0.3, 5)
  const theta = arc.a0 + margin + Math.random() * Math.max(arc.size - margin * 2, 0.2)
  const turns = spinTurns(duration)
  const target = state.rot + turns * 360 + mod360(mod360(-theta) - mod360(state.rot))
  const generation = state.gen
  const startedAt = performance.now()
  const rotationStart = state.rot
  let lastTick = -1
  let raf = 0

  gameStore.setState({ spinning: true, spinDuration: duration })
  const tickLoop = (now: number): void => {
    if (getState().gen !== generation) return
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - Math.pow(1 - progress, 4)
    const angle = rotationStart + (target - rotationStart) * eased
    const tick = Math.floor(mod360(-angle) / 5)
    if (tick !== lastTick) {
      lastTick = tick
      beep(1120 + Math.random() * 160, 0.04, 0.045)
    }
    raf = requestAnimationFrame(tickLoop)
  }
  raf = requestAnimationFrame(tickLoop)
  gameStore.setState({ raf })
  requestAnimationFrame(() => {
    if (getState().gen === generation) gameStore.setState({ rot: target })
  })

  setTimeout(() => {
    cancelAnimationFrame(raf)
    if (getState().gen !== generation) return
    gameStore.setState({ rot: target, raf: 0 })
    beep(320, 0.5, 0.09)
    setTimeout(() => beep(196, 0.8, 0.08), 90)
    land(idx, pick)
  }, duration + SPIN_SETTLE_MS)
}

export function land(idx: number, pick: string | null, immediate = false): void {
  const state = getState()
  const generation = state.gen
  const stage = state.stages[idx]
  if (!stage) return

  if (pick == null) {
    gameStore.setState({
      wheelIndex: idx,
      highlight: null,
      records: [...state.records, { stageId: stage.id, value: null, skipped: true }],
    })
    const next = nextActiveIndex(idx + 1, true)
    if (next === -1) {
      setTimeout(() => {
        if (getState().gen !== generation) return
        gameStore.setState({ spinning: false })
        finish()
      }, 600)
      return
    }
    gameStore.setState({ i: next })
    if (immediate) {
      gameStore.setState({ spinning: false, displayIndex: next, wheelIndex: next })
    } else {
      setTimeout(() => {
        if (getState().gen !== generation) return
        gameStore.setState({ spinning: false, displayIndex: next, wheelIndex: next })
      }, 260)
    }
    return
  }

  gameStore.setState({ wheelIndex: idx, highlight: pick })
  captureCheckpoint(idx, distribution(idx))
  expandAfter(idx, stage.id, pick)
  const current = getState()
  const results = { ...current.results, [stage.id]: pick }
  if (stage.id === 'duel2') results.duel = pick
  gameStore.setState({
    results,
    records: [...current.records, { stageId: stage.id, value: pick, skipped: false }],
  })
  if (stage.kind === 'atk') applyAction(stage.id, pick)
  // 旧实现由行动结算后的 renderStats 同步名称；保持当前回合标签时序。
  syncDerivedNames()
  const next = nextActiveIndex(idx + 1, true)
  // 真实抽取默认停在结果上，等用户看完后点转盘中心的箭头推进；
  // 自动连抽与战斗快进保持原来的自动切轮节奏。
  if (!immediate && !current.auto) {
    gameStore.setState({ spinning: false, pendingNext: next })
    return
  }
  if (next === -1) {
    setTimeout(() => {
      if (getState().gen !== generation) return
      gameStore.setState({ spinning: false })
      finish()
    }, 700)
    return
  }
  gameStore.setState({ i: next })
  if (immediate) {
    gameStore.setState({ spinning: false, displayIndex: next, wheelIndex: next, highlight: null })
    return
  }
  setTimeout(() => {
    if (getState().gen !== generation) return
    gameStore.setState({
      spinning: false,
      displayIndex: next,
      wheelIndex: next,
      highlight: null,
    })
    setTimeout(() => {
      if (getState().gen === generation) doSpin(SPIN_MS.chain)
    }, 90)
  }, 100)
}

/** 落地停留后推进下一轮并立即开抽；没有下一轮时收束终局。 */
export function advance(): void {
  const state = getState()
  if (state.spinning || state.done || state.pendingNext == null) return
  const next = state.pendingNext
  if (next === -1) {
    gameStore.setState({ pendingNext: null })
    finish()
    return
  }
  gameStore.setState({
    pendingNext: null,
    i: next,
    displayIndex: next,
    wheelIndex: next,
    highlight: null,
  })
  doSpin(preferredSpinDuration())
}

export function forceLand(idx: number, immediate = false): void {
  land(idx, pickWeighted(distribution(idx).w), immediate)
}

/** 普通转动与箭头推进共用时长；尊重系统的减少动态偏好。 */
function preferredSpinDuration(): number {
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return reduced ? SPIN_MS.reduced : SPIN_MS.normal
}

export function spinNow(): void {
  doSpin(preferredSpinDuration())
}

export function skipStage(): void {
  const state = getState()
  if (state.spinning || state.done || state.pendingNext != null || state.i >= state.stages.length) {
    return
  }
  gameStore.setState({ auto: false, spinning: true })
  forceLand(state.i)
}

export function startAuto(): void {
  if (getState().spinning || getState().done || getState().pendingNext != null) return
  gameStore.setState({ auto: true })
  doSpin(SPIN_MS.auto)
}

function aimAtPick(stageIndex: number, pick: string): void {
  const target = rotationForOption(getState().rot, distributionArcs(distribution(stageIndex)), pick)
  gameStore.setState({
    spinDuration: MANUAL_SNAP_MS,
    ...(target == null ? {} : { rot: target }),
  })
}

/**
 * 把某次已抽取轮次替换为指定结果。
 * 先恢复该轮抽取前快照，再走正常落地流程；该轮及其后的旧记录全部作废。
 */
export function rewriteRecord(recordIndex: number, pick: string): boolean {
  const state = getState()
  if (state.spinning || state.auto) return false

  const checkpoint = checkpointForRecord(recordIndex)
  if (!checkpoint) return false
  const stage = checkpoint.stages[checkpoint.stageIndex]
  if (!stage || stage.id !== checkpoint.stageId) return false
  if (!stage.options.some((option) => option.id === pick)) return false

  const record = state.records[recordIndex]
  if (!record || record.skipped || record.stageId !== checkpoint.stageId) return false
  if (record.value === pick) return false

  if (!restoreCheckpoint(checkpoint)) return false
  land(checkpoint.stageIndex, pick)
  aimAtPick(checkpoint.stageIndex, pick)
  beep(480, 0.18, 0.06)
  return true
}

/**
 * 手转转盘的唯一入口：回看时改写该轮，否则改写当前轮；
 * 结果没有变化时返回 false，不修改任何状态。
 */
export function manualPick(pick: string): boolean {
  const state = getState()
  if (state.spinning || state.auto) return false

  if (state.review) return rewriteRecord(state.review.recordIndex, pick)

  const stageIndex = state.wheelIndex
  const stage = state.stages[stageIndex]
  if (!stage || !stage.options.some((option) => option.id === pick)) return false

  const recordIndex = recordIndexForStage(stage.id)
  if (recordIndex >= 0) return rewriteRecord(recordIndex, pick)

  land(stageIndex, pick)
  aimAtPick(stageIndex, pick)
  beep(480, 0.18, 0.06)
  return true
}

export function resolveBattle(): void {
  if (getState().spinning || getState().done || getState().pendingNext != null) return
  gameStore.setState({ spinning: true })
  let guard = 0
  while (getState().i < getState().stages.length && guard++ < 60) {
    const state = getState()
    const stage = state.stages[state.i]
    if (stage.kind === 'atk' || /^br\d$/.test(stage.id) || /^ed\d$/.test(stage.id)) {
      forceLand(state.i, true)
      continue
    }
    break
  }
  const state = getState()
  const id = state.i < state.stages.length ? state.stages[state.i].id : ''
  gameStore.setState({ spinning: false })
  if (id === 'duel' || id === 'duel2') doSpin(SPIN_MS.battle)
}

export function finish(): void {
  const state = getState()
  if (state.done) return
  gameStore.setState({ done: true, auto: false })
}

export function restart(): void {
  const state = getState()
  const generation = state.gen + 1
  if (state.raf) cancelAnimationFrame(state.raf)
  const { sound, quickBout } = state
  gameStore.setState({
    ...createInitialGameState(),
    gen: generation,
    sound,
    quickBout,
    // 一次发布完整初始状态，避免订阅者观察到 stages 为空的中间帧。
    stages: createBaseFlow(),
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
