import { derived } from '../game/derive'
import { download } from '../lib/clipboard'
import { useGameStore } from '../store/useGameStore'
import styles from './Deliver.module.css'
import { Button } from './ui/Button'
import { CopyButton } from './ui/CopyButton'
import { useScrollFollow } from './useScrollFollow'

export function StoryPanel() {
  const story = useGameStore((state) => state.story)
  const { output, onScroll, followLatest, following, unread } = useScrollFollow<HTMLPreElement>(
    'storyScroll',
    story,
  )

  return (
    <>
      <hr className="my-5 border-0 border-t border-solid border-line" />
      <h3 className="mb-2.5 font-display text-[17px]">此生的故事</h3>
      <pre
        ref={output}
        onScroll={onScroll}
        className={styles.story}
        tabIndex={0}
        aria-label="此生的故事"
      >
        {story}
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
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
        {!following ? (
          <Button variant="ghost" size="sm" onClick={followLatest}>
            {unread > 0 ? '有新内容 · 回到最新 ↓' : '回到最新 ↓'}
          </Button>
        ) : null}
      </div>
    </>
  )
}
