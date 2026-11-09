import { cn } from '../lib/cn'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'

const panels = [
  { id: 'draw', label: '抽选' },
  { id: 'ledger', label: '命运帖' },
  { id: 'stats', label: '咒力' },
] as const

export function MobileNav() {
  const selected = useGameStore((state) => state.mobilePanel)

  return (
    <nav
      aria-label="人生面板切换"
      className="sticky top-0 z-10 -mx-3 mb-4 border-b border-line bg-paper px-3 mid:hidden"
    >
      <div className="grid grid-cols-3">
        {panels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            aria-pressed={selected === panel.id}
            aria-controls={`panel-${panel.id}`}
            onClick={() => gameStore.setState({ mobilePanel: panel.id })}
            className={cn(
              'cursor-pointer -mb-px border-b-2 border-transparent py-2.5 text-[13px] leading-[1.2] tracking-[0.14em] transition duration-200 ease-out-quart hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermillion',
              selected === panel.id ? 'border-vermillion font-medium text-ink' : 'text-ink-faint',
            )}
          >
            {panel.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
