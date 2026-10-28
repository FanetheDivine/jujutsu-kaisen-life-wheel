import { useEffect, useRef, type KeyboardEvent } from 'react'
import { spinNow } from '../game/actions'
import { distribution } from '../game/selectors'
import { cn } from '../lib/cn'
import { useGameStore } from '../store/useGameStore'
import styles from './Wheel.module.css'

const mod360 = (angle: number): number => ((angle % 360) + 360) % 360

export function Wheel() {
  const index = useGameStore((state) => state.wheelIndex)
  const highlight = useGameStore((state) => state.highlight)
  const rotation = useGameStore((state) => state.rot)
  const duration = useGameStore((state) => state.spinDuration)
  const wheelRef = useRef<SVGGElement>(null)
  const dist = distribution(index)
  const items = dist.stage.options.filter((option) => dist.pct[option.id] > 0.05)
  const sum = items.reduce((total, option) => total + dist.pct[option.id], 0)
  const { arcs } = items.reduce<{
    arcs: Array<{ option: (typeof items)[number]; a0: number; a1: number; size: number }>
    accumulated: number
  }>(
    (acc, option) => {
      const size = (dist.pct[option.id] / sum) * 360
      const arc = { option, a0: acc.accumulated, a1: acc.accumulated + size, size }
      return { arcs: [...acc.arcs, arc], accumulated: acc.accumulated + size }
    },
    { arcs: [], accumulated: 0 },
  )

  useEffect(() => {
    const wheel = wheelRef.current
    if (!wheel) return
    wheel.style.setProperty('--dur', `${duration}ms`)
    wheel.style.transform = `rotate(${rotation}deg)`
  }, [duration, rotation])

  const onKeyDown = (event: KeyboardEvent<SVGGElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      spinNow()
    }
  }

  const point = (angle: number, radius: number): [number, number] => [
    200 + radius * Math.cos((angle * Math.PI) / 180),
    200 + radius * Math.sin((angle * Math.PI) / 180),
  ]

  return (
    <div className="grid place-items-center py-0.5">
      <div className="relative aspect-square w-[min(100%,420px)]">
        <svg viewBox="0 0 400 400" className="block size-full overflow-visible">
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
          <g ref={wheelRef} className={styles.wheel}>
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
            aria-label="转动转盘"
            onClick={spinNow}
            onKeyDown={onKeyDown}
          >
            <circle className={styles.hub} cx="200" cy="200" r="42" />
            <text className={styles.hubText} x="200" y="207">
              呪
            </text>
            <text className={styles.hubSub} x="200" y="226">
              ROUND {String(index + 1).padStart(2, '0')}
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
