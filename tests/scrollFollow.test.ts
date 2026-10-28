import { describe, expect, it } from 'vitest'
import { isNearBottom, nextScrollFollowState } from '../src/lib/scrollFollow'

describe('长内容滚动跟随', () => {
  it('短内容、底部及 48px 容差内视为正在看最新', () => {
    expect(isNearBottom({ scrollTop: 0, clientHeight: 300, scrollHeight: 200 })).toBe(true)
    expect(isNearBottom({ scrollTop: 652, clientHeight: 300, scrollHeight: 1000 })).toBe(true)
    expect(isNearBottom({ scrollTop: 651, clientHeight: 300, scrollHeight: 1000 })).toBe(false)
    expect(isNearBottom({ scrollTop: 700.5, clientHeight: 300, scrollHeight: 1000 })).toBe(true)
  })

  it('跟随时批量追加内容会更新已读位置', () => {
    expect(nextScrollFollowState({ following: true, seenCount: 2 }, 12)).toEqual({
      following: true,
      seenCount: 12,
    })
  })

  it('回看时追加内容不改变跟随和已读位置', () => {
    const paused = { following: false, seenCount: 12 }
    expect(nextScrollFollowState(paused, 20)).toBe(paused)
    expect(20 - nextScrollFollowState(paused, 20).seenCount).toBe(8)
  })

  it('清空或替换为较短内容后恢复初始跟随', () => {
    expect(nextScrollFollowState({ following: false, seenCount: 12 }, 0)).toEqual({
      following: true,
      seenCount: 0,
    })
    expect(nextScrollFollowState({ following: false, seenCount: 12 }, 3)).toEqual({
      following: true,
      seenCount: 3,
    })
  })

  it('没有新增内容时保留状态对象，避免重复更新', () => {
    const following = { following: true, seenCount: 12 }
    expect(nextScrollFollowState(following, 12)).toBe(following)
  })
})
