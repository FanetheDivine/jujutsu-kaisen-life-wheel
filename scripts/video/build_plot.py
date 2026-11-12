"""把 tmp/data.json 的逐帧还原结果编译成剧本线的轮次数据。

用法：python scripts/video/build_plot.py ../../../../tmp/data.json

产出：
- scripts/video/plot.json：清洗后的轮次与扇面（提交用数据源）
- src/game/video/plot.ts：剧本线的 Stage 数据（生成物，勿手改）
"""

import collections
import json
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SRC = sys.argv[1] if len(sys.argv) > 1 else "tmp/data.json"
data = json.load(open(SRC, encoding="utf-8"))
disp = data["disp"]
seq = data["seq"]
pos = {k: sum(v) / len(v) for k, v in data["pos"].items()}

CJK = re.compile(r"[\u4e00-\u9fff]")
MAX_OPTIONS = 40

FIX = {
    "泪咒师": "咒术师",
    "谊咒师": "咒术师",
    "退咒师": "咒术师",
    "追咒师": "咒术师",
    "汽术师": "咒术师",
    "咒胧": "咒骸",
    "百流龙": "石流龙",
    "浪沌": "混沌",
    "模访": "模仿",
    "凝画家": "漫画家",
    "陀良": "陀艮",
    "宿摊": "宿傩",
    "五骨虎": "五谷虎",
    "霸索": "羂索",
    "悠人": "悠仁",
    "真希": "真希",
    "春太": "春太",
    "漏壶": "漏壶",
    "天逆锋": "天逆鉾",
    "天逆锁": "天逆鉾",
    "天逆释": "天逆鉾",
}


def clean(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).strip()
    t = re.sub(r"\s+", "", t)
    t = re.sub(r"^[三注口污·]+", "", t)
    t = t.rstrip("（(·:：,，")
    for a, b in FIX.items():
        t = t.replace(a, b)
    return t.strip()


def key(t: str) -> str:
    return re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", t)


def is_fragment(t: str) -> bool:
    if "##" in t or not t:
        return True
    if t.count("(") != t.count(")"):
        return True
    if t.startswith(("(", ")", "、", "，", ",", ".")):
        return True
    if t.endswith(("(", "其", "的", "在", "与", "、", "，", "比")):
        return True
    return False


def hamming_join(labels):
    order, bucket = [], {}
    for label, cnt in labels:
        k = key(label)
        if not k:
            continue
        if k in bucket:
            merged = bucket[k]
            merged["count"] += cnt
            if cnt > merged["count0"]:
                merged["label"], merged["count0"] = label, cnt
            continue
        hit = None
        for other in order:
            if len(key(other)) == len(k) and len(k) >= 3 and sum(a != b for a, b in zip(key(other), k)) <= 1:
                hit = other
                break
        if hit is None:
            bucket[k] = {"label": label, "count": cnt, "count0": cnt}
            order.append(label)
        else:
            merged = bucket[key(hit)]
            merged["count"] += cnt
            if cnt > merged["count0"]:
                merged["label"], merged["count0"] = label, cnt
    return [bucket[key(l)] for l in order]


# 每轮：可见扇面并集 + 被抽中次数
union = {}
for ep, recs in seq.items():
    for r in recs:
        it = union.setdefault(r["ck"], {"secs": set(), "out": collections.Counter(), "eps": set()})
        it["secs"].update(r["secs"])
        it["eps"].add(ep)
        for o in r["outs"]:
            for part in o.split("|"):
                part = clean(part)
                if part:
                    it["out"][part] += 1

name2ck = {clean(disp[ck]): ck for ck in disp}

