export interface ScrollMetrics {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export interface ScrollFollowState {
  following: boolean
  seenCount: number
}

export function isNearBottom(metrics: ScrollMetrics): boolean {
  return metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop <= 48
}

export function nextScrollFollowState(view: ScrollFollowState, count: number): ScrollFollowState {
  if (count < view.seenCount) return { following: true, seenCount: count }
  if (view.following && count !== view.seenCount) return { following: true, seenCount: count }
  return view
}
