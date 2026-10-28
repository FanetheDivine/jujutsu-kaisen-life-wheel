import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Chip({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'min-w-0 max-w-full rounded-full border border-line [overflow-wrap:anywhere] bg-paper-2 px-2.5 py-1 text-xs [&_b]:font-display [&_b]:font-semibold',
        className,
      )}
      {...props}
    />
  )
}
