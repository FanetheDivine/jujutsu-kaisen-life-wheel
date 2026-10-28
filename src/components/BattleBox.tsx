import { OPPONENT } from '../game/data'
import { oppOf } from '../game/rules'
import { useGameStore } from '../store/useGameStore'

export function BattleBox() {
  const battle = useGameStore((state) => state.battle)
  const results = useGameStore((state) => state.results)
  if (!battle.rounds) return null

  const opponent = battle.foe ? battle.foe.name : OPPONENT[oppOf(results)] || '对手'
  const phase = battle.phase || 1
  const isEvent = Boolean(battle.foe)
  const done = isEvent
    ? battle.log.filter((log) => log.side === 'p' && !log.extra && log.bout === battle.bout).length
    : battle.log.filter((log) => log.side === 'p' && !log.extra && (log.phase || 1) === phase)
        .length
  const heading = isEvent ? '事件战 ' : phase === 2 ? '二番战 ' : ''
  const max = Math.max(battle.p, battle.e, 1)
  const enemyName = `${opponent.length > 5 ? opponent.slice(0, 5) : opponent}${phase === 2 ? '·原身' : ''}`

  return (
    <div className="mt-3.5 rounded-sm border border-vermillion bg-[color-mix(in_oklab,var(--vermillion)_5%,transparent)] px-3.5 py-3">
      <div className="mb-2 flex flex-wrap justify-between gap-x-2.5 gap-y-1 text-[11px] tracking-[0.12em] text-ink-faint">
        <span>
          对手：
          <b className="font-display text-[12.5px] tracking-[0.04em] text-vermillion">
            {opponent}
            {phase === 2 ? '（原身）' : ''}
          </b>
        </span>
        <span>
          {heading}第 {Math.min(done, battle.rounds)} / {battle.rounds} 回合
        </span>
      </div>
      <div className="mb-[5px] grid grid-cols-[48px_1fr_34px] items-center gap-2 text-[11.5px]">
        <span>你</span>
        <span className="h-[7px] overflow-hidden rounded-full bg-paper-2">
          <i
            className="block h-full bg-indigo transition-[width] duration-500 ease-out-quart"
            style={{ width: `${(battle.p / max) * 100}%` }}
          />
        </span>
        <span className="text-right font-bold">{battle.p}</span>
      </div>
      <div className="mb-[5px] grid grid-cols-[48px_1fr_34px] items-center gap-2 text-[11.5px]">
        <span>{enemyName}</span>
        <span className="h-[7px] overflow-hidden rounded-full bg-paper-2">
          <i
            className="block h-full bg-vermillion transition-[width] duration-500 ease-out-quart"
            style={{ width: `${(battle.e / max) * 100}%` }}
          />
        </span>
        <span className="text-right font-bold">{battle.e}</span>
      </div>
    </div>
  )
}
