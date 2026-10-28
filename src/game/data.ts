import { getState } from '../store/gameStore'
import { BY } from './options'
import { RANKS, RI } from './ranks'
import { EFFORT_BONUS, domLabel, oppOf, power, techLabel } from './rules'
import type {
  BattleFoe,
  CausalityRule,
  EventDefinition,
  KitOption,
  ResultContext,
  Stage,
  Weights,
  WheelOption,
} from './types'

export function dimStage(
  id: string,
  name: string,
  desc: string,
  notes: string[],
  rules: CausalityRule[],
): Stage {
  return {
    id,
    name,
    desc,
    kind: 'dim',
    tag: '性能',
    options: RANKS.map((r, i) => ({
      id: `${id}_${r.k}`,
      s: r.k,
      label: r.k,
      base: r.w,
      rank: r.k,
      hint: notes[i],
    })),
    rules,
  }
}

/* =====================================================================
   核心轮盘
   ===================================================================== */
export const CORE: Stage[] = [
  {
    id: 'era',
    name: '入场时期',
    kind: 'core',
    tag: '起点',
    desc: '你被投放到咒术界时间轴的哪一年。此后所有轮盘的几率，都将以此为基准被扭曲——包括你还要经历多少事。',
    options: [
      {
        id: 'e0',
        s: '0卷时期',
        label: '0卷时期',
        base: 1.0,
        hint: '2006。乙骨忧太与祈本里香的高专一年级，百鬼夜行尚在前夜。',
      },
      {
        id: 'e1',
        s: '怀玉·玉折',
        label: '怀玉·玉折',
        base: 1.0,
        hint: '2006。五条悟与夏油杰的高三，星浆体护送，伏黑甚尔撕裂命运的那一年。',
      },
      {
        id: 'e2',
        s: '故事开始',
        label: '故事开始时期',
        base: 1.2,
        hint: '2018 年春。少年院，虎杖悠仁吞下宿傩的手指。',
      },
      {
        id: 'e3',
        s: '涩谷事变',
        label: '涩谷事变时期',
        base: 1.2,
        hint: '2018.10.31。涩谷封印战，咒灵与咒术师的总力战，五条悟被封入狱门疆。',
      },
      {
        id: 'e4',
        s: '死灭回游',
        label: '死灭回游时期',
        base: 1.2,
        hint: '2018.11。羂索发动的杀戮游戏，结界、点数与规则的战场。',
      },
      {
        id: 'e5',
        s: '新宿决战',
        label: '新宿决战时期',
        base: 1.0,
        hint: '2018.12.24。人外魔境新宿，与两面宿傩的最终决战。',
      },
      {
        id: 'e6',
        s: '终战之后',
        label: '终战之后',
        base: 0.8,
        hint: '2019。死灭回游落幕，残存者在废墟上重建新的咒术界。',
      },
    ],
    rules: [],
  },
  {
    id: 'age',
    name: '入场年龄',
    kind: 'core',
    tag: '年岁',
    desc: '你以几岁的身体踏进这个时代。年龄会同时改写你的肉体、你的容貌，以及你能不能赶上后面的那些事。',
    options: [
      {
        id: 'ag1',
        s: '幼童',
        label: '幼童（0–12）',
        base: 1.0,
        hint: '你还握不住咒具，但恐惧已经开始在你体内积累。',
      },
      {
        id: 'ag2',
        s: '少年',
        label: '少年（13–17）',
        base: 1.5,
        hint: '正是被送进高专的年纪。身体在长，咒力也在长。',
      },
      { id: 'ag3', s: '青年', label: '青年（18–25）', base: 1.6, hint: '肉体与咒力的第一次巅峰。' },
      {
        id: 'ag4',
        s: '壮年',
        label: '壮年（26–45）',
        base: 1.0,
        hint: '经验最厚的时候，也是恢复力开始下滑的时候。',
      },
      {
        id: 'ag5',
        s: '老年',
        label: '老年（46+）',
        base: 0.5,
        hint: '你还活着，本身就是一种战绩。',
      },
    ],
    rules: [
      {
        name: '咒灵无所谓年龄',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.ag1 += 0.8
          w.ag5 += 0.4
          w.ag2 -= 0.5
          w.ag3 -= 0.5
        },
      },
      {
        name: '受肉体的肉体被重铸',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.ag3 += 1.0
          w.ag4 += 0.6
          w.ag1 = 0
        },
      },
      {
        name: '御三家从小被培养',
        when: (c: ResultContext) => c.origin === 'o2',
        apply: (w: Weights) => {
          w.ag2 += 0.8
          w.ag1 += 0.4
        },
      },
      {
        name: '死灭回游的选手多是成年人',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.ag3 += 0.5
          w.ag4 += 0.5
        },
      },
    ],
  },
  {
    id: 'personality',
    name: '性格',
    kind: 'core',
    tag: '人心',
    desc: '你是个什么样的人。性格不改变强弱，但它决定你在战场上会怎么选。',
    options: [
      {
        id: 'pe_calm',
        s: '冷静克制',
        label: '冷静克制',
        base: 1.3,
        hint: '永远留一手，永远先看清楚。你在战斗里更常防御与计算。',
      },
      {
        id: 'pe_hot',
        s: '热血冲动',
        label: '热血冲动',
        base: 1.2,
        hint: '想不明白就先打过去。你在战斗里更常硬碰硬、更早放大招。',
      },
      {
        id: 'pe_dark',
        s: '阴郁算计',
        label: '阴郁算计',
        base: 1.0,
        hint: '你擅长陷阱、束缚与借刀杀人。战斗里更倾向束缚、咒具与诡计。',
      },
      {
        id: 'pe_warm',
        s: '温柔执拗',
        label: '温柔执拗',
        base: 1.1,
        hint: '你会为了别人把自己搭进去。战斗里更常治疗与承受。',
      },
      {
        id: 'pe_void',
        s: '虚无旁观',
        label: '虚无旁观',
        base: 0.8,
        hint: '你不太在乎胜负，也不太在乎自己。战斗里什么都做得出来。',
      },
    ],
    rules: [
      {
        name: '老年 · 多已沉淀',
        when: (c: ResultContext) => c.age === 'ag5',
        apply: (w: Weights) => {
          w.pe_calm += 1.0
          w.pe_hot -= 0.6
        },
      },
      {
        name: '幼童 / 少年 · 情绪外露',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag2',
        apply: (w: Weights) => {
          w.pe_hot += 0.9
          w.pe_calm -= 0.5
          w.pe_void -= 0.3
        },
      },
      {
        name: '御三家 / 上层出身',
        when: (c: ResultContext) => c.origin === 'o2',
        apply: (w: Weights) => {
          w.pe_calm += 0.6
          w.pe_dark += 0.5
        },
      },
      {
        name: '咒灵之身 · 依恐惧成形',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.pe_hot += 0.6
          w.pe_void += 0.5
          w.pe_warm -= 0.6
        },
      },
      {
        name: '智谋 S 以上',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
        apply: (w: Weights) => {
          w.pe_calm += 0.6
          w.pe_dark += 0.6
        },
      },
      {
        name: '外貌 SS 以上 · 被世界善待',
        when: (c: ResultContext) => RI(c, 'dim_lk') >= 6,
        apply: (w: Weights) => {
          w.pe_warm += 0.5
        },
      },
    ],
  },
  {
    id: 'luck',
    name: '运气',
    kind: 'core',
    tag: '运势',
    desc: '在这个世界里，运气是一种真实存在的资源。它会影响你在战斗与死亡线上的表现。',
    options: [
      {
        id: 'lk_EX',
        s: 'EX',
        label: 'EX · 被世界偏袒',
        base: 0.1,
        hint: '该死的时候总能差一点，该赢的时候总能多一点。',
      },
      { id: 'lk_S', s: 'S', label: 'S · 强运', base: 0.35, hint: '关键时刻总有转机。' },
      { id: 'lk_A', s: 'A', label: 'A · 偏好运', base: 0.8, hint: '大多数时候站在顺风的那一侧。' },
      { id: 'lk_B', s: 'B', label: 'B · 普通', base: 1.6, hint: '不偏不倚。' },
      { id: 'lk_C', s: 'C', label: 'C · 偏坏运', base: 1.0, hint: '小事总是差一点。' },
      { id: 'lk_D', s: 'D', label: 'D · 霉运', base: 0.6, hint: '你踩过的每一块砖都会松。' },
      {
        id: 'lk_E',
        s: 'E',
        label: 'E · 被世界针对',
        base: 0.25,
        hint: '坏事总会精确地落在你身上——包括那些本该与你无关的事。',
      },
    ],
    rules: [
      {
        name: '老年 · 运气多半已耗尽',
        when: (c: ResultContext) => c.age === 'ag5',
        apply: (w: Weights) => {
          w.lk_E += 0.8
          w.lk_D += 0.6
          w.lk_EX = 0
        },
      },
      {
        name: '幼童 · 运势尚未定型',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.lk_EX += 0.2
          w.lk_E -= 0.3
        },
      },
      {
        name: '与五条悟有缘 · 被最强罩着',
        when: (c: ResultContext) => c.bond === 'b1',
        apply: (w: Weights) => {
          w.lk_S += 0.8
          w.lk_A += 0.5
          w.lk_E -= 0.4
        },
      },
      {
        name: '与宿傩有缘 · 被诅咒之王盯上',
        when: (c: ResultContext) => c.bond === 'b10',
        apply: (w: Weights) => {
          w.lk_E += 0.9
          w.lk_D += 0.6
          w.lk_EX = 0
        },
      },
      {
        name: '孤身一人 · 没人替你挡',
        when: (c: ResultContext) => c.bond === 'b13',
        apply: (w: Weights) => {
          w.lk_D += 0.5
          w.lk_E += 0.4
          w.lk_S -= 0.3
        },
      },
    ],
  },
  {
    id: 'gender',
    name: '性别',
    kind: 'core',
    tag: '肉身',
    desc: '肉身的性别。在死灭回游的年代，还有第三种可能——被古代咒术师的灵魂占据的「受肉体」。',
    options: [
      { id: 'g_m', s: '男', label: '男', base: 1.0, hint: '以男性之躯降生。' },
      { id: 'g_f', s: '女', label: '女', base: 1.0, hint: '以女性之躯降生。' },
      {
        id: 'g_x',
        s: '不定',
        label: '不定 · 受肉体容器',
        base: 0.22,
        hint: '肉身并非你自己：古代咒术师的灵魂寄居其中。',
      },
    ],
    rules: [
      {
        name: '入场于死灭回游',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.g_x += 1.15
        },
      },
      {
        name: '入场于新宿决战',
        when: (c: ResultContext) => c.era === 'e5',
        apply: (w: Weights) => {
          w.g_x += 0.7
        },
      },
      {
        name: '入场于终战之后',
        when: (c: ResultContext) => c.era === 'e6',
        apply: (w: Weights) => {
          w.g_x += 0.4
        },
      },
    ],
  },
  {
    id: 'origin',
    name: '出身 · 存在形态',
    kind: 'core',
    tag: '此身为何',
    desc: '你是以咒术师的身份出生，还是作为恐惧本身诞生，抑或只是恰好路过的普通人。',
    options: [
      {
        id: 'o1',
        s: '高专出身',
        label: '高专出身咒术师',
        base: 1.6,
        hint: '东京或京都咒术高等专门学校，被五条悟那类人捡来的孩子。',
      },
      {
        id: 'o2',
        s: '御三家',
        label: '御三家 · 咒术界名门',
        base: 1.0,
        hint: '五条、禅院、加茂——生在术式与家规都写进族谱的地方。',
      },
      {
        id: 'o3',
        s: '一般人类',
        label: '一般人类（几乎无咒力）',
        base: 0.85,
        hint: '看不见咒灵，也救不了任何人。',
      },
      {
        id: 'o4',
        s: '咒灵',
        label: '咒灵 · 由恐惧而生',
        base: 0.9,
        hint: '人类的负面情感凝聚成形。你没有父母，只有源头。',
      },
      {
        id: 'o5',
        s: '受肉体',
        label: '受肉体 · 容器',
        base: 0.55,
        hint: '沉睡千年的咒术师借你的肉身苏醒。',
      },
      {
        id: 'o6',
        s: '天元侧',
        label: '天元侧 · 结界与星浆体',
        base: 0.3,
        hint: '围绕天元的结界体系、星浆体的同化，或是守护者。',
      },
    ],
    rules: [
      {
        name: '入场于 0 卷时期',
        when: (c: ResultContext) => c.era === 'e0',
        apply: (w: Weights) => {
          w.o1 += 1.0
          w.o2 += 0.5
          w.o5 = 0
          w.o6 += 0.2
        },
      },
      {
        name: '入场于怀玉·玉折',
        when: (c: ResultContext) => c.era === 'e1',
        apply: (w: Weights) => {
          w.o1 += 0.5
          w.o2 += 0.8
          w.o5 = 0
          w.o6 += 1.0
        },
      },
      {
        name: '入场于故事开始',
        when: (c: ResultContext) => c.era === 'e2',
        apply: (w: Weights) => {
          w.o1 += 0.7
          w.o3 += 0.5
          w.o4 += 0.3
        },
      },
      {
        name: '入场于涩谷事变',
        when: (c: ResultContext) => c.era === 'e3',
        apply: (w: Weights) => {
          w.o3 += 1.3
          w.o4 += 0.9
          w.o1 += 0.3
        },
      },
      {
        name: '入场于死灭回游',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.o5 += 2.3
          w.o4 += 0.6
          w.o3 += 0.2
          w.o1 += 0.2
        },
      },
      {
        name: '入场于新宿决战',
        when: (c: ResultContext) => c.era === 'e5',
        apply: (w: Weights) => {
          w.o5 += 0.9
          w.o1 += 0.5
          w.o4 += 0.4
        },
      },
      {
        name: '入场于终战之后',
        when: (c: ResultContext) => c.era === 'e6',
        apply: (w: Weights) => {
          w.o1 += 0.8
          w.o3 += 0.5
          w.o5 = 0
          w.o6 += 0.3
        },
      },
      {
        name: '性别为「不定」',
        when: (c: ResultContext) => c.gender === 'g_x',
        apply: (w: Weights) => {
          w.o5 += 1.6
          w.o4 += 0.5
        },
      },
      {
        name: '幼童尚未被选择',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.o1 += 0.4
          w.o2 += 0.4
        },
      },
    ],
  },
  {
    id: 'curseFear',
    name: '由什么恐惧而生',
    kind: 'core',
    tag: '咒灵',
    desc: '你是人类哪种恐惧聚成的形体。恐惧的性质决定你的外形、你的能力，以及你有多难被祓除。',
    skipIf: (c) => c.origin !== 'o4',
    skipText: '你不是咒灵 —— 此轮不存',
    options: [
      {
        id: 'cf_disaster',
        s: '自然灾害',
        label: '自然灾害类（风暴 · 雷霆 · 火山）',
        base: 1.3,
        hint: '原作参照：漏瑚（火山）、花御（森林）。破坏力直白，体积随恐惧增长。',
      },
      {
        id: 'cf_history',
        s: '人类历史',
        label: '人类历史类（战争 · 屠杀）',
        base: 0.9,
        hint: '由累积的杀意与记忆诞生，往往带有明确的「意志」。',
      },
      {
        id: 'cf_fiction',
        s: '假想作品',
        label: '假想作品类（幻想 · 传说 · 都市传说）',
        base: 0.8,
        hint: '由故事与传闻诞生：某段恐怖传说听的人多了，它就成了真的。',
      },
      {
        id: 'cf_artifact',
        s: '人造物',
        label: '人造物类（核 · 枪 · 机械）',
        base: 0.7,
        hint: '原作参照：疱疮神一类。人类对自己造出来的东西的恐惧。',
      },
      {
        id: 'cf_disease',
        s: '疾病',
        label: '疾病类',
        base: 0.7,
        hint: '对病痛与腐烂的恐惧凝聚而成，常带有毒素与传染性。',
      },
      {
        id: 'cf_root',
        s: '根源恐惧',
        label: '根源恐惧（死亡 · 黑暗 · 深渊）',
        base: 0.6,
        hint: '最古老的一类：不需要具体形象，光是存在就让人发疯。',
      },
      {
        id: 'cf_society',
        s: '社会现象',
        label: '人类社会现象（征服 · 阶级 · 暴力）',
        base: 0.8,
        hint: '由结构性压迫与群体恶意诞生，会随时间越来越强。',
      },
      {
        id: 'cf_common',
        s: '普通',
        label: '普通类（无明确源头）',
        base: 1.0,
        hint: '没有什么特别的由来的弱小咒灵——大多数咒灵都是这样。',
      },
    ],
    rules: [
      {
        name: '入场于涩谷 / 新宿 · 强者辈出',
        when: (c: ResultContext) => c.era === 'e3' || c.era === 'e5',
        apply: (w: Weights) => {
          w.cf_disaster += 0.7
          w.cf_history += 0.5
        },
      },
      {
        name: '幼童 · 恐惧尚未成形',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.cf_root = 0
          w.cf_history = 0
          w.cf_common += 1.2
        },
      },
    ],
  },
  {
    id: 'curseBirth',
    name: '诞生时的形态',
    kind: 'core',
    tag: '咒灵',
    desc: '你刚成形时是什么状态——这决定了你还能不能继续长大。',
    skipIf: (c) => c.origin !== 'o4',
    skipText: '你不是咒灵 —— 此轮不存',
    options: [
      {
        id: 'cb_fetus',
        s: '咒胎',
        label: '咒胎（尚未孵化）',
        base: 1.1,
        hint: '还是一团未成形的肉块。但只要吃掉足够的人，就会孵化——也会变强。',
      },
      {
        id: 'cb_adult',
        s: '完全体',
        label: '完全体（出生即成形）',
        base: 1.4,
        hint: '一诞生就是完整形态，有明确的形体与意志。',
      },
      {
        id: 'cb_reborn',
        s: '受肉诞生',
        label: '受肉诞生（寄居咒物或尸体）',
        base: 0.8,
        hint: '原作参照：九相图。借由咒物或尸体获得人的形体，也获得人的理性。',
      },
      {
        id: 'cb_nine',
        s: '九相图类',
        label: '九相图类（人类与咒灵的混血）',
        base: 0.5,
        hint: '原作参照：脹相三兄弟。既有咒灵的咒力与再生，也保留人类的感情。',
      },
    ],
    rules: [
      {
        name: '根源恐惧 · 多为完全体',
        when: (c: ResultContext) => c.curseFear === 'cf_root',
        apply: (w: Weights) => {
          w.cb_adult += 1.4
          w.cb_fetus -= 0.6
        },
      },
      {
        name: '普通类 · 多为咒胎起步',
        when: (c: ResultContext) => c.curseFear === 'cf_common',
        apply: (w: Weights) => {
          w.cb_fetus += 1.2
          w.cb_nine -= 0.3
        },
      },
      {
        name: '人造物 / 疾病 · 常寄居他物',
        when: (c: ResultContext) => c.curseFear === 'cf_artifact' || c.curseFear === 'cf_disease',
        apply: (w: Weights) => {
          w.cb_reborn += 1.2
        },
      },
      {
        name: '入场于死灭回游 · 受肉者横行',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.cb_reborn += 0.9
          w.cb_nine += 0.5
        },
      },
    ],
  },
  {
    id: 'talent',
    name: '咒力资质 · 术式有无',
    kind: 'core',
    tag: '天赋',
    desc: '术式是刻在肉体上的先天烙印，无法后天习得。没有它，你只剩咒力操作与体术——或者什么都没有。',
    options: [
      {
        id: 't1',
        s: '无术式',
        label: '无术式 · 纯咒力操作',
        base: 1.2,
        hint: '把咒力灌进拳头，打到懂为止。',
      },
      {
        id: 't2',
        s: '先天术式',
        label: '先天术式持有者',
        base: 1.4,
        hint: '生来便刻着一套只属于你的规则。',
      },
      {
        id: 't3',
        s: '天与咒缚',
        label: '天与咒缚',
        base: 0.32,
        hint: '以术式为代价，换来超越常人的肉体。禅院真希、伏黑甚尔那一类。',
      },
      {
        id: 't4',
        s: '咒灵操术',
        label: '咒灵操术 · 调伏使役',
        base: 0.5,
        hint: '把咒灵收进手中驱使，输给谁就要服从谁。',
      },
      {
        id: 't5',
        s: '反转术式',
        label: '天生反转术式',
        base: 0.18,
        hint: '负负得正，产出「正的咒力」来治愈——千中无一的体质。',
      },
      {
        id: 't6',
        s: '无咒力',
        label: '无咒力 · 凡人',
        base: 0.5,
        hint: '咒力微弱到几乎为零，看不见咒灵，也握不住咒具。',
      },
    ],
    rules: [
      {
        name: '出身为一般人类',
        when: (c: ResultContext) => c.origin === 'o3',
        apply: (w: Weights) => {
          w.t6 += 3.2
          w.t1 = 0
          w.t2 = 0
          w.t3 = 0
          w.t4 = 0
          w.t5 = 0
        },
      },
      {
        name: '出身为咒灵',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.t6 = 0
          w.t3 = 0
          w.t2 += 0.9
          w.t1 += 0.5
          w.t5 += 0.2
        },
      },
      {
        name: '出身为受肉体',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.t2 += 1.1
          w.t6 = 0
          w.t1 += 0.2
          w.t5 += 0.2
        },
      },
      {
        name: '出身为天元侧',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.t1 += 0.7
          w.t5 += 0.5
          w.t6 = 0
        },
      },
      {
        name: '出身为御三家',
        when: (c: ResultContext) => c.origin === 'o2',
        apply: (w: Weights) => {
          w.t2 += 0.9
          w.t3 += 0.25
        },
      },
      {
        name: '五条家 · 无一例外都带着术式',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.t2 += 2.2
          w.t1 -= 0.6
          w.t3 = 0
          w.t6 = 0
        },
      },
      {
        name: '禅院家 · 肉体派与影术派并存',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.t3 += 1.9
          w.t2 += 0.7
          w.t1 += 0.4
        },
      },
      {
        name: '加茂家 · 血脉里的术式',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.t2 += 1.7
          w.t6 = 0
        },
      },
      {
        name: '高专出身',
        when: (c: ResultContext) => c.origin === 'o1',
        apply: (w: Weights) => {
          w.t2 += 0.5
          w.t1 += 0.4
        },
      },
      {
        name: '死灭回游 · 强者云集',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.t2 += 0.7
        },
      },
      {
        name: '新宿决战 · 规格外',
        when: (c: ResultContext) => c.era === 'e5',
        apply: (w: Weights) => {
          w.t2 += 0.6
          w.t5 += 0.3
        },
      },
    ],
  },
  {
    id: 'technique',
    name: '生得术式 · 具体为何',
    kind: 'core',
    tag: '术式',
    desc: '术式是刻在肉体上的先天规则。你身上刻着的是哪一套？',
    skipIf: (c) => ['t2', 't4', 't5'].indexOf(c.talent) < 0,
    skipText: '没有术式 —— 此轮不存',
    options: [
      {
        id: 'tc_shadow',
        s: '十种影法术',
        label: '十种影法术',
        base: 0.9,
        hint: '以影为媒介召唤十种式神；式神被破坏不会复原，但残存的力量会留下来。（原作：伏黑惠）',
      },
      {
        id: 'tc_limitless',
        s: '无下限',
        label: '无下限',
        base: 0.4,
        hint: '在自身与世界之间插入「无限」：苍（吸引）、赫（排斥）、茈（虚式）。（原作：五条悟）',
      },
      {
        id: 'tc_blood',
        s: '赤血操术',
        label: '赤血操术',
        base: 0.8,
        hint: '以自身血液为媒介：穿血、苅祓、赫鳞跃动。（原作：脹相）',
      },
      {
        id: 'tc_summon',
        s: '咒灵操术',
        label: '咒灵操术',
        base: 0.85,
        hint: '收服并驱使咒灵，输给谁就要服从谁；吞下咒灵球即可使其为己用。（原作：夏油杰 / 羂索）',
      },
      {
        id: 'tc_idle',
        s: '无为转变',
        label: '无为转变',
        base: 0.5,
        hint: '触碰灵魂、改变肉体的形状。可以把人塑造成任何东西。（原作：真人）',
      },
      {
        id: 'tc_ratio',
        s: '十划咒法',
        label: '十划咒法',
        base: 0.8,
        hint: '把目标按十等分划分，在七三之分处必出暴击。（原作：七海建人）',
      },
      {
        id: 'tc_word',
        s: '咒言',
        label: '咒言',
        base: 0.45,
        hint: '语言即咒力，说出去的话强制现实——代价是烧坏自己的喉咙。（原作：狗卷棘）',
      },
      {
        id: 'tc_swap',
        s: '不义游戏',
        label: '不义游戏',
        base: 0.7,
        hint: '与自己持有的物体互换位置，配合拍手可无限位移。（原作：东堂葵）',
      },
      {
        id: 'tc_copy',
        s: '模仿 · 复制',
        label: '模仿 · 复制',
        base: 0.6,
        hint: '经由某种媒介复制并使用他人的术式。（原作：乙骨忧太经由里香）',
      },
      {
        id: 'tc_disaster',
        s: '灾害系',
        label: '灾害系术式（炎雷 · 熔岩 · 风暴）',
        base: 0.7,
        hint: '以自然灾害为形的术式，破坏力极高而精密不足。（原作：漏瑚一类）',
      },
      {
        id: 'tc_bird',
        s: '黑鸟操术',
        label: '黑鸟操术',
        base: 0.5,
        hint: '以黑色鸟形式神进行侦察与攻击的操术系术式。',
      },
      {
        id: 'tc_project',
        s: '投射咒法',
        label: '投射咒法',
        base: 0.5,
        hint: '把咒力或物体投射到远处的术式，射程与精度都取决于操控。',
      },
      {
        id: 'tc_build',
        s: '构筑术式',
        label: '构筑术式',
        base: 0.5,
        hint: '以咒力构筑实体结构：墙、笼、刺、乃至一整座迷宫。',
      },
      {
        id: 'tc_puppet',
        s: '傀儡操术',
        label: '傀儡操术',
        base: 0.45,
        hint: '操纵人偶与咒骸的术式；本体可以远离战场。',
      },
      {
        id: 'tc_original',
        s: '自创术式',
        label: '自创术式（由你的内心生成名字）',
        base: 0.85,
        hint: '不属于任何人的术式——名字将按你的出身、领域与六维生成。',
      },
    ],
    rules: [
      /* 家门加成放在「咒灵操术资质」规则之前：若你是咒灵操术资质，后面那条规则仍会把其他术式清零 */
      {
        name: '五条家 · 无下限几乎写进血脉',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.tc_limitless += 9.5
          w.tc_shadow -= 0.25
          w.tc_blood -= 0.25
          w.tc_original -= 0.2
        },
      },
      {
        name: '禅院家 · 十种影法术',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.tc_shadow += 5.6
          w.tc_original -= 0.2
        },
      },
      {
        name: '加茂家 · 赤血操术',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.tc_blood += 6.0
          w.tc_original -= 0.2
        },
      },
      {
        name: '资质为咒灵操术',
        when: (c: ResultContext) => c.talent === 't4',
        apply: (w: Weights) => {
          w.tc_summon += 6.0
          Object.keys(w).forEach((k) => {
            if (k !== 'tc_summon') w[k] = 0
          })
        },
      },
      {
        name: '御三家 · 名门之家学',
        when: (c: ResultContext) => c.origin === 'o2',
        apply: (w: Weights) => {
          w.tc_shadow += 0.3
          w.tc_blood += 0.2
          w.tc_limitless += 0.2
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.tc_summon += 0.9
          w.tc_blood += 0.4
          w.tc_disaster += 0.5
        },
      },
      {
        name: '受肉体 · 术式来自他人',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.tc_original += 0.8
          w.tc_copy += 0.5
        },
      },
      {
        name: '天元侧 · 概念与结界',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.tc_build += 1.0
          w.tc_limitless += 0.4
        },
      },
      {
        name: '智谋 S 以上',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
        apply: (w: Weights) => {
          w.tc_ratio += 0.7
          w.tc_build += 0.5
          w.tc_project += 0.4
        },
      },
      {
        name: '体术 S 以上',
        when: (c: ResultContext) => RI(c, 'dim_tj') >= 5,
        apply: (w: Weights) => {
          w.tc_swap += 0.7
          w.tc_blood += 0.4
        },
      },
      {
        name: '幼童 / 少年 · 尚未成熟',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag2',
        apply: (w: Weights) => {
          w.tc_limitless -= 0.2
        },
      },
    ],
  },
  {
    id: 'techNature',
    name: '术式性质',
    kind: 'core',
    tag: '术式',
    desc: '同样是术式，性质完全不同：是把概念强加给世界，还是把恐惧凝成形体？',
    skipIf: (c) => ['t2', 't4', 't5'].indexOf(c.talent) < 0,
    skipText: '没有术式 —— 此轮不存',
    options: [
      {
        id: 'tn_element',
        s: '元素',
        label: '元素系（火 · 雷 · 水 · 土）',
        base: 1.0,
        hint: '原作参照：漏瑚一类。以自然元素直接破坏，威力直白。',
      },
      {
        id: 'tn_concept',
        s: '概念',
        label: '概念系（规则 · 数值 · 必然）',
        base: 0.9,
        hint: '原作参照：五条悟的「无限」、七海的「十划」。把抽象概念强加给现实。',
      },
      {
        id: 'tn_imagine',
        s: '假想',
        label: '假想系（想象 · 具现）',
        base: 0.7,
        hint: '原作参照：猪野一类。以想象为种子，让不存在之物具现。',
      },
      {
        id: 'tn_shiki',
        s: '式神',
        label: '式神系（召唤 · 使役）',
        base: 0.85,
        hint: '原作参照：伏黑惠的十影。召唤独立的存在替你作战。',
      },
      {
        id: 'tn_operate',
        s: '操术',
        label: '操术系（操作 · 支配）',
        base: 0.95,
        hint: '原作参照：赤血操术、咒灵操术。操纵既有的东西为我所用。',
      },
      {
        id: 'tn_space',
        s: '空间',
        label: '空间系（距离 · 断裂 · 隔绝）',
        base: 0.5,
        hint: '原作参照：五条悟。攻击从「不存在的地方」抵达。',
      },
    ],
    rules: [
      {
        name: '术式为无下限',
        when: (c: ResultContext) => c.technique === 'tc_limitless',
        apply: (w: Weights) => {
          w.tn_concept += 2.5
          w.tn_space += 2.0
        },
      },
      {
        name: '术式为十种影法术',
        when: (c: ResultContext) => c.technique === 'tc_shadow',
        apply: (w: Weights) => {
          w.tn_shiki += 3.0
        },
      },
      {
        name: '术式为咒灵操术',
        when: (c: ResultContext) => c.technique === 'tc_summon',
        apply: (w: Weights) => {
          w.tn_operate += 3.0
        },
      },
      {
        name: '术式为赤血操术',
        when: (c: ResultContext) => c.technique === 'tc_blood',
        apply: (w: Weights) => {
          w.tn_operate += 2.6
          w.tn_element += 0.5
        },
      },
      {
        name: '术式为灾害系',
        when: (c: ResultContext) => c.technique === 'tc_disaster',
        apply: (w: Weights) => {
          w.tn_element += 3.0
        },
      },
      {
        name: '术式为咒言',
        when: (c: ResultContext) => c.technique === 'tc_word',
        apply: (w: Weights) => {
          w.tn_concept += 2.2
        },
      },
      {
        name: '术式为构筑系',
        when: (c: ResultContext) => c.technique === 'tc_build',
        apply: (w: Weights) => {
          w.tn_imagine += 2.0
          w.tn_space += 0.8
        },
      },
      {
        name: '术式为投射 / 傀儡',
        when: (c: ResultContext) => c.technique === 'tc_project' || c.technique === 'tc_puppet',
        apply: (w: Weights) => {
          w.tn_operate += 1.8
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.tn_element += 0.7
          w.tn_imagine += 0.6
        },
      },
    ],
  },
  {
    id: 'gift',
    name: '特殊天赋',
    kind: 'core',
    tag: '天赋',
    desc: '除术式之外，你是否生来就带着某种「不讲道理」的东西。',
    options: [
      {
        id: 'gift_none',
        s: '无',
        label: '无（你只是个普通的术师）',
        base: 1.7,
        hint: '你的强与弱都来自后天的选择与训练。',
      },
      {
        id: 'gift_six',
        s: '六眼',
        label: '六眼',
        base: 0.22,
        hint: '原作：五条悟。看穿一切咒力流动，咒力损耗无限接近于零，精密操作近乎神技。',
      },
      {
        id: 'gift_arms',
        s: '双面四臂',
        label: '双面四臂',
        base: 0.2,
        hint: '原作：两面宿傩。两双手意味着两套战斗逻辑同时运转。',
      },
      {
        id: 'gift_binding',
        s: '天与咒缚',
        label: '天与咒缚',
        base: 0.3,
        hint: '原作：伏黑甚尔、禅院真希。以术式为代价，换来超越常人的肉体与「看得见的眼睛」。',
      },
      {
        id: 'gift_rebirth',
        s: '超级受肉体',
        label: '超级受肉体（容器）',
        base: 0.35,
        hint: '原作：虎杖悠仁。吞下咒物后肉体被重铸，能承受宿傩之魂的寄宿。',
      },
      {
        id: 'gift_half',
        s: '半人半咒',
        label: '半人半咒',
        base: 0.3,
        hint: '原作：九相图（脹相等）。兼具人类的理性与咒灵的再生与咒力。',
      },
      {
        id: 'gift_plasma',
        s: '星浆体资质',
        label: '星浆体资质',
        base: 0.18,
        hint: '原作：天内理子。可与天元同化的体质——也因此会被整个咒术界盯上。',
      },
      {
        id: 'gift_desukunto',
        s: '德斯昆特族血脉',
        label: '德斯昆特族血脉',
        base: 0.15,
        hint: '与「杀意」同源的血脉：战斗直觉与身体反应异常发达，几乎不靠思考就能杀人。',
      },
    ],
    rules: [
      {
        name: '已有天与咒缚资质',
        when: (c: ResultContext) => c.talent === 't3',
        apply: (w: Weights) => {
          w.gift_binding += 3.2
          w.gift_six = 0
          w.gift_arms -= 0.3
        },
      },
      {
        name: '只有天与咒缚资质 / 无咒力者才可能有该天赋',
        when: (c: ResultContext) => ['t1', 't2', 't4', 't5'].indexOf(c.talent) >= 0,
        apply: (w: Weights) => {
          w.gift_binding = 0
        },
      },
      {
        name: '无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.gift_six = 0
          w.gift_arms = 0
          w.gift_plasma = 0
          w.gift_binding += 1.4
        },
      },
      {
        name: '受肉体之身',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.gift_rebirth += 1.8
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.gift_half += 1.6
          w.gift_six = 0
          w.gift_binding = 0
        },
      },
      {
        name: '天元侧',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.gift_plasma += 2.0
        },
      },
      {
        name: 'SS / EX 级',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.gift_six += 0.6
          w.gift_arms += 0.5
        },
      },
      {
        name: '死灭回游时代 · 受肉者横行',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.gift_rebirth += 0.6
        },
      },
      {
        name: '五条家 · 六眼',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.gift_six += 3.6
          w.gift_none -= 1.0
        },
      },
      {
        name: '禅院家 · 天与咒缚（以术式换肉体）',
        when: (c: ResultContext) =>
          c.clan === 'cl_zenin' && (c.talent === 't3' || c.talent === 't6'),
        apply: (w: Weights) => {
          w.gift_binding += 2.4
          w.gift_none -= 0.6
        },
      },
      {
        name: '加茂家 · 血脉的异质',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.gift_half += 1.0
          w.gift_desukunto += 0.6
        },
      },
    ],
  },
  {
    id: 'domain',
    name: '生得领域 · 有无',
    kind: 'core',
    tag: '内面',
    desc: '以咒力把内心的风景具现化，并在其中附加必中效果——这是术式的最深处，也是咒术师的顶点。',
    options: [
      {
        id: 'd0',
        s: '无领域',
        label: '未习得领域',
        base: 1.6,
        hint: '你没有领域。绝大多数咒术师都死在这里。',
      },
      {
        id: 'd1',
        s: '不完整领域',
        label: '不完整领域（未完）',
        base: 0.7,
        hint: '形状立起来了，必中却漏风。伏黑惠曾经的样子。',
      },
      {
        id: 'd2',
        s: '领域展开',
        label: '完整领域展开 · 必中',
        base: 0.8,
        hint: '在这个圆里，你的术式必然命中。',
      },
    ],
    rules: [
      {
        name: '资质为无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.d0 += 5
          w.d1 = 0
          w.d2 = 0
        },
      },
      {
        name: '资质为天与咒缚',
        when: (c: ResultContext) => c.talent === 't3',
        apply: (w: Weights) => {
          w.d0 += 3.2
          w.d1 = 0
          w.d2 = 0
        },
      },
      {
        name: '无术式者开不出领域（领域须以术式为骨架）',
        when: (c: ResultContext) => c.talent === 't1',
        apply: (w: Weights) => {
          w.d0 += 3.0
          w.d1 = 0
          w.d2 = 0
        },
      },
      {
        name: '资质为先天术式',
        when: (c: ResultContext) => c.talent === 't2',
        apply: (w: Weights) => {
          w.d1 += 0.5
          w.d2 += 1.4
        },
      },
      {
        name: '资质为天生反转术式',
        when: (c: ResultContext) => c.talent === 't5',
        apply: (w: Weights) => {
          w.d2 += 1.1
        },
      },
      {
        name: '幼童 · 领域尚远',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.d2 -= 0.5
          w.d0 += 0.6
        },
      },
      {
        name: '领域仍是稀有之物（早期时代）',
        when: (c: ResultContext) => c.era === 'e0' || c.era === 'e1',
        apply: (w: Weights) => {
          w.d2 -= 0.35
        },
      },
      {
        name: '顶级战力倾巢而出（后期时代）',
        when: (c: ResultContext) => c.era === 'e3' || c.era === 'e4' || c.era === 'e5',
        apply: (w: Weights) => {
          w.d2 += 0.65
        },
      },
      {
        name: '出身为咒灵',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.d2 += 0.35
        },
      },
      {
        name: '出身为天元侧',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.d2 += 0.45
          w.d1 += 0.2
        },
      },
      {
        name: '五条家 · 家学里就有无量空处',
        when: (c: ResultContext) =>
          c.clan === 'cl_gojo' && ['t1', 't3', 't6'].indexOf(c.talent) < 0,
        apply: (w: Weights) => {
          w.d2 += 1.5
          w.d1 -= 0.2
          w.d0 -= 0.5
        },
      },
      {
        name: '禅院家 · 影之领域代代相传',
        when: (c: ResultContext) =>
          c.clan === 'cl_zenin' && ['t1', 't3', 't6'].indexOf(c.talent) < 0,
        apply: (w: Weights) => {
          w.d2 += 0.5
          w.d1 += 0.5
        },
      },
      {
        name: '加茂家 · 血脉的术式也有内面',
        when: (c: ResultContext) =>
          c.clan === 'cl_kamo' && ['t1', 't3', 't6'].indexOf(c.talent) < 0,
        apply: (w: Weights) => {
          w.d2 += 0.55
        },
      },
    ],
  },
  {
    id: 'domainForm',
    name: '领域形态',
    kind: 'core',
    tag: '内面',
    desc: '你的领域是围出一块绝对空间的「封闭式」，还是直接覆盖现实的「开放式」？',
    skipIf: (c) => c.domain === 'd0',
    skipText: '未展开领域 —— 此轮不存',
    options: [
      {
        id: 'df_closed',
        s: '封闭式',
        label: '封闭式 · 以结界外壁围出绝对空间',
        base: 1.6,
        hint: '例：五条悟「无量空处」、日车宽见「诛伏赐死」。外壁之内即是你的法则。',
      },
      {
        id: 'df_open',
        s: '开放式',
        label: '开放式 · 不设外壁，直接作用于现实',
        base: 0.9,
        hint: '例：两面宿傩「伏魔御廚子」。不围人，只斩到世界尽头——代价是「以结界束缚」的效果会变弱。',
      },
      {
        id: 'df_switch',
        s: '自由切换',
        label: '开放封闭 · 自由切换',
        base: 0.35,
        hint: '极少数术师才能做到：按战况在两种构型间切换。',
      },
      {
        id: 'df_incomplete',
        s: '未完成',
        label: '未完成 · 外壁漏风、必中残缺',
        base: 0.8,
        hint: '例：伏黑惠的「嵌合暗翳庭」。形状立起来了，必中却漏。',
      },
    ],
    rules: [
      {
        name: '领域为「不完整」',
        when: (c: ResultContext) => c.domain === 'd1',
        apply: (w: Weights) => {
          w.df_incomplete += 4.0
          w.df_closed = 0
          w.df_open = 0
          w.df_switch = 0
        },
      },
      {
        name: '领域为「完整展开」',
        when: (c: ResultContext) => c.domain === 'd2',
        apply: (w: Weights) => {
          w.df_incomplete = 0
        },
      },
      {
        name: 'SS / EX 级术师',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.df_switch += 0.8
          w.df_open += 0.5
        },
      },
      {
        name: '操控 S 以上',
        when: (c: ResultContext) => RI(c, 'dim_ct') >= 5,
        apply: (w: Weights) => {
          w.df_switch += 0.6
        },
      },
      {
        name: '咒灵之身 · 更趋向开放式',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.df_open += 0.8
          w.df_closed -= 0.3
        },
      },
    ],
  },
  {
    id: 'domainEffect',
    name: '领域效果',
    kind: 'core',
    tag: '内面',
    desc: '在这个圆里，你的术式对侵入者做什么。（可叠加多种效果，但此处只抽最主要的一种）',
    skipIf: (c) => c.domain === 'd0',
    skipText: '未展开领域 —— 此轮不存',
    options: [
      {
        id: 'de_hit',
        s: '必中',
        label: '必中 · 术式必然命中',
        base: 1.7,
        hint: '领域展开的根本：在这个圆里，你的术式不需要瞄准。',
      },
      {
        id: 'de_auto',
        s: '自动攻击',
        label: '自动攻击 · 领域内自行斩击灼烧',
        base: 0.8,
        hint: '例：两面宿傩「伏魔御廚子」的「御廚子」。你不必出手，领域自己会杀。',
      },
      {
        id: 'de_self',
        s: '增幅自身',
        label: '增幅自身 · 强化肉体与咒力输出',
        base: 0.7,
        hint: '例：称金次一类以领域buff自身的用法。',
      },
      {
        id: 'de_jutsu',
        s: '增幅咒术',
        label: '增幅咒术 · 提升术式威力与范围',
        base: 0.75,
        hint: '例：乙骨忧太一类以领域放大复制术式的用法。',
      },
      {
        id: 'de_soul',
        s: '打击灵魂',
        label: '打击灵魂 · 直接作用于魂体',
        base: 0.6,
        hint: '例：虎杖悠仁对宿傩「容器边界」的那一类打击。',
      },
      {
        id: 'de_control',
        s: '强控',
        label: '强控 · 以情报或感官剥夺使其停摆',
        base: 0.7,
        hint: '例：五条悟「无量空处」灌入无限情报，让对方永久停摆。',
      },
      {
        id: 'de_rule',
        s: '规则',
        label: '规则 · 在领域内制定并宣判规则',
        base: 0.5,
        hint: '例：日车宽见「诛伏赐死」——在领域内开庭，宣判即刻执行。',
      },
      {
        id: 'de_devour',
        s: '吞噬同化',
        label: '吞噬 · 同化侵入者',
        base: 0.5,
        hint: '咒灵常见的形态：把进入者吞进体内风景，缓慢同化。',
      },
    ],
    rules: [
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.de_devour += 1.5
          w.de_auto += 0.5
        },
      },
      {
        name: '天元侧 · 结界与规则',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.de_rule += 1.2
          w.de_control += 0.6
        },
      },
      {
        name: '与宿傩有缘',
        when: (c: ResultContext) => c.bond === 'b10',
        apply: (w: Weights) => {
          w.de_auto += 1.2
        },
      },
      {
        name: '与五条有缘',
        when: (c: ResultContext) => c.bond === 'b1',
        apply: (w: Weights) => {
          w.de_control += 1.2
        },
      },
      {
        name: '智谋 S 以上',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
        apply: (w: Weights) => {
          w.de_rule += 1.0
          w.de_control += 0.5
        },
      },
      {
        name: '体术 S 以上',
        when: (c: ResultContext) => RI(c, 'dim_tj') >= 5,
        apply: (w: Weights) => {
          w.de_self += 0.9
          w.de_soul += 0.4
        },
      },
      {
        name: '未完成领域 · 只剩必中与残缺',
        when: (c: ResultContext) => c.domain === 'd1',
        apply: (w: Weights) => {
          w.de_auto = 0
          w.de_rule = 0
          w.de_control = 0
          w.de_hit += 1.2
        },
      },
    ],
  },
  {
    id: 'domainName',
    name: '领域名',
    kind: 'core',
    tag: '内面',
    desc: '你的领域叫什么。名字会跟着你一辈子，也会写进别人的恐惧里。',
    skipIf: (c) => c.domain === 'd0',
    skipText: '未展开领域 —— 此轮不存',
    options: [
      {
        id: 'dn_malevolent',
        s: '伏魔御廚子',
        label: '「伏魔御廚子」',
        base: 0.95,
        hint: '宿傩的领域。不设外壁的开放式，斩击与火焰在领域内自动生效——「解」与「开」的真正形态。',
      },
      {
        id: 'dn_unlimited',
        s: '无量空处',
        label: '「无量空处」',
        base: 0.5,
        hint: '五条悟的领域。把「无限」这一概念灌进对方大脑，使其永久停摆 0.2 秒——而那 0.2 秒对大脑而言是半年。',
      },
      {
        id: 'dn_chimera',
        s: '嵌合暗翳庭',
        label: '「嵌合暗翳庭」',
        base: 0.85,
        hint: '伏黑惠的领域。以影为地面、以影为海，十种影法术在其中可以从任意阴影里涌出。',
      },
      {
        id: 'dn_coffin',
        s: '呪胎戴天',
        label: '「呪胎戴天」',
        base: 0.9,
        hint: '漏瑚的领域。火山内部的胎内：领域之内的一切都在被熔岩与热压碾碎。',
      },
      {
        id: 'dn_verdict',
        s: '诛伏赐死',
        label: '「诛伏赐死」',
        base: 0.55,
        hint: '日车宽见的领域。领域内开庭审判，宣判「有罪」即没收咒力、判处死刑。',
      },
      {
        id: 'dn_eclipse',
        s: '蚀尽孤狱',
        label: '「蚀尽孤狱」',
        base: 0.6,
        hint: '吞噬同化型：把侵入者吞进一片正在被蚀空的黑暗，缓慢消化。',
      },
      {
        id: 'dn_avici',
        s: '无间禁域',
        label: '「无间禁域」',
        base: 0.5,
        hint: '结界与封印型：不杀伤，只把人永久关在无间的回廊里。',
      },
      {
        id: 'dn_imaginary',
        s: '虚数残响',
        label: '「虚数残响」',
        base: 0.45,
        hint: '空间系：在领域内制造真空与断裂，攻击从「不存在的地方」抵达。',
      },
      {
        id: 'dn_hyakki',
        s: '百鬼夜行',
        label: '「百鬼夜行」',
        base: 0.5,
        hint: '群像召唤型：领域内涌出你调伏过的所有咒灵，与你并肩。',
      },
      {
        id: 'dn_ash',
        s: '灰劫葬场',
        label: '「灰劫葬场」（未完）',
        base: 0.25,
        hint: '未完崩坏型：领域骨架不稳，边转边掉渣，随时可能反噬自身。',
      },
      {
        id: 'dn_original',
        s: '自创之名',
        label: '自创之名（由你的术式与内心生成）',
        base: 0.9,
        hint: '不属于任何人的领域——名字将按你的术式、领域效果与出身生成。',
      },
    ],
    rules: [
      {
        name: '领域未完成',
        when: (c: ResultContext) => c.domain === 'd1',
        apply: (w: Weights) => {
          w.dn_ash += 3.0
          w.dn_malevolent -= 0.4
          w.dn_unlimited = 0
          w.dn_verdict = 0
        },
      },
      {
        name: '领域完整展开',
        when: (c: ResultContext) => c.domain === 'd2',
        apply: (w: Weights) => {
          w.dn_ash = 0
        },
      },
      {
        name: '效果 · 自动攻击',
        when: (c: ResultContext) => c.domainEffect === 'de_auto',
        apply: (w: Weights) => {
          w.dn_malevolent += 1.4
        },
      },
      {
        name: '效果 · 强控',
        when: (c: ResultContext) => c.domainEffect === 'de_control',
        apply: (w: Weights) => {
          w.dn_unlimited += 1.5
        },
      },
      {
        name: '效果 · 规则',
        when: (c: ResultContext) => c.domainEffect === 'de_rule',
        apply: (w: Weights) => {
          w.dn_verdict += 1.6
        },
      },
      {
        name: '效果 · 吞噬同化',
        when: (c: ResultContext) => c.domainEffect === 'de_devour',
        apply: (w: Weights) => {
          w.dn_eclipse += 1.6
        },
      },
      {
        name: '效果 · 增幅自身',
        when: (c: ResultContext) => c.domainEffect === 'de_self',
        apply: (w: Weights) => {
          w.dn_avici += 0.9
          w.dn_coffin += 0.5
        },
      },
      {
        name: '效果 · 增幅咒术',
        when: (c: ResultContext) => c.domainEffect === 'de_jutsu',
        apply: (w: Weights) => {
          w.dn_hyakki += 0.9
          w.dn_chimera += 0.5
        },
      },
      {
        name: '效果 · 打击灵魂',
        when: (c: ResultContext) => c.domainEffect === 'de_soul',
        apply: (w: Weights) => {
          w.dn_imaginary += 0.9
        },
      },
      {
        name: '形态 · 开放式',
        when: (c: ResultContext) => c.domainForm === 'df_open',
        apply: (w: Weights) => {
          w.dn_malevolent += 1.0
          w.dn_imaginary += 0.4
        },
      },
      {
        name: '形态 · 自由切换',
        when: (c: ResultContext) => c.domainForm === 'df_switch',
        apply: (w: Weights) => {
          w.dn_imaginary += 1.1
          w.dn_unlimited += 0.4
        },
      },
      {
        name: '形态 · 封闭式',
        when: (c: ResultContext) => c.domainForm === 'df_closed',
        apply: (w: Weights) => {
          w.dn_unlimited += 0.6
          w.dn_coffin += 0.5
          w.dn_verdict += 0.4
        },
      },
      {
        name: '术式为咒灵操术',
        when: (c: ResultContext) => c.technique === 'tc_summon' || c.talent === 't4',
        apply: (w: Weights) => {
          w.dn_hyakki += 1.4
        },
      },
      {
        name: '术式为十种影法术',
        when: (c: ResultContext) => c.technique === 'tc_shadow',
        apply: (w: Weights) => {
          w.dn_chimera += 2.0
        },
      },
      {
        name: '术式为无下限',
        when: (c: ResultContext) => c.technique === 'tc_limitless',
        apply: (w: Weights) => {
          w.dn_unlimited += 2.0
        },
      },
      {
        name: '术式为赤血操术',
        when: (c: ResultContext) => c.technique === 'tc_blood',
        apply: (w: Weights) => {
          w.dn_eclipse += 1.0
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.dn_eclipse += 0.8
          w.dn_hyakki += 0.7
        },
      },
      {
        name: '天元侧',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.dn_avici += 1.2
        },
      },
    ],
  },
  {
    id: 'grade',
    name: '咒力等级 · 评定',
    kind: 'core',
    tag: '刻度',
    desc: '咒术界用等级给人标价，括号内是换算到 E–EX 的分级，方便你横向比较。',
    options: [
      {
        id: 'g1',
        s: 'E·五级',
        label: '【E】五级',
        base: 0.9,
        hint: '刚摸到咒具的新人。你被派去处理的，多半比你还弱。',
      },
      {
        id: 'g2',
        s: 'D·四级',
        label: '【D】四级',
        base: 1.1,
        hint: '能独自祓除弱小咒灵，但在上层眼里仍是消耗品。',
      },
      {
        id: 'g3',
        s: 'C·三级',
        label: '【C】三级',
        base: 1.2,
        hint: '独当一面的门槛，二手咒具终于配得上你了。',
      },
      {
        id: 'g4',
        s: 'B·二级',
        label: '【B】二级',
        base: 1.1,
        hint: '会被派去处理疑似特级咒物，也是最容易死的一层。（例：狗卷棘、熊猫）',
      },
      {
        id: 'g5',
        s: 'A·准一级',
        label: '【A】准一级',
        base: 0.9,
        hint: '离一级只差一场生死，或者只差一封推荐信。（例：东堂葵、三輪霞）',
      },
      {
        id: 'g6',
        s: 'S·一级',
        label: '【S】一级',
        base: 0.65,
        hint: '咒术界的实战顶点之一，能正面迎战特级咒灵。（例：日车宽见）',
      },
      {
        id: 'g7',
        s: 'SS·特级',
        label: '【SS】特级',
        base: 0.28,
        hint: '一人即一军。（例：五条悟、乙骨忧太、两面宿傩、漏瑚）',
      },
      {
        id: 'g8',
        s: 'EX·特级上',
        label: '【EX】特级上 · 规格外',
        base: 0.07,
        hint: '等级制度在你面前失效——这个时代只有寥寥数人。（例：五条悟、两面宿傩这种「规格外」的存在）',
      },
    ],
    rules: [
      {
        name: '资质为无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.g1 += 3.2
          w.g2 += 1.0
          w.g3 = 0
          w.g4 = 0
          w.g5 = 0
          w.g6 = 0
          w.g7 = 0
          w.g8 = 0
        },
      },
      {
        name: '资质为天与咒缚',
        when: (c: ResultContext) => c.talent === 't3',
        apply: (w: Weights) => {
          w.g5 += 0.9
          w.g6 += 0.9
          w.g7 += 0.3
        },
      },
      {
        name: '已能完整领域展开',
        when: (c: ResultContext) => c.domain === 'd2',
        apply: (w: Weights) => {
          w.g6 += 1.0
          w.g7 += 0.65
          w.g8 += 0.16
          w.g1 -= 0.5
          w.g2 -= 0.4
        },
      },
      {
        name: '领域不完整',
        when: (c: ResultContext) => c.domain === 'd1',
        apply: (w: Weights) => {
          w.g4 += 0.5
          w.g5 += 0.7
        },
      },
      {
        name: '此时代强者密集',
        when: (c: ResultContext) => c.era === 'e4' || c.era === 'e5',
        apply: (w: Weights) => {
          w.g6 += 0.55
          w.g7 += 0.4
        },
      },
      {
        name: '早期时代',
        when: (c: ResultContext) => c.era === 'e0' || c.era === 'e1',
        apply: (w: Weights) => {
          w.g7 += 0.2
          w.g8 += 0.05
        },
      },
      {
        name: '出身为咒灵',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.g7 += 0.32
          w.g8 += 0.1
        },
      },
      {
        name: '出身为受肉体',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.g5 += 0.45
          w.g6 += 0.55
        },
      },
      {
        name: '幼童 / 老年 · 尚未成型',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag5',
        apply: (w: Weights) => {
          w.g1 += 1.2
          w.g2 += 0.8
          w.g7 -= 0.2
          w.g8 = 0
        },
      },
      {
        name: '五条家 · 等级的顶点',
        when: (c: ResultContext) => c.clan === 'cl_gojo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.g7 += 1.3
          w.g8 += 0.5
          w.g6 += 0.5
          w.g1 -= 0.5
          w.g2 -= 0.4
        },
      },
      {
        name: '禅院家 · 评级跟着战果走',
        when: (c: ResultContext) => c.clan === 'cl_zenin' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.g5 += 0.5
          w.g6 += 0.7
          w.g7 += 0.3
          w.g1 -= 0.2
        },
      },
      {
        name: '加茂家 · 稳在一级上下',
        when: (c: ResultContext) => c.clan === 'cl_kamo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.g4 += 0.4
          w.g5 += 0.6
          w.g6 += 0.45
        },
      },
    ],
  },

  /* ---------- 六维性能（E–EX，每档带注释与原作参照） ---------- */
  dimStage(
    'dim_ce',
    '咒力总量',
    '你能装多少咒力。总量决定你能撑多久，也决定你能不能连续展开领域。',
    [
      '【E】几乎为零。你连咒灵都看不见，谈何总量。',
      '【C】够撑一场普通祓除，之后要缓一整晚。',
      '【B】在同等级里算得上充裕，能连打两三场。',
      '【A】撑得起一次领域展开，之后还能站着。',
      '【S】深不见底。连续展开领域也未必见底。',
      '【SS】五条悟、乙骨忧太那一档：取之不尽，用之不竭。',
      '【EX】无限。天元、祈本里香——咒力在这里没有上限。',
    ],
    [
      {
        name: '无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.dim_ce_E += 3.0
          w.dim_ce_C += 0.8
          w.dim_ce_B = 0
          w.dim_ce_A = 0
          w.dim_ce_S = 0
          w.dim_ce_SS = 0
          w.dim_ce_EX = 0
        },
      },
      {
        name: '评定为【EX】规格外',
        when: (c: ResultContext) => c.grade === 'g8',
        apply: (w: Weights) => {
          w.dim_ce_EX += 2.4
          w.dim_ce_SS += 1.5
          w.dim_ce_S += 1.0
          w.dim_ce_E -= 0.6
        },
      },
      {
        name: '评定为【SS】特级',
        when: (c: ResultContext) => c.grade === 'g7',
        apply: (w: Weights) => {
          w.dim_ce_SS += 1.4
          w.dim_ce_S += 1.2
          w.dim_ce_EX += 0.25
        },
      },
      {
        name: '评定为【S】一级',
        when: (c: ResultContext) => c.grade === 'g6',
        apply: (w: Weights) => {
          w.dim_ce_S += 1.0
          w.dim_ce_A += 0.5
        },
      },
      {
        name: '评定为 E / D',
        when: (c: ResultContext) => c.grade === 'g1' || c.grade === 'g2',
        apply: (w: Weights) => {
          w.dim_ce_SS = 0
          w.dim_ce_EX = 0
          w.dim_ce_S -= 0.4
          w.dim_ce_E += 0.6
        },
      },
      {
        name: '能完整领域展开',
        when: (c: ResultContext) => c.domain === 'd2',
        apply: (w: Weights) => {
          w.dim_ce_A += 0.8
          w.dim_ce_S += 0.5
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.dim_ce_A += 0.6
          w.dim_ce_S += 0.3
        },
      },
      {
        name: '青年 / 壮年 · 咒力鼎盛',
        when: (c: ResultContext) => c.age === 'ag3' || c.age === 'ag4',
        apply: (w: Weights) => {
          w.dim_ce_A += 0.5
          w.dim_ce_S += 0.3
        },
      },
      {
        name: '幼童 / 老年 · 容器尚浅',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag5',
        apply: (w: Weights) => {
          w.dim_ce_S -= 0.5
          w.dim_ce_SS = 0
          w.dim_ce_EX = 0
          w.dim_ce_E += 0.7
        },
      },
      {
        name: '五条家 · 六眼的容器',
        when: (c: ResultContext) =>
          c.clan === 'cl_gojo' && c.talent !== 't6' && c.age !== 'ag1' && c.age !== 'ag5',
        apply: (w: Weights) => {
          w.dim_ce_SS += 1.8
          w.dim_ce_EX += 0.9
          w.dim_ce_S += 0.7
          w.dim_ce_E = 0
          w.dim_ce_C -= 0.3
        },
      },
      {
        name: '禅院家 · 尚武之家，咒力未必深',
        when: (c: ResultContext) => c.clan === 'cl_zenin' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_ce_B += 0.6
          w.dim_ce_A += 0.4
          w.dim_ce_SS -= 0.35
          w.dim_ce_EX -= 0.2
        },
      },
      {
        name: '加茂家 · 以血为媒介的容量',
        when: (c: ResultContext) => c.clan === 'cl_kamo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_ce_A += 0.8
          w.dim_ce_S += 0.45
        },
      },
    ],
  ),
  dimStage(
    'dim_ct',
    '咒力操控',
    '把咒力用得多精密。这一项决定你能否打出黑闪、能否在瞬息间调整输出。',
    [
      '【E】咒力从指缝里漏出去，黑闪是天方夜谭。',
      '【C】能做出像样的操作，谈不上精细。',
      '【B】精密。能在 0.1 秒内调整咒力输出。',
      '【A】黑闪常客。咒力像是被你调过音的乐器。',
      '【S】误差趋近于零，连反转术式都比别人顺。',
      '【SS】五条悟「六眼」的精密操作：咒力损耗无限接近于零。',
      '【EX】以 0.000001 秒的误差持续命中——黑闪对你而言是常态而非奇迹。',
    ],
    [
      {
        name: '无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.dim_ct_E += 2.6
          w.dim_ct_C += 1.0
          w.dim_ct_B = 0
          w.dim_ct_A = 0
          w.dim_ct_S = 0
          w.dim_ct_SS = 0
          w.dim_ct_EX = 0
        },
      },
      {
        name: '天生反转术式',
        when: (c: ResultContext) => c.talent === 't5',
        apply: (w: Weights) => {
          w.dim_ct_S += 1.7
          w.dim_ct_A += 1.1
          w.dim_ct_SS += 0.4
        },
      },
      {
        name: '纯咒力操作派',
        when: (c: ResultContext) => c.talent === 't1',
        apply: (w: Weights) => {
          w.dim_ct_A += 1.2
          w.dim_ct_B += 0.7
        },
      },
      {
        name: '评定为 SS / EX',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.dim_ct_SS += 0.9
          w.dim_ct_S += 0.7
        },
      },
      {
        name: '能完整领域展开',
        when: (c: ResultContext) => c.domain === 'd2',
        apply: (w: Weights) => {
          w.dim_ct_A += 0.6
          w.dim_ct_S += 0.3
        },
      },
      {
        name: '幼童 · 尚未熟练',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.dim_ct_A -= 0.5
          w.dim_ct_S = 0
          w.dim_ct_SS = 0
          w.dim_ct_EX = 0
        },
      },
      {
        name: '五条家 · 六眼的精密',
        when: (c: ResultContext) => c.clan === 'cl_gojo' && c.talent !== 't6' && c.age !== 'ag1',
        apply: (w: Weights) => {
          w.dim_ct_SS += 1.4
          w.dim_ct_S += 0.9
          w.dim_ct_EX += 0.3
          w.dim_ct_E = 0
        },
      },
      {
        name: '加茂家 · 血液的精密操作',
        when: (c: ResultContext) => c.clan === 'cl_kamo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_ct_A += 1.1
          w.dim_ct_S += 0.5
        },
      },
      {
        name: '禅院家 · 肉体派不重精密',
        when: (c: ResultContext) => c.clan === 'cl_zenin' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_ct_C += 0.4
          w.dim_ct_SS -= 0.25
        },
      },
    ],
  ),
  dimStage(
    'dim_tj',
    '体术',
    '不使用咒力时的你有多能打。咒力耗尽之后，剩下的全靠这个。',
    [
      '【E】挥拳像挥书包。',
      '【C】练过，够自保。',
      '【B】能与一级术师过上几十招。',
      '【A】空手拆咒灵。',
      '【S】东堂葵级别的肉搏：每一拳都算好了距离。',
      '【SS】伏黑甚尔 / 禅院真希——天与咒缚的极致肉体。',
      '【EX】肉体本身即为术式，被称作「最速」与「最硬」的怪物。',
    ],
    [
      {
        name: '天与咒缚',
        when: (c: ResultContext) => c.talent === 't3',
        apply: (w: Weights) => {
          w.dim_tj_SS += 3.0
          w.dim_tj_S += 1.4
          w.dim_tj_EX += 0.7
          w.dim_tj_E = 0
        },
      },
      {
        name: '纯咒力操作派',
        when: (c: ResultContext) => c.talent === 't1',
        apply: (w: Weights) => {
          w.dim_tj_A += 1.2
          w.dim_tj_B += 0.6
        },
      },
      {
        name: '评定为 SS / EX',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.dim_tj_S += 1.0
          w.dim_tj_SS += 0.4
        },
      },
      {
        name: '无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.dim_tj_A = 0
          w.dim_tj_S = 0
          w.dim_tj_SS = 0
          w.dim_tj_EX = 0
          w.dim_tj_C += 0.6
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.dim_tj_B += 0.6
        },
      },
      {
        name: '青年 / 壮年 · 肉体的巅峰',
        when: (c: ResultContext) => c.age === 'ag3' || c.age === 'ag4',
        apply: (w: Weights) => {
          w.dim_tj_A += 0.7
          w.dim_tj_B += 0.4
        },
      },
      {
        name: '幼童 / 老年 · 身体跟不上',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag5',
        apply: (w: Weights) => {
          w.dim_tj_A -= 0.6
          w.dim_tj_S = 0
          w.dim_tj_SS = 0
          w.dim_tj_EX = 0
          w.dim_tj_E += 1.0
        },
      },
      {
        name: '禅院家 · 从小被打进肉体里',
        when: (c: ResultContext) =>
          c.clan === 'cl_zenin' && c.talent !== 't6' && c.age !== 'ag1' && c.age !== 'ag5',
        apply: (w: Weights) => {
          w.dim_tj_S += 1.3
          w.dim_tj_A += 0.9
          w.dim_tj_SS += 0.5
          w.dim_tj_E = 0
        },
      },
      {
        name: '五条家 · 无敌之身未必练体术',
        when: (c: ResultContext) => c.clan === 'cl_gojo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_tj_B += 0.5
          w.dim_tj_A += 0.4
        },
      },
      {
        name: '加茂家 · 术式为主，体术为辅',
        when: (c: ResultContext) => c.clan === 'cl_kamo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_tj_C += 0.4
          w.dim_tj_B += 0.4
        },
      },
    ],
  ),
  dimStage(
    'dim_bd',
    '体质 · 耐久',
    '你能挨多少下。恢复、再生、耐毒、耐斩——活下来的往往不是最强的，是最迟钝的。',
    [
      '【E】一击即溃。',
      '【C】普通人偏上。',
      '【B】挨几发还能站起来。',
      '【A】断了的手臂第二天就能动。',
      '【S】再生、耐毒、耐斩——你迟钝得像块石头。',
      '【SS】宿傩级受肉体质：断头亦可再起。',
      '【EX】天元的不死：不老、不死、可再生。',
    ],
    [
      {
        name: '天与咒缚',
        when: (c: ResultContext) => c.talent === 't3',
        apply: (w: Weights) => {
          w.dim_bd_SS += 2.4
          w.dim_bd_S += 1.4
          w.dim_bd_E = 0
        },
      },
      {
        name: '天生反转术式',
        when: (c: ResultContext) => c.talent === 't5',
        apply: (w: Weights) => {
          w.dim_bd_S += 1.5
          w.dim_bd_SS += 0.6
          w.dim_bd_A += 0.8
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.dim_bd_A += 1.1
          w.dim_bd_S += 0.5
        },
      },
      {
        name: '受肉体',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.dim_bd_A += 0.7
          w.dim_bd_S += 0.4
        },
      },
      {
        name: '无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.dim_bd_A = 0
          w.dim_bd_S = 0
          w.dim_bd_SS = 0
          w.dim_bd_EX = 0
          w.dim_bd_E += 0.9
        },
      },
      {
        name: '评定为【EX】规格外',
        when: (c: ResultContext) => c.grade === 'g8',
        apply: (w: Weights) => {
          w.dim_bd_SS += 1.0
          w.dim_bd_EX += 0.35
        },
      },
      {
        name: '青年 / 壮年 · 恢复力鼎盛',
        when: (c: ResultContext) => c.age === 'ag3' || c.age === 'ag4',
        apply: (w: Weights) => {
          w.dim_bd_A += 0.6
          w.dim_bd_B += 0.4
        },
      },
      {
        name: '老年 · 恢复迟缓',
        when: (c: ResultContext) => c.age === 'ag5',
        apply: (w: Weights) => {
          w.dim_bd_A -= 0.6
          w.dim_bd_S -= 0.4
          w.dim_bd_E += 0.8
        },
      },
      {
        name: '禅院家 · 挨打长大的',
        when: (c: ResultContext) => c.clan === 'cl_zenin' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_bd_A += 1.0
          w.dim_bd_S += 0.6
        },
      },
      {
        name: '五条家 · 无下限本身就是耐久',
        when: (c: ResultContext) => c.clan === 'cl_gojo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_bd_S += 0.8
          w.dim_bd_SS += 0.4
        },
      },
      {
        name: '加茂家 · 失血即失命',
        when: (c: ResultContext) => c.clan === 'cl_kamo' && c.talent !== 't6',
        apply: (w: Weights) => {
          w.dim_bd_B += 0.6
          w.dim_bd_A += 0.4
          w.dim_bd_SS -= 0.2
        },
      },
    ],
  ),
  dimStage(
    'dim_lk',
    '外貌',
    '在这个世界里，长相也是一种武器——被低估、被记住，或者被恐惧。',
    [
      '【E】看一眼就想移开视线（也许是因为恐惧）。',
      '【C】普通。没人会回头。',
      '【B】端正，会被记住。',
      '【A】出众，走到哪儿都被注视。',
      '【S】不合常理地好看——敌人往往因此低估你。',
      '【SS】五条悟 / 夏油杰那一档：会被写进传闻的容貌。',
      '【EX】存在本身令人不敢直视——宿傩的威压、天元的非人之姿。',
    ],
    [
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.dim_lk_E += 1.7
          w.dim_lk_S += 0.4
          w.dim_lk_EX += 0.25
          w.dim_lk_B -= 0.3
        },
      },
      {
        name: '御三家出身',
        when: (c: ResultContext) => c.origin === 'o2',
        apply: (w: Weights) => {
          w.dim_lk_A += 0.9
          w.dim_lk_B += 0.4
          w.dim_lk_SS += 0.2
        },
      },
      {
        name: '受肉体',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.dim_lk_B += 0.6
          w.dim_lk_A += 0.3
        },
      },
      {
        name: '天元侧',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.dim_lk_A += 0.5
          w.dim_lk_SS += 0.3
        },
      },
      {
        name: '青年 · 最好的年纪',
        when: (c: ResultContext) => c.age === 'ag3',
        apply: (w: Weights) => {
          w.dim_lk_A += 0.5
          w.dim_lk_S += 0.3
        },
      },
      {
        name: '老年 · 岁月与疤痕',
        when: (c: ResultContext) => c.age === 'ag5',
        apply: (w: Weights) => {
          w.dim_lk_A -= 0.4
          w.dim_lk_S -= 0.3
          w.dim_lk_C += 0.5
        },
      },
      {
        name: '幼童 · 尚未长开',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.dim_lk_A -= 0.3
          w.dim_lk_S -= 0.3
          w.dim_lk_SS = 0
          w.dim_lk_EX = 0
        },
      },
      {
        name: '五条家 · 那张脸',
        when: (c: ResultContext) => c.clan === 'cl_gojo' && c.age !== 'ag1',
        apply: (w: Weights) => {
          w.dim_lk_SS += 1.2
          w.dim_lk_S += 0.8
          w.dim_lk_A += 0.5
          w.dim_lk_E = 0
        },
      },
      {
        name: '禅院家 · 锋利而冷的面相',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.dim_lk_A += 0.5
          w.dim_lk_S += 0.3
        },
      },
      {
        name: '加茂家 · 端正的名门之相',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.dim_lk_B += 0.6
          w.dim_lk_A += 0.4
        },
      },
    ],
  ),
  dimStage(
    'dim_in',
    '智谋 · 咒术知识',
    '你有多会算。规则、陷阱、情报——死灭回游里，这一项比咒力更能杀人。',
    [
      '【E】热血上头就冲。',
      '【C】按常识行动。',
      '【B】会算三步之后的棋。',
      '【A】擅长规则与陷阱，别人活在你的剧本里。',
      '【S】你把整个战场当成一道题来解。',
      '【SS】羂索：以千年为单位布局的知性。',
      '【EX】天元：俯瞰整个日本结界的知性。',
    ],
    [
      {
        name: '隶属咒术界上层',
        when: (c: ResultContext) => c.faction === 'f3',
        apply: (w: Weights) => {
          w.dim_in_A += 1.0
          w.dim_in_B += 0.4
        },
      },
      {
        name: '御三家出身',
        when: (c: ResultContext) => c.origin === 'o2',
        apply: (w: Weights) => {
          w.dim_in_A += 0.7
          w.dim_in_S += 0.2
        },
      },
      {
        name: 'S 级以上',
        when: (c: ResultContext) => ['g6', 'g7', 'g8'].includes(c.grade),
        apply: (w: Weights) => {
          w.dim_in_A += 0.8
          w.dim_in_S += 0.3
        },
      },
      {
        name: '与羂索有缘',
        when: (c: ResultContext) => c.bond === 'b8',
        apply: (w: Weights) => {
          w.dim_in_S += 1.3
          w.dim_in_SS += 0.4
        },
      },
      {
        name: '无咒力凡人',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.dim_in_A += 0.8
          w.dim_in_B += 0.5
        },
      },
      {
        name: '壮年 / 老年 · 经验堆积',
        when: (c: ResultContext) => c.age === 'ag4' || c.age === 'ag5',
        apply: (w: Weights) => {
          w.dim_in_A += 0.7
          w.dim_in_S += 0.3
        },
      },
      {
        name: '幼童 · 尚不懂世事',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.dim_in_A -= 0.5
          w.dim_in_S = 0
          w.dim_in_SS = 0
          w.dim_in_EX = 0
          w.dim_in_E += 0.8
        },
      },
      {
        name: '加茂家 · 术式与规则并重',
        when: (c: ResultContext) => c.clan === 'cl_kamo' && c.age !== 'ag1',
        apply: (w: Weights) => {
          w.dim_in_A += 0.8
          w.dim_in_S += 0.3
        },
      },
      {
        name: '五条家 · 生来站在顶点，未必算计',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.dim_in_B += 0.5
          w.dim_in_A += 0.3
        },
      },
      {
        name: '禅院家 · 家规与人心的算计',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.dim_in_B += 0.6
          w.dim_in_A += 0.4
        },
      },
    ],
  ),

  {
    id: 'effort',
    name: '努力程度',
    kind: 'core',
    tag: '修行',
    desc: '天道酬勤。这一轮不改变你已经抽到的六维，但会决定你能练出多少技术、做出多少咒具，以及临战时的底气。',
    options: [
      {
        id: 'ef_lazy',
        s: '躺平',
        label: '躺平 · 能不动就不动',
        base: 1.0,
        hint: '你会的技术会少得可怜，但你活得很轻松。',
      },
      {
        id: 'ef_norm',
        s: '普通',
        label: '普通 · 该练的都练了',
        base: 1.6,
        hint: '不好不坏，是大多数术师的样子。',
      },
      {
        id: 'ef_hard',
        s: '刻苦',
        label: '刻苦 · 练到吐也要练',
        base: 1.1,
        hint: '技术数量与咒具数量都会明显变多。',
      },
      {
        id: 'ef_mad',
        s: '自虐式修行',
        label: '自虐式修行 · 把自己往死里逼',
        base: 0.6,
        hint: '你能掌握的技术与咒具远多于常人——代价是你的身体与寿命。',
      },
      {
        id: 'ef_genius',
        s: '天才型偷懒',
        label: '天才型偷懒 · 只在关键处用功',
        base: 0.8,
        hint: '你练得不多，但每一次都练在对的地方：战斗中的爆发力额外加成。',
      },
    ],
    rules: [
      {
        name: '幼童 · 还没开始练',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.ef_lazy += 1.4
          w.ef_hard -= 0.5
          w.ef_mad = 0
        },
      },
      {
        name: '壮年 / 老年 · 已练了半辈子',
        when: (c: ResultContext) => c.age === 'ag4' || c.age === 'ag5',
        apply: (w: Weights) => {
          w.ef_hard += 0.8
          w.ef_mad += 0.4
          w.ef_lazy -= 0.5
        },
      },
      {
        name: '天赋极高者不必苦练',
        when: (c: ResultContext) => ['g7', 'g8'].indexOf(c.grade) >= 0 || c.gift === 'gift_six',
        apply: (w: Weights) => {
          w.ef_genius += 1.2
          w.ef_mad -= 0.3
        },
      },
      {
        name: '无咒力凡人 · 只能练身体',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.ef_mad += 0.7
          w.ef_lazy -= 0.4
        },
      },
      {
        name: '性格冷静克制 · 自律',
        when: (c: ResultContext) => c.personality === 'pe_calm',
        apply: (w: Weights) => {
          w.ef_hard += 0.9
          w.ef_lazy -= 0.4
        },
      },
      {
        name: '性格热血冲动 · 猛练',
        when: (c: ResultContext) => c.personality === 'pe_hot',
        apply: (w: Weights) => {
          w.ef_mad += 0.8
        },
      },
      {
        name: '性格虚无旁观 · 懒得动',
        when: (c: ResultContext) => c.personality === 'pe_void',
        apply: (w: Weights) => {
          w.ef_lazy += 1.0
          w.ef_hard -= 0.5
        },
      },
    ],
  },
  {
    id: 'faction',
    name: '阵营 · 所属',
    kind: 'core',
    tag: '站位',
    desc: '你站在哪一边。是学校、是咒术界的腐朽上层、是羂索的棋局，还是只想过日子的普通人。',
    options: [
      {
        id: 'f1',
        s: '东京高专',
        label: '东京咒术高等专门学校',
        base: 1.4,
        hint: '被五条悟捡进来的人，都在这里。',
      },
      {
        id: 'f2',
        s: '京都高专',
        label: '京都咒术高等专门学校',
        base: 0.8,
        hint: '与东京互为镜像，也互为对手。',
      },
      {
        id: 'f3',
        s: '咒术界上层',
        label: '咒术界上层 · 评议与御三家',
        base: 0.7,
        hint: '坐在本部会议室里决定谁该死的那群人。',
      },
      {
        id: 'f4',
        s: '咒诅师集团',
        label: '咒诅师集团（夏油 · 羂索侧）',
        base: 0.7,
        hint: '以夏油杰之名集结的百鬼，以及藏在皮下的羂索。',
      },
      {
        id: 'f5',
        s: '死灭回游',
        label: '死灭回游 · 独立玩家',
        base: 0.6,
        hint: '结界内的玩家：夺点、追加规则、活到最后。',
      },
      {
        id: 'f6',
        s: '宿傩阵营',
        label: '宿傩阵营 · 受肉与契约',
        base: 0.5,
        hint: '与两面宿傩结下契约，或自认为是他的器物。',
      },
      {
        id: 'f7',
        s: '一般市民',
        label: '一般市民 · 被卷入者',
        base: 0.6,
        hint: '你只是路过涩谷，或者只是住在新宿。',
      },
      {
        id: 'f8',
        s: '天元侧',
        label: '天元 · 结界守护侧',
        base: 0.3,
        hint: '守护结界体系，或与天元同化的命运。',
      },
      {
        id: 'f9',
        s: '无所属',
        label: '无所属 · 流浪咒术师',
        base: 0.9,
        hint: '不隶属任何组织，只接自己愿意接的活。',
      },
    ],
    rules: [
      {
        name: '出身为一般人类',
        when: (c: ResultContext) => c.origin === 'o3',
        apply: (w: Weights) => {
          w.f7 += 3.2
          w.f1 += 0.25
          w.f4 -= 0.4
          w.f5 -= 0.4
          w.f6 -= 0.3
          w.f8 -= 0.2
        },
      },
      {
        name: '出身为咒灵',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.f4 += 1.7
          w.f9 += 0.8
          w.f1 = 0
          w.f2 = 0
          w.f7 = 0
          w.f5 = 0
          w.f8 = 0
        },
      },
      {
        name: '出身为受肉体',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.f5 += 2.1
          w.f6 += 0.9
        },
      },
      {
        name: '出身为天元侧',
        when: (c: ResultContext) => c.origin === 'o6',
        apply: (w: Weights) => {
          w.f8 += 3.2
          w.f3 += 0.4
        },
      },
      {
        name: '入场于 0 卷时期',
        when: (c: ResultContext) => c.era === 'e0',
        apply: (w: Weights) => {
          w.f1 += 1.3
          w.f2 += 0.6
          w.f4 += 0.6
          w.f5 = 0
        },
      },
      {
        name: '入场于怀玉·玉折',
        when: (c: ResultContext) => c.era === 'e1',
        apply: (w: Weights) => {
          w.f1 += 1.0
          w.f3 += 0.6
          w.f8 += 0.9
          w.f5 = 0
        },
      },
      {
        name: '入场于故事开始',
        when: (c: ResultContext) => c.era === 'e2',
        apply: (w: Weights) => {
          w.f1 += 1.1
          w.f2 += 0.7
          w.f5 = 0
        },
      },
      {
        name: '入场于涩谷事变',
        when: (c: ResultContext) => c.era === 'e3',
        apply: (w: Weights) => {
          w.f1 += 0.7
          w.f3 += 0.6
          w.f7 += 1.3
          w.f4 += 0.8
          w.f5 = 0
        },
      },
      {
        name: '入场于死灭回游',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.f5 += 1.9
          w.f9 += 0.6
          w.f6 += 0.4
          w.f1 -= 0.4
        },
      },
      {
        name: '入场于新宿决战',
        when: (c: ResultContext) => c.era === 'e5',
        apply: (w: Weights) => {
          w.f1 += 0.8
          w.f6 += 0.7
          w.f9 += 0.4
        },
      },
      {
        name: '入场于终战之后',
        when: (c: ResultContext) => c.era === 'e6',
        apply: (w: Weights) => {
          w.f1 += 0.8
          w.f9 += 0.9
          w.f7 += 0.5
          w.f5 = 0
        },
      },
      {
        name: '评定为 SS / EX',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.f1 += 0.4
          w.f9 += 0.4
          w.f5 += 0.4
          w.f3 += 0.3
        },
      },
      {
        name: '少年 · 被学校收容',
        when: (c: ResultContext) => c.age === 'ag2',
        apply: (w: Weights) => {
          w.f1 += 1.0
          w.f2 += 0.7
        },
      },
      {
        name: '幼童 · 还轮不到你站队',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.f7 += 1.0
          w.f1 += 0.4
          w.f3 += 0.4
        },
      },
      {
        name: '御三家 · 生来就坐在上层',
        when: (c: ResultContext) => c.origin === 'o2',
        apply: (w: Weights) => {
          w.f3 += 2.2
          w.f1 += 0.3
          w.f5 -= 0.4
          w.f7 = 0
        },
      },
      {
        name: '五条家 · 与高专同源',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.f3 += 0.8
          w.f1 += 0.5
          w.f9 -= 0.3
        },
      },
      {
        name: '禅院家 · 家规之内，或家规之外',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.f3 += 0.5
          w.f9 += 0.8
          w.f6 += 0.3
        },
      },
      {
        name: '加茂家 · 依附名门行事',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.f3 += 0.6
          w.f2 += 0.5
        },
      },
    ],
  },
  {
    id: 'bond',
    name: '羁绊 · 因果之人',
    kind: 'core',
    tag: '缘',
    desc: '与谁产生因果，几乎等同于决定你会怎么死——也决定了最终决战站在你对面的人是谁。（想最终对决两面宿傩：与他结缘，或入场于涩谷事变 / 死灭回游 / 新宿决战）',
    options: [
      {
        id: 'b1',
        s: '五条悟',
        label: '五条悟',
        base: 0.8,
        hint: '最強。他的存在本身就是这个时代的天灾缓冲垫。',
      },
      {
        id: 'b2',
        s: '乙骨忧太',
        label: '乙骨忧太 · 祈本里香',
        base: 0.8,
        hint: '纯爱的诅咒，取之不尽的咒力。',
      },
      {
        id: 'b3',
        s: '虎杖悠仁',
        label: '虎杖悠仁',
        base: 0.8,
        hint: '宿傩的容器，也是所有人想保住的那个孩子。',
      },
      {
        id: 'b4',
        s: '伏黑惠',
        label: '伏黑惠',
        base: 0.8,
        hint: '十种影法术。他的影子里有一整片海。',
      },
      {
        id: 'b5',
        s: '钉崎野蔷薇',
        label: '钉崎野蔷薇',
        base: 0.8,
        hint: '芻灵咒法。她从不为了别人改变自己的生存方式。',
      },
      {
        id: 'b6',
        s: '禅院真希',
        label: '禅院真希',
        base: 0.8,
        hint: '没有咒力，却砍穿了整个禅院家。',
      },
      {
        id: 'b7',
        s: '狗卷·熊猫',
        label: '狗卷棘 · 熊猫',
        base: 0.8,
        hint: '咒言，与一只会说话的咒骸。',
      },
      {
        id: 'b8',
        s: '夏油杰',
        label: '夏油杰（伪夏油 · 羂索）',
        base: 0.8,
        hint: '你认识的那个夏油，也许早就不是夏油了。',
      },
      {
        id: 'b9',
        s: '伏黑甚尔',
        label: '伏黑甚尔',
        base: 0.8,
        hint: '天与咒缚的极致。他没有咒力，却把五条悟逼到觉醒。',
      },
      {
        id: 'b10',
        s: '两面宿傩',
        label: '两面宿傩',
        base: 0.8,
        hint: '诅咒之王。与他结缘者，多半不得善终。',
      },
      {
        id: 'b11',
        s: '天元',
        label: '天元',
        base: 0.8,
        hint: '不死术式的持有者，日本咒术界的结界本身。',
      },
      {
        id: 'b12',
        s: '同期同袍',
        label: '同期 · 同袍（东堂 / 日车 / 三轮…）',
        base: 0.8,
        hint: '不是主角，但和你一起流血。',
      },
      {
        id: 'b13',
        s: '孤身一人',
        label: '孤身一人 · 无缘',
        base: 0.7,
        hint: '没有谁必须为你而死，也没有谁会为你收尸。',
      },
    ],
    rules: [
      {
        name: '入场于 0 卷时期',
        when: (c: ResultContext) => c.era === 'e0',
        apply: (w: Weights) => {
          w.b2 += 1.6
          w.b6 += 1.0
          w.b7 += 1.2
          w.b1 += 0.9
          w.b3 = 0
          w.b4 = 0
          w.b5 = 0
          w.b9 = 0
          w.b10 = 0
        },
      },
      {
        name: '入场于怀玉·玉折',
        when: (c: ResultContext) => c.era === 'e1',
        apply: (w: Weights) => {
          w.b1 += 1.3
          w.b8 += 1.3
          w.b9 += 1.3
          w.b11 += 0.7
          w.b2 = 0
          w.b3 = 0
          w.b4 = 0
          w.b5 = 0
        },
      },
      {
        name: '入场于故事开始',
        when: (c: ResultContext) => c.era === 'e2',
        apply: (w: Weights) => {
          w.b3 += 1.5
          w.b4 += 1.2
          w.b5 += 1.2
          w.b1 += 1.0
          w.b2 = 0.15
          w.b9 = 0.05
          w.b10 += 0.3
        },
      },
      {
        name: '入场于涩谷事变',
        when: (c: ResultContext) => c.era === 'e3',
        apply: (w: Weights) => {
          w.b1 += 1.0
          w.b3 += 1.0
          w.b10 += 1.1
          w.b12 += 0.6
          w.b9 = 0
        },
      },
      {
        name: '入场于死灭回游',
        when: (c: ResultContext) => c.era === 'e4',
        apply: (w: Weights) => {
          w.b12 += 1.5
          w.b3 += 1.1
          w.b10 += 0.9
          w.b2 += 0.7
          w.b1 += 0.3
        },
      },
      {
        name: '入场于新宿决战',
        when: (c: ResultContext) => c.era === 'e5',
        apply: (w: Weights) => {
          w.b3 += 1.6
          w.b10 += 1.3
          w.b1 += 0.9
          w.b12 += 0.6
          w.b9 = 0
        },
      },
      {
        name: '入场于终战之后',
        when: (c: ResultContext) => c.era === 'e6',
        apply: (w: Weights) => {
          w.b2 += 1.3
          w.b6 += 1.1
          w.b3 += 0.9
          w.b12 += 0.7
          w.b1 += 0.4
        },
      },
      {
        name: '隶属宿傩阵营',
        when: (c: ResultContext) => c.faction === 'f6',
        apply: (w: Weights) => {
          w.b10 += 2.2
        },
      },
      {
        name: '隶属咒诅师集团',
        when: (c: ResultContext) => c.faction === 'f4',
        apply: (w: Weights) => {
          w.b8 += 1.9
        },
      },
      {
        name: '隶属天元侧',
        when: (c: ResultContext) => c.faction === 'f8',
        apply: (w: Weights) => {
          w.b11 += 2.6
        },
      },
      {
        name: '只是一般市民',
        when: (c: ResultContext) => c.faction === 'f7',
        apply: (w: Weights) => {
          w.b13 += 1.1
          w.b1 += 0.4
          w.b12 += 0.4
        },
      },
      {
        name: '出身为咒灵',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.b13 += 0.7
          w.b10 += 0.4
        },
      },
      {
        name: '评定为【EX】规格外',
        when: (c: ResultContext) => c.grade === 'g8',
        apply: (w: Weights) => {
          w.b1 += 0.6
          w.b10 += 0.4
        },
      },
      {
        name: '五条家 · 与那个人同族',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.b1 += 1.8
          w.b2 += 0.3
        },
      },
      {
        name: '禅院家 · 与真希同族',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.b6 += 1.0
        },
      },
      {
        name: '禅院家 · 与甚尔同行（他尚未死的时代）',
        when: (c: ResultContext) =>
          c.clan === 'cl_zenin' && !(c.era === 'e0' || c.era === 'e3' || c.era === 'e5'),
        apply: (w: Weights) => {
          w.b9 += 1.2
        },
      },
      {
        name: '禅院家 · 与伏黑惠同族（他已登场的时代）',
        when: (c: ResultContext) => c.clan === 'cl_zenin' && !(c.era === 'e0' || c.era === 'e1'),
        apply: (w: Weights) => {
          w.b4 += 0.8
        },
      },
      {
        name: '加茂家 · 同期与旧交',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.b12 += 1.0
          w.b7 += 0.5
        },
      },
    ],
  },
]

