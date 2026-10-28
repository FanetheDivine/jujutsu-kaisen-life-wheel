import { useStore } from 'zustand/react'
import { gameStore } from './gameStore'
import type { GameStore } from './gameStore'

export function useGameStore<T>(selector: (state: GameStore) => T): T {
  return useStore(gameStore, selector)
}
