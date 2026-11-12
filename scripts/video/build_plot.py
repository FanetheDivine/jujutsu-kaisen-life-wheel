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
    {
        "key": "culling",
        "name": "死灭回游",
        "era": 6,
        "gate": "是否参加死灭回游",
        "wheels": [
            ("是否参加死灭回游", {"self": True}),
            ("参加死灭回游地点", {"gate": "是"}),
            ("死灭回游·进结界前·救真依", {"gate": "是"}),
            ("死灭回游·是否留下守卫天元", {"gate": "是"}),
            ("守卫天元结果·强者", {"gate": "是"}),
            ("死灭回游·带走天使后", {"gate": "是"}),
            ("死灭回游·东京·对手·强者", {"gate": "是"}),
            ("死灭回游·对手·东京", {"gate": "是"}),
            ("死灭回游·东京·高专", {"gate": "是"}),
            ("死灭回游·是否发生战斗", {"gate": "是"}),
            ("死灭回游·杀高层", {"gate": "是"}),
            ("死灭回游·是否前往星宫", {"gate": "是"}),
            ("死灭回游·能否叫来秤金次", {"gate": "是"}),
            ("死灭回游·宿夺舍", {"gate": "是"}),
            ("特殊事件·能否阻止宿夺舍", {"gate": "是"}),
            ("特殊事件·宿夺舍被谁阻止了", {"gate": "是"}),
            ("特殊事件·宿夺舍是否成功", {"gate": "是"}),
            ("特殊事件·通缉虎杖", {"gate": "是"}),
        ],
    },
    {
        "key": "shinjuku",
        "name": "新宿决战",
        "era": 7,
        "gate": "是否参加新宿决战",
        "wheels": [
            ("是否参加新宿决战", {"self": True}),
            ("决战阵营", {"gate": "是"}),
            ("新宿决战·策略", {"gate": "是"}),
            ("新宿决战·是否参加·咒灵", {"gate": "是", "origin": ["咒灵"]}),
            ("新宿决战·和里梅一起·宿方", {"gate": "是"}),
            ("新宿决战·赶到战场的时间", {"gate": "是"}),
            ("新宿决战·能否阻止空间斩!", {"gate": "是"}),
            ("决战训练·成长", {"gate": "是"}),
            ("决战宿入场顺序", {"gate": "是"}),
            ("战前劝降·EX道德", {"gate": "是"}),
            ("特殊事件·五条悟是否解封", {"gate": "是"}),
            ("特殊事件·五条悟清算·高层", {"gate": "是", "origin": ["咒术高层"]}),
            ("特殊事件·伏黑津美纪/万", {"gate": "是"}),
            ("特殊事件·伏黑惠是否存活", {"gate": "是"}),
            ("特殊事件·是否再战五条", {"gate": "是"}),
            ("特殊事件·E-道德·是否再战", {"gate": "是", "moral": "low"}),
            ("特殊事件·是否逃脱", {"gate": "是"}),
            ("特殊事件·是否追击主角", {"gate": "是"}),
            ("特殊事件·战后宿是否清算主角", {"gate": "是"}),
            ("特殊事件·是否当场杀死索", {"gate": "是"}),
            ("处决虎杖·虎杖的选择", {"gate": "是"}),
            ("当宿从领域出来·他看见的是", {"gate": "是"}),
            ("诛伏赐死·辩论盘·初始胜率", {"gate": "是"}),
            ("诛伏赐死·辩论盘·宿傩", {"gate": "是"}),
            ("诛伏赐死·辩论盘·日车", {"gate": "是"}),
            ("诛伏赐死·辩论盘·胜负", {"gate": "是"}),
        ],
    },
]

# 结局与彩蛋（P6）：先问活没活到 68 年后，再分「68 年后线」「主角死后线」「逆转时间线」，
# 最后是三条彩蛋盘与观众投币。后几条在录像里是散落的插盘，这里统一收在终局。
ENDINGS = [
    ("是否活到68年后", {"self": True}),
    ("在哪里·68年后", {"gate": "是"}),
    ("68年后人类是否存在", {"gate": "是"}),
    ("68年后声望", {"gate": "是"}),
    ("68年后是否参加战斗", {"gate": "是"}),
    ("主角死后·五宿对决胜利者是", {"gate": "否"}),
    ("主角死后·索和夏油是谁对付的", {"gate": "否"}),
    ("逆转时间·虎杖回来的方式是", {"gate": "否"}),
    ("逆转时间·虎杖回到的时间点是", {"gate": "否"}),
    ("逆转时间·时间是否继续回溯", {"gate": "否"}),
    ("逆转时间·虎杖能否回到68年后", {"gate": "否"}),
    ("逆转时间·回不去了·决定", {"gate": "否"}),
    ("我掌握了咒力的核心!", {}),
    ("宿把手机砍坏了怎么办", {}),
    ("打架前先恰个饭", {}),
    ("观众看完会不会投币", {}),
]

