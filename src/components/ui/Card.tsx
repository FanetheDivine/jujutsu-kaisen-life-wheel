import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string
  note?: ReactNode
}

export function Card({ title, note, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface p-[clamp(16px,2.2vw,24px)] shadow-card',
        className,
      )}
      {...props}
    >
      {title ? (
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-[15px] tracking-[0.18em] before:size-[5px] before:rotate-45 before:bg-vermillion before:content-['']">
            {title}
          </h3>
          {note ? (
            <span className="text-[11.5px] tracking-[0.06em] text-ink-faint">{note}</span>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
