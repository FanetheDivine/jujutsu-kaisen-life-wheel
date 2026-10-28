import { gameStore, getState } from '../store/gameStore'
import {
  BATTLE_ROUNDS2,
  BOUT_EVENTS,
  CLAN,
  DUEL,
  DUEL2,
  EVENT_DEFS,
  GEAR_COUNT,
  GROWTH,
  LOSS,
  ROUND_NUM,
  SUKUNA_TRUE,
  VOW_COUNT,
  absenceStage,
  boutDuelStage,
  boutFoe,
  boutGrowthStage,
  boutLossStage,
  boutRoundsStage,
  boutSkillStage,
  enemyActionStage,
  gearStageFor,
  makeEventStage,
  playerActionStage,
  skillStageFor,
  vowStageFor,
} from './data'
import { BY, register } from './options'
import { oppOf } from './rules'
import type { BattleSide, Stage } from './types'

/** 落地后的动态插轮，保持原有判断顺序。 */
export function expandAfter(idx: number, stageId: string, pick: string): void {
  const state = getState()
  const stages = state.stages
  const battle = { ...state.battle, log: [...state.battle.log] }
  const inserted: Stage[] = []

  if (stageId === 'origin' && pick === 'o2') inserted.push(CLAN)
  if (stageId === 'era') {
    const eraIndex = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6'].indexOf(pick)
    const events = EVENT_DEFS.filter((definition) => eraIndex < definition.eraIdx).map(
      makeEventStage,
    )
    const at = stages.findIndex((stage) => stage.id === 'battleRounds')
    if (at >= 0 && events.length) {
      gameStore.setState({ stages: [...stages.slice(0, at), ...events, ...stages.slice(at)] })
    }
    return
  }
  if (stageId.indexOf('ev') === 0 && String(pick).slice(-4) === '_abs') {
    inserted.push(absenceStage(stageId))
  }
  if (BOUT_EVENTS.indexOf(stageId) >= 0 && String(pick).slice(-4) !== '_abs') {
    inserted.push(state.quickBout ? boutDuelStage(stageId) : boutRoundsStage(stageId))
  }
  if (/^br\d$/.test(stageId)) {
    const number = stageId.slice(2)
    const eventId = 'ev' + number
    const rounds = Number(String(pick).slice(-1)) || 1
    Object.assign(battle, {
      bout: eventId,
      foe: boutFoe(eventId, state.results),
      p: 0,
      e: 0,
      diff: 0,
      ce: 3,
      domainUsed: false,
      extraCount: 0,
      rounds,
    })
    // 回合工厂会读取当前敌人；必须先提交，不能等插轮结束时统一更新。
    gameStore.setState({ battle })
    for (let round = 1; round <= rounds; round++) {
      inserted.push(playerActionStage('v' + number + 'p' + round, round, false))
      inserted.push(enemyActionStage('v' + number + 'e' + round, round))
    }
    inserted.push(boutDuelStage(eventId))
  }
  if (/^ed\d$/.test(stageId)) {
    const number = stageId.slice(2)
    if (pick !== 'ed5') inserted.push(boutGrowthStage('ev' + number))
  }
  if (/^gr\d$/.test(stageId)) {
    const number = stageId.slice(2)
    if (pick === 'gr_skill') inserted.push(boutSkillStage('ev' + number))
    if (pick === 'gr_lose') inserted.push(boutLossStage('ev' + number))
  }
  if (stageId === 'skillCount') {
    const count = Number(String(pick).replace('kc', ''))
    for (let index = 1; index <= count; index++) inserted.push(skillStageFor(index))
  }
  if (stageId === 'vowGate' && pick === 'vow_yes') inserted.push(VOW_COUNT)
  if (stageId === 'vowCount') {
    const count = Number(String(pick).replace('vc', ''))
    for (let index = 1; index <= count; index++) inserted.push(vowStageFor(index))
  }
  if (/^skill\d+$/.test(stageId) && pick === 'sk_gear') inserted.push(GEAR_COUNT)
  if (stageId === 'gearCount') {
    const count = Number(String(pick).replace('gc', ''))
    for (let index = 1; index <= count; index++) inserted.push(gearStageFor(index))
  }
  if (stageId === 'duel' && oppOf(state.results) === 'b10' && (pick === 'w1' || pick === 'w2')) {
    inserted.push(SUKUNA_TRUE)
  }
  if (stageId === 'sukunaTrue' && pick === 'su_yes') inserted.push(BATTLE_ROUNDS2)
  if (stageId === 'battleRounds' || stageId === 'battleRounds2') {
    const second = stageId === 'battleRounds2'
    let rounds = ROUND_NUM[pick] || 3
    if ((state.results.grade === 'g7' || state.results.grade === 'g8') && rounds < 5) rounds += 1
    if (!second) {
      battle.bout = 'final'
      battle.foe = null
    } else {
      const carry = Math.max(-2, Math.min(5, Math.round(state.battle.diff / 3)))
      Object.assign(battle, {
        phase: 2,
        bout: 'final2',
        foe: null,
        p: carry > 0 ? carry : 0,
        e: carry < 0 ? -carry : 0,
        diff: carry,
        ce: 3,
        domainUsed: false,
        extraCount: 0,
      })
    }
    battle.rounds = rounds
    // 一番战需清除事件敌人，二番战需让工厂立即看到 phase=2。
    gameStore.setState({ battle })
    const playerPrefix = second ? 'q' : 'p'
    const enemyPrefix = second ? 'f' : 'e'
    for (let round = 1; round <= rounds; round++) {
      inserted.push(playerActionStage(playerPrefix + round, round, false))
      inserted.push(enemyActionStage(enemyPrefix + round, round))
    }
    inserted.push(second ? DUEL2 : DUEL)
    if (!second) inserted.push(GROWTH)
  }
  if (/^act[pq]\d+$/.test(stageId)) {
    if (String(pick).slice(-6) === '_black' && battle.extraCount < 4) {
      battle.extraCount += 2
      const round = stages[idx].round
      const phase = battle.phase || 1
      inserted.push(
        playerActionStage('x' + phase + '_' + battle.extraCount + 'a', round ?? 0, true),
      )
      inserted.push(
        playerActionStage('x' + phase + '_' + battle.extraCount + 'b', round ?? 0, true),
      )
    }
  }
  if (stageId === 'growth') {
    if (pick === 'gr_skill') inserted.push(skillStageFor('new', '战后习得的新技能'))
    if (pick === 'gr_lose') inserted.push(LOSS)
  }

  inserted.forEach(register)
  gameStore.setState({
    battle,
    stages: inserted.length
      ? [...stages.slice(0, idx + 1), ...inserted, ...stages.slice(idx + 1)]
      : stages,
  })
}

export function applyAction(stageId: string, pick: string): void {
  const state = getState()
  const stage = state.stages.find((item) => item.id === stageId)
  if (!stage || stage.kind !== 'atk') return
  const option = BY[pick]
  const pw = option?.pw || 2
  const battle = { ...state.battle, log: [...state.battle.log] }
  const side: BattleSide = stage.side || 'p'
  if (side === 'p') {
    battle.p += pw
    if (String(pick).indexOf('_domain') >= 0) battle.domainUsed = true
    if (String(pick).indexOf('_prison') >= 0) battle.prisonUsed = true
    if (String(pick).indexOf('_guard') < 0 && String(pick).indexOf('_rev') < 0) battle.ce -= 1
  } else {
    battle.e += pw
  }
  battle.diff = battle.p - battle.e
  battle.log.push({
    round: stage.round ?? 0,
    side,
    extra: !!stage.extra,
    phase: battle.phase || 1,
    bout: battle.bout || '',
    label: option ? option.label : pick,
    pw,
  })
  gameStore.setState({ battle })
}
