import { createStore } from 'zustand/vanilla'
import type { AppState, HistoryCheckpoint, HistoryReview, Stage } from '../game/types'

export interface GameStore extends AppState {
  stages: Stage[]
  displayIndex: number
  wheelIndex: number
  highlight: string | null
  /** 落地停留时待进入的轮次；-1 表示没有下一轮（终局），null 表示未停留。 */
  pendingNext: number | null
  spinDuration: number
  mobilePanel: 'draw' | 'ledger' | 'stats'
  history: HistoryCheckpoint[]
  review: HistoryReview | null
}

export function createInitialGameState(): GameStore {
  return {
    i: 0,
    results: {},
    records: [],
    rot: 0,
    spinning: false,
    auto: false,
    sound: false,
    done: false,
    gen: 0,
    raf: 0,
    battle: {
      p: 0,
      e: 0,
      diff: 0,
      ce: 3,
      domainUsed: false,
      rounds: 0,
      log: [],
      extraCount: 0,
      phase: 1,
      prisonUsed: false,
      bout: '',
      foe: null,
    },
    jutsuName: '',
    domainName: '',
    quickBout: false,
    stages: [],
    displayIndex: 0,
    wheelIndex: 0,
    highlight: null,
    pendingNext: null,
    spinDuration: 0,
    mobilePanel: 'draw',
    history: [],
    review: null,
  }
}

export const gameStore = createStore<GameStore>()(() => createInitialGameState())
export const getState = gameStore.getState
