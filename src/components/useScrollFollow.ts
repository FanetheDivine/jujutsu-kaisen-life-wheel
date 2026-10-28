import { useEffect, useLayoutEffect, useRef } from 'react'
import { isNearBottom, nextScrollFollowState } from '../lib/scrollFollow'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'

type ScrollKey = 'ledgerScroll' | 'storyScroll'

function contentCount(key: ScrollKey): number {
  const state = gameStore.getState()
  return key === 'ledgerScroll' ? state.records.length : state.story.length
}

export function useScrollFollow<T extends HTMLElement>(key: ScrollKey, content: number | string) {
  const output = useRef<T>(null)
  const view = useGameStore((state) => state[key])
  const generation = useGameStore((state) => state.gen)

  const onScroll = (): void => {
    const element = output.current
    if (!element?.getClientRects().length) return
    const previous = gameStore.getState()[key]
    const following = isNearBottom(element)
    const seenCount = following ? contentCount(key) : previous.seenCount
    if (following !== previous.following || seenCount !== previous.seenCount) {
      gameStore.setState({ [key]: { following, seenCount } })
    }
  }

  const followLatest = (): void => {
    gameStore.setState({ [key]: { following: true, seenCount: contentCount(key) } })
    const element = output.current
    if (element) {
      element.focus({ preventScroll: true })
      element.scrollTop = element.scrollHeight
    }
  }

  useLayoutEffect(() => {
    const element = output.current
    if (!element?.getClientRects().length) return
    const previous = gameStore.getState()[key]
    const next = nextScrollFollowState(previous, contentCount(key))
    if (next.following) element.scrollTop = element.scrollHeight
    if (next !== previous) gameStore.setState({ [key]: next })
  }, [content, generation, key, view.following])

  useEffect(() => {
    const element = output.current
    if (!element) return
    // CSS-hidden mobile panels report zero size; restore following when they reappear.
    const observer = new ResizeObserver(() => {
      if (!element.getClientRects().length) return
      const previous = gameStore.getState()[key]
      if (!previous.following) return
      element.scrollTop = element.scrollHeight
      const next = nextScrollFollowState(previous, contentCount(key))
      if (next !== previous) gameStore.setState({ [key]: next })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [key])

  return {
    output,
    onScroll,
    followLatest,
    following: view.following,
    unread: Math.max(0, (typeof content === 'number' ? content : content.length) - view.seenCount),
  }
}
