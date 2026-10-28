import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'
import { Button } from './ui/Button'

const panels = [
  { id: 'draw', label: '抽选' },
  { id: 'ledger', label: '命运帖' },
  { id: 'stats', label: '咒力' },
] as const

export function MobileNav() {
  const selected = useGameStore((state) => state.mobilePanel)
  const records = useGameStore((state) => state.records)
  const stages = useGameStore((state) => state.stages)
  const done = useGameStore((state) => state.done)

  return (
    <nav
      aria-label="人生面板切换"
      className="sticky top-0 z-10 -mx-3 mb-4 border-b border-line bg-paper px-3 pt-2 pb-3 mid:hidden"
    >
      <div className="mb-2 flex items-center justify-between text-[11px] tracking-[0.08em] text-ink-soft">
        <span>{done ? '此生已尽 · 档案在下方' : '前轮定后轮 · 一命到底'}</span>
        <span>
          {records.length} / {stages.length} 轮
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {panels.map((panel) => (
          <Button
            key={panel.id}
            variant={selected === panel.id ? 'primary' : 'default'}
            size="sm"
            aria-pressed={selected === panel.id}
            aria-controls={`panel-${panel.id}`}
            onClick={() => gameStore.setState({ mobilePanel: panel.id })}
          >
            {panel.label}
          </Button>
        ))}
      </div>
    </nav>
  )
}
