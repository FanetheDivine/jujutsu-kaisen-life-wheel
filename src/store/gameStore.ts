import { createStore } from 'zustand/vanilla'
import type { AppState, Stage } from '../game/types'
import type { ScrollFollowState } from '../lib/scrollFollow'

export interface GameStore extends AppState {
  stages: Stage[]
  displayIndex: number
  wheelIndex: number
  highlight: string | null
  spinDuration: number
  markdown: string
  mobilePanel: 'draw' | 'ledger' | 'stats'
  ledgerScroll: ScrollFollowState
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
    spinDuration: 0,
    markdown: '',
    mobilePanel: 'draw',
    ledgerScroll: { following: true, seenCount: 0 },
  }
}

export const gameStore = createStore<GameStore>()(() => createInitialGameState())
export const getState = gameStore.getState
