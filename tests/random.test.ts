import { describe, expect, it } from 'vitest'
import { mulberry32, seedOf } from '../src/random'

describe('确定性命名随机数', () => {
  it('相同种子生成相同序列，且取值位于 [0, 1)', () => {
    const first = mulberry32(seedOf('era|origin|domain'))
    const second = mulberry32(seedOf('era|origin|domain'))
    const firstSequence = Array.from({ length: 12 }, () => first())
    const secondSequence = Array.from({ length: 12 }, () => second())

    expect(firstSequence).toEqual(secondSequence)
    expect(firstSequence.every((value) => value >= 0 && value < 1)).toBe(true)
  })

  it('不同输入生成不同的种子与序列', () => {
    expect(seedOf('人生一')).not.toBe(seedOf('人生二'))
    const first = mulberry32(seedOf('人生一'))
    const second = mulberry32(seedOf('人生二'))

    expect(Array.from({ length: 4 }, () => first())).not.toEqual(
      Array.from({ length: 4 }, () => second()),
    )
  })
})