# 篇章表：era 是「时间点」下标（0 平安 … 8 六十八年后），早于它的篇章整段跳过。
# when 里可以再叠条件：gate=是/否 看该篇章的参与盘，origin 限定身份，moral 限制道德，tech=否 限定无术式。
ARCS = [
    {
        "key": "past400",
        "name": "四百年前",
        "era": 1,
        "wheels": [
            ("400年前事件", {}),
            ("400年前·死前·在咒术界地位", {}),
            ("特殊事件·加入的家族是", {"origin": ["咒术高层"]}),
            ("特殊事件·禅院家风影响", {"origin": ["咒术高层"]}),
        ],
    },
    {
        "key": "hidden",
        "name": "怀玉",
        "era": 2,
        "gate": "怀玉·是否参加理子保卫战",
        "wheels": [
            ("时间成长·怀玉到零卷·是否成长", {}),
            ("时间成长·成长", {}),
            ("怀玉·是否参加理子保卫战", {"self": True}),
            ("怀玉·伏黑甚尔是否刺杀理子", {"gate": "是"}),
            ("特殊事件·虎杖是否救下理子", {"gate": "是"}),
            ("特殊事件·甚尔能否战胜觉醒五条", {"gate": "是"}),
            ("特殊事件·存活后的甚尔", {"gate": "是"}),
            ("特殊事件·甚尔怎么使用新阴流", {"gate": "是"}),
            ("未与甚尔战斗·见面情况", {"gate": "否"}),
        ],
    },
    {
        "key": "daily",
        "name": "日常",
        "era": 3,
        "wheels": [
            ("怎么来到日本·除日本外地区", {}),
            ("日常盘·遇见夏油杰", {}),
            ("日常盘·事件·和谁一起", {}),
            ("日常盘·遇见人物·怀玉", {}),
            ("日常盘·收徒·徒弟是·怀玉", {}),
            ("日常盘·遇见是否发生战斗", {}),
            ("遇见·是否发生战斗", {}),
            ("日常盘·遭遇·零卷到剧情开始", {}),
            ("日常盘·遭遇·事件", {}),
            ("日常盘·事件·零卷到剧情开始", {}),
        ],
    },
    {
        "key": "parade",
        "name": "百鬼夜行",
        "era": 3,
        "gate": "是否参加百鬼夜行",
        "wheels": [
            ("是否参加百鬼夜行", {"self": True}),
            ("百鬼夜行·遇见人数", {"gate": "是"}),
            ("百鬼夜行·遇敌", {"gate": "是"}),
            ("百鬼夜行·夏油方", {"gate": "是"}),
            ("在哪个战场·百鬼夜行", {"gate": "是"}),
            ("特殊事件·参加百鬼夜行阵营", {"gate": "是"}),
            ("特殊事件·夏油杰夺取里香", {"gate": "是"}),
            ("特殊事件·乙骨处决", {"gate": "是"}),
        ],
    },
    {
        "key": "start",
        "name": "剧情开始",
        "era": 4,
        "wheels": [
            ("加入高专·原因·普通人", {"origin": ["普通人"]}),
            ("加入高专·招募人是·零卷", {"origin": ["普通人"]}),
            ("在做什么·剧情开始时", {}),
            ("剧情开始时·在做什么·天灾咒灵", {"origin": ["咒灵"]}),
            ("剧情开始·对战二级咒灵", {}),
            ("少年院·经过", {}),
            ("高级技巧会几个", {}),
            ("会哪个高级技巧", {}),
            ("会哪个高级技巧·无生得术式", {"tech": "否"}),
            ("特殊事件·虎杖悠仁的死刑", {}),
            ("特殊事件·伏黑惠的养育情况是", {}),
            ("特殊事件·伏黑惠是否被主角收养", {}),
        ],
    },
    {
        "key": "juvenile",
        "name": "幼鱼与逆罚",
        "era": 4,
        "gate": "是否参与幼鱼与逆罚",
        "wheels": [
            ("是否参与幼鱼与逆罚", {"self": True}),
            ("是否参与幼鱼与逆罚·高专", {"gate": "是"}),
            ("幼鱼·是否出手·低道德", {"gate": "是", "moral": "low"}),
            ("特殊事件·顺平之后是否加入高专", {"gate": "是"}),
        ],
    },
    {
        "key": "exchange",
        "name": "交流会",
        "era": 4,
        "gate": "是否参加交流会",
        "wheels": [
            ("是否参加交流会", {"self": True}),
            ("交流会·阵营", {"gate": "是"}),
            ("交流会·索方", {"gate": "是"}),
            ("交流会结果·强者", {"gate": "是"}),
            ("交流会结果·弱者", {"gate": "是"}),
            ("未参与事件·在干嘛", {"gate": "否"}),
        ],
    },
    {
        "key": "shibuya",
        "name": "涩谷事变",
        "era": 5,
        "gate": "是否参加涩谷事变",
        "wheels": [
            ("是否参加涩谷事变", {"self": True}),
            ("涩谷事变·开场", {"gate": "是"}),
            ("涩谷事变·过程", {"gate": "是"}),
            ("涩谷事变经过·开场(高专)", {"gate": "是"}),
            ("涩谷事变·和东堂一起", {"gate": "是"}),
            ("涩谷事变·天灾索方", {"gate": "是"}),
            ("涩谷事变·天灾·封印五条", {"gate": "是"}),
            ("涩谷事变·对战索获胜后", {"gate": "是"}),
            ("涩谷事变·游走支援", {"gate": "是"}),
            ("涩谷事变·游荡·遇见了谁·咒灵", {"gate": "是", "origin": ["咒灵"]}),
            ("涩谷事变·遇见春太后", {"gate": "是"}),
            ("涩谷事变·支援·抢五条盒", {"gate": "是"}),
            ("涩谷事变·是否继续行动", {"gate": "是"}),
            ("涩谷事变·经过·咒灵", {"gate": "是", "origin": ["咒灵"]}),
            ("事件结果·救五条(高专)", {"gate": "是"}),
            ("特殊事件·机械丸叛变·低道德", {"gate": "是", "moral": "low"}),
            ("特殊事件·东堂的伤势", {"gate": "是"}),
            ("特殊事件·是否提前击杀真人", {"gate": "是"}),
            ("特殊事件·真人的下场", {"gate": "是"}),
            ("特殊事件·和漏壶遇见虎杖后", {"gate": "是"}),
            ("特殊事件·是否给真希一伙补刀", {"gate": "是"}),
            ("特殊事件·是否去发现来西华", {"gate": "是"}),
            ("特殊事件·死灭回游是否开启", {"gate": "是"}),
            ("特殊事件·羂索的情况", {"gate": "是"}),
            ("特殊事件·宿夺舍是否在场", {"gate": "是"}),
            ("特殊事件·叫主角来的人是", {"gate": "是"}),
            ("特殊事件·能否阻止宿立下束缚", {"gate": "是"}),
            ("是否提前解封五条·天逆咒具", {"gate": "是"}),
            ("特殊事件·禅院家灭门", {"gate": "是", "origin": ["咒术高层"]}),
        ],
    },
]


