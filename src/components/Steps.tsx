import { useState } from 'react'
import { cn } from '../lib/cn'
import { useGameStore } from '../store/useGameStore'
import { HistoryDialog } from './HistoryDialog'

export function Steps() {
  const stages = useGameStore((state) => state.stages)
  const records = useGameStore((state) => state.records)
  const current = useGameStore((state) => state.i)
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null)

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-[3px]" aria-label="人生轮次进度">
        {stages.map((stage, index) => {
          const record = records[index]
          const drawable = Boolean(record && !record.skipped)
          const baseClassName = cn(
            'grid size-[21px] place-items-center rounded-[3px] border border-line text-[9.5px] text-ink-faint transition-all duration-250 ease-out-quart',
            stage.kind === 'atk' && 'opacity-80',
            record && !record.skipped && 'border-sector-line bg-paper-2 text-ink-soft',
            record?.skipped && 'text-ink-faint line-through opacity-55',
            index === current &&
              !record &&
              'border-vermillion bg-vermillion font-semibold text-[#fff4e8]',
            selectedHistory === index && 'border-vermillion text-vermillion',
          )

          if (!drawable) {
            return (
              <span key={`${stage.id}-${index}`} title={stage.name} className={baseClassName}>
                {index + 1}
              </span>
            )
          }

          return (
            <button
              key={`${stage.id}-${index}`}
              type="button"
              title={`${stage.name} · 点击查看，可重抽或手选`}
              aria-label={`查看第 ${index + 1} 轮抽取详情`}
              aria-haspopup="dialog"
              className={cn(
                baseClassName,
                'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion hover:border-vermillion hover:text-vermillion',
              )}
              onClick={() => setSelectedHistory(index)}
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
      {selectedHistory !== null ? (
        <HistoryDialog
          key={selectedHistory}
          recordIndex={selectedHistory}
          onClose={() => setSelectedHistory(null)}
        />
      ) : null}
    </>
  )
}
