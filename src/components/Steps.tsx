import { cn } from '../lib/cn'
import { useGameStore } from '../store/useGameStore'

export function Steps() {
  const stages = useGameStore((state) => state.stages)
  const records = useGameStore((state) => state.records)
  const current = useGameStore((state) => state.i)

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-[3px]" aria-label="人生轮次进度">
        {stages.map((stage, index) => {
          const record = records.find((item) => item.stageId === stage.id)
          return (
            <span
              key={`${stage.id}-${index}`}
              title={stage.name}
              className={cn(
                'grid size-[21px] place-items-center rounded-[3px] border border-line text-[9.5px] text-ink-faint transition-all duration-250 ease-out-quart',
                stage.kind === 'atk' && 'opacity-80',
                record && !record.skipped && 'border-sector-line bg-paper-2 text-ink-soft',
                record?.skipped && 'text-ink-faint line-through opacity-55',
                index === current &&
                  !record &&
                  'border-vermillion bg-vermillion font-semibold text-[#fff4e8]',
              )}
            >
              {index + 1}
            </span>
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
