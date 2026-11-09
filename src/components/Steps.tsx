import { closeHistoryReview, openHistoryForStage } from '../game/history'
import { labelOf } from '../game/options'
import { cn } from '../lib/cn'
import { useGameStore } from '../store/useGameStore'

export function Steps() {
  const stages = useGameStore((state) => state.stages)
  const records = useGameStore((state) => state.records)
  const history = useGameStore((state) => state.history)
  const review = useGameStore((state) => state.review)
  const current = useGameStore((state) => state.i)
  const spinning = useGameStore((state) => state.spinning)
  const auto = useGameStore((state) => state.auto)
  const locked = spinning || auto

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-[3px]" aria-label="人生轮次进度">
        {stages.map((stage, index) => {
          const entry = history.find(
            (item) => item.stageIndex === index && item.stageId === stage.id,
          )
          const record = entry
            ? records[entry.recordIndex]
            : records.find((item) => item.stageId === stage.id)
          const clickable = !!entry && !!record && !record.skipped
          const active = clickable && review?.recordIndex === entry.recordIndex
          const className = cn(
            'grid size-[21px] place-items-center rounded-[3px] border border-line text-[9.5px] text-ink-faint transition-all duration-250 ease-out-quart',
            stage.kind === 'atk' && 'opacity-80',
            record && !record.skipped && 'border-sector-line bg-paper-2 text-ink-soft',
            record?.skipped && 'text-ink-faint line-through opacity-55',
            index === current &&
              !record &&
              'border-vermillion bg-vermillion font-semibold text-[#fff4e8]',
            active && 'border-indigo bg-indigo font-semibold text-[#f3f5ff] opacity-100',
            clickable &&
              "relative cursor-pointer after:absolute after:-inset-[3px] after:content-[''] hover:border-vermillion hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion disabled:cursor-wait disabled:opacity-50",
          )
          const title = clickable
            ? `回看第 ${index + 1} 轮：${stage.name}（原结果：${labelOf(record.value)}）`
            : stage.name

          if (!clickable) {
            return (
              <span key={`${stage.id}-${index}`} title={title} className={className}>
                {index + 1}
              </span>
            )
          }

          return (
            <button
              key={`${stage.id}-${index}`}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={active}
              disabled={locked}
              onClick={() => {
                if (active) closeHistoryReview()
                else openHistoryForStage(index)
              }}
              className={className}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      <div className="mb-3.5 h-[3px] overflow-hidden rounded-full bg-paper-2">
        <i
          className="block h-full bg-vermillion transition-[width] duration-400 ease-out-quart"
          style={{ width: `${((records.length / Math.max(stages.length, 1)) * 100).toFixed(1)}%` }}
        />
      </div>
    </>
  )
}
