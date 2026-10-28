import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { manualSelectPast, redrawPast } from '../game/actions'
import type { WheelOption } from '../game/types'
import { cn } from '../lib/cn'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'
import { Button } from './ui/Button'
import styles from './HistoryDialog.module.css'

type HistoryDialogProps = {
  recordIndex: number
  onClose: () => void
}

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function HistoryDialog({ recordIndex, onClose }: HistoryDialogProps) {
  const entry = useGameStore((state) =>
    state.history.find((item) => item.recordIndex === recordIndex),
  )
  const originalRecord = useGameStore((state) => state.records[recordIndex])
  const locked = useGameStore((state) => state.spinning || state.auto)
  const [pendingOption, setPendingOption] = useState<WheelOption | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const confirmRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()

    return () => {
      const previous = restoreFocusRef.current
      if (previous?.isConnected) {
        previous.focus()
        return
      }
      // 重抽会立刻截断记录，原格子可能退化为不可聚焦的进度格；此时回到转盘。
      document.querySelector<HTMLElement>('[data-history-focus="wheel"]')?.focus()
    }
  }, [])

  useEffect(() => {
    if (pendingOption) {
      const cancel = confirmRef.current?.querySelector<HTMLElement>('[data-confirm-cancel]')
      ;(cancel ?? confirmRef.current)?.focus()
      return
    }
    panelRef.current?.focus()
  }, [pendingOption])

  if (!entry || !originalRecord || originalRecord.skipped) return null

  const originalOption = entry.distribution.stage.options.find(
    (option) => option.id === originalRecord.value,
  )

  const returnToDrawPanel = () => {
    gameStore.setState({ mobilePanel: 'draw' })
    onClose()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (pendingOption) {
        setPendingOption(null)
      } else {
        onClose()
      }
      return
    }

    if (event.key !== 'Tab') return
    const container = pendingOption ? confirmRef.current : panelRef.current
    if (!container) return
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    if (!focusable.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === container)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleRedraw = () => {
    if (locked) return
    if (redrawPast(recordIndex)) returnToDrawPanel()
  }

  const handleConfirm = () => {
    if (!pendingOption || locked) return
    const changed = manualSelectPast(recordIndex, pendingOption.id)
    setPendingOption(null)
    if (changed) returnToDrawPanel()
  }

  return (
    <div
      className={styles.overlay}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-dialog-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>命运回溯 · 第 {recordIndex + 1} 轮</span>
          <h2 id="history-dialog-title" className={styles.title}>
            {entry.distribution.stage.name}
            <span className="ml-2 align-middle text-[11px] tracking-[0.1em] text-ink-faint">
              {entry.distribution.stage.tag}
            </span>
          </h2>
          <p className={styles.stageDesc}>{entry.distribution.stage.desc}</p>
        </header>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>原抽中结果</h3>
            <p className={styles.original}>
              <span className={styles.originalLabel}>
                {originalOption?.label || originalRecord.value}
              </span>
              {originalOption?.hint ? <span> · {originalOption.hint}</span> : null}
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>当时的选项概率</h3>
            <div className={styles.options}>
              {entry.distribution.stage.options.map((option) => {
                const pct = entry.distribution.pct[option.id] || 0
                const delta = pct - (entry.distribution.bpct[option.id] || 0)
                const isOriginal = option.id === originalRecord.value
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(styles.option, pct <= 0 && styles.zero, isOriginal && styles.win)}
                    style={{ '--w': `${pct}%` } as CSSProperties}
                    title={option.hint}
                    disabled={locked}
                    aria-label={`手动选择 ${option.label}，当时概率 ${pct.toFixed(1)}%`}
                    onClick={() => setPendingOption(option)}
                  >
                    <span className={styles.optionLabel}>
                      {option.label}
                      {isOriginal ? <span className={styles.badge}>原中</span> : null}
                    </span>
                    <span className={styles.optionMeta}>
                      {Math.abs(delta) >= 0.05 ? (
                        <span
                          className={cn(
                            styles.optionDelta,
                            delta > 0 ? styles.deltaUp : styles.deltaDown,
                          )}
                        >
                          {delta > 0 ? '▲' : '▼'}
                          {Math.abs(delta).toFixed(1)}pp
                        </span>
                      ) : null}
                      <span className={cn(styles.optionPct, pct <= 0 && styles.zeroTag)}>
                        {pct <= 0 ? '无缘' : `${pct.toFixed(1)}%`}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>当时的因果干涉</h3>
            {entry.distribution.notes.length ? (
              <ul className={styles.notes}>
                {entry.distribution.notes.map((note, index) => (
                  <li key={`${note.rule}-${index}`} className={styles.notesItem}>
                    <span className={styles.noteName}>{note.rule}</span> →{' '}
                    {note.changes.map((change, changeIndex) => (
                      <span key={`${change.label}-${changeIndex}`}>
                        {changeIndex ? ' ／ ' : ''}
                        {change.label}{' '}
                        <span className={change.pp > 0 ? styles.deltaUp : styles.deltaDown}>
                          {change.pp > 0 ? '↑' : '↓'}
                          {Math.abs(change.pp).toFixed(0)}pp
                        </span>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.notesEmpty}>此轮不受干涉。</p>
            )}
            {locked ? (
              <p className={styles.lockNotice}>命运推演中：可以查看，但暂不能重抽或手选。</p>
            ) : (
              <p className={cn(styles.lockNotice, 'text-ink-faint')}>
                点击任意选项可自由改命；重抽会重新随机这一轮。
              </p>
            )}
          </section>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footNote}>改写后，这一轮原结果与其后的命运都会永久作废。</p>
          <div className={styles.actions}>
            <Button size="sm" onClick={onClose}>
              关闭
            </Button>
            <Button size="sm" disabled={locked} onClick={handleRedraw}>
              重抽
            </Button>
          </div>
        </footer>
      </div>

      {pendingOption ? (
        <div
          className={styles.confirm}
          onClick={(event) => event.target === event.currentTarget && setPendingOption(null)}
        >
          <div
            ref={confirmRef}
            className={styles.confirmPanel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="history-confirm-title"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            <h2 id="history-confirm-title" className={styles.confirmTitle}>
              确认改写命运？
            </h2>
            <p className={styles.confirmBody}>
              第 {recordIndex + 1} 轮将由「{originalOption?.label || originalRecord.value}」改为：
            </p>
            <p className={styles.choice}>
              <span className={styles.choiceStrong}>{pendingOption.label}</span>
              {pendingOption.hint ? <span> · {pendingOption.hint}</span> : null}
            </p>
            <p className={styles.warning}>
              确认后不再随机；第 {recordIndex + 1}{' '}
              轮原结果及其后的所有结果、记录、动态分支和命运快照都会永久作废，且无法恢复。
            </p>
            <div className={styles.confirmActions}>
              <Button size="sm" data-confirm-cancel="true" onClick={() => setPendingOption(null)}>
                取消
              </Button>
              <Button size="sm" variant="primary" onClick={handleConfirm}>
                确认改命
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
