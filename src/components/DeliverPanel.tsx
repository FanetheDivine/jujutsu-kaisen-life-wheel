import { useEffect, useRef } from 'react'
import { restart } from '../game/actions'
import { download } from '../lib/clipboard'
import { useGameStore } from '../store/useGameStore'
import { ApiPanel } from './ApiPanel'
import styles from './Deliver.module.css'
import { StoryPanel } from './StoryPanel'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { CopyButton } from './ui/CopyButton'

export function DeliverPanel() {
  const done = useGameStore((state) => state.done)
  const markdown = useGameStore((state) => state.markdown)
  const systemPrompt = useGameStore((state) => state.systemPrompt)
  const root = useRef<HTMLElement>(null)
  const output = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (done) root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [done])

  if (!done) return null

  return (
    <section ref={root} className="mt-7">
      <Card title="此生交付" note="MARKDOWN · AI PROMPT · STORY">
        <div className="grid grid-cols-1 gap-[clamp(18px,2.4vw,28px)] mid:grid-cols-2">
          <div>
            <h3 className="mb-2.5 font-display text-[17px]">① 完整档案（Markdown）</h3>
            <pre ref={output} className={styles.markdown}>
              {markdown}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <CopyButton text={markdown} target={output}>
                复制 Markdown
              </CopyButton>
              <CopyButton
                text={`【系统提示词】\n${systemPrompt}\n\n【用户消息】\n${markdown}`}
                target={output}
              >
                复制提示词＋档案
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
              不打算用 API？点「复制提示词＋档案」，整段粘贴进任意聊天 AI（ChatGPT / Claude /
              DeepSeek / Kimi…）即可；或直接下载 Markdown 自行保存。
            </p>
          </div>
          <div>
            <ApiPanel />
            <StoryPanel />
          </div>
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
