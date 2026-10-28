import type { Rank, ResultContext } from './types'

export const RANK_SC: Record<Rank, number> = { E: 12, C: 26, B: 40, A: 55, S: 70, SS: 85, EX: 100 }
export const RANK_IDX: Record<Rank, number> = { E: 1, C: 2, B: 3, A: 4, S: 5, SS: 6, EX: 7 }
export const RANKS: Array<{ k: Rank; w: number }> = [
  { k: 'E', w: 1.5 },
  { k: 'C', w: 1.9 },
  { k: 'B', w: 1.6 },
  { k: 'A', w: 1.05 },
  { k: 'S', w: 0.52 },
  { k: 'SS', w: 0.16 },
  { k: 'EX', w: 0.045 },
]
export const RNK = (context: ResultContext, key: string): Rank | null => {
  const rank = context[key]?.split('_').pop()
  return rank && rank in RANK_SC ? (rank as Rank) : null
}
export const RV = (context: ResultContext, key: string): number => {
  const rank = RNK(context, key)
  return rank ? RANK_SC[rank] : 0
}
export const RI = (context: ResultContext, key: string): number => {
  const rank = RNK(context, key)
  return rank ? RANK_IDX[rank] : 0
}
export const rankOfScore = (score: number): Rank =>
  score >= 90
    ? 'EX'
    : score >= 78
      ? 'SS'
      : score >= 65
        ? 'S'
        : score >= 50
          ? 'A'
          : score >= 35
            ? 'B'
            : score >= 20
              ? 'C'
              : 'E'

export const DIMS = [
  { k: 'dim_ce', n: '咒力总量' },
  { k: 'dim_ct', n: '咒力操控' },
  { k: 'dim_tj', n: '体术' },
  { k: 'dim_bd', n: '体质' },
  { k: 'dim_lk', n: '外貌' },
  { k: 'dim_in', n: '智谋' },
]
