export interface RadarPoint {
  x: number
  y: number
}

/** 分数统一钳制到 0–100，非数值按 0 处理。 */
function clampScore(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
}

/** SVG 浮点噪声会让顶点落在 179.99999997 这类值上，按 1e-6 取整。 */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * 六轴雷达的第 0 轴朝上（12 点方向），其余轴按顺时针均分。
 * value 为该轴 0–100 的分数，0 分落在圆心，100 分落在半径端点。
 */
export function radarPoint(
  value: number,
  index: number,
  cx: number,
  cy: number,
  radius: number,
  sides = 6,
): RadarPoint {
  const ratio = clampScore(value) / 100
  const angle = (-90 + (360 / sides) * index) * (Math.PI / 180)
  return {
    x: round(cx + radius * ratio * Math.cos(angle)),
    y: round(cy + radius * ratio * Math.sin(angle)),
  }
}

/** 轴数由数值个数决定，空数组返回空点集。 */
export function radarPoints(
  values: readonly number[],
  cx: number,
  cy: number,
  radius: number,
): RadarPoint[] {
  return values.map((value, index) => radarPoint(value, index, cx, cy, radius, values.length))
}

/** 生成 SVG polygon 的 points 属性；空数据返回空串。 */
export function radarPolygon(
  values: readonly number[],
  cx: number,
  cy: number,
  radius: number,
): string {
  return radarPoints(values, cx, cy, radius)
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')
}
