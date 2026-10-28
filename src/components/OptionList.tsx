import type { CSSProperties } from 'react'
import type { distribution } from '../game/selectors'
import { cn } from '../lib/cn'
import { useGameStore } from '../store/useGameStore'
import styles from './Options.module.css'

type OptionListProps = { dist: ReturnType<typeof distribution> }
type OptionStyle = CSSProperties & { '--w': string }

export function OptionList({ dist }: OptionListProps) {
  const highlight = useGameStore((state) => state.highlight)

  return (
    <ul className="mt-4 flex list-none flex-col gap-1.5">
      {dist.stage.options.map((option) => {
        const percentage = dist.pct[option.id]
        const delta = percentage - dist.bpct[option.id]
        const zero = dist.w[option.id] <= 0
        return (
          <li
            key={option.id}
            data-id={option.id}
            className={cn(
              styles.option,
              zero && styles.zero,
              highlight === option.id && styles.win,
            )}
            style={{ '--w': `${percentage.toFixed(1)}%` } as OptionStyle}
          >
            <span className={cn(styles.label, 'text-[13.5px]')}>
              {option.label}
              {option.pw ? (
                <span className="ml-1 text-[11px] font-bold tracking-[0.02em] text-vermillion">
                  威力{option.pw}
                </span>
              ) : null}
            </span>
            <span className="min-w-10 text-right text-[13px] tabular-nums text-ink-soft">
              {zero ? '无缘' : `${percentage.toFixed(1)}%`}
            </span>
            <span
              className={cn(
                'min-w-9 text-right text-[11px] text-ink-faint',
                delta > 0.5 && 'text-vermillion',
                delta < -0.5 && 'text-indigo',
              )}
            >
              {Math.abs(delta) < 0.5
                ? '—'
                : `${delta > 0 ? '▲+' : '▼'}${Math.abs(delta).toFixed(0)}`}
            </span>
            {option.hint ? (
              <span className="col-span-full mt-px text-[11.5px] text-ink-faint">
                {option.hint}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
