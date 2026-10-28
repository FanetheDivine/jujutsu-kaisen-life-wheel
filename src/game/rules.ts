import { getState } from '../store/gameStore'
import { BY } from './options'
import { DIMS, RV } from './ranks'
import type { ResultContext } from './types'

export const GIFT_BONUS: Record<string, number> = {
  gift_none: 0,
  gift_six: 5,
  gift_arms: 4,
  gift_binding: 3,
  gift_rebirth: 3,
  gift_half: 2,
  gift_plasma: 1,
  gift_desukunto: 2,
}
export const EFFORT_BONUS: Record<string, number> = {
  ef_lazy: -1,
  ef_norm: 0,
  ef_hard: 1,
  ef_mad: 2,
  ef_genius: 1,
}
export function power(c: ResultContext): number {
  if (DIMS.some((d) => !c[d.k])) return 0
  const v =
    0.28 * RV(c, 'dim_ce') +
    0.2 * RV(c, 'dim_ct') +
    0.2 * RV(c, 'dim_tj') +
    0.15 * RV(c, 'dim_bd') +
    0.05 * RV(c, 'dim_lk') +
    0.12 * RV(c, 'dim_in')
  return Math.max(0, Math.min(100, Math.round(v + (GIFT_BONUS[c.gift] || 0))))
}
/* 决战对手：由羁绊 + 决战阵营共同决定 */
export function oppOf(c: ResultContext): string {
  const side = c.battleSide
  // 站在宿傩一侧 → 挡在你面前的是五条悟与整个高专；
  // 唯一的例外是「你的因果之人正是宿傩本人」——侍奉他的人，最后仍要独自面对他。
  if (side === 'bs_sukuna') return c.bond === 'b10' ? 'b10' : 'b1'
  if (side === 'bs_jujutsu') return c.bond === 'b1' ? 'b10' : c.bond || 'b13'
  return c.bond || 'b13'
}
/* 术式 / 领域的名字：抽到具体名字就用具体的，抽到「自创」就用生成的 */
export function techLabel(c: ResultContext, generatedName = getState().jutsuName): string {
  if (!c.technique) return '——'
  if (c.technique === 'tc_original') return generatedName || '自创术式'
  return BY[c.technique] ? BY[c.technique].label : '自创术式'
}
export function domLabel(c: ResultContext, generatedName = getState().domainName): string {
  if (!c.domain || c.domain === 'd0') return '——'
  if (c.domainName === 'dn_original') return generatedName || '自创领域'
  return BY[c.domainName]
    ? BY[c.domainName].label.replace(/[「」（）]/g, '')
    : generatedName || '领域'
}