/* =====================================================================
   技能盘 / 咒具
   ===================================================================== */
export const SKILL_DEFS = [
  {
    id: 'sk_simple',
    s: '简易领域',
    label: '简易领域',
    base: 1.3,
    hint: '0.5 秒展开的简易领域：不附必中，但能抵消对方领域的「必中」。（原作：伏黑惠、东堂葵在涩谷用过）',
  },
  {
    id: 'sk_reverse',
    s: '反转术式',
    label: '反转术式',
    base: 1.0,
    hint: '负负得正，产出「正的咒力」治疗自己。（原作：五条悟、乙骨忧太）',
  },
  {
    id: 'sk_revout',
    s: '反转外放',
    label: '反转术式 · 外放（正能量）',
    base: 0.6,
    hint: '把正咒力外放出去——对咒灵是强特攻。（原作：能以正能量灼烧咒灵的少数术师）',
  },
  {
    id: 'sk_jutsurev',
    s: '术式反转',
    label: '术式反转（赫 / 苍一类）',
    base: 0.5,
    hint: '把术式的「顺转」反转，得到性质完全相反的一击。（原作：无下限的赫与苍）',
  },
  {
    id: 'sk_black',
    s: '黑闪',
    label: '黑闪',
    base: 1.15,
    hint: '咒力与物理冲击在 0.000001 秒误差内碰撞。命中后威力翻倍，并可追击两次。（原作：虎杖悠仁在涩谷连打四次）',
  },
  {
    id: 'sk_extreme',
    s: '极之番',
    label: '极之番 · 术式最大输出',
    base: 0.9,
    hint: '把术式压到极限的一击。（原作：五条悟「茈」、钉崎野蔷薇「共鸣」、脹相「廻 ROT」那一类）',
  },
  {
    id: 'sk_resonance',
    s: '芻灵共鸣',
    label: '芻灵咒法 · 共鸣',
    base: 0.5,
    hint: '以稻草人（媒介）传导伤害，把痛楚直接送进对方体内。（原作：钉崎野蔷薇）',
  },
  {
    id: 'sk_summon',
    s: '咒灵操术',
    label: '咒灵操术 · 调伏使役',
    base: 1.0,
    hint: '收服并驱使咒灵，输给谁就要服从谁。（原作：夏油杰 / 羂索）',
  },
  {
    id: 'sk_shadow',
    s: '十种影法术',
    label: '十种影法术 · 调伏（鵺 / 大黑天等）',
    base: 0.3,
    hint: '以影为媒介驱使十种式神；被破坏的式神不会复原。（原作：伏黑惠）',
  },
  {
    id: 'sk_gear',
    s: '咒具锻造',
    label: '咒具锻造',
    base: 1.2,
    hint: '以咒力灌注器物做出只属于你的武器——随后要抽你做了几件、分别是什么。',
  },
  {
    id: 'sk_puppet',
    s: '傀儡咒术学',
    label: '傀儡咒术学（咒骸制作）',
    base: 0.6,
    hint: '制作并操纵咒骸：让尸体替你挡刀、替你说话。（原作：熊猫一类的咒骸技术）',
  },
  {
    id: 'sk_bind',
    s: '束缚戒律',
    label: '束缚 · 自我戒律',
    base: 1.0,
    hint: '给自己加上限制，换取同等增幅。束缚越重，回报越大。（原作：虎杖与宿傩的契约一类）',
  },
  {
    id: 'sk_loan',
    s: '无敌贷款王',
    label: '无敌贷款王（把束缚榨到极致）',
    base: 0.3,
    hint: '「以自身活着为代价换取不死」那一类疯狂交易的专家——你会把每一条束缚都贷到极限。',
  },
  {
    id: 'sk_word',
    s: '咒言',
    label: '咒言',
    base: 0.4,
    hint: '语言即是咒力，说出口的话强制现实——代价是烧坏自己的喉咙。（原作：狗卷棘）',
  },
  {
    id: 'sk_barrier',
    s: '结界术',
    label: '结界术 · 帐',
    base: 0.9,
    hint: '构筑结界、隐匿身形、隔绝外界。（原作：五条悟展开的「帐」）',
  },
  {
    id: 'sk_fall',
    s: '落花之情',
    label: '落花之情',
    base: 0.7,
    hint: '以最少咒力在 0.1 秒内自动迎击侵入者——不需要你反应。',
  },
  {
    id: 'sk_rebirth',
    s: '肉体改造',
    label: '受肉 · 肉体改造',
    base: 0.5,
    hint: '改造肉身以适应咒力，代价是逐渐不像人类。（原作：受肉体的古代术师们）',
  },
  {
    id: 'sk_spread',
    s: '领域展延',
    label: '领域展延',
    base: 0.45,
    hint: '把领域揉进武术动作里的高等技术：每一次出拳都带着领域的余韵。',
  },
]
export const GEAR_DEFS = [
  {
    id: 'gr_yuyun',
    s: '游云',
    label: '「游云」',
    base: 1.0,
    hint: '不以锋利取胜、以重量取胜的长柄咒具。一击能把咒灵砸进地里。',
  },
  {
    id: 'gr_amanai',
    s: '天逆鉾',
    label: '「天逆鉾」',
    base: 0.55,
    hint: '传说能强制解除任何术式的规格外咒具——被它刺中的术式会当场失效。',
  },
  {
    id: 'gr_kamutoke',
    s: '神武解',
    label: '「神武解」',
    base: 0.75,
    hint: '新阴流的刀：斩击本身被刻进了咒力。（原作：三輪霞的佩刀）',
  },
  {
    id: 'gr_soul',
    s: '释魂刀',
    label: '「释魂刀」',
    base: 0.7,
    hint: '斩的不是肉，是魂。对受肉体与容器类的存在尤其有效。',
  },
  {
    id: 'gr_chain',
    s: '万里锁',
    label: '「万里锁」',
    base: 0.8,
    hint: '可无限延伸的锁链类咒具：束缚、牵引、绞杀都靠它。',
  },
  {
    id: 'gr_dragon',
    s: '龙骨',
    label: '「龙骨」',
    base: 0.7,
    hint: '形似龙骨的钝器，重量惊人，附带震退效果。',
  },
  {
    id: 'gr_hiten',
    s: '飞天',
    label: '「飞天」',
    base: 0.6,
    hint: '能让人短暂浮空与滑翔的咒具——在立体战场上的逃跑与突袭神器。',
  },
  {
    id: 'gr_blackrope',
    s: '黑绳',
    label: '「黑绳」',
    base: 0.6,
    hint: '以咒力编织的黑色绳索，专为束缚与封印而作。',
  },
  {
    id: 'gr_toza',
    s: '屠座魔',
    label: '「屠座魔」',
    base: 0.45,
    hint: '形制诡异的大型咒具，破坏力极高，代价是极难驾驭。',
  },
  {
    id: 'gr_gun',
    s: '现代火器',
    label: '现代火器（咒力灌注子弹）',
    base: 0.7,
    hint: '咒术师不齿的东西，但它真的会死人。',
  },
  {
    id: 'gr_armor',
    s: '咒具铠',
    label: '咒具铠 · 护甲',
    base: 0.75,
    hint: '以咒力织成的护甲，替你挡下那一次致命打击。',
  },
  {
    id: 'gr_prison',
    s: '狱门疆',
    label: '「狱门疆」（表 / 里）',
    base: 0.15,
    hint: '封印专用的咒物级咒具——它能关住的东西，也包括你自己。',
  },
  {
    id: 'gr_original',
    s: '自制咒具',
    label: '自制咒具（由你的术式灌注而成）',
    base: 0.9,
    hint: '不属于任何名录的武器——名字将按你的术式与出身生成。',
  },
]
export function chosenSkills(c: ResultContext): string[] {
  return Object.keys(c)
    .filter(
      (k) =>
        /^skill\d+$/.test(k) ||
        /^skillg\d+$/.test(k) ||
        /^skillnew\d*$/.test(k) ||
        k === 'skill_new',
    )
    .map((k) => c[k])
}
export function skillStageFor(i: number | string, title?: string): Stage {
  const st: Stage = {
    id: 'skill' + i,
    name: title || '掌握的技能 ' + i,
    kind: 'skill',
    tag: '技艺',
    desc: '你会什么，决定了你在战场上能打出什么牌。',
    options: SKILL_DEFS.map((s) => ({ ...s })),
    rules: SKILL_DEFS.map((s) => ({
      name: '已经掌握：' + s.label,
      when: (c: ResultContext) => chosenSkills(c).includes(s.id),
      apply: (w: Weights) => {
        w[s.id] = 0
      },
    })).concat([
      {
        name: '无术式者难有术式系技术',
        when: (c: ResultContext) => ['t2', 't4', 't5'].indexOf(c.talent) < 0,
        apply: (w: Weights) => {
          w.sk_extreme = 0
          w.sk_spread = 0
          w.sk_jutsurev = 0
          w.sk_resonance = 0
        },
      },
      {
        name: '无咒力凡人学不了术式系',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.sk_reverse = 0
          w.sk_revout = 0
          w.sk_jutsurev = 0
          w.sk_black = 0
          w.sk_summon = 0
          w.sk_extreme = 0
          w.sk_spread = 0
          w.sk_resonance = 0
          w.sk_shadow = 0
        },
      },
      {
        name: '操控不足打不出黑闪',
        when: (c: ResultContext) => RI(c, 'dim_ct') < 4,
        apply: (w: Weights) => {
          w.sk_black = 0
        },
      },
      {
        name: '反转术式需极高操控',
        when: (c: ResultContext) => c.talent !== 't5' && RI(c, 'dim_ct') < 5,
        apply: (w: Weights) => {
          w.sk_reverse = 0
          w.sk_revout = 0
        },
      },
      {
        name: '反转外放要先会反转',
        when: (c: ResultContext) => c.talent !== 't5' && chosenSkills(c).indexOf('sk_reverse') < 0,
        apply: (w: Weights) => {
          w.sk_revout = 0
        },
      },
      {
        name: '术式反转需 A 以上操控',
        when: (c: ResultContext) => RI(c, 'dim_ct') < 4 || ['t2', 't4', 't5'].indexOf(c.talent) < 0,
        apply: (w: Weights) => {
          w.sk_jutsurev = 0
        },
      },
      {
        name: '咒灵操术需调伏之缘',
        when: (c: ResultContext) => !(c.talent === 't4' || c.origin === 'o4'),
        apply: (w: Weights) => {
          w.sk_summon = 0
        },
      },
      {
        name: '十种影法术需影之术式',
        when: (c: ResultContext) => c.technique !== 'tc_shadow',
        apply: (w: Weights) => {
          w.sk_shadow = 0
        },
      },
      {
        name: '咒言之术式 · 说出口就是现实',
        when: (c: ResultContext) => c.technique === 'tc_word',
        apply: (w: Weights) => {
          w.sk_word += 1.6
        },
      },
      {
        name: '没有咒言之术式 · 难练成咒言',
        when: (c: ResultContext) => !!c.technique && c.technique !== 'tc_word',
        apply: (w: Weights) => {
          w.sk_word -= 0.25
        },
      },
      {
        name: '无领域者谈不上展延',
        when: (c: ResultContext) => c.domain !== 'd2',
        apply: (w: Weights) => {
          w.sk_spread = 0
        },
      },
      /* 束缚链已有前置门：抽到「不存在束缚倾向」就不该再出现束缚类技术 */
      {
        name: '不存在束缚倾向 · 谈不上束缚戒律',
        when: (c: ResultContext) => c.vowGate === 'vow_no',
        apply: (w: Weights) => {
          w.sk_bind = 0
          w.sk_loan = 0
        },
      },
      {
        name: '无敌贷款王要算得清账（且要有束缚倾向）',
        when: (c: ResultContext) => c.vowGate !== 'vow_yes' || RI(c, 'dim_in') < 4,
        apply: (w: Weights) => {
          w.sk_loan = 0
        },
      },
      {
        name: '有束缚倾向者更容易变成贷款王',
        when: (c: ResultContext) => c.vowGate === 'vow_yes',
        apply: (w: Weights) => {
          w.sk_loan += 1.8
          w.sk_bind += 1.2
        },
      },
      {
        name: '傀儡咒术需要再造的智慧',
        when: (c: ResultContext) => RI(c, 'dim_in') < 3,
        apply: (w: Weights) => {
          w.sk_puppet = 0
        },
      },
      {
        name: '受肉体 / 宿傩阵营更易改造肉体',
        when: (c: ResultContext) => c.origin === 'o5' || c.faction === 'f6',
        apply: (w: Weights) => {
          w.sk_rebirth += 1.6
        },
      },
      {
        name: '智谋 A 以上善用束缚与结界',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 4,
        apply: (w: Weights) => {
          w.sk_bind += 0.8
          w.sk_barrier += 0.6
        },
      },
      {
        name: '自幼被训练',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag2',
        apply: (w: Weights) => {
          w.sk_simple += 0.5
          w.sk_fall += 0.5
        },
      },
      {
        name: '六眼 · 术式系的上限被打开',
        when: (c: ResultContext) => c.gift === 'gift_six',
        apply: (w: Weights) => {
          w.sk_reverse += 0.8
          w.sk_jutsurev += 0.8
          w.sk_extreme += 0.6
        },
      },
      /* 御三家：家学直接决定你能学到什么 */
      {
        name: '五条家 · 无下限的家学（茈 / 反转 / 展延）',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.sk_extreme += 1.8
          w.sk_reverse += 1.2
          w.sk_jutsurev += 1.2
          w.sk_spread += 1.0
          w.sk_barrier += 0.6
          w.sk_black += 0.5
        },
      },
      {
        name: '禅院家 · 肉体与影的家学',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.sk_shadow += 1.6
          w.sk_gear += 1.1
          w.sk_black += 0.9
          w.sk_simple += 0.6
          w.sk_fall += 0.5
          w.sk_rebirth += 0.4
        },
      },
      {
        name: '加茂家 · 血脉与器物的家学',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.sk_extreme += 1.0
          w.sk_gear += 1.0
          w.sk_reverse += 0.6
          w.sk_barrier += 0.5
        },
      },
    ]),
  }
  return st
}
export function gearStageFor(i: number): Stage {
  return {
    id: 'gear' + i,
    name: '咒具 ' + i,
    kind: 'gear',
    tag: '咒具',
    desc: '你灌注咒力做出来的第 ' + i + ' 件器物。',
    options: GEAR_DEFS.map((g) => ({ ...g })),
    rules: [
      {
        name: '体术 S 以上偏好长柄与重器',
        when: (c: ResultContext) => RI(c, 'dim_tj') >= 5,
        apply: (w: Weights) => {
          w.gr_yuyun += 0.8
          w.gr_dragon += 0.5
        },
      },
      {
        name: '操控 S 以上做得更精细',
        when: (c: ResultContext) => RI(c, 'dim_ct') >= 5,
        apply: (w: Weights) => {
          w.gr_blackrope += 0.6
          w.gr_amanai += 0.3
        },
      },
      {
        name: '现代派（无所属 / 市民）',
        when: (c: ResultContext) => ['f7', 'f9'].indexOf(c.faction) >= 0,
        apply: (w: Weights) => {
          w.gr_gun += 1.2
        },
      },
      {
        name: '御三家 / 上层 · 家藏名器',
        when: (c: ResultContext) => c.faction === 'f3' || c.origin === 'o2',
        apply: (w: Weights) => {
          w.gr_kamutoke += 0.8
          w.gr_amanai += 0.4
        },
      },
      {
        name: '五条家 · 狱门疆由这家保管',
        when: (c: ResultContext) => c.clan === 'cl_gojo',
        apply: (w: Weights) => {
          w.gr_prison += 1.1
          w.gr_special += 0.5
        },
      },
      {
        name: '禅院家 · 一族的咒具库',
        when: (c: ResultContext) => c.clan === 'cl_zenin',
        apply: (w: Weights) => {
          w.gr_special += 0.8
          w.gr_armor += 0.5
          w.gr_chain += 0.4
        },
      },
      {
        name: '加茂家 · 以血灌注的自制咒具',
        when: (c: ResultContext) => c.clan === 'cl_kamo',
        apply: (w: Weights) => {
          w.gr_original += 0.9
          w.gr_soul += 0.5
        },
      },
      {
        name: '智谋 S 以上 · 专做克制类',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
        apply: (w: Weights) => {
          w.gr_amanai += 0.7
          w.gr_blackrope += 0.5
        },
      },
      {
        name: '咒灵操术者爱做束缚类',
        when: (c: ResultContext) => c.talent === 't4' || c.technique === 'tc_summon',
        apply: (w: Weights) => {
          w.gr_chain += 1.2
          w.gr_blackrope += 0.8
        },
      },
      {
        name: '自创术式者只能自造咒具',
        when: (c: ResultContext) => c.technique === 'tc_original',
        apply: (w: Weights) => {
          w.gr_original += 1.0
        },
      },
      {
        name: '刻苦 / 自虐式修行者做得多',
        when: (c: ResultContext) => c.effort === 'ef_hard' || c.effort === 'ef_mad',
        apply: (w: Weights) => {
          w.gr_original += 0.5
        },
      },
    ].concat(
      GEAR_DEFS.map((g) => ({
        name: '已经做过：' + g.label,
        when: (c: ResultContext) =>
          Object.keys(c)
            .filter((k) => /^gear\d+$/.test(k))
            .map((k) => c[k])
            .includes(g.id),
        apply: (w: Weights) => {
          w[g.id] = 0
        },
      })),
    ),
  }
}
export const SKILL_COUNT: Stage = {
  id: 'skillCount',
  name: '掌握技能数量',
  kind: 'skill',
  tag: '技艺',
  desc: '除天赋予你的术式之外，你还会多少种「技术」。技术是可以后天练出来的东西。',
  options: [
    {
      id: 'kc0',
      s: '0 件',
      label: '一件也不会',
      base: 0.7,
      hint: '你只会把咒力灌进拳头，然后打过去。',
    },
    { id: 'kc1', s: '1 件', label: '掌握 1 种技术', base: 1.5, hint: '一招鲜，吃遍天。' },
    { id: 'kc2', s: '2 件', label: '掌握 2 种技术', base: 1.5, hint: '攻与守各有其一。' },
    { id: 'kc3', s: '3 件', label: '掌握 3 种技术', base: 1.0, hint: '已经称得上「有牌可打」。' },
    {
      id: 'kc4',
      s: '4 件',
      label: '掌握 4 种技术',
      base: 0.5,
      hint: '老手。别人会开始研究你的出牌顺序。',
    },
    {
      id: 'kc5',
      s: '5 件',
      label: '掌握 5 种技术',
      base: 0.2,
      hint: '规格外的技艺量——你会的东西比大多数人的一生还多。',
    },
  ],
  rules: [
    {
      name: '无咒力凡人',
      when: (c: ResultContext) => c.talent === 't6',
      apply: (w: Weights) => {
        w.kc0 += 1.6
        w.kc1 += 0.8
        w.kc2 = 0
        w.kc3 = 0
        w.kc4 = 0
        w.kc5 = 0
      },
    },
    {
      name: '评定为 SS / EX',
      when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
      apply: (w: Weights) => {
        w.kc3 += 0.9
        w.kc4 += 0.7
        w.kc5 += 0.4
        w.kc0 -= 0.4
      },
    },
    {
      name: '智谋 S 以上',
      when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
      apply: (w: Weights) => {
        w.kc2 += 0.6
        w.kc3 += 0.5
      },
    },
    {
      name: '壮年 / 老年 · 练得够久',
      when: (c: ResultContext) => c.age === 'ag4' || c.age === 'ag5',
      apply: (w: Weights) => {
        w.kc2 += 0.7
        w.kc3 += 0.5
      },
    },
    {
      name: '幼童 · 还什么都不会',
      when: (c: ResultContext) => c.age === 'ag1',
      apply: (w: Weights) => {
        w.kc0 += 1.4
        w.kc1 += 0.6
        w.kc4 = 0
        w.kc5 = 0
      },
    },
    {
      name: '后期时代 · 技术普遍化',
      when: (c: ResultContext) => c.era === 'e4' || c.era === 'e5',
      apply: (w: Weights) => {
        w.kc2 += 0.4
        w.kc3 += 0.3
      },
    },
    {
      name: '努力 · 躺平',
      when: (c: ResultContext) => c.effort === 'ef_lazy',
      apply: (w: Weights) => {
        w.kc0 += 1.8
        w.kc1 += 0.6
        w.kc3 -= 0.4
        w.kc4 = 0
        w.kc5 = 0
      },
    },
    {
      name: '努力 · 刻苦',
      when: (c: ResultContext) => c.effort === 'ef_hard',
      apply: (w: Weights) => {
        w.kc2 += 0.6
        w.kc3 += 1.0
        w.kc4 += 0.5
        w.kc0 -= 0.6
      },
    },
    {
      name: '努力 · 自虐式修行',
      when: (c: ResultContext) => c.effort === 'ef_mad',
      apply: (w: Weights) => {
        w.kc3 += 1.0
        w.kc4 += 1.0
        w.kc5 += 0.6
        w.kc0 -= 0.7
        w.kc1 -= 0.5
      },
    },
    {
      name: '努力 · 天才型偷懒',
      when: (c: ResultContext) => c.effort === 'ef_genius',
      apply: (w: Weights) => {
        w.kc1 += 0.8
        w.kc2 += 0.5
        w.kc5 -= 0.3
      },
    },
  ],
}
export const GEAR_COUNT: Stage = {
  id: 'gearCount',
  name: '制作咒具 · 数量',
  kind: 'gear',
  tag: '咒具',
  desc: '你做了几件咒具？每件都要单独抽一次类型。',
  options: [
    { id: 'gc1', s: '1 件', label: '1 件', base: 1.6, hint: '一件趁手的就够了。' },
    { id: 'gc2', s: '2 件', label: '2 件', base: 1.2, hint: '一攻一守。' },
    { id: 'gc3', s: '3 件', label: '3 件', base: 0.6, hint: '你开始像甚尔那样囤积武器。' },
    { id: 'gc4', s: '4 件', label: '4 件', base: 0.25, hint: '整个人就是一座移动武器库。' },
  ],
  rules: [
    {
      name: '智谋 / 操控 S 以上',
      when: (c: ResultContext) => RI(c, 'dim_in') >= 5 || RI(c, 'dim_ct') >= 5,
      apply: (w: Weights) => {
        w.gc2 += 0.6
        w.gc3 += 0.4
      },
    },
    {
      name: '幼童做不出几件',
      when: (c: ResultContext) => c.age === 'ag1',
      apply: (w: Weights) => {
        w.gc2 -= 0.5
        w.gc3 = 0
        w.gc4 = 0
      },
    },
    {
      name: '努力 · 刻苦',
      when: (c: ResultContext) => c.effort === 'ef_hard',
      apply: (w: Weights) => {
        w.gc2 += 0.7
        w.gc3 += 0.4
      },
    },
    {
      name: '努力 · 自虐式修行',
      when: (c: ResultContext) => c.effort === 'ef_mad',
      apply: (w: Weights) => {
        w.gc2 += 0.5
        w.gc3 += 0.8
        w.gc4 += 0.5
      },
    },
    {
      name: '努力 · 躺平',
      when: (c: ResultContext) => c.effort === 'ef_lazy',
      apply: (w: Weights) => {
        w.gc3 = 0
        w.gc4 = 0
      },
    },
  ],
}

