import type { Stage, WheelOption } from './types'

export const BY: Record<string, WheelOption> = {}

export function register(stage: Stage): Stage {
  stage.options.forEach((option) => {
    BY[option.id] = option
  })
  return stage
}

/** 回退到历史分支前清空旧选项文案，避免已作废分支继续覆盖同名选项。 */
export function resetOptions(): void {
  Object.keys(BY).forEach((key) => {
    delete BY[key]
  })
}

export function labelOf(id: string | null | undefined): string {
  return id == null ? '' : BY[id] ? BY[id].label : id
}
