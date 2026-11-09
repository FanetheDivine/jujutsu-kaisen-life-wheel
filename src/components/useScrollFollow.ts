import { useEffect, useLayoutEffect, useRef } from 'react'
import { isNearBottom, nextScrollFollowState } from '../lib/scrollFollow'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'

function contentCount(): number {
  return gameStore.getState().records.length
}

export function useScrollFollow<T extends HTMLElement>(content: number) {
  const output = useRef<T>(null)
  const view = useGameStore((state) => state.ledgerScroll)
  const generation = useGameStore((state) => state.gen)

  const onScroll = (): void => {
    const element = output.current
    if (!element?.getClientRects().length) return
    const previous = gameStore.getState().ledgerScroll
    const following = isNearBottom(element)
    const seenCount = following ? contentCount() : previous.seenCount
    if (following !== previous.following || seenCount !== previous.seenCount) {
      gameStore.setState({ ledgerScroll: { following, seenCount } })
    }
  }

  const followLatest = (): void => {
    gameStore.setState({ ledgerScroll: { following: true, seenCount: contentCount() } })
    const element = output.current
    if (element) {
      element.focus({ preventScroll: true })
      element.scrollTop = element.scrollHeight
    }
  }

  useLayoutEffect(() => {
    const element = output.current
    if (!element?.getClientRects().length) return
    const previous = gameStore.getState().ledgerScroll
    const next = nextScrollFollowState(previous, contentCount())
    if (next.following) element.scrollTop = element.scrollHeight
    if (next !== previous) gameStore.setState({ ledgerScroll: next })
  }, [content, generation, view.following])

  useEffect(() => {
    const element = output.current
    if (!element) return
    // CSS-hidden mobile panels report zero size; restore following when they reappear.
    const observer = new ResizeObserver(() => {
      if (!element.getClientRects().length) return
      const previous = gameStore.getState().ledgerScroll
      if (!previous.following) return
      element.scrollTop = element.scrollHeight
      const next = nextScrollFollowState(previous, contentCount())
      if (next !== previous) gameStore.setState({ ledgerScroll: next })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return {
    output,
    onScroll,
    followLatest,
    following: view.following,
    unread: Math.max(0, content - view.seenCount),
  }
}