/* ---------- 束缚链（借鉴「是否存在束缚倾向 → 束缚数 → 束缚理念」） ---------- */
export const VOW_GATE: Stage = {
  id: 'vowGate',
  name: '是否存在束缚倾向',
  kind: 'vow',
  tag: '束缚',
  desc: '束缚＝以「给自己加锁」换取同等的增幅。你是否是那种会拿代价去换力量的人？',
  options: [
    {
      id: 'vow_yes',
      s: '有',
      label: '存在束缚倾向',
      base: 1.0,
      hint: '你愿意付出代价去换取力量——这是变强最快、也最容易把自己赔进去的路。',
    },
    {
      id: 'vow_no',
      s: '无',
      label: '不存在束缚倾向',
      base: 1.3,
      hint: '你从不拿自己的什么去换什么。你会变强得慢一点，但睡得着。',
    },
  ],
  rules: [
    {
      name: '智谋 S 以上 · 更懂交易',
      when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
      apply: (w: Weights) => {
        w.vow_yes += 1.0
      },
    },
    {
      name: '与宿傩有缘 · 契约的味道',
      when: (c: ResultContext) => c.bond === 'b10',
      apply: (w: Weights) => {
        w.vow_yes += 0.9
      },
    },
    {
      name: '隶属宿傩阵营',
      when: (c: ResultContext) => c.faction === 'f6',
      apply: (w: Weights) => {
        w.vow_yes += 0.8
      },
    },
    {
      name: '无咒力凡人 · 没什么可失去',
      when: (c: ResultContext) => c.talent === 't6',
      apply: (w: Weights) => {
        w.vow_yes += 0.6
      },
    },
    {
      name: '性格虚无旁观 · 什么都敢押',
      when: (c: ResultContext) => c.personality === 'pe_void',
      apply: (w: Weights) => {
        w.vow_yes += 0.7
      },
    },
    {
      name: '幼童 · 尚不懂代价',
      when: (c: ResultContext) => c.age === 'ag1',
      apply: (w: Weights) => {
        w.vow_yes -= 0.8
      },
    },
  ],
}
export const VOW_COUNT: Stage = {
  id: 'vowCount',
  name: '束缚数',
  kind: 'vow',
  tag: '束缚',
  desc: '你身上挂着几条束缚。每多一条，你的增幅就重一层，代价也重一层。',
  options: [
    { id: 'vc1', s: '1 条', label: '1 条束缚', base: 1.6, hint: '一条已经足够改变一场战斗。' },
    { id: 'vc2', s: '2 条', label: '2 条束缚', base: 0.9, hint: '增幅与代价开始互相叠加。' },
    { id: 'vc3', s: '3 条', label: '3 条束缚', base: 0.35, hint: '你把自己抵押得只剩下骨头了。' },
  ],
  rules: [
    {
      name: '无敌贷款王 · 贷到极限',
      when: (c: ResultContext) => chosenSkills(c).indexOf('sk_loan') >= 0,
      apply: (w: Weights) => {
        w.vc3 += 1.6
        w.vc2 += 0.6
      },
    },
    {
      name: '智谋 EX 级',
      when: (c: ResultContext) => RI(c, 'dim_in') >= 6,
      apply: (w: Weights) => {
        w.vc2 += 0.6
        w.vc3 += 0.3
      },
    },
  ],
}
export const VOW_IDEAS = [
  {
    id: 'vw_sweet',
    s: '戒甜食',
    label: '永远不能吃甜食 —— 换取全属性增强',
    base: 1.0,
    hint: '代价极小，收益极稳。最经典的「便宜」束缚。',
  },
  {
    id: 'vw_alone',
    s: '孤死',
    label: '只能在众人拥簇下死去 —— 换取战斗中的不死',
    base: 0.6,
    hint: '你不会死在无人之处；代价是你注定死在某场众目睽睽的战斗里。',
  },
  {
    id: 'vw_domain',
    s: '缩短领域',
    label: '领域最长持续时间缩短 —— 换取无术式熔断',
    base: 0.7,
    hint: '你的领域更短，但展开后不会烧断术式。',
  },
  {
    id: 'vw_unlucky',
    s: '日常霉运',
    label: '日常霉运加身 —— 换取战斗中的强运',
    base: 0.8,
    hint: '平日里什么都不顺，一旦开战，运气全站在你这边。',
  },
  {
    id: 'vw_charge',
    s: '长前摇',
    label: '某个技能前摇变长 —— 换取该技能瞬发',
    base: 0.7,
    hint: '先慢慢摆一次架势，之后同一招可以零帧发出。',
  },
  {
    id: 'vw_report',
    s: '自报情报',
    label: '战斗时把自身情报全报出来（连裤衩颜色）—— 换取全面增强',
    base: 0.5,
    hint: '毫无保留地暴露自己，换来全方位的增幅。',
  },
  {
    id: 'vw_alive',
    s: '以生换死',
    label: '以「自身活着」为代价 —— 换取自己不死',
    base: 0.35,
    hint: '最不讲道理的一条：你活着这件事本身成了抵押品，因此你暂时不会死。',
  },
  {
    id: 'vw_later',
    s: '后天贷款',
    label: '天与咒缚 · 后天贷款版 —— 把咒力贷回来',
    base: 0.4,
    hint: '若你本无咒力，这一条能把它「贷」回来；账单会在某天到期。',
  },
]
export function vowStageFor(i: number): Stage {
  return {
    id: 'vow' + i,
    name: '束缚 ' + i + ' · 理念',
    kind: 'vow',
    tag: '束缚',
    desc: '第 ' + i + ' 条束缚的内容。代价越荒唐，回报越离谱。',
    options: VOW_IDEAS.map((v) => ({ ...v })),
    rules: VOW_IDEAS.map((v) => ({
      name: '已有：' + v.label.split(' ——')[0],
      when: (c: ResultContext) =>
        Object.keys(c)
          .filter((k) => /^vow\d+$/.test(k))
          .map((k) => c[k])
          .indexOf(v.id) >= 0,
      apply: (w: Weights) => {
        w[v.id] = 0
      },
    })).concat([
      {
        name: '有天与咒缚者才谈得上后天贷款',
        when: (c: ResultContext) => c.talent !== 't3' && c.gift !== 'gift_binding',
        apply: (w: Weights) => {
          w.vw_later = 0
        },
      },
      {
        name: '无敌贷款王 · 只押最狠的',
        when: (c: ResultContext) => chosenSkills(c).indexOf('sk_loan') >= 0,
        apply: (w: Weights) => {
          w.vw_alive += 1.4
          w.vw_report += 0.8
          w.vw_sweet -= 0.6
        },
      },
      {
        name: '智谋 S 以上 · 挑性价比最高的',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
        apply: (w: Weights) => {
          w.vw_sweet += 0.7
          w.vw_unlucky += 0.6
        },
      },
      {
        name: '与宿傩有缘 · 契约味更重',
        when: (c: ResultContext) => c.bond === 'b10',
        apply: (w: Weights) => {
          w.vw_alone += 0.7
          w.vw_alive += 0.5
        },
      },
    ]),
  }
}
/* ---------- 御三家 · 你出自哪一家（仅出身为 o2 时动态插入） ---------- */
export const CLAN: Stage = {
  id: 'clan',
  name: '御三家 · 你出自哪一家',
  kind: 'core',
  tag: '家门',
  desc: '同为名门，家学却完全不同：五条家世代相传「无下限」与「六眼」，禅院家以肉体与影立家、也以家规吃人，加茂家操血脉之术而居三家之末。你被写在哪一家的族谱上？',
  options: [
    {
      id: 'cl_gojo',
      s: '五条家',
      label: '五条家 · 无下限与六眼',
      base: 1.0,
      hint: '咒术界最强的一族。数百年才出一个「六眼」——你要么是那个人，要么是那个人的影子，要么是那个被拿来与他比较的人。',
    },
    {
      id: 'cl_zenin',
      s: '禅院家',
      label: '禅院家 · 肉体与影',
      base: 1.15,
      hint: '尚武、残酷，把术式与血统一起写进家规。出过伏黑甚尔与禅院真希，也出过被家族扔出去的人。',
    },
    {
      id: 'cl_kamo',
      s: '加茂家',
      label: '加茂家 · 血脉之术',
      base: 1.0,
      hint: '以自身血液为媒介的古术之家。地位在三家之末，却也因此不必背负「顶点」这个名字。',
    },
  ],
  rules: [
    {
      name: '怀玉 / 0 卷时期 · 五条家正盛',
      when: (c: ResultContext) => c.era === 'e0' || c.era === 'e1',
      apply: (w: Weights) => {
        w.cl_gojo += 0.9
        w.cl_kamo -= 0.2
      },
    },
    {
      name: '涩谷之后 · 五条家只剩传说',
      when: (c: ResultContext) => c.era === 'e4' || c.era === 'e5',
      apply: (w: Weights) => {
        w.cl_zenin += 0.5
        w.cl_gojo -= 0.2
      },
    },
    {
      name: '幼童 · 一切都由家决定',
      when: (c: ResultContext) => c.age === 'ag1',
      apply: (w: Weights) => {
        w.cl_zenin += 0.3
      },
    },
    {
      name: '性别为「不定」· 名门容不下异端',
      when: (c: ResultContext) => c.gender === 'g_x',
      apply: (w: Weights) => {
        w.cl_zenin -= 0.45
        w.cl_kamo += 0.35
      },
    },
    {
      name: '天元侧的气味 · 古老血脉更近',
      when: (c: ResultContext) => c.gift === 'gift_plasma',
      apply: (w: Weights) => {
        w.cl_kamo += 0.6
        w.cl_gojo += 0.3
      },
    },
  ],
}

