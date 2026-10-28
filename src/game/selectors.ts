import { gameStore, getState } from '../store/gameStore'
import type { DistributionNote, LifeRecord, WeightChange, Weights } from './types'

export function distribution(idx: number) {
  const { stages, results: context } = getState()
  const stage = stages[idx]
  const base: Weights = {}
  stage.options.forEach((option) => (base[option.id] = option.base))
  const weights: Weights = { ...base }
  const notes: DistributionNote[] = []
  const banned = new Set<string>()

  ;(stage.rules || []).forEach((rule) => {
    if (rule.when && !rule.when(context)) return
    const before = { ...weights }
    rule.apply(weights, context)
    const changes: WeightChange[] = []
    stage.options.forEach((option) => {
      const difference = weights[option.id] - before[option.id]
      if (Math.abs(difference) > 1e-6) {
        changes.push({ label: option.s || option.label, d: difference, pp: 0 })
      }
      if (before[option.id] > 0 && weights[option.id] <= 0) banned.add(option.id)
    })
    if (changes.length) {
      notes.push({
        rule: typeof rule.name === 'function' ? rule.name(context) : rule.name,
        changes,
      })
    }
  })

  for (const key in weights) weights[key] = Math.max(0, weights[key])
  banned.forEach((key) => {
    weights[key] = 0
  })
  let total = 0
  for (const key in weights) total += weights[key]
  const pct: Weights = {}
  stage.options.forEach((option) => {
    pct[option.id] = total ? (weights[option.id] / total) * 100 : 0
  })
  let baseTotal = 0
  for (const key in base) baseTotal += base[key]
  const bpct: Weights = {}
  stage.options.forEach((option) => {
    bpct[option.id] = (base[option.id] / baseTotal) * 100
  })
  notes.forEach((note) => note.changes.forEach((change) => (change.pp = (change.d / total) * 100)))
  return { stage, w: weights, pct, bpct, notes, total }
}

/** 找到下一个可抽轮次；record=true 时将跨过的轮次补记为「此轮不存」。 */
export function nextActiveIndex(from: number, record: boolean): number {
  const { stages, results, records } = getState()
  const skipped: LifeRecord[] = []
  for (let index = from; index < stages.length; index++) {
    const stage = stages[index]
    if (stage.skipIf && stage.skipIf(results)) {
      if (
        record &&
        !records.some((item) => item.stageId === stage.id) &&
        !skipped.some((item) => item.stageId === stage.id)
      ) {
        skipped.push({ stageId: stage.id, value: null, skipped: true })
      }
      continue
    }
    if (skipped.length) gameStore.setState({ records: [...records, ...skipped] })
    return index
  }
  if (skipped.length) gameStore.setState({ records: [...records, ...skipped] })
  return -1
}
