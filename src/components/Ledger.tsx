import { BY, labelOf } from '../game/options'
import { stageById } from '../game/registry'
import { cn } from '../lib/cn'
import { useGameStore } from '../store/useGameStore'
import styles from './Ledger.module.css'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { useScrollFollow } from './useScrollFollow'

export function Ledger() {
  const records = useGameStore((state) => state.records)
  const stages = useGameStore((state) => state.stages)
  const results = useGameStore((state) => state.results)
  const { output, onScroll, followLatest, following, unread } = useScrollFollow<HTMLDivElement>(
    'ledgerScroll',
    records.length,
  )

  return (
    <Card title="命运帖" note={`${records.length} / ${stages.length} 轮`}>
      <div
        ref={output}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label="命运记录"
        className={styles.viewport}
      >
        <ol className="flex list-none flex-col">
          {records.length === 0 ? (
            <li className="px-2.5 py-[34px] text-center text-[13px] text-ink-faint">
              <span className="mb-2 block font-display text-[40px] text-line">呪</span>
              尚未入场。
              <br />
              转动第一轮的瞬间，你的一生便开始被咒力书写。
            </li>
          ) : (
            records.map((record, index) => {
              const stage = stageById(record.stageId)
              let value = record.skipped ? '——' : labelOf(record.value)
              if (
                !record.skipped &&
                (record.stageId === 'battleRounds' || record.stageId === 'battleRounds2') &&
                (results.grade === 'g7' || results.grade === 'g8')
              ) {
                value += ' ＋1（SS / EX 自动追加）'
              }
              const hint = record.skipped
                ? stage.skipText || '此轮不存'
                : record.value && BY[record.value]
                  ? BY[record.value].hint || ''
                  : ''
              const attack = stage.kind === 'atk'
              return (
                <li
                  key={`${record.stageId}-${index}`}
                  className={cn(
                    'grid grid-cols-[28px_minmax(0,1fr)] sm:grid-cols-[38px_minmax(0,1fr)] gap-2.5 border-t border-dashed border-line py-2 first:border-t-0',
                    attack && 'py-[5px]',
                    index === records.length - 1 && styles.fresh,
                  )}
                >
                  <div className="pt-0.5 font-display text-[11px] tracking-[0.04em] text-vermillion">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-[10.5px] tracking-[0.12em] text-ink-faint">
                      {stage.name}
                      {stage.kind === 'event' && stage.title ? ` · ${stage.title}` : ''}
                    </div>
                    <div
                      className={cn(
                        'my-px font-display text-base tracking-[0.03em]',
                        record.skipped && 'text-ink-faint italic',
                        attack && 'm-0 text-[13.5px]',
                      )}
                    >
                      {value}
                      {attack && record.value && BY[record.value] ? (
                        <span className="ml-1 font-body text-[11px] font-bold tracking-[0.02em] text-vermillion">
                          {' '}
                          +{BY[record.value].pw || 0}
                        </span>
                      ) : null}
                    </div>
                    {attack ? null : <div className="text-[11.5px] text-ink-soft">{hint}</div>}
                  </div>
                </li>
              )
            })
          )}
        </ol>
      </div>
      {records.length > 0 ? (
        <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p role="status" className="text-xs text-ink-soft">
            {following
              ? '跟随最新 · 上滑可回看'
              : unread > 0
                ? `${unread} 条新记录 · 回看中`
                : '回看中 · 已暂停跟随'}
          </p>
          <Button size="sm" variant="ghost" onClick={followLatest} disabled={following}>
            {following ? '已在最新' : '回到最新 ↓'}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