/* ---------- 决战阵营 / 后世评价 ---------- */
export const BATTLE_SIDE: Stage = {
  id: 'battleSide',
  name: '决战阵营',
  kind: 'battle',
  tag: '阵营',
  desc: '最终那场仗，你站在谁的天空下。这一轮先定，后面「涩谷 / 死灭回游 / 新宿决战 / 终战之后」的经历都会跟着它走，并直接决定决战里站在你对面的人是谁。',
  options: [
    {
      id: 'bs_jujutsu',
      s: '高专方',
      label: '高专方 · 与众人并肩',
      base: 1.5,
      hint: '你和所有人一起，去打那个有两张脸的东西。此后你在新宿不可能站在宿傩一侧。',
    },
    {
      id: 'bs_sukuna',
      s: '宿傩方',
      label: '宿傩方 · 与诅咒之王同盟',
      base: 0.6,
      hint: '你侍奉他。挡在你面前的就是五条悟与整个高专——除非你的因果之人正是宿傩本人，那他终将是你唯一要面对的人。',
    },
    {
      id: 'bs_self',
      s: '自己打自己的仗',
      label: '两边都不站 · 只打自己的仗',
      base: 0.9,
      hint: '你谁的人都不是。你的对手只由你自己的因果决定。',
    },
  ],
  rules: [
    {
      name: '隶属宿傩阵营',
      when: (c: ResultContext) => c.faction === 'f6',
      apply: (w: Weights) => {
        w.bs_sukuna += 2.4
        w.bs_jujutsu -= 0.8
      },
    },
    {
      name: '隶属咒诅师集团',
      when: (c: ResultContext) => c.faction === 'f4',
      apply: (w: Weights) => {
        w.bs_sukuna += 1.2
        w.bs_self += 0.5
      },
    },
    {
      name: '隶属高专',
      when: (c: ResultContext) => c.faction === 'f1' || c.faction === 'f2',
      apply: (w: Weights) => {
        w.bs_jujutsu += 1.8
        w.bs_sukuna -= 0.6
      },
    },
    {
      name: '无所属 · 流浪者',
      when: (c: ResultContext) => c.faction === 'f9',
      apply: (w: Weights) => {
        w.bs_self += 1.2
      },
    },
    {
      name: '咒灵之身',
      when: (c: ResultContext) => c.origin === 'o4',
      apply: (w: Weights) => {
        w.bs_sukuna += 0.8
        w.bs_jujutsu -= 0.5
      },
    },
    {
      name: '与五条悟有缘',
      when: (c: ResultContext) => c.bond === 'b1',
      apply: (w: Weights) => {
        w.bs_jujutsu += 1.0
        w.bs_sukuna -= 0.5
      },
    },
    {
      name: '与宿傩有缘',
      when: (c: ResultContext) => c.bond === 'b10',
      apply: (w: Weights) => {
        w.bs_sukuna += 1.0
      },
    },
    {
      name: '孤身一人',
      when: (c: ResultContext) => c.bond === 'b13',
      apply: (w: Weights) => {
        w.bs_self += 1.0
      },
    },
  ],
}
export const LEGACY: Stage = {
  id: 'legacy',
  name: '后世评价',
  kind: 'legacy',
  tag: '身后',
  desc: '很久以后，咒术界会怎么称呼你。',
  options: [
    {
      id: 'lg_hero',
      s: '英雄',
      label: '英雄',
      base: 1.0,
      hint: '你的名字会被写进教科书，被孩子们念出来。',
    },
    {
      id: 'lg_strongest',
      s: '史上最强',
      label: '史上最强',
      base: 0.45,
      hint: '不是某个时代的最强，是「史上」。',
    },
    {
      id: 'lg_modern',
      s: '现代最强',
      label: '现代最强',
      base: 0.6,
      hint: '这个时代里，没有人能越过你。',
    },
    {
      id: 'lg_worst',
      s: '最恶',
      label: '最恶诅咒师（或最恶咒灵）',
      base: 0.7,
      hint: '你的名字用来吓唬小孩——而他们确实该怕。',
    },
    {
      id: 'lg_unscrup',
      s: '无底线术师',
      label: '无底线术师',
      base: 0.7,
      hint: '你赢了，但没人愿意提你是怎么赢的。',
    },
    {
      id: 'lg_none',
      s: '无特别评价',
      label: '无特别评价',
      base: 1.1,
      hint: '你活过、死过，档案上只有一行字。',
    },
    { id: 'lg_who', s: '他谁啊？', label: '他谁啊？', base: 0.9, hint: '连咒术界都懒得记你。' },
    {
      id: 'lg_cosmic',
      s: '宇宙最强',
      label: '宇宙最强',
      base: 0.08,
      hint: '连外星来的东西都得先问一句：那位在不在？',
    },
  ],
  rules: [
    {
      name: '结局为诅咒之王',
      when: (c: ResultContext) => c.ending === 'x5',
      apply: (w: Weights) => {
        w.lg_strongest += 1.6
        w.lg_worst += 1.2
        w.lg_cosmic += 0.5
      },
    },
    {
      name: '结局为改写规则者',
      when: (c: ResultContext) => c.ending === 'x9',
      apply: (w: Weights) => {
        w.lg_strongest += 1.0
        w.lg_modern += 0.6
      },
    },
    {
      name: '结局为战死殉道',
      when: (c: ResultContext) => c.ending === 'x1',
      apply: (w: Weights) => {
        w.lg_hero += 1.8
        w.lg_none -= 0.4
      },
    },
    {
      name: '结局为成为教师',
      when: (c: ResultContext) => c.ending === 'x7',
      apply: (w: Weights) => {
        w.lg_hero += 1.0
        w.lg_modern += 0.4
      },
    },
    {
      name: '结局为放逐流亡',
      when: (c: ResultContext) => c.ending === 'x8',
      apply: (w: Weights) => {
        w.lg_worst += 1.2
        w.lg_unscrup += 1.0
        w.lg_hero -= 0.6
      },
    },
    {
      name: '决战压胜',
      when: (c: ResultContext) => c.duel === 'w1',
      apply: (w: Weights) => {
        w.lg_strongest += 1.0
        w.lg_modern += 0.8
        w.lg_cosmic += 0.3
      },
    },
    {
      name: '打倒了原身形态的宿傩',
      when: (c: ResultContext) => c.duel2 && (c.duel2 === 'w1' || c.duel2 === 'w2'),
      apply: (w: Weights) => {
        w.lg_strongest += 2.4
        w.lg_cosmic += 1.0
        w.lg_modern += 0.9
        w.lg_who -= 0.8
        w.lg_none -= 0.6
      },
    },
    {
      name: '败于原身形态的宿傩',
      when: (c: ResultContext) => c.duel2 === 'w5',
      apply: (w: Weights) => {
        w.lg_hero += 1.2
        w.lg_none += 0.5
        w.lg_who -= 0.5
      },
    },
    {
      name: '决战败走',
      when: (c: ResultContext) => c.duel === 'w4',
      apply: (w: Weights) => {
        w.lg_unscrup += 0.8
        w.lg_who += 0.6
        w.lg_hero -= 0.5
      },
    },
    {
      name: '评定为【EX】规格外',
      when: (c: ResultContext) => c.grade === 'g8',
      apply: (w: Weights) => {
        w.lg_strongest += 1.4
        w.lg_cosmic += 0.6
      },
    },
    {
      name: '评定为 E / D 级',
      when: (c: ResultContext) => c.grade === 'g1' || c.grade === 'g2',
      apply: (w: Weights) => {
        w.lg_who += 1.4
        w.lg_none += 0.8
        w.lg_hero -= 0.4
      },
    },
    {
      name: '五条家 · 名字本身就是传说',
      when: (c: ResultContext) => c.clan === 'cl_gojo',
      apply: (w: Weights) => {
        w.lg_strongest += 1.2
        w.lg_modern += 0.9
        w.lg_cosmic += 0.4
        w.lg_who -= 0.6
      },
    },
    {
      name: '禅院家 · 恶名与功名同源',
      when: (c: ResultContext) => c.clan === 'cl_zenin',
      apply: (w: Weights) => {
        w.lg_unscrup += 0.9
        w.lg_worst += 0.6
        w.lg_modern += 0.4
      },
    },
    {
      name: '加茂家 · 被记在教科书的一行里',
      when: (c: ResultContext) => c.clan === 'cl_kamo',
      apply: (w: Weights) => {
        w.lg_modern += 0.6
        w.lg_hero += 0.4
        w.lg_none += 0.3
      },
    },
    {
      name: '隶属宿傩阵营',
      when: (c: ResultContext) => c.faction === 'f6',
      apply: (w: Weights) => {
        w.lg_worst += 1.0
        w.lg_unscrup += 0.6
        w.lg_hero -= 0.8
      },
    },
    {
      name: '咒灵之身',
      when: (c: ResultContext) => c.origin === 'o4',
      apply: (w: Weights) => {
        w.lg_worst += 0.9
      },
    },
    {
      name: '六眼或双面四臂',
      when: (c: ResultContext) => c.gift === 'gift_six' || c.gift === 'gift_arms',
      apply: (w: Weights) => {
        w.lg_strongest += 0.8
        w.lg_modern += 0.6
      },
    },
  ],
}

