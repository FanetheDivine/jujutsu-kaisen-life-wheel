import { closeHistoryReview } from '../game/history'
import { restart, resolveBattle, skipStage, spinNow, startAuto } from '../game/actions'
import { OPPONENT, OPPONENT_NOTE } from '../game/data'
import { labelOf } from '../game/options'
import { oppOf } from '../game/rules'
import { distribution, heldDistribution } from '../game/selectors'
import { gameStore } from '../store/gameStore'
import { useGameStore } from '../store/useGameStore'
import { Interference } from './Interference'
import { OptionList } from './OptionList'
import { Button } from './ui/Button'

export function StagePanel() {
  const index = useGameStore((state) => state.displayIndex)
  const stages = useGameStore((state) => state.stages)
  const results = useGameStore((state) => state.results)
  const battle = useGameStore((state) => state.battle)
  const spinning = useGameStore((state) => state.spinning)
  const pendingNext = useGameStore((state) => state.pendingNext)
  const done = useGameStore((state) => state.done)
  const quickBout = useGameStore((state) => state.quickBout)
  const review = useGameStore((state) => state.review)
  const reviewing = review != null
  const held = review ? null : heldDistribution(index)
  const dist = review ? review.checkpoint.distribution : held || distribution(index)
  const stage = dist.stage
  const context = review ? review.checkpoint.results : results
  const battleState = review ? review.checkpoint.battle : battle
  const opponent = oppOf(context)
  const ended = done && !reviewing
  const roundIndex = reviewing ? review.checkpoint.stageIndex : index
  const totalStages = reviewing ? review.checkpoint.stages.length : stages.length
  let description = stage.desc

  if (stage.id === 'duel') {
    description = `对手：${OPPONENT[opponent] || '你的命运本身'}（${OPPONENT_NOTE[opponent] || ''}）。${stage.desc}`
  }
  if (stage.id === 'duel2') {
    description = `对手：两面宿傩 · 原身形态（四臂、双面的真正肉体 —— 他受肉时用的那具躯壳已经被他撕开了）。${stage.desc}`
  }
  if (
    (stage.id === 'battleRounds' || stage.id === 'battleRounds2') &&
    (context.grade === 'g7' || context.grade === 'g8')
  ) {
    description += `【本局生效：${labelOf(context.grade)} → 抽中后追加 1 回合，最多五回合】`
  }
  if (stage.id === 'sukunaTrue') {
    description = `一番战的结果：${labelOf(context.duel)}。${stage.desc}`
  }
  if (stage.kind === 'atk' && stage.side === 'e') {
    description = `${battleState.foe ? `${battleState.foe.note} ` : battleState.phase === 2 ? '他撕开了受肉的躯壳，露出四只手与两张脸。' : ''}${battleState.foe ? battleState.foe.name : OPPONENT[opponent] || '对手'}这一手要打什么。`
  }

  const canResolve =
    stage.kind === 'atk' ||
    /^br\d$/.test(stage.id) ||
    /^ed\d$/.test(stage.id) ||
    stage.id === 'battleRounds' ||
    stage.id === 'battleRounds2' ||
    stage.id === 'duel' ||
    stage.id === 'duel2'
  const disabled = spinning || ended || pendingNext != null

  return (
    <>
      <p className="mt-0.5 text-center text-[11.5px] tracking-[0.08em] text-ink-faint">
        {reviewing
          ? '回看历史轮盘 —— 拖动转盘改命，结果改变才生效'
          : pendingNext != null
            ? '本轮结果已定 —— 点中央的「→」直接抽下一轮'
            : '点中央的「呪」即可转动 —— 扇区面积就是当下的真实几率'}
      </p>
      <div className="mx-0 mt-3 mb-1 text-center">
        <div className="text-[11px] tracking-[0.28em] text-vermillion">
          {reviewing
            ? `回看 ROUND ${String(roundIndex + 1).padStart(2, '0')} / ${totalStages} · ${stage.tag}`
            : ended
              ? '此生已尽'
              : `ROUND ${String(index + 1).padStart(2, '0')} / ${totalStages} · ${stage.tag}`}
        </div>
        <h2 className="my-1 font-display text-[clamp(19px,2.4vw,24px)] tracking-[0.05em]">
          {ended ? '你的一生已经写完' : stage.name}
        </h2>
        <p className="mx-auto max-w-[48ch] text-[12.5px] text-ink-soft">
          {ended ? '此生的因果已经闭合。' : description}
        </p>
      </div>
      {ended ? null : <OptionList dist={dist} />}
      {ended ? (
        <div className="mt-3.5 rounded-r-sm border-l-2 border-indigo bg-[color-mix(in_oklab,var(--indigo)_6%,transparent)] px-3.5 py-3">
          <h4 className="mb-1.5 text-[11px] font-semibold tracking-[0.2em] text-indigo">
            前轮因果干涉
          </h4>
          <p className="text-xs text-ink-faint">因果已闭合。</p>
          <p className="mt-1.5 text-[11.5px] leading-[1.6] text-ink-faint">
            仍可拖动转盘改写最后一轮并重新开启此生，或点顶部序号回看任意一轮。
          </p>
        </div>
      ) : (
        <Interference dist={dist} />
      )}
      {reviewing ? (
        <div className="mt-[18px] rounded-sm border border-line bg-paper-2 px-3.5 py-3 text-center">
          <p className="text-[12px] leading-[1.6] text-ink-soft">
            回看不改变当前人生。拖动转盘并停在另一个扇区，才会把第{' '}
            {review.checkpoint.stageIndex + 1} 轮的原结果与之后已抽取的内容一并作废。
          </p>
          <div className="mt-2.5 flex justify-center">
            <Button size="sm" onClick={closeHistoryReview}>
              返回当前
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-[18px] flex flex-wrap justify-center gap-2.5">
            <Button variant="primary" disabled={disabled} onClick={spinNow}>
              {ended ? '已 定 终 局' : stage.kind === 'ending' ? '转 动 · 定 终 局' : '转 动'}
            </Button>
            <Button variant="ghost" disabled={disabled} onClick={skipStage}>
              跳过此轮
            </Button>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={startAuto}>
              一键抽完余生
            </Button>
            {canResolve && !ended ? (
              <Button variant="ghost" size="sm" disabled={disabled} onClick={resolveBattle}>
                跳过战斗演出 · 直接结算
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={restart}>
              重新开始
            </Button>
          </div>
          <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
            每一段经历（百鬼夜行 / 少年院 / 涩谷事变 / 死灭回游 /
            新宿决战）只要你在场就会开战，敌人按你的立场与强度自动匹配。
            <label className="ml-1.5 inline-flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={quickBout}
                onChange={(event) => gameStore.setState({ quickBout: event.target.checked })}
              />
              <span className="text-xs">事件战只出结算</span>
            </label>
          </p>
          <p className="mt-2 text-[11.5px] leading-[1.6] text-ink-faint">
            「重新开始」会清空这一生的全部结果，转盘立刻回到第一轮的初始状态。
          </p>
          <p className="mt-2 text-[11.5px] leading-[1.6] text-indigo">
            点顶部已抽取的序号可回看该轮；回看时直接拖动转盘即可改命，结果改变才会作废后续。
          </p>
        </>
      )}
    </>
  )
}