# 战斗结算三连盘：胜负 → 伤势 → 成长，每次打完都过一遍。
# 高天赋与低天赋是两个不同轮次，用天赋盘的档位二选一。
SETTLE = [
    ("战斗盘·胜负", {}),
    ("战斗盘·伤势·主角", {}),
    ("事件伤势", {}),
    ("是否得到成长·高天赋", {"talent": "high"}),
    ("是否得到成长·低天赋", {"talent": "low"}),
    ("事件成长·SS天赋以上", {"talent": "high"}),
    ("事件成长·低天赋", {"talent": "low"}),
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
    "是否参加死灭回游": ["是", "否"],
    "是否参加新宿决战": ["是", "否"],
    "死灭回游·是否发生战斗": ["是", "否"],
    "死灭回游·是否留下守卫天元": ["留下", "不留下"],
    "死灭回游·能否叫来秤金次": ["叫来了", "没叫来"],
    "特殊事件·能否阻止宿夺舍": ["阻止了", "没阻止"],
    "特殊事件·宿夺舍是否成功": ["成功", "失败"],
    "特殊事件·伏黑惠是否存活": ["存活", "战死"],
    "特殊事件·是否再战五条": ["再战", "不再战"],
    "特殊事件·E-道德·是否再战": ["再战", "不再战"],
    "特殊事件·是否逃脱": ["逃脱", "没逃脱"],
    "特殊事件·是否追击主角": ["追击", "不追击"],
    "特殊事件·战后宿是否清算主角": ["清算", "不清算"],
    "特殊事件·是否当场杀死索": ["杀了", "没杀"],
    "特殊事件·五条悟是否解封": ["解封", "没解封"],
    "特殊事件·通缉虎杖": ["被通缉", "没被通缉"],
    "战斗盘·胜负": ["胜", "负"],
    "战斗盘·伤势·主角": ["重伤", "轻伤", "无伤"],
    "事件伤势": ["重伤", "轻伤"],
    "是否得到成长·高天赋": ["是", "否"],
    "是否得到成长·低天赋": ["是", "否"],
    "事件成长·SS天赋以上": ["是", "否"],
    "事件成长·低天赋": ["是", "否"],
    "诛伏赐死·辩论盘·日车": ["有罪", "无罪"],
    "诛伏赐死·辩论盘·胜负": ["日车胜", "宿傩胜"],
    "68年后人类是否存在": ["存在", "不存在"],
    "主角死后·索和夏油是谁对付的": ["五角战", "高专"],
    "宿把手机砍坏了怎么办": ["去转转", "自己修修看"],
    "打架前先恰个饭": ["妙界垫一口", "海洋至尊补个水"],
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


missing = []


def build(group, prefix):
    rows = []
    for arc in group:
        # 组内若有一轮用 self 标记成「参与盘」，其余轮次的 gate 条件就指向它，
        # 例如结局组用「是否活到68年后」分叉。
        own_gate = next((name for name, when in arc["wheels"] if when.get("self")), None)
        for name, when in arc["wheels"]:
            ck = name2ck.get(name)
            if not ck:
                missing.append(name)
                continue
            options = options_for(ck)
            # 录屏可能停格在别的盘上（OCR 扇面张冠李戴），按语义补的选项优先。
            if name in EXTRA_OPTS or len(options) < 2:
                options = [{"label": label, "count": 0} for label in EXTRA_OPTS.get(name, [])] or options
            rows.append(
                {
                    "id": "%s%02d" % (prefix, len(rows) + 1),
                    "arc": arc["key"],
                    "arcName": arc["name"],
                    "era": arc["era"],
                    "gate": arc.get("gate") or own_gate,
                    "name": name,
                    "pos": round(pos.get(ck, 0), 4),
                    "eps": sorted(union[ck]["eps"]),
                    "when": when,
                    "options": options,
                }
            )
    return rows


stages = build(ARCS, "p")
settle = build([{"key": "settle", "name": "战斗结算", "era": 0, "wheels": SETTLE}], "s")
ending = build([{"key": "ending", "name": "结局", "era": 0, "wheels": ENDINGS}], "e")
ending[0]["id"] = "ending"
ending[-1]["id"] = "legacy"

if missing:
    with open("tmp_missing.txt", "w", encoding="utf-8") as fh:
        fh.write(chr(10).join(missing))
    raise SystemExit("MISSING " + str(len(missing)))

gate_ids = {}
for stage in stages + ending:
    if stage["when"].get("self"):
        gate_ids[stage["name"]] = stage["id"]

thin = [s["id"] + " " + s["name"] for s in stages + settle + ending if len(s["options"]) < 2]

json.dump(
    {
        "source": "毓彧庾《咒术转盘》ep74–ep82 + 特别篇逐帧还原",
        "stages": stages,
        "settle": settle,
        "ending": ending,
    },
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
    # 结算盘与结局盘不看时间点：打到哪一年都要结算这一仗、都要给个收尾。
    thunks = (
        []
        if stage["arc"] in ("settle", "ending")
        else ["eraIndex(context.era) > %d" % stage["era"]]
    )
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
    if when.get("talent") == "high":
        thunks.append("!isHighTalent(labelOf(context.talent))")
    if when.get("talent") == "low":
        thunks.append("!isLowTalent(labelOf(context.talent))")
    return " || ".join(thunks) or "false"


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
lines.append(" * 剧本线轮次（P3–P4）：四百年前 → 怀玉 → 日常 → 百鬼夜行 → 剧情开始 → 幼鱼与逆罚 →")
lines.append(" *")
lines.append(" * 交流会 → 涩谷事变 → 死灭回游 → 新宿决战；战斗结算三连盘（胜负 → 伤势 → 成长）单独一组。")
lines.append(" * 触发条件是推断：时间点早于该篇章 → 整段跳过；参与盘答「否」→ 只留 gate 与替补盘。")
lines.append(" */")
lines.append("")
lines.append("const PLOT = '剧情'")
lines.append("const ENDING = '终局'")
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
lines.append("/** 天赋档位：SSS / SS / S / 超越五宿算高天赋，C / D / 学不明白算低天赋。 */")
lines.append("export function isHighTalent(label: string): boolean {")
lines.append("  return /^(SSS|SS|S\(|超越)/.test(label)")
lines.append("}")
lines.append("")
lines.append("export function isLowTalent(label: string): boolean {")
lines.append("  return /^(C|D|学不明白)/.test(label)")
lines.append("}")
lines.append("")
lines.append("export const PLOT_STAGES: Stage[] = [")
for stage in stages:
    lines.append("  wheel({")
    lines.append("    id: '%s'," % stage["id"])
    lines.append("    name: '%s'," % stage["name"].replace("'", "\\'"))
    lines.append("    tag: PLOT,")
    lines.append("    skipText: '这段时间不在你的时间线上',")
    cond = emit_when(stage)
    if cond == "false":
        lines.append("    skipIf: () => false,")
    else:
        lines.append("    skipIf: (context) => %s," % cond)
    lines.append("    opts: [")
    for o in stage["options"]:
        lines.append(opt(o))
    lines.append("    ],")
    lines.append("  }),")
lines.append("]")
lines.append("")
lines.append("export const SETTLE_STAGES: Stage[] = [")
for stage in settle:
    lines.append("  wheel({")
    lines.append("    id: '%s'," % stage["id"])
    lines.append("    name: '%s'," % stage["name"].replace("'", "\'"))
    lines.append("    tag: PLOT,")
    cond = emit_when(stage)
    if cond == "false":
        lines.append("    skipIf: () => false,")
    else:
        lines.append("    skipIf: (context) => %s," % cond)
    lines.append("    opts: [")
    for o in stage["options"]:
        lines.append(opt(o))
    lines.append("    ],")
    lines.append("  }),")
lines.append("]")
lines.append("")
lines.append("export const ENDING_STAGES: Stage[] = [")
for stage in ending:
    lines.append("  wheel({")
    lines.append("    id: '%s'," % stage["id"])
    lines.append("    name: '%s'," % stage["name"].replace("'", "\'"))
    lines.append("    tag: ENDING,")
    lines.append("    kind: '%s'," % ("ending" if stage["id"] == "ending" else "legacy" if stage["id"] == "legacy" else "dim"))
    cond = emit_when(stage)
    lines.append(
        "    skipIf: () => false," if cond == "false" else "    skipIf: (context) => %s," % cond
    )
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