/* =====================================================================
   经历轮
   ===================================================================== */
export const EVENT_DEFS: EventDefinition[] = [
  {
    id: 'ev0',
    eraIdx: 2,
    name: '百鬼夜行',
    title: '2007.12.24 · 东京与京都',
    desc: '2007 年 12 月 24 日。披着夏油杰皮囊的羂索，在东京与京都放出了上千只咒灵。那一夜你在哪里？',
    opts: [
      {
        k: 'a',
        s: '前线祓除',
        label: '在前线祓除咒灵',
        base: 1.4,
        hint: '一夜之间能祓除多少，决定了你能活到第几天。',
      },
      {
        k: 'b',
        s: '守住民宅',
        label: '守住民宅与避难所',
        base: 1.1,
        hint: '你杀不了几只，但你挡住了它们。',
      },
      {
        k: 'c',
        s: '被卷入',
        label: '被卷入的普通人',
        base: 0.8,
        hint: '你只是回家路上遇到了它们。',
      },
      {
        k: 'd',
        s: '与夏油同行',
        label: '与夏油（羂索）同行',
        base: 0.5,
        hint: '放出咒灵的那个人，和你站在一边。',
      },
      {
        k: 'abs',
        s: '缺席',
        label: '缺席（别处任务 / 已退出舞台）',
        base: 0.7,
        hint: '你不在这里。原因可能是任务，也可能是死亡。',
      },
    ],
    rules: [
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.ev0_a = 0
          w.ev0_b = 0
          w.ev0_c = 0
          w.ev0_d += 2.2
        },
      },
      {
        name: '一般人类',
        when: (c: ResultContext) => c.origin === 'o3',
        apply: (w: Weights) => {
          w.ev0_c += 2.4
          w.ev0_a = 0
          w.ev0_b -= 0.4
        },
      },
      {
        name: '隶属咒诅师集团',
        when: (c: ResultContext) => c.faction === 'f4',
        apply: (w: Weights) => {
          w.ev0_d += 1.9
          w.ev0_a -= 0.5
        },
      },
      {
        name: '隶属高专',
        when: (c: ResultContext) => c.faction === 'f1' || c.faction === 'f2',
        apply: (w: Weights) => {
          w.ev0_a += 1.3
          w.ev0_b += 0.6
        },
      },
      {
        name: 'S 级以上战力',
        when: (c: ResultContext) => ['g6', 'g7', 'g8'].includes(c.grade),
        apply: (w: Weights) => {
          w.ev0_a += 0.9
        },
      },
      {
        name: '体质 A 以上',
        when: (c: ResultContext) => RI(c, 'dim_bd') >= 4,
        apply: (w: Weights) => {
          w.ev0_a += 0.5
        },
      },
      {
        name: '幼童 · 上不了前线',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w.ev0_a = 0
          w.ev0_b = 0
          w.ev0_c += 1.6
          w.ev0_abs += 0.8
        },
      },
    ],
  },
  {
    id: 'ev2',
    eraIdx: 2,
    name: '少年院 · 宿傩降生',
    title: '2018 年春 · 少年院',
    desc: '2018 年春。伏黑惠在少年院找到了那根手指，虎杖悠仁把它吞了下去。世界从那天开始倾斜——你在哪儿？',
    opts: [
      {
        k: 'a',
        s: '在少年院',
        label: '就在少年院现场',
        base: 1.2,
        hint: '你亲眼看见那根手指被塞进他嘴里。',
      },
      {
        k: 'b',
        s: '回收任务',
        label: '被派去回收特级咒物',
        base: 1.2,
        hint: '你是接到任务赶过去的那一组。',
      },
      {
        k: 'c',
        s: '觊觎手指',
        label: '在暗处觊觎那根手指',
        base: 0.55,
        hint: '你想要它。为了力量，为了卖钱，或者为了别的目的。',
      },
      {
        k: 'd',
        s: '毫无交集',
        label: '与这件事毫无交集',
        base: 0.9,
        hint: '那天你在做别的事。世界改变的时候，你不在场。',
      },
      {
        k: 'abs',
        s: '尚未登场',
        label: '尚未登场（未出生 / 已不在）',
        base: 0.6,
        hint: '你还没进入这个故事——也许还没出生，也许已经死了。',
      },
    ],
    rules: [
      {
        name: '隶属高专',
        when: (c: ResultContext) => c.faction === 'f1' || c.faction === 'f2',
        apply: (w: Weights) => {
          w.ev2_b += 1.3
          w.ev2_a += 0.5
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.ev2_c += 1.8
          w.ev2_b = 0
        },
      },
      {
        name: '宿傩阵营 / 咒诅师',
        when: (c: ResultContext) => c.faction === 'f6' || c.faction === 'f4',
        apply: (w: Weights) => {
          w.ev2_c += 1.6
        },
      },
      {
        name: '只是一般市民',
        when: (c: ResultContext) => c.faction === 'f7',
        apply: (w: Weights) => {
          w.ev2_d += 2.0
          w.ev2_a = 0
          w.ev2_b = 0
        },
      },
      {
        name: '天元侧',
        when: (c: ResultContext) => c.faction === 'f8',
        apply: (w: Weights) => {
          w.ev2_d += 1.2
        },
      },
      {
        name: '智谋 A 以上',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 4,
        apply: (w: Weights) => {
          w.ev2_c += 0.5
        },
      },
    ],
  },
  {
    id: 'ev3',
    eraIdx: 3,
    name: '涩谷事变',
    title: '2018.10.31 · 涩谷',
    desc: '2018 年 10 月 31 日。涩谷地下，咒灵与咒术师的总力战；那一天的终点是狱门疆。你做了什么？',
    opts: [
      {
        k: 'a',
        s: '地下交战',
        label: '在涩谷地下正面交战',
        base: 1.4,
        hint: '站台、下水道、地下街——最前线。',
      },
      {
        k: 'b',
        s: '守卫外缘',
        label: '守卫结界外缘 · 疏散民众',
        base: 1.0,
        hint: '你在结界外，把活着的人往外推。',
      },
      { k: 'c', s: '被卷入', label: '作为市民被卷入', base: 0.9, hint: '你只是来看万圣节的人潮。' },
      {
        k: 'd',
        s: '与咒灵并肩',
        label: '站在咒灵 · 真人一侧',
        base: 0.45,
        hint: '你趁这场混乱，做了自己想做的事。',
      },
      {
        k: 'e',
        s: '参与封印',
        label: '参与封印五条悟的计划',
        base: 0.4,
        hint: '无论你站在哪一方，那一天的目标都是那口箱子。',
      },
      {
        k: 'abs',
        s: '缺席',
        label: '缺席（别处任务 / 已退出舞台）',
        base: 0.7,
        hint: '涩谷那天，你在别处——或者已经不在了。',
      },
    ],
    rules: [
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.ev3_a = 0
          w.ev3_b = 0
          w.ev3_c = 0
          w.ev3_d += 2.4
          w.ev3_e += 0.6
        },
      },
      {
        name: '一般人类 / 市民',
        when: (c: ResultContext) => c.origin === 'o3' || c.faction === 'f7',
        apply: (w: Weights) => {
          w.ev3_c += 2.4
          w.ev3_a = 0
          w.ev3_b -= 0.5
        },
      },
      {
        name: '隶属高专',
        when: (c: ResultContext) => c.faction === 'f1' || c.faction === 'f2',
        apply: (w: Weights) => {
          w.ev3_a += 1.4
          w.ev3_b += 0.7
        },
      },
      {
        name: '隶属咒术界上层',
        when: (c: ResultContext) => c.faction === 'f3',
        apply: (w: Weights) => {
          w.ev3_e += 1.8
          w.ev3_b += 0.6
        },
      },
      {
        name: '咒诅师 / 宿傩阵营',
        when: (c: ResultContext) => c.faction === 'f4' || c.faction === 'f6',
        apply: (w: Weights) => {
          w.ev3_d += 1.6
          w.ev3_e += 1.0
        },
      },
      {
        name: 'SS / EX',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.ev3_a += 1.0
        },
      },
      {
        name: '体术 A 以上',
        when: (c: ResultContext) => RI(c, 'dim_tj') >= 4,
        apply: (w: Weights) => {
          w.ev3_a += 0.6
        },
      },
      {
        name: '你已定下站在高专方',
        when: (c: ResultContext) => c.battleSide === 'bs_jujutsu',
        apply: (w: Weights) => {
          w.ev3_a += 1.0
          w.ev3_b += 0.4
          w.ev3_d -= 1.4
        },
      },
      {
        name: '你已定下站在宿傩方',
        when: (c: ResultContext) => c.battleSide === 'bs_sukuna',
        apply: (w: Weights) => {
          w.ev3_d += 1.6
          w.ev3_e += 0.5
          w.ev3_a -= 0.4
        },
      },
      {
        name: '你已定下两边都不站',
        when: (c: ResultContext) => c.battleSide === 'bs_self',
        apply: (w: Weights) => {
          w.ev3_b += 0.7
          w.ev3_c += 0.4
        },
      },
    ],
  },
  {
    id: 'ev4',
    eraIdx: 4,
    name: '死灭回游',
    title: '2018.11 · 结界之内',
    desc: '2018 年 11 月。羂索发动的杀戮游戏在结界里开动：点数、规则，以及活到最后的资格。',
    opts: [
      {
        k: 'a',
        s: '玩家·夺点',
        label: '作为玩家夺取点数',
        base: 1.3,
        hint: '杀戮即得分。你很快就习惯了。',
      },
      {
        k: 'b',
        s: '追加规则',
        label: '以 100 点追加规则',
        base: 0.32,
        hint: '你攒够一百点，向游戏本身提了一个要求。',
      },
      {
        k: 'c',
        s: '泳者',
        label: '作为「泳者」被强行卷入',
        base: 0.9,
        hint: '你没报名，结界还是把你抓了进去。',
      },
      {
        k: 'd',
        s: '运营侧',
        label: '站在羂索一侧运营游戏',
        base: 0.45,
        hint: '你不是棋子，你是摆棋的人。',
      },
      {
        k: 'abs',
        s: '缺席',
        label: '缺席（结界外奔走 / 已退出舞台）',
        base: 0.8,
        hint: '你在结界外面奔走，或者已经不在这个世界。',
      },
    ],
    rules: [
      {
        name: '受肉体 · 容器',
        when: (c: ResultContext) => c.origin === 'o5',
        apply: (w: Weights) => {
          w.ev4_a += 2.0
          w.ev4_c -= 0.3
        },
      },
      {
        name: '死灭回游玩家',
        when: (c: ResultContext) => c.faction === 'f5',
        apply: (w: Weights) => {
          w.ev4_a += 1.8
          w.ev4_b += 0.4
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.ev4_a = 0
          w.ev4_b = 0
          w.ev4_c += 1.0
          w.ev4_d += 1.7
        },
      },
      {
        name: '一般人类 / 市民',
        when: (c: ResultContext) => c.origin === 'o3' || c.faction === 'f7',
        apply: (w: Weights) => {
          w.ev4_c += 2.4
          w.ev4_a = 0
          w.ev4_b = 0
        },
      },
      {
        name: '咒诅师集团',
        when: (c: ResultContext) => c.faction === 'f4',
        apply: (w: Weights) => {
          w.ev4_d += 1.9
        },
      },
      {
        name: 'SS / EX',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.ev4_b += 1.6
          w.ev4_a += 0.7
        },
      },
      {
        name: '智谋 A 以上',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 4,
        apply: (w: Weights) => {
          w.ev4_b += 1.0
        },
      },
      {
        name: '咒力总量 A 以上',
        when: (c: ResultContext) => RI(c, 'dim_ce') >= 4,
        apply: (w: Weights) => {
          w.ev4_a += 0.6
        },
      },
      {
        name: '你已定下站在高专方',
        when: (c: ResultContext) => c.battleSide === 'bs_jujutsu',
        apply: (w: Weights) => {
          w.ev4_a += 0.7
          w.ev4_c += 0.5
          w.ev4_d -= 0.6
        },
      },
      {
        name: '你已定下站在宿傩方',
        when: (c: ResultContext) => c.battleSide === 'bs_sukuna',
        apply: (w: Weights) => {
          w.ev4_d += 1.8
          w.ev4_a += 0.3
        },
      },
      {
        name: '你已定下两边都不站',
        when: (c: ResultContext) => c.battleSide === 'bs_self',
        apply: (w: Weights) => {
          w.ev4_c += 0.8
          w.ev4_abs += 0.4
        },
      },
    ],
  },
  {
    id: 'ev5',
    eraIdx: 5,
    name: '新宿决战',
    title: '2018.12.24 · 人外魔境新宿',
    desc: '2018 年 12 月 24 日。五条悟解除封印，与两面宿傩在新宿上空开战。那一天，你站在哪一边的天空下？',
    opts: [
      {
        k: 'a',
        s: '讨伐宿傩',
        label: '参与讨伐宿傩',
        base: 1.3,
        hint: '轮到你了。所有还站着的人都去了。',
      },
      {
        k: 'b',
        s: '结界外守候',
        label: '在结界外守候 · 传递情报',
        base: 1.0,
        hint: '你上不了那个战场，但你没有离开。',
      },
      {
        k: 'c',
        s: '宿傩一侧',
        label: '站在宿傩一侧',
        base: 0.45,
        hint: '你选择侍奉那个有两张脸的东西。',
      },
      {
        k: 'abs',
        s: '缺席',
        label: '缺席（已死 / 被封印 / 远离战场）',
        base: 0.9,
        hint: '那一天，你已经不在任何一边了。',
      },
    ],
    rules: [
      {
        name: '宿傩阵营',
        when: (c: ResultContext) => c.faction === 'f6',
        apply: (w: Weights) => {
          w.ev5_c += 2.4
          w.ev5_a = 0
        },
      },
      {
        name: '与宿傩有缘',
        when: (c: ResultContext) => c.bond === 'b10',
        apply: (w: Weights) => {
          w.ev5_c += 1.2
          w.ev5_a += 0.6
        },
      },
      {
        name: '与虎杖 / 五条有缘',
        when: (c: ResultContext) => c.bond === 'b3' || c.bond === 'b1',
        apply: (w: Weights) => {
          w.ev5_a += 1.4
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.ev5_c += 1.4
          w.ev5_b += 0.5
        },
      },
      {
        name: '一般人类 / 市民',
        when: (c: ResultContext) => c.origin === 'o3' || c.faction === 'f7',
        apply: (w: Weights) => {
          w.ev5_b += 1.8
          w.ev5_a = 0
        },
      },
      {
        name: '隶属高专',
        when: (c: ResultContext) => c.faction === 'f1' || c.faction === 'f2',
        apply: (w: Weights) => {
          w.ev5_a += 1.2
        },
      },
      {
        name: 'SS / EX',
        when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.ev5_a += 1.1
        },
      },
      /* 决战阵营已经先抽过：新宿决战必须跟着它走，否则会出现「决战高专方 / 新宿却站在宿傩一侧」的自相矛盾 */
      {
        name: '你已定下站在高专方 · 不可能侍奉宿傩',
        when: (c: ResultContext) => c.battleSide === 'bs_jujutsu',
        apply: (w: Weights) => {
          w.ev5_a += 3.0
          w.ev5_b += 0.4
          w.ev5_c = 0
        },
      },
      {
        name: '你已定下站在宿傩方 · 不可能去讨伐他',
        when: (c: ResultContext) => c.battleSide === 'bs_sukuna',
        apply: (w: Weights) => {
          w.ev5_c += 3.4
          w.ev5_a = 0
          w.ev5_b -= 0.5
        },
      },
      {
        name: '你已定下两边都不站 · 多半只在结界外',
        when: (c: ResultContext) => c.battleSide === 'bs_self',
        apply: (w: Weights) => {
          w.ev5_b += 1.4
          w.ev5_a -= 0.5
          w.ev5_c -= 0.5
        },
      },
      {
        name: '你的决战对手就是宿傩本人',
        when: (c: ResultContext) => c.battleSide === 'bs_jujutsu' && c.bond === 'b10',
        apply: (w: Weights) => {
          w.ev5_a += 0.8
        },
      },
    ],
  },
  {
    id: 'ev6',
    eraIdx: 6,
    name: '终战之后',
    title: '2019 · 废墟之上',
    desc: '死灭回游落幕，宿傩之火熄灭。幸存下来的人开始重建这个世界的秩序——或者拒绝参与重建。',
    opts: [
      {
        k: 'a',
        s: '重建秩序',
        label: '留在咒术界重建秩序',
        base: 1.2,
        hint: '你把废墟清出一条路，然后站在这条路上。',
      },
      {
        k: 'b',
        s: '成为教师',
        label: '成为教师 · 培养下一代',
        base: 0.9,
        hint: '把学生活着送出去，是你唯一的复仇。',
      },
      {
        k: 'c',
        s: '隐退',
        label: '隐退 · 回到普通人的生活',
        base: 0.9,
        hint: '你终于学会为房租发愁，这感觉并不坏。',
      },
      {
        k: 'd',
        s: '流亡',
        label: '流亡 / 不被承认',
        base: 0.6,
        hint: '你触碰了禁忌，从此不被任何组织承认。',
      },
      {
        k: 'abs',
        s: '不在此世',
        label: '不在这个世界',
        base: 0.7,
        hint: '你没能活到 2019 年，或者被永远留在了某口箱子里。',
      },
    ],
    rules: [
      {
        name: '隶属高专 / 上层',
        when: (c: ResultContext) => ['f1', 'f2', 'f3'].includes(c.faction),
        apply: (w: Weights) => {
          w.ev6_a += 1.3
          w.ev6_b += 0.5
        },
      },
      {
        name: '与五条 / 乙骨 / 真希有缘',
        when: (c: ResultContext) => ['b1', 'b2', 'b6'].includes(c.bond),
        apply: (w: Weights) => {
          w.ev6_a += 0.9
          w.ev6_b += 0.6
        },
      },
      {
        name: '一般人类 / 市民',
        when: (c: ResultContext) => c.origin === 'o3' || c.faction === 'f7',
        apply: (w: Weights) => {
          w.ev6_c += 2.2
          w.ev6_a = 0
        },
      },
      {
        name: '宿傩阵营 / 咒诅师',
        when: (c: ResultContext) => c.faction === 'f6' || c.faction === 'f4',
        apply: (w: Weights) => {
          w.ev6_d += 1.9
          w.ev6_a -= 0.4
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w.ev6_abs += 1.6
          w.ev6_c += 0.4
        },
      },
      {
        name: '智谋 A 以上',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 4,
        apply: (w: Weights) => {
          w.ev6_a += 0.7
        },
      },
      {
        name: '你站在高专方打完了那一仗',
        when: (c: ResultContext) => c.battleSide === 'bs_jujutsu',
        apply: (w: Weights) => {
          w.ev6_a += 0.9
          w.ev6_b += 0.5
          w.ev6_d -= 0.6
        },
      },
      {
        name: '你站在宿傩方 · 战后无处容身',
        when: (c: ResultContext) => c.battleSide === 'bs_sukuna',
        apply: (w: Weights) => {
          w.ev6_d += 1.6
          w.ev6_c += 0.6
          w.ev6_a -= 0.7
        },
      },
      {
        name: '你两边都不站',
        when: (c: ResultContext) => c.battleSide === 'bs_self',
        apply: (w: Weights) => {
          w.ev6_c += 0.9
          w.ev6_d += 0.4
        },
      },
    ],
  },
]

