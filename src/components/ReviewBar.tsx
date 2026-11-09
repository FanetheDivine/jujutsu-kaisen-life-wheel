import { closeHistoryReview } from '../game/history'
import { labelOf } from '../game/options'
import { Button } from './ui/Button'
import { useGameStore } from '../store/useGameStore'

export function ReviewBar() {
  const review = useGameStore((state) => state.review)
  const records = useGameStore((state) => state.records)
  if (!review) return null

  const laterPicks = records
    .slice(review.recordIndex + 1)
    .filter((record) => !record.skipped).length
  const stage = review.checkpoint.distribution.stage

  return (
    <div
      aria-live="polite"
      className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-sm border border-indigo bg-[color-mix(in_oklab,var(--indigo)_7%,transparent)] px-3 py-2 text-[11.5px] leading-[1.55] text-ink-soft"
    >
      <span className="font-semibold tracking-[0.12em] text-indigo">
        回看 · 第 {review.checkpoint.stageIndex + 1} 轮
      </span>
      <span>
        {stage.name} · 原结果「{labelOf(review.originalValue)}」
      </span>
      <span className="text-ink-faint">
        {laterPicks > 0
          ? `拖动转盘改命；结果改变才会作废后续 ${laterPicks} 次抽取、动态分支与战斗记录。`
          : '拖动转盘改命；本轮之后尚无已抽取结果。'}
      </span>
      <Button size="sm" className="ml-auto whitespace-nowrap" onClick={closeHistoryReview}>
        返回当前
      </Button>
    </div>
  )
}
