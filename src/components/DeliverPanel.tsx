import { useEffect, useRef } from 'react'
import { restart } from '../game/actions'
import { download } from '../lib/clipboard'
import { useGameStore } from '../store/useGameStore'
import styles from './Deliver.module.css'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { CopyButton } from './ui/CopyButton'

export function DeliverPanel() {
  const done = useGameStore((state) => state.done)
  const markdown = useGameStore((state) => state.markdown)
  const root = useRef<HTMLElement>(null)
  const output = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (done) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      root.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
    }
  }, [done])

  return (
    <section ref={root} hidden={!done} className="mt-7 scroll-mt-28 mid:scroll-mt-4">
      <Card title="此生交付" note="MARKDOWN · 人生档案">
        <div className="min-w-0">
          <h3 className="mb-2.5 font-display text-[17px]">完整档案（Markdown）</h3>
          <pre
            ref={output}
            className={styles.markdown}
            tabIndex={0}
            aria-label="完整档案（Markdown）"
          >
            {markdown}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <CopyButton text={markdown} target={output}>
              复制 Markdown
            </CopyButton>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => download('咒术回战·抽选人生.md', markdown)}
            >
              下载 .md
            </Button>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-[1.7] text-ink-faint">
            档案只记录这一生，可复制或下载自行保存。
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button variant="ghost" size="sm" onClick={restart}>
            再抽一生 ↺
          </Button>
        </div>
      </Card>
    </section>
  )
}