/* =====================================================================
   事件战：百鬼夜行 / 少年院 / 涩谷事变 / 死灭回游 / 新宿决战 均可开战
   敌人按「你在该事件里的立场 + 决战阵营 + 你的强度」自动匹配，不再只有终局之战
   ===================================================================== */
export const BOUT_EVENTS = ['ev0', 'ev2', 'ev3', 'ev4', 'ev5']
export const BOUT_DIFF: Record<string, number> = { 0: 5, 2: 4, 3: 7, 4: 6, 5: 9 } // 各事件的基准难度（简报模式用）
export const BOUT_KIT: Record<string, KitOption[]> = {
  crowd: [
    { k: 'flow', s: '咒力奔流', label: '咒灵群 · 咒力奔流', base: 1.6, pw: 5 },
    { k: 'swarm', s: '数量压制', label: '数量压制（四面八方）', base: 1.3, pw: 6 },
    { k: 'devour', s: '吞噬', label: '被它们按倒 · 啃食', base: 1.1, pw: 7 },
    { k: 'domain', s: '小型领域', label: '小型领域 · 泥沼', base: 0.45, pw: 9 },
  ],
  curse: [
    { k: 'jutsu', s: '术式攻击', label: '术式 · 无为转变 / 炎', base: 1.5, pw: 7 },
    { k: 'domain', s: '领域展开', label: '展开领域', base: 0.7, pw: 11 },
    { k: 'black', s: '黑闪', label: '黑闪', base: 0.5, pw: 8 },
    { k: 'tai', s: '肉体碾压', label: '变形的肉体 · 碾压', base: 1.0, pw: 6 },
  ],
  sorcerer: [
    { k: 'jutsu', s: '术式攻击', label: '术式攻击', base: 1.5, pw: 6 },
    { k: 'gear', s: '咒具', label: '咒具 · 斩击', base: 1.1, pw: 5 },
    { k: 'black', s: '黑闪', label: '黑闪', base: 0.6, pw: 8 },
    { k: 'barrier', s: '结界', label: '以结界切断退路', base: 0.8, pw: 5 },
    { k: 'domain', s: '领域', label: '展开领域', base: 0.5, pw: 10 },
  ],
  player: [
    { k: 'jutsu', s: '术式攻击', label: '术式攻击', base: 1.6, pw: 6 },
    { k: 'trap', s: '陷阱', label: '预先布置的陷阱', base: 1.0, pw: 6 },
    { k: 'rule', s: '改写规则', label: '用点数改写规则', base: 0.6, pw: 8 },
    { k: 'tai', s: '体术', label: '体术连击', base: 1.2, pw: 4 },
  ],
  object: [
    { k: 'claw', s: '爪击', label: '咒物的爪击', base: 1.6, pw: 6 },
    { k: 'fear', s: '威压', label: '威压 · 咒力喷涌', base: 1.0, pw: 7 },
    { k: 'devour', s: '吞噬', label: '试图吞下你', base: 0.8, pw: 8 },
    { k: 'regen', s: '再生', label: '断肢再生', base: 0.8, pw: 4 },
  ],
  // 注：key 为 'sukuna' 时直接用 ENEMY_KIT.b10（它在下方定义，此处不能提前引用）
}
export function eventDefinition(evId: string): EventDefinition {
  const definition = EVENT_DEFS.find((item) => item.id === evId)
  if (!definition) throw new Error('未知事件：' + evId)
  return definition
}
export const boutKit = (key: string): KitOption[] =>
  key === 'sukuna' ? ENEMY_KIT.b10 : BOUT_KIT[key] || GENERIC_KIT
export function boutFoe(evId: string, c: ResultContext): BattleFoe {
  if (evId === 'ev0')
    return c.ev0 === 'ev0_d'
      ? {
          key: 'sorcerer',
          name: '赶来祓除的高专术师',
          note: '放出咒灵的人和你站在一边，所以那一夜你的敌人是来救人的那些人。',
          bonus: -1,
        }
      : {
          key: 'crowd',
          name: '百鬼 · 咒灵群',
          note: '上千只咒灵涌上东京与京都的街头。你不必打赢它们，只要活到天亮。',
          bonus: 0,
        }
  if (evId === 'ev2')
    return c.ev2 === 'ev2_c'
      ? {
          key: 'sorcerer',
          name: '来回收咒物的高专术师',
          note: '你想要那根手指，于是挡在你面前的是来收回它的人。',
          bonus: -1,
        }
      : {
          key: 'object',
          name: '少年院里的特级咒物',
          note: '那根手指化成的东西，正从走廊尽头爬过来。',
          bonus: 0,
        }
  if (evId === 'ev3')
    return c.ev3 === 'ev3_d' || c.ev3 === 'ev3_e'
      ? {
          key: 'sorcerer',
          name: '涩谷里的咒术师',
          note: '那一夜你在另一侧，挡路的是穿制服的那些人。',
          bonus: 0,
        }
      : c.ev3 === 'ev3_c'
        ? {
            key: 'crowd',
            name: '逃命路上撞见的咒灵',
            note: '你只是来看万圣节人潮的普通人，但它还是找到了你。',
            bonus: -2,
          }
        : {
            key: 'curse',
            name: '涩谷的特级咒灵',
            note: '真人、漏瑚、花御——那一夜的特级是成群出现的。',
            bonus: 2,
          }
  if (evId === 'ev4')
    return c.ev4 === 'ev4_d'
      ? {
          key: 'sorcerer',
          name: '闯进结界的术师',
          note: '你是摆棋的人，所以你的对手是来掀桌的人。',
          bonus: -1,
        }
      : {
          key: 'player',
          name: '结界内的玩家',
          note: '杀戮即得分。对面那个人同样懂这条规则。',
          bonus: 0,
        }
  return c.battleSide === 'bs_sukuna' || c.ev5 === 'ev5_c'
    ? {
        key: 'sorcerer',
        name: '讨伐宿傩的众人',
        note: '你站在那两张脸的一侧，于是挡在你面前的是剩下的所有人。',
        bonus: 1,
      }
    : c.ev5 === 'ev5_b'
      ? {
          key: 'crowd',
          name: '溢出结界的余波',
          note: '你没能进入战场，但空中落下来的东西照样会杀人。',
          bonus: -2,
        }
      : {
          key: 'sukuna',
          name: '两面宿傩',
          note: '那一天的天空属于他。你能做的只有撑住。',
          bonus: 3,
        }
}
/* 事件战的「分差」：演出过就用真实累计；简报模式则用战力对事件难度估算 */
export function boutDiffOf(c: ResultContext, evId: string): number {
  const b = getState().battle
  if (b.bout === evId) return b.diff
  const n = evId.slice(2)
  const foe = boutFoe(evId, c)
  return Math.round(power(c) / 8) - (BOUT_DIFF[n] || 5) - (foe.bonus || 0)
}
export function boutRoundsStage(evId: string): Stage {
  const n = evId.slice(2),
    def = eventDefinition(evId)
  const o1 = 'br' + n + '_1',
    o2 = 'br' + n + '_2',
    o3 = 'br' + n + '_3'
  return {
    id: 'br' + n,
    name: '「' + def.name + '」· 交手回合数',
    kind: 'battle',
    tag: '事件战',
    desc:
      '你在「' +
      def.title +
      '」这一战里与对手交手几次。事件战不会拖太久——一两次碰撞往往就分出生死。',
    options: [
      { id: o1, s: '一击', label: '一击 · 一次交手', base: 1.5, hint: '一次碰撞，胜负立判。' },
      { id: o2, s: '二回合', label: '二回合', base: 1.4, hint: '你来我往两次。' },
      { id: o3, s: '三回合', label: '三回合', base: 0.9, hint: '打到第三回合，双方都开始见底。' },
    ],
    rules: [
      {
        name: '你足够强 · 打得久一点',
        when: (c: ResultContext) => power(c) >= 65,
        apply: (w: Weights) => {
          w[o2] += 0.5
          w[o3] += 0.5
        },
      },
      {
        name: '咒力总量偏低 · 速战速决',
        when: (c: ResultContext) => RI(c, 'dim_ce') <= 2,
        apply: (w: Weights) => {
          w[o1] += 0.8
          w[o3] -= 0.4
        },
      },
      {
        name: '对手是宿傩本人 · 一击即分生死',
        when: (c: ResultContext) => evId === 'ev5' && boutFoe('ev5', c).key === 'sukuna',
        apply: (w: Weights) => {
          w[o1] += 0.7
          w[o3] -= 0.35
        },
      },
      {
        name: '幼童 / 老年 · 打不了太久',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag5',
        apply: (w: Weights) => {
          w[o1] += 0.6
          w[o3] -= 0.3
        },
      },
    ],
  }
}
export function boutDuelStage(evId: string): Stage {
  const n = evId.slice(2),
    def = eventDefinition(evId)
  return {
    id: 'ed' + n,
    name: '「' + def.name + '」· 战斗结算',
    kind: 'bout',
    tag: '事件战',
    desc: '这一场的结果。若你在此战中战死，后面的经历会全部变成缺席，你也不会再出现在最终决战里。',
    options: [
      { id: 'ed1', s: '压胜', label: '压胜 · 毫发无伤', base: 1.0, hint: '你几乎没让对方碰到。' },
      {
        id: 'ed2',
        s: '险胜',
        label: '险胜 · 带伤取胜',
        base: 1.5,
        hint: '你赢了，代价是几道会留很久的伤。',
      },
      {
        id: 'ed3',
        s: '脱身',
        label: '苦战脱身 · 没能赢但活着走了',
        base: 1.0,
        hint: '跑不丢人。丢人的是跑不掉。',
      },
      {
        id: 'ed4',
        s: '重伤',
        label: '重伤濒死 · 赢了半条命',
        base: 0.7,
        hint: '你赢了，但有一半的身体留在了那里。',
      },
      {
        id: 'ed5',
        s: '战死',
        label: '战死 · 没能起身',
        base: 0.2,
        hint: '你的咒力耗尽在最后一击之前。',
      },
    ],
    rules: [
      {
        name: '这一战打得不算惨 · 不会死在这里',
        when: (c: ResultContext) => boutDiffOf(c, evId) > -9,
        apply: (w: Weights) => {
          w.ed5 = 0
        },
      },
      {
        name: '交手被彻底压制',
        when: (c: ResultContext) => boutDiffOf(c, evId) <= -8,
        apply: (w: Weights) => {
          w.ed4 += 1.2
          w.ed5 += 2.8
          w.ed1 = 0
          w.ed2 = 0
        },
      },
      {
        name: '交手落入下风',
        when: (c: ResultContext) => boutDiffOf(c, evId) <= -3 && boutDiffOf(c, evId) > -8,
        apply: (w: Weights) => {
          w.ed3 += 1.6
          w.ed4 += 0.8
          w.ed5 += 0.4
        },
      },
      {
        name: '势均力敌',
        when: (c: ResultContext) => Math.abs(boutDiffOf(c, evId)) < 3,
        apply: (w: Weights) => {
          w.ed2 += 0.8
          w.ed3 += 1.2
          w.ed4 += 0.6
        },
      },
      {
        name: '交手小胜',
        when: (c: ResultContext) => boutDiffOf(c, evId) >= 3 && boutDiffOf(c, evId) < 6,
        apply: (w: Weights) => {
          w.ed1 += 1.0
          w.ed2 += 1.6
        },
      },
      {
        name: '交手占优',
        when: (c: ResultContext) => boutDiffOf(c, evId) >= 6,
        apply: (w: Weights) => {
          w.ed1 += 2.6
          w.ed2 += 0.5
        },
      },
      {
        name: '战力太低 · 这一战可能就是终点',
        when: (c: ResultContext) => power(c) < 28,
        apply: (w: Weights) => {
          w.ed5 += 0.7
          w.ed1 -= 0.4
        },
      },
      {
        name: '凡人之躯 · 禁不起一次失误',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.ed5 += 0.9
          w.ed1 -= 0.5
        },
      },
      {
        name: '对手是宿傩本人 · 活着就是胜利',
        when: (c: ResultContext) => evId === 'ev5' && boutFoe('ev5', c).key === 'sukuna',
        apply: (w: Weights) => {
          w.ed5 += 0.8
          w.ed3 += 0.8
          w.ed1 -= 0.6
        },
      },
      {
        name: '你只是被卷入的市民',
        when: (c: ResultContext) => evId === 'ev3' && c.ev3 === 'ev3_c',
        apply: (w: Weights) => {
          w.ed3 += 1.2
          w.ed5 += 0.6
          w.ed1 -= 0.4
        },
      },
      {
        name: '六眼 / SS 以上 · 事件战几乎不会有事',
        when: (c: ResultContext) => c.gift === 'gift_six' || c.grade === 'g7' || c.grade === 'g8',
        apply: (w: Weights) => {
          w.ed1 += 0.8
          w.ed5 -= 0.5
        },
      },
    ],
  }
}
/* 还有没有「新的技术」可学（把技能轮的主要门槛复算一遍，避免抽到「学会新技能」却没东西可学） */
export function learnableCount(c: ResultContext): number {
  const owned = chosenSkills(c)
  let n = 0
  ;(SKILL_DEFS || []).forEach((s) => {
    if (owned.indexOf(s.id) >= 0) return
    if (
      ['t2', 't4', 't5'].indexOf(c.talent) < 0 &&
      ['sk_extreme', 'sk_spread', 'sk_jutsurev', 'sk_resonance'].indexOf(s.id) >= 0
    )
      return
    if (
      c.talent === 't6' &&
      [
        'sk_reverse',
        'sk_revout',
        'sk_jutsurev',
        'sk_black',
        'sk_summon',
        'sk_extreme',
        'sk_spread',
        'sk_resonance',
        'sk_shadow',
      ].indexOf(s.id) >= 0
    )
      return
    if (RI(c, 'dim_ct') < 4 && s.id === 'sk_black') return
    if (c.talent !== 't5' && RI(c, 'dim_ct') < 5 && ['sk_reverse', 'sk_revout'].indexOf(s.id) >= 0)
      return
    if (!(c.talent === 't4' || c.origin === 'o4') && s.id === 'sk_summon') return
    if (c.technique !== 'tc_shadow' && s.id === 'sk_shadow') return
    if (c.domain !== 'd2' && s.id === 'sk_spread') return
    if (RI(c, 'dim_in') < 3 && s.id === 'sk_puppet') return
    if (c.vowGate === 'vow_no' && ['sk_bind', 'sk_loan'].indexOf(s.id) >= 0) return
    if (c.vowGate !== 'vow_yes' && s.id === 'sk_loan') return
    n++
  })
  return n
}
export function boutGrowthStage(evId: string): Stage {
  const n = evId.slice(2),
    def = eventDefinition(evId)
  return {
    id: 'gr' + n,
    name: '「' + def.name + '」之后 · 是否有所成长',
    kind: 'growth',
    tag: '战后',
    desc: '活过「' + def.name + '」之后，你身上留下了什么。',
    options: [
      {
        id: 'gr_skill',
        s: '学会新技能',
        label: '在生死之间学会了新的技术',
        base: 1.3,
        hint: '人只在濒死时长本事。',
      },
      {
        id: 'gr_evolve',
        s: '术式进化',
        label: '术式本身进化了',
        base: 0.8,
        hint: '同一套术式，又长出了一层。',
      },
      {
        id: 'gr_rank',
        s: '等级提升',
        label: '实力精进（等级提升一档）',
        base: 0.9,
        hint: '你被重新评定了一次。',
      },
      {
        id: 'gr_nothing',
        s: '什么也没变',
        label: '什么也没变，只是活下来了',
        base: 1.1,
        hint: '活下来本身就已经很多了。',
      },
      {
        id: 'gr_lose',
        s: '失去了什么',
        label: '失去了某样东西',
        base: 0.7,
        hint: '咒具、术式、或者某个人。',
      },
    ],
    rules: [
      {
        name: '无咒力凡人难以进化术式',
        when: (c: ResultContext) => c.talent === 't6',
        apply: (w: Weights) => {
          w.gr_evolve = 0
          w.gr_rank -= 0.4
        },
      },
      {
        name: '无术式者谈不上术式进化',
        when: (c: ResultContext) => ['t1', 't3'].indexOf(c.talent) >= 0,
        apply: (w: Weights) => {
          w.gr_evolve = 0
        },
      },
      {
        name: '智谋 S 以上更易把经验变成技术',
        when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
        apply: (w: Weights) => {
          w.gr_skill += 0.8
        },
      },
      {
        name: '本场压胜 · 未必学到东西',
        when: (c: ResultContext) => c['ed' + n] === 'ed1',
        apply: (w: Weights) => {
          w.gr_nothing += 1.0
        },
      },
      {
        name: '险胜 / 重伤 · 生死之间长本事',
        when: (c: ResultContext) => ['ed2', 'ed4'].indexOf(c['ed' + n]) >= 0,
        apply: (w: Weights) => {
          w.gr_skill += 1.0
          w.gr_rank += 0.4
        },
      },
      {
        name: '只是脱身 · 更可能失去什么',
        when: (c: ResultContext) => c['ed' + n] === 'ed3',
        apply: (w: Weights) => {
          w.gr_lose += 1.0
          w.gr_rank -= 0.3
        },
      },
      {
        name: '年少者学得更快',
        when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag2',
        apply: (w: Weights) => {
          w.gr_skill += 0.5
        },
      },
      {
        name: '已经没有新的技术可学',
        when: (c: ResultContext) => learnableCount(c) === 0,
        apply: (w: Weights) => {
          w.gr_skill = 0
        },
      },
    ],
  }
}
export function boutSkillStage(evId: string): Stage {
  const n = evId.slice(2),
    def = eventDefinition(evId)
  const st = skillStageFor('g' + n)
  st.name = '「' + def.name + '」之后习得的技术'
  return st
}
export function boutLossStage(evId: string): Stage {
  const n = evId.slice(2),
    def = eventDefinition(evId)
  return Object.assign({}, LOSS, {
    id: 'ls' + n,
    name: '「' + def.name + '」· 你失去了什么',
    desc: '活下来是要付账的。',
  })
}
/* 在某场事件战中战死：后面的经历全部缺席，最终决战也不会再有你 */
export function deadAt(c: ResultContext): string | null {
  for (const id of BOUT_EVENTS) {
    if (c['ed' + id.slice(2)] === 'ed5') return id
  }
  return null
}
export function deadBefore(c: ResultContext, evId: string): boolean {
  const d = deadAt(c)
  if (!d) return false
  return BOUT_EVENTS.indexOf(d) < BOUT_EVENTS.indexOf(evId) || (evId === 'ev6' && !!d)
}

export function priorDead(c: ResultContext): boolean {
  return Object.keys(c).some((k) => k.indexOf('abs_') === 0 && String(c[k]).slice(-5) === '_dead')
}
export function makeEventStage(def: EventDefinition): Stage {
  const rules = def.rules.slice()
  const st: Stage = {
    id: def.id,
    name: def.name,
    kind: 'event',
    tag: '经历',
    title: def.title,
    desc: def.desc,
    eraIdx: def.eraIdx,
    options: def.opts.map((o) => ({
      id: def.id + '_' + o.k,
      s: o.s,
      label: o.label,
      base: o.base,
      hint: o.hint,
    })),
    rules,
  }
  const myIdx = EVENT_DEFS.indexOf(def)
  EVENT_DEFS.filter((_, i) => i < myIdx).forEach((d) => {
    rules.push({
      name: '在「' + d.name + '」中已缺席',
      when: (c: ResultContext) => c[d.id] === d.id + '_abs',
      apply: (w: Weights) => {
        w[def.id + '_abs'] += 1.6
        w[def.id + '_a'] -= 0.5
      },
    })
  })
  rules.push({
    name: '你已经死在某个时点',
    when: (c: ResultContext) => priorDead(c),
    apply: (w: Weights) => {
      Object.keys(w).forEach((k) => {
        if (k !== def.id + '_abs') w[k] = 0
      })
      w[def.id + '_abs'] += 6
    },
  })
  rules.push({
    name: '你已在更早的战斗中战死',
    when: (c: ResultContext) => deadBefore(c, def.id),
    apply: (w: Weights) => {
      Object.keys(w).forEach((k) => {
        if (k !== def.id + '_abs') w[k] = 0
      })
      w[def.id + '_abs'] += 8
    },
  })
  return st
}
export function absenceStage(eventId: string): Stage {
  const def = EVENT_DEFS.find((d) => d.id === eventId)
  const evName = def ? def.name : '那个时点'
  const idOf = (k: string): string => 'abs_' + eventId + '_' + k
  return {
    id: 'abs_' + eventId,
    name: '缺席原因 · ' + evName,
    kind: 'abs',
    tag: '缺席',
    desc: '你在「' + evName + '」里缺席。那是为什么？',
    options: [
      {
        id: idOf('mission'),
        s: '别处任务',
        label: '在别处执行任务',
        base: 1.4,
        hint: '同一天，别的地方也需要有人去死。',
      },
      {
        id: idOf('sealed'),
        s: '被封印',
        label: '被封印在某口箱子里',
        base: 0.5,
        hint: '肉体还在，时间停了。',
      },
      {
        id: idOf('dead'),
        s: '已死',
        label: '已经死了（不是在那场战斗里）',
        base: 0.8,
        hint: '你在别处、别的时间，先行退场。',
      },
      {
        id: idOf('flee'),
        s: '逃亡',
        label: '逃亡 · 被通缉',
        base: 0.7,
        hint: '你躲起来了，而世界照常运转。',
      },
      {
        id: idOf('hurt'),
        s: '重伤',
        label: '重伤昏迷 / 住院',
        base: 0.9,
        hint: '你在病床上听说了那一天的事。',
      },
      {
        id: idOf('unborn'),
        s: '未出生',
        label: '那时你还不存在',
        base: 0.4,
        hint: '对咒灵而言是尚未聚形，对人而言是尚未降生。',
      },
      {
        id: idOf('outside'),
        s: '被隔绝',
        label: '被结界隔绝在外',
        base: 0.6,
        hint: '你就在外面，进不去，也听不见。',
      },
    ],
    rules: [
      {
        name: '幼童 · 更可能尚未长成',
        when: (c: ResultContext) => c.age === 'ag1',
        apply: (w: Weights) => {
          w[idOf('unborn')] += 1.2
          w[idOf('mission')] -= 0.5
        },
      },
      {
        name: '老年 · 更容易先走一步',
        when: (c: ResultContext) => c.age === 'ag5',
        apply: (w: Weights) => {
          w[idOf('dead')] += 1.0
          w[idOf('hurt')] += 0.6
        },
      },
      {
        name: '咒灵之身',
        when: (c: ResultContext) => c.origin === 'o4',
        apply: (w: Weights) => {
          w[idOf('unborn')] += 1.0
          w[idOf('hurt')] = 0
        },
      },
      {
        name: '宿傩阵营 / 咒诅师 · 多为逃亡',
        when: (c: ResultContext) => ['f4', 'f6'].indexOf(c.faction) >= 0,
        apply: (w: Weights) => {
          w[idOf('flee')] += 1.3
        },
      },
      {
        name: '隶属高专 · 多为任务',
        when: (c: ResultContext) => ['f1', 'f2'].indexOf(c.faction) >= 0,
        apply: (w: Weights) => {
          w[idOf('mission')] += 1.2
        },
      },
    ],
  }
}

