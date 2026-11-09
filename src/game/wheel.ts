import type { DistributionView, WheelOption } from './types'

export interface DistributionArc {
  option: WheelOption
  a0: number
  a1: number
  size: number
}

/** 角度归一化到 [0, 360)。 */
export function mod360(angle: number): number {
  return ((angle % 360) + 360) % 360
}

/**
 * 把当前概率分布切成转盘扇区。
 * 与旧的转盘绘制 / 落点逻辑一致：只画概率大于 0.05% 的选项，再把可见概率归一化到整圈。
 */
export function distributionArcs(distribution: DistributionView): DistributionArc[] {
  const items = distribution.stage.options.filter(
    (option) => (distribution.pct[option.id] || 0) > 0.05,
  )
  const sum = items.reduce((total, option) => total + (distribution.pct[option.id] || 0), 0)
  if (!items.length || sum <= 0) return []

  const arcs: DistributionArc[] = []
  let accumulated = 0
  items.forEach((option, index) => {
    const a0 = accumulated
    const a1 =
      index === items.length - 1 ? 360 : a0 + ((distribution.pct[option.id] || 0) / sum) * 360
    arcs.push({ option, a0, a1, size: a1 - a0 })
    accumulated = a1
  })
  return arcs
}

/** 指针当前指向的扇区；角度按转盘本地坐标（0 度在正上方，顺时针增长）。 */
export function optionAtAngle(arcs: DistributionArc[], angle: number): DistributionArc | null {
  if (!arcs.length) return null
  const normalized = mod360(angle)
  const found = arcs.find((arc) => normalized >= arc.a0 && normalized < arc.a1)
  return found || null
}

/** 让指定本地角度对准指针所需的最短旋转角。 */
export function rotationForAngle(fromRot: number, theta: number): number {
  const desired = mod360(-theta)
  const current = mod360(fromRot)
  const delta = ((desired - current + 540) % 360) - 180
  return fromRot + delta
}

/** 让指定选项扇区中心对准指针所需的最短旋转角；选项不可见时返回 null。 */
export function rotationForOption(
  fromRot: number,
  arcs: DistributionArc[],
  optionId: string,
): number | null {
  const arc = arcs.find((item) => item.option.id === optionId)
  if (!arc) return null
  return rotationForAngle(fromRot, (arc.a0 + arc.a1) / 2)
}
