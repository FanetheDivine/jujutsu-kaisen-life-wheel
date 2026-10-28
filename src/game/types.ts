export type Rank = 'E' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'EX'
export type ResultContext = Record<string, string>
export type Weights = Record<string, number>
export type BattleSide = 'p' | 'e'

export interface WheelOption {
  id: string
  s?: string
  label: string
  base: number
  hint?: string
  rank?: Rank
  pw?: number
}

export interface CausalityRule {
  name: string | ((context: ResultContext) => string)
  when?: (context: ResultContext) => unknown
  apply: (weights: Weights, context: ResultContext) => void
}

export type StageKind =
  | 'core'
  | 'dim'
  | 'skill'
  | 'gear'
  | 'vow'
  | 'battle'
  | 'legacy'
  | 'event'
  | 'abs'
  | 'bout'
  | 'growth'
  | 'atk'
  | 'duel'
  | 'ending'

export interface Stage {
  id: string
  name: string
  desc: string
  kind: StageKind
  tag: string
  options: WheelOption[]
  rules?: CausalityRule[]
  skipIf?: (context: ResultContext) => boolean
  skipText?: string
  title?: string
  eraIdx?: number
  side?: BattleSide
  round?: number
  extra?: boolean
}

export interface EventDefinition {
  id: string
  eraIdx: number
  name: string
  title: string
  desc: string
  opts: Array<{
    k: string
    s: string
    label: string
    base: number
    hint?: string
  }>
  rules: CausalityRule[]
}

export interface KitOption {
  k: string
  s: string
  label: string
  base: number
  hint?: string
  pw: number
}

export interface LifeRecord {
  stageId: string
  value: string | null
  skipped: boolean
}

export interface BattleLog {
  round: number
  side: BattleSide
  extra: boolean
  phase: number
  bout: string
  label: string
  pw: number
}

export interface BattleFoe {
  key: string
  name: string
  note: string
  bonus: number
}

export interface BattleState {
  p: number
  e: number
  diff: number
  ce: number
  domainUsed: boolean
  rounds: number
  log: BattleLog[]
  extraCount: number
  phase: number
  prisonUsed: boolean
  bout: string
  foe: BattleFoe | null
}

export interface AppState {
  i: number
  results: ResultContext
  records: LifeRecord[]
  rot: number
  spinning: boolean
  auto: boolean
  sound: boolean
  done: boolean
  gen: number
  raf: number
  ctrl: AbortController | null
  battle: BattleState
  jutsuName: string
  domainName: string
  quickBout: boolean
}

export interface WeightChange {
  label: string
  d: number
  pp: number
}

export interface DistributionNote {
  rule: string
  changes: WeightChange[]
}

export interface DerivedLife {
  jutsu: string
  dom: string
  title: string
}