/* =====================================================================
   战斗
   ===================================================================== */
export const OPPONENT: Record<string, string> = {
  b1: '五条悟',
  b2: '乙骨忧太与祈本里香',
  b3: '虎杖悠仁',
  b4: '伏黑惠',
  b5: '钉崎野蔷薇',
  b6: '禅院真希',
  b7: '狗卷棘与熊猫',
  b8: '羂索',
  b9: '伏黑甚尔',
  b10: '两面宿傩',
  b11: '天元的试炼',
  b12: '你的同期',
  b13: '一只无名特级咒灵',
}
export const OPPONENT_NOTE: Record<string, string> = {
  b1: '你不可能赢他，你只能活下来',
  b2: '纯粹的咒力洪流',
  b3: '他不想杀你，但他会打到你说实话',
  b4: '十种影法术与他的决意',
  b5: '她会把你的「位置」当作弱点',
  b6: '没有咒力，却能砍穿一切',
  b7: '咒言与意外的强韧',
  b8: '他准备了千年，你只是他的一步棋',
  b9: '他会把你的术式连同自信一起夺走',
  b10: '在这个人面前，「险胜」已是奇迹',
  b11: '不是胜负，是你要不要成为结界的一部分',
  b12: '你们本该并肩，如今只能有一个站起来',
  b13: '没有人会为你收尸，也没有人会替你挡一下',
}
export const OPP_BONUS: Record<string, number> = {
  b1: 5,
  b10: 5,
  b9: 3,
  b2: 3,
  b8: 2,
  b11: 3,
  b13: 1,
  b6: 0,
  b5: -1,
  b7: -1,
  b12: -1,
  b3: 0,
  b4: 0,
}
export const ENEMY_KIT: Record<string, KitOption[]> = {
  b10: [
    { k: 'slash', s: '斩击「解」', label: '斩击「解」', base: 1.6, pw: 8 },
    { k: 'open', s: '「开」火焰', label: '「开」· 火焰', base: 1.2, pw: 9 },
    { k: 'domain', s: '伏魔御廚子', label: '展开领域「伏魔御廚子」', base: 1.0, pw: 11 },
    { k: 'black', s: '黑闪', label: '黑闪', base: 0.7, pw: 8 },
    { k: 'heal', s: '受肉回复', label: '受肉 · 回复', base: 0.5, pw: 4 },
    { k: 'tai', s: '肉搏', label: '肉搏', base: 0.8, pw: 5 },
  ],
  b1: [
    { k: 'inf', s: '无量空处', label: '展开领域「无量空处」', base: 1.1, pw: 12 },
    { k: 'purple', s: '茈', label: '茈（虚式）', base: 1.1, pw: 10 },
    { k: 'red', s: '赫', label: '术式顺转「赫」', base: 1.3, pw: 6 },
    { k: 'blue', s: '苍', label: '术式反转「苍」', base: 1.3, pw: 6 },
    { k: 'black', s: '黑闪', label: '黑闪', base: 0.7, pw: 8 },
    { k: 'tai', s: '无下限肉搏', label: '无下限 · 肉搏', base: 1.0, pw: 6 },
  ],
  b9: [
    { k: 'gear', s: '咒具·游云', label: '咒具 · 游云', base: 1.3, pw: 8 },
    { k: 'tai', s: '肉体碾压', label: '肉体碾压', base: 1.5, pw: 8 },
    { k: 'strip', s: '拆解术式', label: '拆解你的术式', base: 0.8, pw: 6 },
    { k: 'ambush', s: '突袭', label: '从死角突袭', base: 1.0, pw: 7 },
  ],
  b3: [
    { k: 'tai', s: '迳庭拳', label: '体术 · 迳庭拳', base: 1.5, pw: 6 },
    { k: 'div', s: '黑闪', label: '黑闪', base: 0.8, pw: 8 },
    { k: 'soul', s: '灵魂打击', label: '打击灵魂（宿傩的容器）', base: 0.9, pw: 8 },
    { k: 'guard', s: '防御', label: '防御 · 承受', base: 0.7, pw: 2 },
  ],
  b2: [
    { k: 'rica', s: '里香猛攻', label: '祈本里香 · 猛攻', base: 1.6, pw: 9 },
    { k: 'copy', s: '模仿术式', label: '里香模仿的术式', base: 1.0, pw: 7 },
    { k: 'black', s: '黑闪', label: '黑闪', base: 0.6, pw: 7 },
    { k: 'tai', s: '肉搏', label: '肉搏', base: 0.8, pw: 5 },
  ],
  b8: [
    { k: 'summon', s: '驱使咒灵', label: '释放手中咒灵', base: 1.5, pw: 8 },
    { k: 'plan', s: '陷阱', label: '预先布置的陷阱', base: 1.2, pw: 7 },
    { k: 'domain', s: '领域', label: '展开领域', base: 0.8, pw: 11 },
    { k: 'tai', s: '体术', label: '体术', base: 0.8, pw: 4 },
  ],
  b6: [
    { k: 'gear', s: '咒具斩击', label: '咒具 · 斩击', base: 1.5, pw: 8 },
    { k: 'tai', s: '体术', label: '体术连击', base: 1.3, pw: 6 },
    { k: 'ambush', s: '突袭', label: '一瞬的突袭', base: 0.9, pw: 7 },
  ],
  b13: [
    { k: 'flow', s: '咒力奔流', label: '咒力奔流', base: 1.5, pw: 7 },
    { k: 'devour', s: '吞噬', label: '吞噬 · 同化', base: 1.1, pw: 9 },
    { k: 'domain', s: '领域', label: '展开领域', base: 0.7, pw: 10 },
  ],
}
export const GENERIC_KIT: KitOption[] = [
  { k: 'jutsu', s: '术式攻击', label: '术式攻击', base: 1.6, pw: 5 },
  { k: 'domain', s: '展开领域', label: '展开领域', base: 0.8, pw: 9 },
  { k: 'gear', s: '咒具', label: '咒具攻击', base: 1.0, pw: 4 },
  { k: 'black', s: '黑闪', label: '黑闪', base: 0.6, pw: 7 },
  { k: 'tai', s: '体术', label: '体术连击', base: 1.2, pw: 4 },
  { k: 'guard', s: '防御', label: '防御 · 回避', base: 0.8, pw: 2 },
]
/* 宿傩「原身形态」专属招式组：四臂、双面，火力全面升级 */
export const SUKUNA_TRUE_KIT: KitOption[] = [
  { k: 'slash', s: '斩击「解」', label: '四臂斩击「解」', base: 1.5, pw: 9 },
  { k: 'open', s: '火焰箭「竈」', label: '「开」· 火焰箭「竈」', base: 1.2, pw: 11 },
  {
    k: 'domain',
    s: '伏魔御廚子（再展开）',
    label: '再次展开领域「伏魔御廚子」',
    base: 0.9,
    pw: 13,
  },
  { k: 'black', s: '黑闪', label: '黑闪', base: 0.8, pw: 9 },
  { k: 'heal', s: '受肉 · 完全回复', label: '受肉 · 完全回复', base: 0.5, pw: 6 },
  { k: 'tai', s: '四臂肉搏', label: '四臂 · 肉搏', base: 0.8, pw: 7 },
]

export const ROUND_NUM: Record<string, number> = { r1: 1, r2: 2, r3: 3, r4: 4, r5: 5 }
export const BATTLE_ROUNDS: Stage = {
  id: 'battleRounds',
  name: '决战 · 交手回合数',
  kind: 'battle',
  tag: '交战',
  skipIf: (c) => !!deadAt(c),
  skipText: '你没能活到最终决战 —— 此轮不存',
  desc: '你和对手交手多少次（1–5 回合）。每一次交手，双方都要各抽一次「这一手打什么」。评定为 SS / EX 者会额外自动多打一个回合（上限仍为五回合）。',
  options: [
    {
      id: 'r1',
      s: '一击',
      label: '一击定胜负',
      base: 0.55,
      hint: '只交手一次。不是你倒下，就是他倒下。',
    },
    { id: 'r2', s: '二回合', label: '二回合', base: 1.0, hint: '一次试探，一次定生死。' },
    {
      id: 'r3',
      s: '三回合',
      label: '三回合',
      base: 1.95,
      hint: '你来我往三次——最常见的交手长度。',
    },
    { id: 'r4', s: '四回合', label: '四回合', base: 1.25, hint: '打到第四次，双方都开始出血。' },
    { id: 'r5', s: '五回合', label: '五回合', base: 1.0, hint: '打到第五次，双方的咒力都见了底。' },
  ],
  rules: [
    {
      name: '对手是宿傩或五条 · 一击即分生死',
      when: (c: ResultContext) => ['b1', 'b10'].indexOf(oppOf(c)) >= 0,
      apply: (w: Weights) => {
        w.r1 += 0.9
        w.r4 -= 0.15
        w.r5 -= 0.2
      },
    },
    {
      name: '你足够强 · 能撑更长',
      when: (c: ResultContext) => power(c) >= 65,
      apply: (w: Weights) => {
        w.r3 += 0.5
        w.r4 += 0.5
        w.r5 += 0.4
      },
    },
    {
      name: '体质 S 以上 · 打得起消耗战',
      when: (c: ResultContext) => RI(c, 'dim_bd') >= 5,
      apply: (w: Weights) => {
        w.r4 += 0.5
        w.r5 += 0.6
      },
    },
    {
      name: '咒力总量偏低 · 拖不得',
      when: (c: ResultContext) => RI(c, 'dim_ce') <= 2,
      apply: (w: Weights) => {
        w.r1 += 0.7
        w.r4 -= 0.2
        w.r5 = 0
      },
    },
    {
      name: '评定 SS / EX · 自动追加一回合（上限五）',
      when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
      apply: (w: Weights) => {
        w.r1 += 0.5
        w.r2 += 0.7
        w.r3 += 0.6
        w.r4 += 0.5
        w.r5 -= 0.2
      },
    },
    {
      name: '幼童或老年 · 打不了太久',
      when: (c: ResultContext) => c.age === 'ag1' || c.age === 'ag5',
      apply: (w: Weights) => {
        w.r1 += 0.7
        w.r4 -= 0.3
        w.r5 -= 0.4
      },
    },
    {
      name: '你把命押在了一瞬间',
      when: (c: ResultContext) => c.effort === 'ef_genius' || c.gift === 'gift_six',
      apply: (w: Weights) => {
        w.r2 += 0.4
        w.r3 += 0.3
      },
    },
  ],
}

