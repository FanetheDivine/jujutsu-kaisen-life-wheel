import { describe, expect, it } from 'vitest'
import { radarPoint, radarPoints, radarPolygon } from '../src/lib/radar'

describe('六轴雷达几何', () => {
  it('第 0 轴朝上，其余各轴按顺时针均分', () => {
    expect(radarPoint(100, 0, 180, 160, 100)).toEqual({ x: 180, y: 60 })

    const upperRight = radarPoint(100, 1, 180, 160, 100)
    expect(upperRight.x).toBeCloseTo(180 + 100 * Math.cos(-Math.PI / 6), 6)
    expect(upperRight.y).toBeCloseTo(110, 6)

    const bottom = radarPoint(100, 3, 180, 160, 100)
    expect(bottom.x).toBeCloseTo(180, 6)
    expect(bottom.y).toBeCloseTo(260, 6)
  })

  it('0 分落在圆心，越界与非数值被钳制到 0–100', () => {
    expect(radarPoint(0, 2, 180, 160, 100)).toEqual({ x: 180, y: 160 })
    expect(radarPoint(120, 0, 180, 160, 100)).toEqual({ x: 180, y: 60 })
    expect(radarPoint(-20, 0, 180, 160, 100)).toEqual({ x: 180, y: 160 })
    expect(radarPoint(Number.NaN, 0, 180, 160, 100)).toEqual({ x: 180, y: 160 })
  })

  it('轴数与数值个数一致，空数据不产生点', () => {
    expect(radarPoints([], 180, 160, 100)).toEqual([])
    expect(radarPoints([100, 80, 60, 40, 20, 0], 180, 160, 100)).toHaveLength(6)
  })

  it('生成固定两位小数的闭合多边形点串', () => {
    expect(radarPolygon([], 180, 160, 100)).toBe('')
    expect(radarPolygon([100, 0, 100, 0, 100, 0], 180, 160, 100)).toBe(
      '180.00,60.00 180.00,160.00 266.60,210.00 180.00,160.00 93.40,210.00 180.00,160.00',
    )
  })
})