# 录像里这几轮只读到 0–1 个扇面（画面停格刚好没展开），按轮次语义补足到至少两个，
# 否则玩家抽到该轮时无从选择。补的选项不带次数，权重与其它未观测项一致。
EXTRA_OPTS = {
    "怀玉·是否参加理子保卫战": ["是", "否"],
    "特殊事件·甚尔能否战胜觉醒五条": ["能", "不能"],
    "特殊事件·甚尔怎么使用新阴流": ["靠天与咒缚的肉体强攻", "靠咒具·天逆鉾偷袭"],
    "怎么来到日本·除日本外地区": ["偷渡上岸", "被咒术师带来", "自己摸索着来"],
    "百鬼夜行·遇见人数": ["1人", "2人", "3人"],
    "特殊事件·参加百鬼夜行阵营": ["夏油方", "高专方"],
    "特殊事件·伏黑惠的养育情况是": ["自己养", "交给禅院家", "交给五条家"],
    "幼鱼·是否出手·低道德": ["出手", "不出手"],
    "特殊事件·顺平之后是否加入高专": ["加入", "不加入"],
    "交流会·阵营": ["高专方", "索方"],
    "特殊事件·机械丸叛变·低道德": ["叛变", "没叛变"],
}


def options_for(ck):
    it = union.get(ck)
    if not it:
        raise SystemExit("找不到轮次：" + ck)
    labels = []
    for sec in it["secs"]:
        sec = clean(sec)
        if is_fragment(sec) or len(CJK.findall(sec)) < 1 or len(sec) > 24:
            continue
        labels.append((sec, it["out"].get(sec, 0)))
    for label, cnt in it["out"].items():
        if not any(label == lb for lb, _ in labels):
            labels.append((label, cnt))
    merged = hamming_join(labels)
    rows = [{"label": m["label"], "count": m["count"]} for m in merged]
    rows.sort(key=lambda r: (-r["count"], r["label"]))
    return rows[:MAX_OPTIONS]


stages = []
missing = []
for arc in ARCS:
    for name, when in arc["wheels"]:
        ck = name2ck.get(name)
        if not ck:
            missing.append(name)
            continue
        options = options_for(ck)
        if len(options) < 2:
            options = [{"label": label, "count": 0} for label in EXTRA_OPTS.get(name, [])] or options
        stages.append(
            {
                "id": "p%02d" % (len(stages) + 1),
                "arc": arc["key"],
                "arcName": arc["name"],
                "era": arc["era"],
                "gate": arc.get("gate"),
                "name": name,
                "pos": round(pos.get(ck, 0), 4),
                "eps": sorted(union[ck]["eps"]),
                "when": when,
                "options": options,
            }
        )

if missing:
    with open("tmp_missing.txt", "w", encoding="utf-8") as fh:
        fh.write(chr(10).join(missing))
    raise SystemExit("MISSING " + str(len(missing)))

gate_ids = {}
for stage in stages:
    if stage["when"].get("self"):
        gate_ids[stage["name"]] = stage["id"]

thin = [s["id"] + " " + s["name"] for s in stages if len(s["options"]) < 2]

