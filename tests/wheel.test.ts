import { describe, expect, it } from 'vitest'
import { distributionArcs, mod360, optionAtAngle, rotationForOption } from '../src/game/wheel'
import type { DistributionView, Stage, WheelOption } from '../src/game/types'

function option(id: string, base = 1): WheelOption {
  return { id, label: `选项-${id}`, base }
}

function distribution(
  options: WheelOption[],
  pct: Record<string, number>,
  weights: Record<string, number> = pct,
): DistributionView {
  const stage: Stage = {
    id: 'test',
    name: '测试轮',
    desc: '测试',
    kind: 'core',
    tag: '测试',
    options,
  }
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0)
  return {
    stage,
    w: weights,
    pct,
    bpct: pct,
    notes: [],
    total,
  }
}

describe('转盘弧线', () => {
  it('只绘制概率大于 0.05% 的选项，并把可见概率归一化到 360 度', () => {
    const dist = distribution(
      [option('a'), option('b'), option('hidden')],
      { a: 50, b: 50, hidden: 0.04 },
      { a: 1, b: 1, hidden: 0.001 },
    )
    const arcs = distributionArcs(dist)

    expect(arcs.map((arc) => arc.option.id)).toEqual(['a', 'b'])
    expect(arcs[0].a0).toBe(0)
    expect(arcs[0].size).toBeCloseTo(180)
    expect(arcs[1].a0).toBeCloseTo(180)
    expect(arcs[1].a1).toBeCloseTo(360)
    expect(arcs.reduce((sum, arc) => sum + arc.size, 0)).toBeCloseTo(360)
  })

  it('概率总和不足 100% 时仍按可见部分的相对比例铺满整圈', () => {
    const arcs = distributionArcs(
      distribution([option('a'), option('b')], { a: 25, b: 25 }, { a: 1, b: 1 }),
    )

    expect(arcs[0].size).toBeCloseTo(180)
    expect(arcs[1].a1).toBeCloseTo(360)
  })

  it('空轮盘不产生弧线', () => {
    expect(distributionArcs(distribution([], {}, {}))).toEqual([])
  })
})

describe('指针角度与选项映射', () => {
  const dist = distribution(
    [option('a'), option('b'), option('c')],
    { a: 25, b: 50, c: 25 },
    { a: 1, b: 2, c: 1 },
  )
  const arcs = distributionArcs(dist)

  it('按顺时针角度找到对应扇区，边界归入后一个扇区', () => {
    expect(optionAtAngle(arcs, 0)?.option.id).toBe('a')
    expect(optionAtAngle(arcs, 89)?.option.id).toBe('a')
    expect(optionAtAngle(arcs, 90)?.option.id).toBe('b')
    expect(optionAtAngle(arcs, 269.9)?.option.id).toBe('b')
    expect(optionAtAngle(arcs, 270)?.option.id).toBe('c')
    expect(optionAtAngle(arcs, 359.9)?.option.id).toBe('c')
  })

  it('角度自动归一化', () => {
    expect(optionAtAngle(arcs, -270)?.option.id).toBe('b')
    expect(optionAtAngle(arcs, 450)?.option.id).toBe('b')
    expect(optionAtAngle(arcs, 720)?.option.id).toBe('a')
  })

  it('不可见选项不会被绘制成扇区', () => {
    const hidden = distribution([option('a'), option('hidden')], { a: 100, hidden: 0 })
    const visible = distributionArcs(hidden)

    expect(visible.map((arc) => arc.option.id)).toEqual(['a'])
    expect(optionAtAngle(visible, 180)?.option.id).toBe('a')
    expect(rotationForOption(0, visible, 'hidden')).toBeNull()
  })
})

describe('吸附角度', () => {
  const arcs = distributionArcs(
    distribution([option('a'), option('b')], { a: 50, b: 50 }, { a: 1, b: 1 }),
  )

  it('返回让目标扇区中心对准指针的最近旋转角度', () => {
    const target = rotationForOption(0, arcs, 'b')

    expect(target).not.toBeNull()
    if (target == null) throw new Error('缺少吸附角度')
    expect(mod360(-target)).toBeCloseTo(270)
    expect(optionAtAngle(arcs, mod360(-target))?.option.id).toBe('b')
  })

  it('跨过 0 度时选择最短旋转方向', () => {
    const target = rotationForOption(350, arcs, 'a')

    expect(target).toBe(270)
    if (target == null) throw new Error('缺少吸附角度')
    expect(mod360(-target)).toBeCloseTo(90)
  })

  it('不可见或不存在的结果返回 null', () => {
    expect(rotationForOption(0, arcs, 'missing')).toBeNull()
  })
})
