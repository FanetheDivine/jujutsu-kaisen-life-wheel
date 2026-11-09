import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { advance, MANUAL_SNAP_MS, manualPick, spinNow } from '../game/actions'
import { closeHistoryReview, recordIndexForStage } from '../game/history'
import { distribution, heldDistribution } from '../game/selectors'
import {
  angleDelta,
  distributionArcs,
  mod360,
  nearestEquivalentRotation,
  optionAtAngle,
  rotationForOption,
} from '../game/wheel'
import { cn } from '../lib/cn'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'
import styles from './Wheel.module.css'

type DragState = {
  pointerId: number
  startRotation: number
  rotation: number
  lastAngle: number
  moved: boolean
}

const DRAG_THRESHOLD_DEG = 10
const RESTORE_MS = 260

function pointerAt(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { angle: number; radius: number } {
  const rect = svg.getBoundingClientRect()
  const dx = ((clientX - rect.left - rect.width / 2) / Math.max(rect.width, 1)) * 400
  const dy = ((clientY - rect.top - rect.height / 2) / Math.max(rect.height, 1)) * 400
  return {
    angle: mod360((Math.atan2(dy, dx) * 180) / Math.PI),
    radius: Math.hypot(dx, dy),
  }
}

export function Wheel() {
  const index = useGameStore((state) => state.wheelIndex)
  const highlight = useGameStore((state) => state.highlight)
  const rotation = useGameStore((state) => state.rot)
  const duration = useGameStore((state) => state.spinDuration)
  const pendingNext = useGameStore((state) => state.pendingNext)
  const review = useGameStore((state) => state.review)
  const records = useGameStore((state) => state.records)
  const spinning = useGameStore((state) => state.spinning)
  const auto = useGameStore((state) => state.auto)
  const reviewing = review != null
  const holding = pendingNext != null && !reviewing
  const locked = spinning || auto
  const wheelRef = useRef<SVGGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const suppressClickRef = useRef(false)
  const held = review ? null : heldDistribution(index)
  const dist = review ? review.checkpoint.distribution : held || distribution(index)
  const arcs = distributionArcs(dist)
  const previewOption = previewId
    ? arcs.find((arc) => arc.option.id === previewId)?.option || null
    : null
  const currentRecordIndex = recordIndexForStage(dist.stage.id, records)
  const currentValue = review
    ? review.originalValue
    : currentRecordIndex >= 0
      ? records[currentRecordIndex].value
      : null

  useEffect(() => {
    const wheel = wheelRef.current
    if (!wheel) return
    wheel.style.setProperty('--dur', `${duration}ms`)
    wheel.style.transform = `rotate(${rotation}deg)`
  }, [duration, rotation])

  const applyRotation = (angle: number, milliseconds: number): void => {
    const wheel = wheelRef.current
    if (!wheel) return
    wheel.style.setProperty('--dur', `${milliseconds}ms`)
    wheel.style.transform = `rotate(${angle}deg)`
  }

  const restoreRotation = (visualRotation: number): void => {
    const settled = nearestEquivalentRotation(rotation, visualRotation)
    gameStore.setState({ rot: settled, spinDuration: RESTORE_MS })
    applyRotation(settled, RESTORE_MS)
  }

  const activate = (): void => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (reviewing) closeHistoryReview()
    else if (holding) advance()
    else spinNow()
  }

  const onKeyDown = (event: KeyboardEvent<SVGGElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (locked || !event.isPrimary || event.button !== 0) return
    const { angle, radius } = pointerAt(event.currentTarget, event.clientX, event.clientY)
    if (radius < 52 || radius > 200) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // 指针已失效时继续无意义，交给 pointercancel 清理。
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startRotation: rotation,
      rotation,
      lastAngle: angle,
      moved: false,
    }
    setDragging(true)
    setPreviewId(null)
    applyRotation(rotation, 0)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const { angle } = pointerAt(event.currentTarget, event.clientX, event.clientY)
    drag.rotation += angleDelta(drag.lastAngle, angle)
    drag.lastAngle = angle
    if (Math.abs(drag.rotation - drag.startRotation) >= DRAG_THRESHOLD_DEG) {
      drag.moved = true
    }
    applyRotation(drag.rotation, 0)
    setPreviewId(optionAtAngle(arcs, mod360(-drag.rotation))?.option.id || null)
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>, commit: boolean): void => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setPreviewId(null)
    if (drag.moved) {
      suppressClickRef.current = true
      setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    if (!commit || !drag.moved) {
      restoreRotation(drag.rotation)
      return
    }

    const pick = optionAtAngle(arcs, mod360(-drag.rotation))?.option.id || null
    if (!pick) {
      restoreRotation(drag.rotation)
      return
    }
    const target = rotationForOption(drag.rotation, arcs, pick)
    if (target != null) applyRotation(target, MANUAL_SNAP_MS)
    if (!manualPick(pick, drag.rotation)) restoreRotation(drag.rotation)
  }

  const onLostPointerCapture = (): void => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setDragging(false)
    setPreviewId(null)
    restoreRotation(drag.rotation)
  }

  const point = (angle: number, radius: number): [number, number] => [
    200 + radius * Math.cos((angle * Math.PI) / 180),
    200 + radius * Math.sin((angle * Math.PI) / 180),
  ]

  return (
    <div className="grid place-items-center py-0.5">
      <div className="relative aspect-square w-[min(100%,420px)]">
        <svg
          viewBox="0 0 400 400"
          role="group"
          aria-label="命运转盘：点中央按钮随机转动，拖动圆环可手动改命"
          className={cn(
            'block size-full overflow-visible select-none',
            locked ? 'cursor-default' : dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => finishDrag(event, true)}
          onPointerCancel={(event) => finishDrag(event, false)}
          onLostPointerCapture={onLostPointerCapture}
        >
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--vermillion)" stopOpacity=".16" />
              <stop offset="70%" stopColor="var(--vermillion)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="196" fill="url(#glow)" />
          <circle cx="200" cy="200" r="186" fill="none" stroke="var(--line)" strokeWidth="1" />
          <circle
            cx="200"
            cy="200"
            r="178"
            fill="none"
            stroke="var(--vermillion)"
            strokeWidth="0.7"
            opacity="0.45"
            strokeDasharray="2 6"
          />
          <g ref={wheelRef} className={cn(styles.wheel, dragging && styles.dragging)}>
            {arcs.map((arc, index) => {
              const a0 = arc.a0 - 90
              const a1 = arc.a1 - 90
              const [x0, y0] = point(a0, 178)
              const [x1, y1] = point(a1, 178)
              const large = arc.size > 180 ? 1 : 0
              const middle = (arc.a0 + arc.a1) / 2
              const fontSize =
                arc.size < 14 ? 9.5 : arc.size < 26 ? 11 : arc.size < 55 ? 12.5 : 13.5
              const inner = mod360(middle - 90) > 90 && mod360(middle - 90) < 270 ? 90 : -90
              const textY = (200 - 178 * 0.6).toFixed(1)
              return (
                <g
                  key={arc.option.id}
                  className={cn(
                    styles.sector,
                    index % 2 ? styles.b : styles.a,
                    highlight === arc.option.id && styles.hl,
                    previewId === arc.option.id && styles.preview,
                  )}
                >
                  <path
                    d={`M200 200 L${x0.toFixed(2)} ${y0.toFixed(2)} A178 178 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
                  />
                  {arc.size >= 5 ? (
                    <text
                      x="200"
                      y={textY}
                      fontSize={fontSize}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${middle.toFixed(2)} 200 200)`}
                    >
                      <tspan transform={`rotate(${inner} 200 ${textY})`}>
                        {arc.option.s || arc.option.label}
                      </tspan>
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>
          <path
            d="M200 6 L214 -14 L186 -14 Z"
            transform="translate(0,26)"
            fill="var(--vermillion)"
          />
          <g
            className={styles.hubGroup}
            role="button"
            tabIndex={0}
            aria-label={reviewing ? '返回当前命运' : holding ? '抽下一轮' : '转动转盘'}
            onClick={activate}
            onKeyDown={onKeyDown}
          >
            <circle className={styles.hub} cx="200" cy="200" r="42" />
            {reviewing ? (
              <text className={styles.hubText} x="200" y="207">
                回
              </text>
            ) : holding ? (
              <path className={styles.advanceArrow} d="M188 200H211M201 189L212 200L201 211" />
            ) : (
              <text className={styles.hubText} x="200" y="207">
                呪
              </text>
            )}
            <text className={styles.hubSub} x="200" y="226">
              {reviewing ? 'CURRENT' : `ROUND ${String(index + 1).padStart(2, '0')}`}
            </text>
          </g>
        </svg>
        {dragging ? (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-x-2 bottom-1 flex justify-center"
          >
            <span className="rounded-full border border-line bg-surface/95 px-2.5 py-1 text-center text-[10.5px] leading-[1.4] tracking-[0.04em] text-ink-soft shadow-card">
              {previewOption
                ? `松手${previewOption.id === currentValue ? '保持原结果' : '改命'} → ${previewOption.s || previewOption.label}`
                : '松手回到原位'}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
