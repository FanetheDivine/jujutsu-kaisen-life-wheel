import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-[5px] block text-xs text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="mt-[5px] block text-[11px] text-ink-faint">{hint}</span> : null}
    </label>
  )
}
