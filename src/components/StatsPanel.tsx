import { chosenSkills } from '../game/data'
import { derived, survivalRate } from '../game/derive'
import { BY, labelOf } from '../game/options'
import { DIMS, rankOfScore, RNK, RV } from '../game/ranks'
import { domLabel, power, techLabel } from '../game/rules'
import { useGameStore } from '../store/useGameStore'
import { BattleBox } from './BattleBox'
import { Card } from './ui/Card'
import { Chip } from './ui/Chip'

export function StatsPanel() {
  const results = useGameStore((state) => state.results)
  const records = useGameStore((state) => state.records)
  const stages = useGameStore((state) => state.stages)
  const current = useGameStore((state) => state.i)
  const done = useGameStore((state) => state.done)
  const life = derived()
  const combatPower = power(results)
  let jutsu =
    results.talent === 't6'
      ? '无（看不见咒灵的眼睛）'
      : results.talent === 't1'
        ? '无术式 · 仅咒力操作与体术'
        : results.talent === 't3'
          ? '天与咒缚（以术式换取肉体）'
          : results.technique
            ? techLabel(results)
            : '——'
  if (results.technique && results.techNature && BY[results.techNature]) {
    jutsu += ` · ${BY[results.techNature].label.split('（')[0]}`
  }
  let domain = '未展开'
  if (results.domain === 'd1') domain = `「${domLabel(results)}」（未完）`
  else if (results.domain === 'd2') domain = `「${domLabel(results)}」`

  const skills = chosenSkills(results)
    .map((id) => BY[id]?.label)
    .filter(Boolean)
  const gear = Object.keys(results)
    .filter((key) => /^gear\d+$/.test(key))
    .map((key) => BY[results[key]]?.label)
    .filter(Boolean)
  const vows = Object.keys(results)
    .filter((key) => /^vow\d+$/.test(key))
    .map((key) => BY[results[key]]?.label.split(' ——')[0])
  const endingIndex = stages.findIndex((stage) => stage.kind === 'ending')
  const reached =
    records.some((record) => record.stageId === 'ending') ||
    (endingIndex >= 0 && current >= endingIndex)
  const survival = reached && endingIndex >= 0 ? survivalRate() : null

  return (
    <Card
      title="咒力检定"
      note={combatPower ? `综合战力 ${combatPower} · ${rankOfScore(combatPower)}` : '综合战力 —'}
    >
      <div className="mb-3.5 flex flex-wrap gap-2">
        {results.era ? (
          <>
            <Chip>
              术式：<b>{jutsu}</b>
            </Chip>
            <Chip>
              领域：<b>{domain}</b>
            </Chip>
            <Chip>
              称号：<b>{life.title}</b>
            </Chip>
          </>
        ) : (
          <Chip>术式 / 领域 / 称号 —— 尚未抽选</Chip>
        )}
      </div>
      <div className="flex flex-col gap-[7px]">
        {DIMS.map((dimension) => {
          const value = results[dimension.k] ? RV(results, dimension.k) : 0
          const rank = results[dimension.k] ? RNK(results, dimension.k) : '—'
          return (
            <div
              key={dimension.k}
              title={`${dimension.n} ${value}`}
              className="grid grid-cols-[60px_1fr_30px] items-center gap-2.5 text-xs"
            >
              <span>{dimension.n}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-paper-2">
                <span
                  className="block h-full bg-[linear-gradient(90deg,var(--indigo),var(--vermillion))] transition-[width] duration-700 ease-out-quart"
                  style={{ width: `${value}%` }}
                />
              </span>
              <span
                className={
                  results[dimension.k]
                    ? 'text-right font-bold tracking-[0.02em] text-ink-soft'
                    : 'text-right font-normal text-ink-faint'
                }
              >
                {rank}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length ? (
          <Chip>
            技能：<b>{skills.join('、')}</b>
          </Chip>
        ) : null}
        {gear.length ? (
          <Chip>
            咒具：<b>{gear.join('、')}</b>
          </Chip>
        ) : null}
        {vows.length ? (
          <Chip>
            束缚：<b>{vows.join('；')}</b>
          </Chip>
        ) : null}
        {results.gift && results.gift !== 'gift_none' ? (
          <Chip>
            天赋：<b>{labelOf(results.gift)}</b>
          </Chip>
        ) : null}
        {results.luck ? (
          <Chip>
            运气：<b>{labelOf(results.luck)}</b>
          </Chip>
        ) : null}
        {results.growth ? (
          <Chip>
            战后：<b>{labelOf(results.growth)}</b>
          </Chip>
        ) : null}
      </div>
      <BattleBox />
      <div className="mt-3.5 rounded-sm border border-line bg-paper-2 px-3.5 py-3">
        <div className="text-[11px] tracking-[0.18em] text-ink-faint">生还倾向</div>
        <div className="mt-0.5 font-display text-lg">
          {survival === null
            ? '—'
            : `${survival.toFixed(0)}% · ${survival >= 70 ? '高' : survival >= 45 ? '中' : survival >= 22 ? '低' : '绝望'}`}
        </div>
        <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
          {done
            ? `实际结局：${labelOf(results.ending)}。`
            : survival === null
              ? '六维抽毕后显示综合战力；终局轮开启后显示生还率。'
              : '由时代、六维、等级、阵营、羁绊、决战与战后成长共同折算。'}
        </p>
      </div>
    </Card>
  )
}
