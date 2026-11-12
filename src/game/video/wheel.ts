import type { Stage } from '../types'

/** 扇面：纯文案，或 [文案, 录像抽中次数]。 */
export type Opt = string | [string] | [string, number]

export interface WheelSpec {
  id: string
  name: string
  tag: string
  kind?: Stage['kind']
  desc?: string
  skipText?: string
  skipIf?: Stage['skipIf']
  opts: Opt[]
}

/** 把一个轮次规格展开成 Stage；权重是 1 + 录像抽中次数。 */
export function wheel(spec: WheelSpec): Stage {
  const options = spec.opts.map((item, index) => {
    const [label, count] = typeof item === 'string' ? [item, 0] : [item[0], item[1] ?? 0]
    return {
      id: `${spec.id}_${index}`,
      label,
      base: 1 + count,
      ...(count > 0 ? { hint: `录像中出现 ${count} 次` } : {}),
    }
  })
  return {
    id: spec.id,
    name: spec.name,
    desc: spec.desc ?? '',
    kind: spec.kind ?? 'dim',
    tag: spec.tag,
    options,
    ...(spec.skipIf ? { skipIf: spec.skipIf, skipText: spec.skipText } : {}),
  }
}
