import type { Stage, WheelOption } from './types'

export const BY: Record<string, WheelOption> = {}

export function register(stage: Stage): Stage {
  stage.options.forEach((option) => {
    BY[option.id] = option
  })
  return stage
}

export function labelOf(id: string | null | undefined): string {
  return id == null ? '' : BY[id] ? BY[id].label : id
}
