import { getState } from '../store/gameStore'
import { BOUT_EVENTS, EVENT_DEFS, OPPONENT, boutFoe, deadAt } from './data'
import { BY, labelOf } from './options'
import { DIMS, RNK, rankOfScore } from './ranks'
import { stageById } from './registry'
import { domLabel, oppOf, power } from './rules'
import { VERSION, VERSION_DATE, VERSION_NOTE } from './version'
import type { BattleLog, DerivedLife, Stage } from './types'

export function buildMarkdown(d: DerivedLife, sv: number): string {
  const c = getState().results
  const stageOf = stageById
  const rows = (kind: Stage['kind']) =>
    getState()
      .records.filter((r) => stageOf(r.stageId).kind === kind)
      .map((r) => {
        const st = stageOf(r.stageId)
        const val = r.skipped ? '——（此轮不存）' : labelOf(r.value)
        const hint = r.skipped
          ? st.skipText || ''
          : r.value && BY[r.value]
            ? BY[r.value].hint || ''
            : ''
        return { st, val, hint }
      })
  const coreRows = rows('core')
    .map((r) => '| ' + r.st.name + ' | **' + r.val + '** | ' + r.hint + ' |')
    .join('\n')
  const dimTable = DIMS.map(
    (dd) =>
      '| ' +
      dd.n +
      ' | **' +
      (c[dd.k] ? RNK(c, dd.k) : '—') +
      '** | ' +
      (c[dd.k] ? BY[c[dd.k]].hint || '' : '') +
      ' |',
  ).join('\n')
  const evRows = rows('event')
    .map((r) => '- **' + r.st.name + '**（' + (r.st.title || '') + '）：' + r.val + ' —— ' + r.hint)
    .join('\n')
  const absRows = rows('abs')
    .map((r) => '- ' + r.st.name + '：**' + r.val + '**')
    .join('\n')
  const skillRows = rows('skill')
    .map((r) => '- ' + r.st.name + '：**' + r.val + '**' + (r.hint ? ' —— ' + r.hint : ''))
    .join('\n')
  const gearRows = rows('gear')
    .map((r) => '- ' + r.st.name + '：**' + r.val + '**')
    .join('\n')
  const vowRows = rows('vow')
    .map((r) => '- ' + r.st.name + '：**' + r.val + '**' + (r.hint ? ' —— ' + r.hint : ''))
    .join('\n')
  const legacyRow = rows('legacy')
    .map((r) => '- 后世评价：**' + r.val + '**')
    .join('\n')
  const oppId = oppOf(c)

  const b = getState().battle
  const oppName = OPPONENT[oppId] || '对手'
  const evNameOf = (id: string | null): string => {
    const d = EVENT_DEFS.find((x) => x.id === id)
    return d ? d.name : id || '未知事件'
  }
  /* ---- 战斗记录按「场次」分组：各场事件战 + 终局一番战 + 终局二番战 ---- */
  interface BoutGroup {
    key: string
    isEv: boolean
    logs: BattleLog[]
  }
  const boutGroups: BoutGroup[] = []
  b.log.forEach((l) => {
    const eventKey = l.bout && BOUT_EVENTS.indexOf(l.bout) >= 0 ? l.bout : null
    const isEv = eventKey !== null
    const key = eventKey || 'final' + ((l.phase || 1) === 2 ? '2' : '')
    let g = boutGroups.find((x) => x.key === key)
    if (!g) {
      g = { key, isEv, logs: [] }
      boutGroups.push(g)
    }
    g.logs.push(l)
  })
  const fmtBout = (g: BoutGroup): string => {
    const byRound: Record<string, BattleLog[]> = {}
    g.logs.forEach((l) => {
      byRound[l.round] = byRound[l.round] || []
      byRound[l.round].push(l)
    })
    const foeName = g.isEv
      ? boutFoe(g.key, c).name
      : g.key === 'final2'
        ? oppName + '（原身形态）'
        : oppName
    const head = g.isEv
      ? '**' + evNameOf(g.key) + '** · 对手：' + foeName + '\n'
      : '**' + (g.key === 'final2' ? '二番战' : '一番战') + '** · 对手：' + foeName + '\n'
    const body = Object.keys(byRound)
      .sort((x, y) => Number(x) - Number(y))
      .map((r) => {
        const ps = byRound[r]
          .filter((l) => l.side === 'p')
          .map((l) => l.label + (l.extra ? '（追击）' : '') + ' +' + l.pw)
          .join(' ／ ')
        const es = byRound[r]
          .filter((l) => l.side === 'e')
          .map((l) => l.label + ' +' + l.pw)
          .join(' ／ ')
        return '- 第 ' + r + ' 回合：你【' + ps + '】 vs ' + foeName + '【' + es + '】'
      })
      .join('\n')
    const sp = g.logs.filter((l) => l.side === 'p').reduce((a, l) => a + l.pw, 0)
    const se = g.logs.filter((l) => l.side === 'e').reduce((a, l) => a + l.pw, 0)
    const df = sp - se
    return (
      head +
      body +
      '\n- 本场累计：你 ' +
      sp +
      ' ／ ' +
      foeName +
      ' ' +
      se +
      '（差 ' +
      (df > 0 ? '+' : '') +
      df +
      '）'
    )
  }
  const evGroups = boutGroups
    .filter((g) => g.isEv)
    .sort((a, z) => BOUT_EVENTS.indexOf(a.key) - BOUT_EVENTS.indexOf(z.key))
  const finGroups = boutGroups.filter((g) => !g.isEv).sort((a, z) => (a.key < z.key ? -1 : 1))
  const battleLog = finGroups.length ? finGroups.map(fmtBout).join('\n\n') : '-（无终局战斗记录）'
  /* 各场事件战：逐回合 + 结果 + 战后成长 + 失去 */
  let boutRows = ''
  BOUT_EVENTS.forEach((evId) => {
    const n = evId.slice(2),
      def = EVENT_DEFS.find((x) => x.id === evId)
    const evVal = c[evId]
    if (!def || !c['ed' + n]) return // 这一场没打
    if (!evVal || String(evVal).slice(-4) === '_abs') return // 缺席
    let g: BoutGroup | null = null
    for (const x of evGroups) {
      if (x.key === evId) {
        g = x
        break
      }
    }
    let s = '### ' + def.name + '（' + def.title + '）\n\n'
    if (g) s += fmtBout(g) + '\n'
    else s += '- 对手：**' + boutFoe(evId, c).name + '**（简报模式：未逐回合演出）\n'
    s += '- 结果：**' + (c['ed' + n] ? labelOf(c['ed' + n]) : '——') + '**\n'
    if (c['gr' + n]) {
      s += '- 战后：**' + labelOf(c['gr' + n]) + '**'
      if (c['skillg' + n]) s += '（习得：' + labelOf(c['skillg' + n]) + '）'
      if (c['ls' + n]) s += '　失去：**' + labelOf(c['ls' + n]) + '**'
      s += '\n'
    }
    boutRows += s + '\n'
  })
  return (
    '# 咒术回战 · 抽选人生档案\n\n' +
    '> 生成时间：' +
    new Date().toLocaleString('zh-CN') +
    '\n' +
    '> 生成器版本：' +
    VERSION +
    '（' +
    VERSION_DATE +
    ' · ' +
    VERSION_NOTE +
    '）\n' +
    '> 生成方式：因果转盘（前轮结果实时改写后轮几率，扇区面积即当下几率）\n\n' +
    '## 一、此身为何\n\n| 轮次 | 结果 | 说明 |\n|---|---|---|\n' +
    coreRows +
    '\n\n' +
    '## 二、六维性能（E–EX）\n\n| 维度 | 等级 | 注释 |\n|---|---|---|\n' +
    dimTable +
    '\n\n' +
    '- 综合战力：**' +
    power(c) +
    ' / 100（' +
    rankOfScore(power(c)) +
    '）**\n\n' +
    '## 三、技能 · 咒具 · 束缚\n\n' +
    (skillRows || '-（一件也不会）') +
    '\n\n' +
    (gearRows ? '咒具：\n' + gearRows + '\n' : '') +
    '\n' +
    (vowRows ? '束缚：\n' + vowRows + '\n' : '') +
    '\n' +
    '## 四、逐段经历\n\n' +
    (evRows || '-（入场于终战之后，此后再无大事）') +
    '\n\n' +
    (absRows ? '缺席原因：\n' + absRows + '\n' : '') +
    '\n' +
    (boutRows ? '## 五、各场战斗（逐场记录）\n\n' + boutRows + '\n' : '') +
    '## 六、决战逐回合记录\n\n' +
    (deadAt(c)
      ? '- **未参与最终决战**：你在「' + evNameOf(deadAt(c)) + '」这一战中战死，没能活到那一天。\n'
      : '- 对手：**' +
        oppName +
        '**\n- 交手回合数：**' +
        labelOf(c.battleRounds) +
        '**' +
        (c.grade === 'g7' || c.grade === 'g8' ? '（SS / EX 自动追加一回合）' : '') +
        (c.battleRounds2 ? '　二番战：**' + labelOf(c.battleRounds2) + '**' : '') +
        '\n' +
        battleLog +
        '\n\n' +
        (c.sukunaTrue ? '- 宿傩是否解放原身：**' + labelOf(c.sukunaTrue) + '**\n' : '') +
        '- 决战结果：**' +
        labelOf(c.duel) +
        '** —— ' +
        ((BY[c.duel] && BY[c.duel].hint) || '') +
        '\n') +
    '\n' +
    '## 七、战后\n\n- ' +
    (c.growth ? '**' + labelOf(c.growth) + '**' : '—') +
    '\n' +
    (c.loss ? '- 失去的东西：**' + labelOf(c.loss) + '**\n' : '') +
    '\n' +
    '## 八、结局\n\n- **' +
    labelOf(c.ending) +
    '** —— ' +
    ((BY[c.ending] && BY[c.ending].hint) || '') +
    '\n- 生还倾向：' +
    sv.toFixed(0) +
    '%\n\n' +
    (legacyRow ? '## 九、身后名\n\n' + legacyRow + '\n\n' : '') +
    '## 十、术式与领域\n\n- 生得术式：**' +
    (c.technique ? labelOf(c.technique) : '无术式') +
    '**' +
    (c.techNature ? '（性质：' + labelOf(c.techNature) + '）' : '') +
    '\n' +
    '- 生得领域：**' +
    (c.domain === 'd0' ? '未展开' : '「' + domLabel(c) + '」') +
    '**' +
    (c.domainForm ? '（形态：' + labelOf(c.domainForm) + '）' : '') +
    (c.domainEffect ? '（效果：' + labelOf(c.domainEffect) + '）' : '') +
    '\n' +
    '- 称号：**' +
    d.title +
    '**\n'
  )
}
