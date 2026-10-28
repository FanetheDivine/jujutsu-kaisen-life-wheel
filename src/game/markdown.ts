import { getState } from '../store/gameStore'
import {
  BOUT_EVENTS,
  EVENT_DEFS,
  OPPONENT,
  OPPONENT_NOTE,
  boutFoe,
  chosenSkills,
  deadAt,
} from './data'
import { BY, labelOf } from './options'
import { DIMS, RNK, rankOfScore } from './ranks'
import { stageById } from './registry'
import { domLabel, oppOf, power } from './rules'
import { VERSION, VERSION_DATE, VERSION_NOTE } from './version'
import type { BattleLog, DerivedLife, Stage } from './types'

export const SYSTEM_PROMPT = [
  '你是精通《咒术回战》世界观的同人小说家。请严格遵循以下设定，不得擅自篡改：',
  '1. 咒力源于人类的负面情感；咒灵由人的恐惧与憎恶凝聚而生，被祓除即消散。',
  '2. 术式为先天刻印在肉体上的能力，无法后天习得；天与咒缚是以术式为代价换来超人肉体。',
  '3. 领域展开＝以大量咒力具现化「生得领域」并附加必中效果；简易领域不附必中，但可抵消必中。',
  '4. 反转术式＝负负得正产生「正的咒力」用于治愈；黑闪＝咒力与物理冲击在 0.000001 秒误差内的碰撞，命中后威力翻倍并可追击。',
  '5. 咒物、受肉体、天元与其结界体系、死灭回游规则（结界内玩家、点数、以 100 点追加规则）不得违背。',
  '5c. 两面宿傩的「原身形态」＝四只手、两张脸的真正肉体，可再次展开领域「伏魔御廚子」；若档案中出现二番战，请如实描写他撕开受肉躯壳的过程。',
  '5b. 束缚＝以「给自己加锁」换取同等增幅，代价与收益必须同时成立；术式与领域请严格使用档案中给出的具体名称（如十种影法术、无量空处、伏魔御廚子、诛伏赐死），不要改名或替换。',
  '6. 时间线严格对齐档案中的「入场时期」与「逐段经历」，不得让该时点的死者复活、不得提前发生未发生之事。',
  '7. 禁止改写档案给出的结局、决战结果与战斗记录——你要写的是「这个人如何走到这个结局」。',
  '7b. 立场必须前后一致：档案中的「决战阵营」与「逐段经历」里的站队结果不得互相矛盾（例如决战阵营为高专方，就不能写成他在新宿站在宿傩一侧）。',
  '写作要求：中文；第二人称「你」；3000–5000 字；按「逐段经历」与「决战逐回合记录」分节并加小标题；战斗要逐回合写出双方出招；文风冷峻克制，偶有黑色幽默；不要输出设定说明或点评，只输出故事本身。',
].join('\n')

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
  const opp = OPPONENT[oppId] || '你的命运本身'
  const bondLine =
    c.bond === 'b13'
      ? '关键人物：**无。你孤身一人**，请写出这份孤独如何把人推向既定结局'
      : '必须出现的关键人物：**' +
        labelOf(c.bond) +
        '**（决战对手：' +
        opp +
        ' —— ' +
        (OPPONENT_NOTE[oppId] || '') +
        '）'
  const sk = chosenSkills(c)
    .map((id) => BY[id] && BY[id].label)
    .filter(Boolean)

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
    '## 十、术式与领域（具体名称）\n\n- 生得术式：**' +
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
    '**\n\n' +
    '## 十一、世界观锚点（写作时请严格遵守）\n\n' +
    '- 2006：怀玉·玉折（星浆体护送事件）／0 卷（乙骨忧太与祈本里香，百鬼夜行前夜）\n' +
    '- 2007.12.24：百鬼夜行，羂索在东京与京都放出上千只咒灵\n' +
    '- 2018 年春：虎杖悠仁吞下宿傩手指，进入东京咒术高专\n' +
    '- 2018.10.31：涩谷事变，五条悟被封印于狱门疆\n' +
    '- 2018.11：死灭回游开始（羂索发动），结界内玩家以点数博弈，追加规则需 100 点\n' +
    '- 2018.12.24：人外魔境新宿决战，五条悟与两面宿傩的最终对决\n' +
    '- 2019：终战之后，残存者重建咒术界\n' +
    '- 咒力＝负面情感的运用；咒灵＝恐惧的具现；术式＝先天刻印；领域展开＝具现化生得领域＋必中\n' +
    '- 天与咒缚＝以术式换取肉体；反转术式＝负负得正；黑闪＝0.000001 秒误差的咒力碰撞\n' +
    '- 简易领域＝0.5 秒展开、不附必中但可抵消必中；极之番＝术式的最大输出\n' +
    '- 天元＝不死术式与日本结界的核心；受肉体＝千年咒术师的灵魂借尸苏醒\n\n' +
    '## 十二、请为我写故事\n\n请以以上档案为主角设定，创作一篇《咒术回战》同人短篇：\n\n' +
    '- 视点：第二人称「你」，从「' +
    labelOf(c.era) +
    '」入场，入场年龄 ' +
    labelOf(c.age) +
    '，性格' +
    labelOf(c.personality) +
    '，运气 ' +
    labelOf(c.luck) +
    '\n' +
    '- 必须按「逐段经历」的顺序逐段推进，每段独立成节\n' +
    (boutRows
      ? '- 「各场战斗」里的每一场都要单独成节，按其中的逐回合记录写出双方出招（招式名请照抄），并写出该场之后的成长或失去\n'
      : '') +
    '- 决战一节必须严格按「决战逐回合记录」逐回合写出双方出招（招式名请照抄），落在：**' +
    labelOf(c.duel) +
    '**（对手：' +
    opp +
    '）' +
    (c.sukunaTrue === 'su_yes'
      ? '；宿傩会在一番战后解放「原身形态」（四臂、双面），二番战必须单独成节'
      : '') +
    '\n' +
    '- 最终结局必须是：**' +
    labelOf(c.ending) +
    '**\n' +
    '- ' +
    bondLine +
    '\n' +
    '- 必须体现六维（' +
    DIMS.map((dd) => dd.n + '：' + (c[dd.k] ? RNK(c, dd.k) : '—')).join('、') +
    '）、术式（' +
    (c.technique ? labelOf(c.technique) : '无') +
    '）、领域（' +
    (c.domain === 'd0' ? '未展开' : '「' + domLabel(c) + '」') +
    '）、等级（' +
    labelOf(c.grade) +
    '）、阵营（' +
    labelOf(c.faction) +
    '）、技能（' +
    (sk.join('、') || '无') +
    '）\n' +
    '- 立场必须前后一致：最终**' +
    labelOf(c.battleSide) +
    '**，所以「逐段经历」里的站队（尤其是新宿决战）必须与此一致，不得写成矛盾的两套立场\n' +
    '- 篇幅 3000–5000 字，文风冷峻克制，不要输出设定说明，只写故事\n'
  )
}
