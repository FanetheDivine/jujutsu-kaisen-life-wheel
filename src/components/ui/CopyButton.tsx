import { useEffect, useRef, useState, type RefObject } from 'react'
import { copyText, selectNode } from '../../lib/clipboard'
import { Button } from './Button'

interface CopyButtonProps {
  text: string | null
  target?: RefObject<HTMLElement | null>
  children: string
}

export function CopyButton({ text, target, children }: CopyButtonProps) {
  const [label, setLabel] = useState(children)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const flash = (message: string): void => {
    setLabel(message)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => setLabel(children), 1600)
  }

  const onClick = async (): Promise<void> => {
    if (!text || !text.trim()) {
      flash('还没有内容可复制')
      return
    }
    try {
      await copyText(text)
      flash('已复制 ✓')
    } catch {
      if (target?.current && selectNode(target.current)) flash('已选中 · 请按 ⌘/Ctrl+C')
      else flash('复制失败 · 请手动选中')
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      {label}
    </Button>
  )
}