json.dump(
    {"source": "毓彧庾《咒术转盘》ep74–ep82 + 特别篇逐帧还原", "stages": stages},
    open("scripts/video/plot.json", "w", encoding="utf-8"),
    ensure_ascii=False,
    separators=(",", ":"),
)

ERA_ORDER = [
    "千年前平安时代",
    "400年前",
    "怀玉时期",
    "0卷时期",
    "剧情开始时",
    "涩谷事变时期",
    "死灭回游时期",
    "新宿决战时期",
    "68年后外传",
]

def emit_when(stage):
    thunks = ["eraIndex(context.era) > %d" % stage["era"]]
    when = stage["when"]
    if when.get("gate") and stage["gate"]:
        gid = gate_ids[stage["gate"]]
        if when["gate"] == "是":
            thunks.append("labelOf(context.%s) === '否'" % gid)
        else:
            thunks.append("labelOf(context.%s) === '是'" % gid)
    if when.get("origin"):
        names = ", ".join("'%s'" % n for n in when["origin"])
        thunks.append("!originIs(context.origin, %s)" % names)
    if when.get("moral") == "low":
        thunks.append("!isLowMoral(labelOf(context.moral))")
    if when.get("tech") == "否":
        thunks.append("labelOf(context.hasTechnique) === '是'")
    return " || ".join(thunks)


def opt(item):
    label = item["label"].replace("'", "\\'")
    cnt = item["count"]
    return "          ['%s', %d]," % (label, cnt) if cnt else "          ['%s']," % label


lines = []
lines.append("import { labelOf } from '../options'")
lines.append("import type { Stage } from '../types'")
lines.append("import { wheel } from './wheel'")
lines.append("")
lines.append("/**")
lines.append(" * 剧本线轮次（P3）：四百年前 → 怀玉 → 日常 → 百鬼夜行 → 剧情开始 → 幼鱼与逆罚 → 交流会 → 涩谷事变。")
lines.append(" *")
lines.append(" * 由 scripts/video/build_plot.py 从逐帧还原结果生成，勿手改；改条件请改脚本里的 ARCS 表。")
lines.append(" * 触发条件是推断：时间点早于该篇章 → 整段跳过；参与盘答「否」→ 只留 gate 与替补盘。")
lines.append(" */")
lines.append("")
lines.append("const PLOT = '剧情'")
lines.append("")
lines.append("export const ERA_ORDER = [")
for era in ERA_ORDER:
    lines.append("  '%s'," % era)
lines.append("]")
lines.append("")
lines.append("/** 时间点下标；录像没抽到时间点时按最早算，好让整条线都播。 */")
lines.append("export function eraIndex(pick: string | undefined): number {")
lines.append("  if (!pick) return 0")
lines.append("  const index = ERA_ORDER.indexOf(labelOf(pick))")
lines.append("  return index < 0 ? 0 : index")
lines.append("}")
lines.append("")
lines.append("/** 穿越时间点晚于某个篇章时，那个篇章属于“过去”，整段跳过。 */")
lines.append("export function eraPast(pick: string | undefined, era: number): boolean {")
lines.append("  return eraIndex(pick) > era")
lines.append("}")
lines.append("")
lines.append("export function originIs(pick: string | undefined, ...names: string[]): boolean {")
lines.append("  const label = pick ? labelOf(pick) : ''")
lines.append("  return names.some((name) => label.includes(name))")
lines.append("}")
lines.append("")
lines.append("export function isLowMoral(label: string): boolean {")
lines.append("  return label.startsWith('D') || label.startsWith('E')")
lines.append("}")
lines.append("")
lines.append("export const PLOT_STAGES: Stage[] = [")
for stage in stages:
    lines.append("  wheel({")
    lines.append("    id: '%s'," % stage["id"])
    lines.append("    name: '%s'," % stage["name"].replace("'", "\\'"))
    lines.append("    tag: PLOT,")
    lines.append("    skipText: '这段时间不在你的时间线上',")
    lines.append("    skipIf: (context) => %s," % emit_when(stage))
    lines.append("    opts: [")
    for o in stage["options"]:
        lines.append(opt(o))
    lines.append("    ],")
    lines.append("  }),")
lines.append("]")
lines.append("")
lines.append("export const PLOT_ARC_NAMES = [")
for arc in ARCS:
    lines.append("  '%s'," % arc["name"])
lines.append("]")
lines.append("")

open("src/game/video/plot.ts", "w", encoding="utf-8").write("\n".join(lines))

print("stages", len(stages))
print("options", sum(len(s["options"]) for s in stages))
print("thin(<2)", len(thin))
for t in thin:
    print("  ", t)
