import { useEffect, useRef } from 'react'
import { derived } from '../game/derive'
import { download } from '../lib/clipboard'
import { useGameStore } from '../store/useGameStore'
import styles from './Deliver.module.css'
import { Button } from './ui/Button'
import { CopyButton } from './ui/CopyButton'

export function StoryPanel() {
  const story = useGameStore((state) => state.story)
  const output = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (output.current) output.current.scrollTop = output.current.scrollHeight
  }, [story])

  return (
    <>
      <hr className="my-5 border-0 border-t border-solid border-line" />
      <h3 className="mb-2.5 font-display text-[17px]">此生的故事</h3>
      <pre ref={output} className={styles.story} tabIndex={0} aria-label="此生的故事">
        {story}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <CopyButton text={story} target={output}>
          复制故事
        </CopyButton>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => download('咒术回战·此生的故事.md', `# ${derived().title}\n\n${story}`)}
        >
          下载故事 .md
        </Button>
      </div>
    </>
  )
}