export function playerActionStage(idx: string, round: number, extra: boolean): Stage {
  const c = getState().results
  const bonus = Math.round(power(c) / 20) + (EFFORT_BONUS[c.effort] || 0) // 综合战力 + 努力程度 → 每一击的加成
  const has = (id: string): boolean => chosenSkills(c).indexOf(id) >= 0 || c['skill_new'] === id
  const gearList = Object.keys(c)
    .filter((k) => /^gear\d+$/.test(k))
    .map((k) => BY[c[k]] && BY[c[k]].s)
    .filter(Boolean)
    .join('／')
  const opts: WheelOption[] = []
  opts.push({
    id: 'act' + idx + '_tai',
    s: '体术',
    label: '体术连击',
    base: 1.4,
    pw: 4 + Math.max(0, RI(c, 'dim_tj') - 2),
    hint: '不用咒力的最原始打法。',
  })
  opts.push({
    id: 'act' + idx + '_flow',
    s: '咒力奔流',
    label: '咒力奔流',
    base: 1.2,
    pw: 3 + Math.max(0, RI(c, 'dim_ce') - 3),
    hint: '把咒力直接砸过去。',
  })
  opts.push({
    id: 'act' + idx + '_guard',
    s: '防御',
    label: '防御 · 回避',
    base: 0.9,
    pw: 3,
    hint: '先活下来，再谈别的。',
  })
  const jutsuLabel = c.technique ? techLabel(c) : getState().jutsuName || '顺转'
  const domNameTxt = c.domainName ? domLabel(c) : getState().domainName || '领域'
  if (['t2', 't4', 't5'].indexOf(c.talent) >= 0)
    opts.push({
      id: 'act' + idx + '_jutsu',
      s: '术式',
      label: '术式 · ' + jutsuLabel,
      base: 1.6,
      pw: 7 + bonus,
      hint: '释放你刻在肉体上的那套规则。',
    })
  if (['t2', 't4', 't5'].indexOf(c.talent) >= 0)
    opts.push({
      id: 'act' + idx + '_jutsurev',
      s: '术式反转',
      label: '术式反转 · ' + jutsuLabel + '（逆）',
      base: 0.7,
      pw: 9 + bonus,
      hint: '把术式的顺转反转，打出性质相反的一击。',
    })
  if (c.domain === 'd2')
    opts.push({
      id: 'act' + idx + '_domain',
      s: '领域展开',
      label: '展开领域「' + domNameTxt + '」',
      base: 1.1,
      pw: 14,
      hint: '在这个圆里，你的术式必然命中。',
    })
  if (has('sk_extreme'))
    opts.push({
      id: 'act' + idx + '_extreme',
      s: '极之番',
      label: '极之番 · ' + jutsuLabel + '（最大输出）',
      base: 0.8,
      pw: 11 + bonus,
      hint: '把术式压到极限的一击。',
    })
  if (has('sk_resonance'))
    opts.push({
      id: 'act' + idx + '_reso',
      s: '芻灵共鸣',
      label: '芻灵咒法 · 共鸣',
      base: 0.8,
      pw: 9 + bonus,
      hint: '把伤害经由媒介直接传导进对方体内。',
    })
  if (has('sk_black'))
    opts.push({
      id: 'act' + idx + '_black',
      s: '黑闪',
      label: '黑闪（命中后可追击两次）',
      base: 1.35,
      pw: 10 + bonus,
      hint: '0.000001 秒的误差。命中即翻倍，并追加两次出招。',
    })
  if (has('sk_gear') && gearList)
    opts.push({
      id: 'act' + idx + '_gear',
      s: '咒具',
      label: '咒具 · ' + gearList,
      base: 1.2,
      pw: 7 + bonus,
      hint: '你灌注咒力做出来的东西。',
    })
  if (has('sk_summon') || c.talent === 't4')
    opts.push({
      id: 'act' + idx + '_summon',
      s: '召唤咒灵',
      label: '召唤咒灵',
      base: 1.0,
      pw: 6 + bonus,
      hint: '把手里的咒灵放出去。',
    })
  if (has('sk_shadow'))
    opts.push({
      id: 'act' + idx + '_shiki',
      s: '十种影',
      label: '十种影法术 · 式神',
      base: 1.0,
      pw: 8 + bonus,
      hint: '从影里唤出你调伏过的式神。',
    })
  if (has('sk_puppet'))
    opts.push({
      id: 'act' + idx + '_puppet',
      s: '咒骸',
      label: '傀儡咒术 · 咒骸替身',
      base: 0.8,
      pw: 6 + bonus,
      hint: '让咒骸替你挡下这一击，你则从另一侧出手。',
    })
  if (has('sk_reverse') || c.talent === 't5')
    opts.push({
      id: 'act' + idx + '_rev',
      s: '反转术式',
      label: '反转术式 · 治疗自己',
      base: 0.6,
      pw: 6,
      hint: '负负得正，把断掉的地方接回去。',
    })
  if (has('sk_revout'))
    opts.push({
      id: 'act' + idx + '_revout',
      s: '反转外放',
      label: '反转术式 · 外放（对咒灵特攻）',
      base: 0.7,
      pw: 9 + bonus,
      hint: '把正咒力直接喷出去——对咒灵是毁灭性的。',
    })
  if (has('sk_simple') || c.domain !== 'd0')
    opts.push({
      id: 'act' + idx + '_simple',
      s: '简易领域',
      label: '简易领域（抵消必中）',
      base: 0.8,
      pw: 5,
      hint: '撑起 0.5 秒的简易领域，抵消对方领域的必中。',
    })
  if (has('sk_bind') || has('sk_loan'))
    opts.push({
      id: 'act' + idx + '_vow',
      s: '束缚',
      label: '立下束缚 · 以代价换输出',
      base: 0.7,
      pw: 8 + bonus,
      hint: '给自己加锁，换取同等的回报。',
    })
  if (has('sk_word'))
    opts.push({
      id: 'act' + idx + '_word',
      s: '咒言',
      label: '咒言',
      base: 0.7,
      pw: 7,
      hint: '说出口的话强制现实。',
    })
  if (has('sk_fall'))
    opts.push({
      id: 'act' + idx + '_fall',
      s: '落花之情',
      label: '落花之情 · 自动迎击',
      base: 0.7,
      pw: 6,
      hint: '在 0.1 秒内自动反击侵入者。',
    })
  if (has('sk_spread'))
    opts.push({
      id: 'act' + idx + '_spread',
      s: '领域展延',
      label: '领域展延 · 揉进动作里',
      base: 0.6,
      pw: 9,
      hint: '把领域揉进武术动作的一击。',
    })
  if (has('sk_barrier'))
    opts.push({
      id: 'act' + idx + '_barrier',
      s: '结界术',
      label: '结界术 · 隔绝',
      base: 0.6,
      pw: 4,
      hint: '用结界把战场切开。',
    })
  /* 宿傩专项：持有「狱门疆」时，一生只有一次的封印一击 */
  if (
    oppOf(c) === 'b10' &&
    Object.keys(c).some((k) => /^gear\d+$/.test(k) && c[k] === 'gr_prison')
  ) {
    opts.push({
      id: 'act' + idx + '_prison',
      s: '狱门疆',
      label: '狱门疆 · 封印（一生仅一次）',
      base: 1.0,
      pw: 22 + bonus,
      hint: '把「两面宿傩」关进那只独眼面具里——这需要他站在你面前六米内、一分钟不动。用掉就没有了。',
    })
  }
  return {
    id: 'act' + idx,
    kind: 'atk',
    side: 'p',
    round,
    extra: !!extra,
    tag: '战斗',
    name: (extra ? '追击 · 第 ' : '第 ') + round + ' 回合 · 你的出手',
    desc: '你这一手要打什么。出招威力会累计，并在结算轮换算成胜率。',
    options: opts,
    rules: [
      {
        name: '领域已经用过一次',
        when: () => getState().battle.domainUsed,
        apply: (w: Weights) => {
          if (w['act' + idx + '_domain'] !== undefined) w['act' + idx + '_domain'] = 0
        },
      },
      {
        name: '咒力见底 · 用不出大招',
        when: () => getState().battle.ce <= 0,
        apply: (w: Weights) => {
          ;['_domain', '_extreme', '_spread', '_rev'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] = 0
          })
        },
      },
      {
        name: '追击 · 只能追打',
        when: () => !!extra,
        apply: (w: Weights) => {
          if (w['act' + idx + '_domain'] !== undefined) w['act' + idx + '_domain'] = 0
          if (w['act' + idx + '_guard'] !== undefined) w['act' + idx + '_guard'] -= 0.5
          if (w['act' + idx + '_rev'] !== undefined) w['act' + idx + '_rev'] = 0
        },
      },
      {
        name: '咒力总量 S 以上 · 敢放大招',
        when: (c2) => RI(c2, 'dim_ce') >= 5,
        apply: (w: Weights) => {
          ;['_domain', '_extreme', '_jutsu'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.8
          })
        },
      },
      {
        name: '操控 S 以上 · 更容易黑闪',
        when: (c2) => RI(c2, 'dim_ct') >= 5,
        apply: (w: Weights) => {
          if (w['act' + idx + '_black'] !== undefined) w['act' + idx + '_black'] += 1.0
        },
      },
      {
        name: '智谋 S 以上 · 倾向束缚与结界',
        when: (c2) => RI(c2, 'dim_in') >= 5,
        apply: (w: Weights) => {
          ;['_vow', '_barrier'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.6
          })
        },
      },
      {
        name: '已受重伤 · 倾向治疗与防御',
        when: () => getState().battle.diff < -4,
        apply: (w: Weights) => {
          ;['_rev', '_guard', '_simple'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.9
          })
        },
      },
      {
        name: '性格冷静克制 · 更常防御与计算',
        when: (c2) => c2.personality === 'pe_calm',
        apply: (w: Weights) => {
          ;['_guard', '_simple', '_barrier', '_vow'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.7
          })
        },
      },
      {
        name: '性格热血冲动 · 更常硬碰硬',
        when: (c2) => c2.personality === 'pe_hot',
        apply: (w: Weights) => {
          ;['_tai', '_jutsu', '_domain', '_extreme', '_black'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.7
          })
        },
      },
      {
        name: '性格阴郁算计 · 更常束缚与咒具',
        when: (c2) => c2.personality === 'pe_dark',
        apply: (w: Weights) => {
          ;['_vow', '_gear', '_barrier', '_puppet'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.8
          })
        },
      },
      {
        name: '性格温柔执拗 · 更常治疗与承受',
        when: (c2) => c2.personality === 'pe_warm',
        apply: (w: Weights) => {
          ;['_rev', '_guard', '_simple'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.6
          })
        },
      },
      {
        name: '运气好 · 大招更容易打出来',
        when: (c2) => c2.luck === 'lk_EX' || c2.luck === 'lk_S',
        apply: (w: Weights) => {
          ;['_domain', '_extreme', '_black'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.8
          })
        },
      },
      {
        name: '运气差 · 大招容易打空',
        when: (c2) => c2.luck === 'lk_D' || c2.luck === 'lk_E',
        apply: (w: Weights) => {
          ;['_domain', '_extreme', '_black'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] -= 0.4
          })
          if (w['act' + idx + '_guard'] !== undefined) w['act' + idx + '_guard'] += 0.5
        },
      },
      {
        name: '天才型偷懒 · 只在关键处出手',
        when: (c2) => c2.effort === 'ef_genius',
        apply: (w: Weights) => {
          ;['_extreme', '_black', '_domain'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.7
          })
        },
      },
      {
        name: '自虐式修行 · 咒力更深',
        when: (c2) => c2.effort === 'ef_mad',
        apply: (w: Weights) => {
          ;['_jutsu', '_jutsurev', '_flow'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.5
          })
        },
      },
      {
        name: '狱门疆已经用掉了',
        when: () => getState().battle.prisonUsed,
        apply: (w: Weights) => {
          if (w['act' + idx + '_prison'] !== undefined) w['act' + idx + '_prison'] = 0
        },
      },
      {
        name: '对方领域不设外壁 · 简易领域只能减伤',
        when: (c2) => oppOf(c2) === 'b10',
        apply: (w: Weights) => {
          if (w['act' + idx + '_simple'] !== undefined) w['act' + idx + '_simple'] -= 0.35
        },
      },
      {
        name: '面对原身形态 · 你只能拼命',
        when: () => getState().battle.phase === 2,
        apply: (w: Weights) => {
          if (w['act' + idx + '_guard'] !== undefined) w['act' + idx + '_guard'] -= 0.3
          ;['_domain', '_extreme', '_black', '_prison'].forEach((s) => {
            if (w['act' + idx + s] !== undefined) w['act' + idx + s] += 0.5
          })
        },
      },
    ],
  }
}
export function enemyActionStage(idx: string, round: number): Stage {
  const opp = oppOf(getState().results)
  const phase2 = getState().battle.phase === 2
  const foe = getState().battle.foe || null
  const kit = foe
    ? boutKit(foe.key)
    : phase2 && opp === 'b10'
      ? SUKUNA_TRUE_KIT
      : ENEMY_KIT[opp] || GENERIC_KIT
  // 二番战：宿傩的种族加成减半、追加值减为 +1（他已经是一番战的手下败将，不该再叠满 buff）
  const bonus = foe
    ? (foe.bonus || 0) + Math.round(power(getState().results) / 62)
    : (phase2 ? Math.round((OPP_BONUS[opp] || 0) * 0.5) : OPP_BONUS[opp] || 0) +
      Math.round(power(getState().results) / 45) +
      (phase2 ? 1 : 0)
  const scale = 0.65 + power(getState().results) / 160 // 对手的强度随你的实力伸缩
  return {
    id: 'eact' + idx,
    kind: 'atk',
    side: 'e',
    round,
    tag: '战斗',
    name:
      '第 ' +
      round +
      ' 回合 · ' +
      (foe ? foe.name + '的出手' : phase2 ? '原身形态的出手' : '对手的出手'),
    desc:
      (foe ? foe.note + ' ' : phase2 ? '他撕开了受肉的躯壳，露出四只手与两张脸。' : '') +
      '对方这一手要打什么。',
    options: kit.map((o) => {
      const pw = Math.max(2, Math.round(o.pw * scale)) + bonus
      return {
        id: 'eact' + idx + '_' + o.k,
        s: o.s,
        label: o.label,
        base: o.base,
        pw,
        hint: '威力 ' + pw + '。',
      }
    }),
    rules: [
      {
        name: '对手已受创 · 转为保守',
        when: () => getState().battle.diff > 5,
        apply: (w: Weights) => {
          Object.keys(w).forEach((k) => {
            if (k.slice(-6) === '_guard' || k.slice(-5) === '_heal') w[k] += 1.0
          })
        },
      },
      {
        name: '对手占优 · 加大输出',
        when: () => getState().battle.diff < -5,
        apply: (w: Weights) => {
          Object.keys(w).forEach((k) => {
            if (k.slice(-7) === '_domain' || k.slice(-6) === '_black') w[k] += 0.8
          })
        },
      },
    ],
  }
}
export const DUEL: Stage = {
  id: 'duel',
  name: '决战 · 结算',
  kind: 'duel',
  tag: '生死',
  desc: '前面每一次交手的威力累计起来 —— 这就是你此刻的胜率。',
  options: [
    {
      id: 'w1',
      s: '压胜',
      label: '压胜 · 毫发无伤',
      base: 0.9,
      hint: '你从头到尾没有让对方碰到你。',
    },
    {
      id: 'w2',
      s: '险胜',
      label: '险胜 · 重伤存活',
      base: 1.35,
      hint: '你赢了，但有一半的身体留在了那里。',
    },
    {
      id: 'w3',
      s: '两败俱伤',
      label: '两败俱伤 · 同归于尽之姿',
      base: 0.85,
      hint: '你们一起倒下，只有一个人还能呼吸。',
    },
    { id: 'w4', s: '败走', label: '败走 · 活下来', base: 0.95, hint: '你逃了。这没什么可耻的。' },
    {
      id: 'w5',
      s: '战死',
      label: '战死 · 未能起身',
      base: 1.0,
      hint: '你的咒力耗尽在最后一击之前。',
    },
  ],
  rules: [
    {
      name: '交手占压倒优势',
      when: () => getState().battle.diff >= 10,
      apply: (w: Weights) => {
        w.w1 += 4.0
        w.w5 -= 0.5
        w.w4 -= 0.7
      },
    },
    {
      name: '交手形成碾压 · 胜负已无悬念',
      when: () => getState().battle.diff >= 24,
      apply: (w: Weights) => {
        w.w1 += 3.0
        w.w4 = 0.05
        w.w5 = 0.02
        w.w3 -= 0.5
      },
    },
    {
      name: '被彻底碾压 · 毫无还手之力',
      when: () => getState().battle.diff <= -24,
      apply: (w: Weights) => {
        w.w5 += 3.0
        w.w1 = 0.02
        w.w2 = 0.05
      },
    },
    {
      name: '交手占优',
      when: () => getState().battle.diff >= 4 && getState().battle.diff < 10,
      apply: (w: Weights) => {
        w.w1 += 1.6
        w.w2 += 1.3
        w.w5 -= 0.3
      },
    },
    {
      name: '交手势均力敌',
      when: () => getState().battle.diff > -4 && getState().battle.diff < 4,
      apply: (w: Weights) => {
        w.w2 += 0.8
        w.w3 += 1.1
        w.w4 += 0.6
      },
    },
    {
      name: '交手落入下风',
      when: () => getState().battle.diff <= -4 && getState().battle.diff > -10,
      apply: (w: Weights) => {
        w.w4 += 1.6
        w.w3 += 0.8
        w.w5 += 0.7
        w.w2 -= 0.5
      },
    },
    {
      name: '交手被彻底压制',
      when: () => getState().battle.diff <= -10,
      apply: (w: Weights) => {
        w.w5 += 4.0
        w.w4 += 1.0
        w.w2 -= 0.6
      },
    },
    {
      name: 'SS / EX 之力',
      when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
      apply: (w: Weights) => {
        w.w1 += 1.2
        w.w5 -= 0.4
      },
    },
    {
      name: 'E / D 级',
      when: (c: ResultContext) => c.grade === 'g1' || c.grade === 'g2',
      apply: (w: Weights) => {
        w.w5 += 1.2
        w.w1 -= 0.4
      },
    },
    {
      name: '能完整领域展开',
      when: (c: ResultContext) => c.domain === 'd2',
      apply: (w: Weights) => {
        w.w1 += 0.8
        w.w2 += 0.4
      },
    },
    {
      name: '对手是宿傩或五条',
      when: (c: ResultContext) => ['b10', 'b1'].indexOf(oppOf(c)) >= 0,
      apply: (w: Weights) => {
        w.w5 += 1.5
        w.w1 -= 0.6
        w.w3 += 0.7
        w.w4 += 0.5
      },
    },
    {
      name: '对手是同期或较易者',
      when: (c: ResultContext) => ['b5', 'b6', 'b7', 'b12'].indexOf(oppOf(c)) >= 0,
      apply: (w: Weights) => {
        w.w1 += 0.8
        w.w5 -= 0.3
      },
    },
    {
      name: '孤身一人 · 无人援手',
      when: (c: ResultContext) => c.bond === 'b13',
      apply: (w: Weights) => {
        w.w5 += 0.6
        w.w3 += 0.4
      },
    },
    {
      name: '体质 A 以上 · 更难被杀死',
      when: (c: ResultContext) => RI(c, 'dim_bd') >= 4,
      apply: (w: Weights) => {
        w.w5 -= 0.5
        w.w2 += 0.4
      },
    },
    {
      name: '涩谷 / 新宿的战场',
      when: (c: ResultContext) => c.era === 'e3' || c.era === 'e5',
      apply: (w: Weights) => {
        w.w5 += 0.5
      },
    },
    {
      name: '咒灵之身 · 被祓除即终结',
      when: (c: ResultContext) => c.origin === 'o4',
      apply: (w: Weights) => {
        w.w5 += 0.5
      },
    },
    {
      name: '运气 EX / S · 关键时刻总有转机',
      when: (c: ResultContext) => c.luck === 'lk_EX' || c.luck === 'lk_S',
      apply: (w: Weights) => {
        w.w1 += 0.8
        w.w2 += 0.6
        w.w5 -= 0.5
      },
    },
    {
      name: '运气 D / E · 该来的总会来',
      when: (c: ResultContext) => c.luck === 'lk_D' || c.luck === 'lk_E',
      apply: (w: Weights) => {
        w.w5 += 1.0
        w.w3 += 0.5
      },
    },
    {
      name: '努力 · 自虐式修行的底气',
      when: (c: ResultContext) => c.effort === 'ef_mad',
      apply: (w: Weights) => {
        w.w1 += 0.5
        w.w2 += 0.5
        w.w4 -= 0.3
      },
    },
    {
      name: '努力 · 躺平的代价',
      when: (c: ResultContext) => c.effort === 'ef_lazy',
      apply: (w: Weights) => {
        w.w4 += 0.6
        w.w5 += 0.4
      },
    },
    {
      name: '性格冷静克制 · 更会留手',
      when: (c: ResultContext) => c.personality === 'pe_calm',
      apply: (w: Weights) => {
        w.w2 += 0.5
        w.w4 += 0.4
        w.w5 -= 0.4
      },
    },
    {
      name: '性格热血冲动 · 更容易两头堵',
      when: (c: ResultContext) => c.personality === 'pe_hot',
      apply: (w: Weights) => {
        w.w1 += 0.4
        w.w3 += 0.5
        w.w5 += 0.3
      },
    },
    {
      name: '六眼 · 战斗几乎没有盲点',
      when: (c: ResultContext) => c.gift === 'gift_six',
      apply: (w: Weights) => {
        w.w1 += 0.9
        w.w2 += 0.5
        w.w5 -= 0.5
      },
    },
    {
      name: '双面四臂 · 两套战斗逻辑',
      when: (c: ResultContext) => c.gift === 'gift_arms',
      apply: (w: Weights) => {
        w.w1 += 0.8
        w.w2 += 0.4
      },
    },
    {
      name: '身上挂着束缚 · 增幅已生效',
      when: (c: ResultContext) => c.vowCount,
      apply: (w: Weights) => {
        w.w1 += 0.5
        w.w2 += 0.4
      },
    },
  ],
}
/* ---------- 宿傩专项：原身解放 · 二番战 ---------- */
export const SUKUNA_TRUE: Stage = {
  id: 'sukunaTrue',
  name: '宿傩 · 是否解放原身',
  kind: 'battle',
  tag: '二番战',
  desc: '你把他打倒了。但受肉只是一具躯壳——他真正的身体，有四只手、两张脸。这一轮决定他要不要把那副身体拿出来。',
  options: [
    {
      id: 'su_yes',
      s: '解放原身',
      label: '解放原身 · 二番战开始',
      base: 1.15,
      hint: '他笑着撕开那具借来的躯壳，露出四臂双面的真正形态。战斗从头再来一次。',
    },
    {
      id: 'su_no',
      s: '就此终结',
      label: '就此终结 · 他没有再站起来',
      base: 1.0,
      hint: '这一次是真的结束了。你打倒的，就是他的全部。',
    },
  ],
  rules: [
    {
      name: '你是压胜 · 他更有理由认真起来',
      when: () => getState().results.duel === 'w1',
      apply: (w: Weights) => {
        w.su_yes += 1.8
      },
    },
    {
      name: '你只是险胜 · 他也不过如此',
      when: () => getState().results.duel === 'w2',
      apply: (w: Weights) => {
        w.su_yes += 0.5
        w.su_no += 0.4
      },
    },
    {
      name: '你身上还有余力 · 他舍不得结束',
      when: (c: ResultContext) => RI(c, 'dim_ce') >= 5 || getState().battle.diff >= 8,
      apply: (w: Weights) => {
        w.su_yes += 0.7
      },
    },
    {
      name: '你已强弩之末 · 他也懒得再玩',
      when: () => getState().battle.ce <= 1 && getState().battle.diff < 6,
      apply: (w: Weights) => {
        w.su_no += 0.9
      },
    },
    {
      name: '你用狱门疆封住了他',
      when: () => getState().battle.prisonUsed,
      apply: (w: Weights) => {
        w.su_yes = 0.05
      },
    },
    {
      name: '你有六眼 · 看得出他还留了一手',
      when: (c: ResultContext) => c.gift === 'gift_six',
      apply: (w: Weights) => {
        w.su_yes += 0.5
      },
    },
    {
      name: '运气 EX / S · 或许这一次是真的',
      when: (c: ResultContext) => c.luck === 'lk_EX' || c.luck === 'lk_S',
      apply: (w: Weights) => {
        w.su_no += 0.6
      },
    },
    {
      name: '运气 E / D · 你知道的，他还没完',
      when: (c: ResultContext) => c.luck === 'lk_E' || c.luck === 'lk_D',
      apply: (w: Weights) => {
        w.su_yes += 0.8
      },
    },
  ],
}
export const BATTLE_ROUNDS2: Stage = {
  id: 'battleRounds2',
  name: '二番战 · 交手回合数',
  kind: 'battle',
  tag: '二番战',
  desc: '原身形态的宿傩站在你面前。新的战斗重新计数——你的咒力已所剩无几，但他也是。',
  options: BATTLE_ROUNDS.options,
  rules: [
    {
      name: '他不会让你速死 · 也舍不得速胜',
      when: () => true,
      apply: (w: Weights) => {
        w.r3 += 0.5
        w.r4 += 0.45
        w.r2 += 0.2
        w.r1 -= 0.15
      },
    },
    {
      name: '你已耗尽 · 撑不了太久',
      when: () => getState().battle.ce <= 1,
      apply: (w: Weights) => {
        w.r1 += 0.5
        w.r4 -= 0.2
        w.r5 -= 0.3
      },
    },
    {
      name: '咒力总量 S 以上 · 还打得起',
      when: (c: ResultContext) => RI(c, 'dim_ce') >= 5,
      apply: (w: Weights) => {
        w.r3 += 0.6
        w.r4 += 0.5
        w.r5 += 0.4
      },
    },
    {
      name: '评定 SS / EX · 自动追加一回合（上限五）',
      when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
      apply: (w: Weights) => {
        w.r1 += 0.5
        w.r2 += 0.7
        w.r3 += 0.6
        w.r4 += 0.5
        w.r5 -= 0.2
      },
    },
    {
      name: '受了重伤 · 速战速决',
      when: () => getState().battle.diff <= -4,
      apply: (w: Weights) => {
        w.r1 += 0.9
        w.r5 -= 0.5
      },
    },
  ],
}
/* 二番战结算：更狠。id 复用 w1–w5，便于结局/后世评价直接读取最终结果 */
export const DUEL2: Stage = {
  id: 'duel2',
  name: '二番战 · 结算',
  kind: 'duel',
  tag: '生死',
  desc: '面对那副有四只手的身体，前面每一次交手重新累计 —— 这一次没有侥幸。',
  options: [
    {
      id: 'w1',
      s: '压胜',
      label: '压胜 · 毫发无伤',
      base: 0.6,
      hint: '你打倒了「那个东西」。此后无人再敢称你为凡人。',
    },
    {
      id: 'w2',
      s: '险胜',
      label: '险胜 · 重伤存活',
      base: 1.15,
      hint: '你赢了，但有一半的身体留在了那里。',
    },
    {
      id: 'w3',
      s: '两败俱伤',
      label: '两败俱伤 · 同归于尽之姿',
      base: 0.9,
      hint: '你们一起倒下，只有一个人还能呼吸。',
    },
    {
      id: 'w4',
      s: '败走',
      label: '败走 · 活下来',
      base: 0.85,
      hint: '你逃了。能从他手里逃走，本身就是战绩。',
    },
    {
      id: 'w5',
      s: '战死',
      label: '战死 · 未能起身',
      base: 1.2,
      hint: '你的咒力耗尽在最后一击之前。',
    },
  ],
  rules: (DUEL.rules || []).concat([
    {
      name: '对手是原身形态的宿傩',
      when: () => true,
      apply: (w: Weights) => {
        w.w5 += 0.5
        w.w1 -= 0.1
      },
    },
    {
      name: '你已经赢过他一次 · 他知道你不好杀',
      when: () => true,
      apply: (w: Weights) => {
        w.w5 -= 0.9
        w.w1 += 0.35
        w.w2 += 0.25
      },
    },
    {
      name: '你的咒力已经见底',
      when: () => getState().battle.ce <= 0,
      apply: (w: Weights) => {
        w.w5 += 1.0
        w.w2 -= 0.3
      },
    },
    {
      name: '你身上有束缚 · 还有余牌',
      when: (c: ResultContext) => c.vowCount,
      apply: (w: Weights) => {
        w.w1 += 0.4
        w.w2 += 0.3
      },
    },
    {
      name: '二番战 · 你打出了优势',
      when: () => getState().battle.diff >= 4,
      apply: (w: Weights) => {
        w.w1 += 2.4
        w.w2 += 1.6
        w.w5 -= 0.8
        w.w4 -= 0.4
      },
    },
    {
      name: '二番战 · 你被压着打',
      when: () => getState().battle.diff <= -4,
      apply: (w: Weights) => {
        w.w5 += 1.6
        w.w4 += 0.8
        w.w1 -= 0.3
      },
    },
    {
      name: '用过狱门疆 · 你封住了他的退路',
      when: () => getState().battle.prisonUsed,
      apply: (w: Weights) => {
        w.w1 += 1.6
        w.w2 += 0.8
        w.w5 -= 0.9
      },
    },
    {
      name: '你会反转术式 · 撑得住',
      when: (c: ResultContext) => c.talent === 't5' || chosenSkills(c).indexOf('sk_reverse') >= 0,
      apply: (w: Weights) => {
        w.w5 -= 0.6
        w.w2 += 0.5
      },
    },
  ]),
}
export const GROWTH: Stage = {
  id: 'growth',
  name: '战后 · 是否有所成长',
  kind: 'growth',
  tag: '战后',
  desc: '活过那场战斗之后，你身上留下了什么。',
  options: [
    {
      id: 'gr_skill',
      s: '学会新技能',
      label: '在生死之间学会了新的技术',
      base: 1.3,
      hint: '人只在濒死时长本事。',
    },
    {
      id: 'gr_evolve',
      s: '术式进化',
      label: '术式本身进化了',
      base: 0.8,
      hint: '同一套术式，又长出了一层。',
    },
    {
      id: 'gr_rank',
      s: '等级提升',
      label: '实力精进（等级提升一档）',
      base: 0.9,
      hint: '你被重新评定了一次。',
    },
    {
      id: 'gr_nothing',
      s: '什么也没变',
      label: '什么也没变，只是活下来了',
      base: 1.1,
      hint: '活下来本身就已经很多了。',
    },
    {
      id: 'gr_lose',
      s: '失去了什么',
      label: '失去了某样东西',
      base: 0.7,
      hint: '咒具、术式、或者某个人。',
    },
  ],
  rules: [
    {
      name: '无咒力凡人难以进化术式',
      when: (c: ResultContext) => c.talent === 't6',
      apply: (w: Weights) => {
        w.gr_evolve = 0
        w.gr_rank -= 0.4
      },
    },
    {
      name: '无术式者谈不上术式进化',
      when: (c: ResultContext) => ['t1', 't3'].indexOf(c.talent) >= 0,
      apply: (w: Weights) => {
        w.gr_evolve = 0
      },
    },
    {
      name: '智谋 S 以上更易把经验变成技术',
      when: (c: ResultContext) => RI(c, 'dim_in') >= 5,
      apply: (w: Weights) => {
        w.gr_skill += 0.8
      },
    },
    {
      name: '败走者更可能失去什么',
      when: (c: ResultContext) => c.duel === 'w4',
      apply: (w: Weights) => {
        w.gr_lose += 1.2
        w.gr_rank -= 0.5
      },
    },
    {
      name: '压胜者未必学到东西',
      when: (c: ResultContext) => c.duel === 'w1',
      apply: (w: Weights) => {
        w.gr_nothing += 0.8
      },
    },
    {
      name: '已经没有新的技术可学',
      when: (c: ResultContext) => learnableCount(c) === 0,
      apply: (w: Weights) => {
        w.gr_skill = 0
      },
    },
  ],
}
export const LOSS: Stage = {
  id: 'loss',
  name: '你失去了什么',
  kind: 'growth',
  tag: '战后',
  desc: '活下来是要付账的。',
  options: [
    { id: 'ls_gear', s: '咒具', label: '失去了一件咒具', base: 1.0, hint: '它替你挡了那一下。' },
    {
      id: 'ls_arm',
      s: '肢体',
      label: '失去了一只手 / 一只眼',
      base: 0.9,
      hint: '此后你要学着用剩下的部分战斗。',
    },
    {
      id: 'ls_person',
      s: '某人',
      label: '失去了某个人',
      base: 1.0,
      hint: '他留在了那里，你走了出来。',
    },
    {
      id: 'ls_mem',
      s: '记忆',
      label: '失去了一段记忆',
      base: 0.6,
      hint: '你记得结果，不记得过程。',
    },
    {
      id: 'ls_jutsu',
      s: '术式',
      label: '失去了术式的一部分',
      base: 0.5,
      hint: '术式被夺走、被拆解，或被封住。',
    },
  ],
  rules: [
    {
      name: '没有咒具可失去',
      when: (c: ResultContext) => !Object.keys(c).some((k) => /^gear\d+$/.test(k)),
      apply: (w: Weights) => {
        w.ls_gear = 0
      },
    },
    {
      name: '没有术式可失去',
      when: (c: ResultContext) => ['t1', 't3', 't6'].indexOf(c.talent) >= 0,
      apply: (w: Weights) => {
        w.ls_jutsu = 0
      },
    },
    {
      name: '孤身一人 · 没人可失去',
      when: (c: ResultContext) => c.bond === 'b13',
      apply: (w: Weights) => {
        w.ls_person = 0
        w.ls_arm += 0.6
      },
    },
  ],
}
export const ENDING: Stage = {
  id: 'ending',
  name: '命运结局',
  kind: 'ending',
  tag: '终',
  desc: '最后一轮。时代、六维、阵营、羁绊、决战与战后成长，此刻全部折算成死亡与存活的比率。',
  options: [
    {
      id: 'x1',
      s: '战死殉道',
      label: '战死 · 殉道',
      base: 1.02,
      hint: '为了某人而死。在这个世界里，这几乎是最好的死法。',
    },
    {
      id: 'x2',
      s: '存活见证',
      label: '存活 · 见证新咒术界',
      base: 1.35,
      hint: '活到 2019 年，站在废墟上看新的秩序搭起来。',
    },
    {
      id: 'x3',
      s: '被封印',
      label: '被封印 · 长眠',
      base: 0.45,
      hint: '狱门疆一类的存在：肉体还在，时间停止。',
    },
    {
      id: 'x4',
      s: '消散成佛',
      label: '消散 · 成佛',
      base: 0.45,
      hint: '咒灵唯一的善终：被祓除，化为乌有。',
    },
    {
      id: 'x5',
      s: '诅咒之王',
      label: '成为诅咒之王 · 新的顶点',
      base: 0.3,
      hint: '你把所有人踩在脚下，然后独自站在顶端。',
    },
    {
      id: 'x6',
      s: '隐退平凡',
      label: '隐退 · 归于平凡',
      base: 0.7,
      hint: '放下咒力，去当一个会为房租发愁的普通人。',
    },
    {
      id: 'x7',
      s: '成为教师',
      label: '成为教师 · 传承下一代',
      base: 0.7,
      hint: '把学生活着送出去，是你唯一的复仇。',
    },
    {
      id: 'x8',
      s: '放逐流亡',
      label: '被咒术界放逐 · 流亡',
      base: 0.5,
      hint: '你违反了禁忌，从此不被任何人承认。',
    },
    {
      id: 'x9',
      s: '改写规则',
      label: '改写规则者 · 触及天元',
      base: 0.22,
      hint: '你改写了规则，甚至触及天元的同化。世界因你而变形。',
    },
  ],
  rules: [
    {
      name: '入场于涩谷事变',
      when: (c: ResultContext) => c.era === 'e3',
      apply: (w: Weights) => {
        w.x1 += 1.0
        w.x3 += 0.4
      },
    },
    {
      name: '入场于死灭回游',
      when: (c: ResultContext) => c.era === 'e4',
      apply: (w: Weights) => {
        w.x1 += 1.1
        w.x8 += 0.5
      },
    },
    {
      name: '入场于新宿决战',
      when: (c: ResultContext) => c.era === 'e5',
      apply: (w: Weights) => {
        w.x1 += 1.2
        w.x3 += 0.3
      },
    },
    {
      name: '入场于终战之后',
      when: (c: ResultContext) => c.era === 'e6',
      apply: (w: Weights) => {
        w.x2 += 1.3
        w.x7 += 1.0
        w.x6 += 0.5
        w.x1 -= 0.5
      },
    },
    {
      name: '入场于 0 卷时期',
      when: (c: ResultContext) => c.era === 'e0',
      apply: (w: Weights) => {
        w.x2 += 0.7
        w.x4 += 0.4
      },
    },
    {
      name: '入场于怀玉·玉折',
      when: (c: ResultContext) => c.era === 'e1',
      apply: (w: Weights) => {
        w.x1 += 0.7
        w.x8 += 0.6
      },
    },
    {
      name: '出身为咒灵',
      when: (c: ResultContext) => c.origin === 'o4',
      apply: (w: Weights) => {
        w.x4 += 2.0
        w.x7 = 0
        w.x2 -= 0.4
      },
    },
    {
      name: '出身为一般人类',
      when: (c: ResultContext) => c.origin === 'o3',
      apply: (w: Weights) => {
        w.x1 += 0.9
        w.x6 += 0.7
        w.x5 = 0.02
        w.x9 = 0.02
      },
    },
    {
      name: '评定为 SS / EX',
      when: (c: ResultContext) => c.grade === 'g7' || c.grade === 'g8',
      apply: (w: Weights) => {
        w.x5 += 0.85
        w.x9 += 0.55
        w.x2 += 0.4
      },
    },
    {
      name: '评定为 E / D',
      when: (c: ResultContext) => c.grade === 'g1' || c.grade === 'g2',
      apply: (w: Weights) => {
        w.x1 += 0.85
        w.x6 += 0.55
        w.x5 = 0
      },
    },
    {
      name: '能完整领域展开',
      when: (c: ResultContext) => c.domain === 'd2',
      apply: (w: Weights) => {
        w.x2 += 0.45
        w.x5 += 0.3
      },
    },
    {
      name: '隶属宿傩阵营',
      when: (c: ResultContext) => c.faction === 'f6',
      apply: (w: Weights) => {
        w.x1 += 0.85
        w.x5 += 0.55
      },
    },
    {
      name: '隶属天元侧',
      when: (c: ResultContext) => c.faction === 'f8',
      apply: (w: Weights) => {
        w.x9 += 1.7
        w.x3 += 0.5
      },
    },
    {
      name: '与五条悟有缘',
      when: (c: ResultContext) => c.bond === 'b1',
      apply: (w: Weights) => {
        w.x2 += 0.45
        w.x7 += 0.55
      },
    },
    {
      name: '与宿傩有缘',
      when: (c: ResultContext) => c.bond === 'b10',
      apply: (w: Weights) => {
        w.x1 += 0.7
        w.x5 += 0.45
        w.x3 += 0.3
      },
    },
    {
      name: '孤身一人',
      when: (c: ResultContext) => c.bond === 'b13',
      apply: (w: Weights) => {
        w.x1 += 0.55
        w.x8 += 0.45
      },
    },
    {
      name: '决战压胜',
      when: (c: ResultContext) => c.duel === 'w1',
      apply: (w: Weights) => {
        w.x2 += 1.0
        w.x5 += 1.2
        w.x7 += 0.5
        w.x1 -= 0.6
      },
    },
    {
      name: '决战险胜',
      when: (c: ResultContext) => c.duel === 'w2',
      apply: (w: Weights) => {
        w.x2 += 0.9
        w.x7 += 0.6
        w.x6 += 0.4
        w.x1 -= 0.4
      },
    },
    {
      name: '决战两败俱伤',
      when: (c: ResultContext) => c.duel === 'w3',
      apply: (w: Weights) => {
        w.x1 += 0.7
        w.x3 += 0.9
        w.x6 += 0.3
        w.x2 += 0.5
      },
    },
    {
      name: '决战败走',
      when: (c: ResultContext) => c.duel === 'w4',
      apply: (w: Weights) => {
        w.x6 += 0.9
        w.x8 += 0.8
        w.x2 += 0.4
      },
    },
    {
      name: '打倒了原身形态的宿傩',
      when: (c: ResultContext) => c.duel2 && (c.duel2 === 'w1' || c.duel2 === 'w2'),
      apply: (w: Weights) => {
        w.x5 += 1.3
        w.x9 += 0.8
        w.x2 += 0.6
        w.x7 += 0.3
        w.x1 -= 0.4
      },
    },
    {
      name: '从原身形态的宿傩手里逃走',
      when: (c: ResultContext) => c.duel2 === 'w4',
      apply: (w: Weights) => {
        w.x6 += 0.8
        w.x8 += 0.7
        w.x1 -= 0.3
      },
    },
    {
      name: '战后习得新技术',
      when: (c: ResultContext) => c.growth === 'gr_skill',
      apply: (w: Weights) => {
        w.x2 += 0.4
        w.x7 += 0.4
      },
    },
    {
      name: '战后术式进化',
      when: (c: ResultContext) => c.growth === 'gr_evolve',
      apply: (w: Weights) => {
        w.x5 += 0.5
        w.x9 += 0.3
      },
    },
    {
      name: '战后失去了什么',
      when: (c: ResultContext) => c.growth === 'gr_lose',
      apply: (w: Weights) => {
        w.x6 += 0.6
        w.x8 += 0.5
        w.x1 += 0.3
      },
    },
    {
      name: '六维综合极高',
      when: (c: ResultContext) => power(c) >= 78,
      apply: (w: Weights) => {
        w.x2 += 0.7
        w.x5 += 0.5
        w.x1 -= 0.4
      },
    },
    {
      name: '六维综合极低',
      when: (c: ResultContext) => power(c) <= 34,
      apply: (w: Weights) => {
        w.x1 += 0.6
        w.x6 += 0.5
      },
    },
    {
      name: '终战之后已不在这个世界',
      when: (c: ResultContext) => c.ev6 === 'ev6_abs',
      apply: (w: Weights) => {
        w.x1 += 3.0
        w.x4 += 1.0
        w.x3 += 0.5
        w.x2 = 0.12
        w.x6 = 0.12
        w.x7 = 0.12
        w.x5 = 0.05
        w.x9 = 0.05
      },
    },
    {
      name: '新宿决战已缺席',
      when: (c: ResultContext) => c.ev5 === 'ev5_abs',
      apply: (w: Weights) => {
        w.x1 += 1.6
        w.x3 += 0.8
        w.x2 -= 0.6
      },
    },
    {
      name: '缺席原因是「已死」',
      when: (c: ResultContext) => priorDead(c),
      apply: (w: Weights) => {
        w.x1 += 4.0
        w.x2 = 0.08
        w.x6 = 0.08
        w.x7 = 0.08
        w.x5 = 0.05
        w.x9 = 0.05
      },
    },
    {
      name: '缺席原因是「已死」· 咒灵',
      when: (c: ResultContext) => c.origin === 'o4' && priorDead(c),
      apply: (w: Weights) => {
        w.x4 += 6.0
      },
    },
    {
      name: '缺席原因是「被封印」',
      when: (c: ResultContext) =>
        Object.keys(c).some((k) => k.indexOf('abs_') === 0 && String(c[k]).slice(-7) === '_sealed'),
      apply: (w: Weights) => {
        w.x3 += 3.0
        w.x1 -= 0.5
      },
    },
    {
      name: '五条家 · 生来就站在顶点',
      when: (c: ResultContext) => c.clan === 'cl_gojo',
      apply: (w: Weights) => {
        w.x5 += 0.7
        w.x9 += 0.35
        w.x2 += 0.3
        w.x7 += 0.3
        w.x6 -= 0.3
        w.x8 -= 0.2
      },
    },
    {
      name: '禅院家 · 家规吃人的那一族',
      when: (c: ResultContext) => c.clan === 'cl_zenin',
      apply: (w: Weights) => {
        w.x8 += 0.7
        w.x1 += 0.35
        w.x5 += 0.3
        w.x7 -= 0.3
      },
    },
    {
      name: '加茂家 · 名门之末的务实',
      when: (c: ResultContext) => c.clan === 'cl_kamo',
      apply: (w: Weights) => {
        w.x7 += 0.5
        w.x2 += 0.3
        w.x6 += 0.25
      },
    },
  ]
    .concat(
      EVENT_DEFS.map((d) => ({
        name: '在「' + d.name + '」中缺席',
        when: (c: ResultContext) => c[d.id] === d.id + '_abs',
        apply: (w: Weights) => {
          w.x1 += 0.6
          w.x8 += 0.4
          w.x2 -= 0.3
        },
      })),
    )
    .concat([
      /* 战死是硬约束，放在最后执行，避免被其他规则顶掉 */
      {
        name: '决战战死',
        when: (c: ResultContext) => c.duel === 'w5',
        apply: (w: Weights) => {
          w.x1 += 9.0
          w.x2 = 0
          w.x5 = 0
          w.x6 = 0
          w.x7 = 0
          w.x9 = 0
          w.x8 = 0
          w.x3 = 0
        },
      },
      {
        name: '决战战死 · 咒灵之身',
        when: (c: ResultContext) => c.duel === 'w5' && c.origin === 'o4',
        apply: (w: Weights) => {
          w.x4 += 9.0
          w.x1 -= 6
        },
      },
      {
        name: '败于原身形态的宿傩',
        when: (c: ResultContext) => c.duel2 === 'w5',
        apply: (w: Weights) => {
          w.x1 += 9.0
          w.x2 = 0
          w.x5 = 0
          w.x6 = 0
          w.x7 = 0
          w.x9 = 0
          w.x8 = 0
          w.x3 = 0
        },
      },
      /* 死在某一场事件战里：结局只能是「战死殉道」（咒灵则是消散），且不可能参与最终决战 */
      {
        name: '你没能活到最终决战',
        when: (c: ResultContext) => !!deadAt(c),
        apply: (w: Weights) => {
          w.x1 += 9.0
          w.x2 = 0
          w.x3 = 0
          w.x4 = 0
          w.x5 = 0
          w.x6 = 0
          w.x7 = 0
          w.x8 = 0
          w.x9 = 0
        },
      },
      {
        name: '你没能活到最终决战 · 咒灵之身',
        when: (c: ResultContext) => !!deadAt(c) && c.origin === 'o4',
        apply: (w: Weights) => {
          w.x4 += 9.0
          w.x1 -= 6
        },
      },
      {
        name: '在死灭回游里打出了名号',
        when: (c: ResultContext) => ['ed1', 'ed2'].indexOf(c['ed4']) >= 0,
        apply: (w: Weights) => {
          w.x5 += 0.4
          w.x2 += 0.3
        },
      },
      {
        name: '在涩谷与死灭回游中都活了下来',
        when: (c: ResultContext) =>
          c['ed3'] && c['ed3'] !== 'ed5' && c['ed4'] && c['ed4'] !== 'ed5',
        apply: (w: Weights) => {
          w.x2 += 0.4
          w.x7 += 0.3
        },
      },
    ]),
}
