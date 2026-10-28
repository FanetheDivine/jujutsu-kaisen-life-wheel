import { mulberry32, seedOf } from '../random'
import { getState, gameStore } from '../store/gameStore'
import { ALL_STAGES } from './registry'
import { BY } from './options'
import { distribution } from './selectors'
import { domLabel, techLabel } from './rules'
import type { DerivedLife } from './types'

export const A1 = [
  '影',
  '呪',
  '灰',
  '血',
  '铁',
  '雷',
  '蚀',
  '虚',
  '星',
  '氷',
  '炎',
  '骨',
  '哭',
  '镜',
  '锁',
  '雾',
  '棘',
  '空',
  '罪',
  '溺',
  '骸',
  '蛇',
  '鸦',
  '刃',
  '霜',
  '尘',
]
export const A2 = [
  '蚀',
  '葬',
  '鸣',
  '缚',
  '噬',
  '燃',
  '裂',
  '堕',
  '醒',
  '巡',
  '缠',
  '沈',
  '乱',
  '赦',
  '裁',
  '溢',
  '枯',
  '孕',
  '坠',
  '歌',
  '缝',
  '融',
  '烬',
  '离',
]
export const C1 = [
  '嵌合',
  '呪胎',
  '无量',
  '伏魔',
  '诛伏',
  '蚀尽',
  '残月',
  '血海',
  '无间',
  '灰劫',
  '星霜',
  '虚数',
  '百鬼',
  '孤舟',
  '永夜',
]
export const C2 = [
  '暗翳庭',
  '戴天',
  '空处',
  '御廚子',
  '赐死',
  '轮回',
  '葬场',
  '之渊',
  '孤狱',
  '回廊',
  '地狱',
  '禁域',
  '之匣',
  '残响',
]
export function derived(): DerivedLife {
  const c = getState().results
  const rnd = mulberry32(seedOf(ALL_STAGES.map((s) => c[s.id] || '-').join('|')))
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
  const jutsuName = '「' + pick(A1) + pick(A2) + '」'
  const domainName = pick(C1) + pick(C2)
  let jutsu = '——'
  if (c.talent === 't6') jutsu = '无（看不见咒灵的眼睛）'
  else if (c.talent === 't1') jutsu = '无术式 · 仅咒力操作与体术'
  else if (c.talent === 't3') jutsu = '天与咒缚（以术式换取肉体）'
  else if (c.technique) jutsu = techLabel(c, jutsuName)
  else if (c.talent) jutsu = jutsuName + '术式'
  if (c.technique && c.techNature)
    jutsu += ' · ' + (BY[c.techNature] ? BY[c.techNature].label.split('（')[0] : '')
  let dom = '未展开'
  if (c.domain === 'd1') dom = '「' + domLabel(c, domainName) + '」（未完）'
  else if (c.domain === 'd2') dom = '「' + domLabel(c, domainName) + '」'
  let role
  if (c.ending === 'x5') role = '王'
  else if (c.ending === 'x7') role = '师'
  else if (c.origin === 'o4') role = '咒灵'
  else if (c.origin === 'o5') role = '容器'
  else if (c.faction === 'f7') role = '路人'
  else role = pick(['咒术师', '剑客', '审判者', '放浪者', '观测者', '守门人', '祓除者'])
  return {
    jutsu,
    dom,
    title:
      pick([
        '残秽',
        '无明',
        '狱门',
        '星浆',
        '逆缘',
        '不死',
        '残照',
        '白霜',
        '百鬼',
        '虚数',
        '傀儡',
        '喰',
      ]) +
      '的' +
      role,
  }
}

/** 仅在落地后同步后续战斗构建器需要读取的自创名称，渲染期间保持纯计算。 */
export function syncDerivedNames(): void {
  const context = getState().results
  const random = mulberry32(seedOf(ALL_STAGES.map((stage) => context[stage.id] || '-').join('|')))
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]
  gameStore.setState({
    jutsuName: '「' + pick(A1) + pick(A2) + '」',
    domainName: pick(C1) + pick(C2),
  })
}

export function survivalRate(): number {
  const idx = getState().stages.findIndex((s) => s.kind === 'ending')
  if (idx < 0) return 0
  const d = distribution(idx)
  return ['x2', 'x5', 'x6', 'x7', 'x9'].reduce((a, k) => a + (d.pct[k] || 0), 0)
}
