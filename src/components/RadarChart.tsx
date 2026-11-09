import { DIMS, rankOfScore, RNK, RV } from '../game/ranks'
import type { Rank, ResultContext } from '../game/types'
import { radarPoint, radarPolygon } from '../lib/radar'
import styles from './RadarChart.module.css'

const SIDES = 6
const CX = 180
const CY = 160
const RADIUS = 104
const LABEL_RADIUS = 130
const RINGS = [20, 40, 60, 80, 100]

function anchorOf(x: number): 'middle' | 'start' | 'end' {
  if (Math.abs(x - CX) < 1) return 'middle'
  return x > CX ? 'start' : 'end'
}

type RadarChartProps = {
  results: ResultContext
  combatPower: number
}

export function RadarChart({ results, combatPower }: RadarChartProps) {
  const values = DIMS.map((dimension) => (results[dimension.k] ? RV(results, dimension.k) : 0))
  const ranks = DIMS.map((dimension): Rank | null =>
    results[dimension.k] ? RNK(results, dimension.k) : null,
  )
  const complete = ranks.every((rank) => rank !== null)
  const powerRank = complete ? rankOfScore(combatPower) : null
  const summary = DIMS.map((dimension, index) => `${dimension.n} ${ranks[index] ?? '—'}`).join('，')
  const hasData = values.some((value) => value > 0)
  const description = `六维雷达图：${summary}；综合战力 ${
    powerRank ? `${combatPower} · ${powerRank}` : '待抽选'
  }`

  return (
    <figure className="mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 360 320" role="img" aria-label={description} className={styles.chart}>
        {RINGS.map((level) => (
          <polygon
            key={level}
            className={styles.ring}
            points={radarPolygon(new Array<number>(SIDES).fill(level), CX, CY, RADIUS)}
          />
        ))}
        {DIMS.map((dimension, index) => {
          const end = radarPoint(100, index, CX, CY, RADIUS)
          return (
            <line key={dimension.k} className={styles.axis} x1={CX} y1={CY} x2={end.x} y2={end.y} />
          )
        })}
        {hasData ? (
          <>
            <polygon className={styles.area} points={radarPolygon(values, CX, CY, RADIUS)} />
            {values.map((value, index) => {
              if (value <= 0) return null
              const dot = radarPoint(value, index, CX, CY, RADIUS)
              return (
                <circle key={DIMS[index].k} className={styles.dot} cx={dot.x} cy={dot.y} r={2.4} />
              )
            })}
          </>
        ) : null}
        {DIMS.map((dimension, index) => {
          const label = radarPoint(100, index, CX, CY, LABEL_RADIUS)
          return (
            <text
              key={dimension.k}
              className={styles.label}
              x={label.x}
              y={label.y}
              textAnchor={anchorOf(label.x)}
            >
              <tspan className={styles.name}>{dimension.n}</tspan>
              <tspan className={ranks[index] ? styles.rank : styles.rankEmpty} dy="14">
                {ranks[index] ?? '—'}
              </tspan>
            </text>
          )
        })}
        <text className={styles.centerLabel} x={CX} y={CY - 8} textAnchor="middle">
          综合战力
        </text>
        <text className={styles.centerValue} x={CX} y={CY + 20} textAnchor="middle">
          {powerRank ? combatPower : '—'}
        </text>
        {powerRank ? (
          <text className={styles.centerRank} x={CX} y={CY + 38} textAnchor="middle">
            {powerRank}
          </text>
        ) : null}
      </svg>
    </figure>
  )
}
