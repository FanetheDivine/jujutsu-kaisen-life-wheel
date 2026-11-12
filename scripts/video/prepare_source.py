"""一次性数据清洗：tmp/stages.json -> scripts/video/source.json（提交用数据源）。"""

import json
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")

raw = json.load(open("tmp/stages.json", encoding="utf-8"))

CJK = re.compile(r"[\u4e00-\u9fff]")
MAX_OPTIONS = 60

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
}


def clean(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).strip()
    t = re.sub(r"\s+", "", t)
    t = re.sub(r"^[三注口污]+", "", t)
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
    """精确去重 + 同长度汉明距离 <=1 的变体合并。"""
    order = []
    bucket = {}
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


stages = []
for i, s in enumerate(raw, 1):
    title = clean(s["title"])
    counts = {}
    for k, v in s.get("outcomes", {}).items():
        k2 = clean(k)
        if k2 and not is_fragment(k2):
            counts[k2] = counts.get(k2, 0) + v
    labels = []
    for sec in s["sectors"]:
        sec = clean(sec)
        if is_fragment(sec) or len(CJK.findall(sec)) < 1 or len(sec) > 24:
            continue
        labels.append((sec, counts.get(sec, 0)))
    for k, v in counts.items():
        if not any(k == lb for lb, _ in labels):
            labels.append((k, v))
    merged = hamming_join(labels)
    options = [
        {"label": m["label"], "count": m["count"], "base": 1 + m["count"]}
        for m in merged
    ]
    options.sort(key=lambda o: (-o["count"], o["label"]))
    options = options[:MAX_OPTIONS]
    stages.append(
        {
            "id": "w%03d" % i,
            "cid": s["id"],
            "title": title,
            "pos": round(s.get("pos", 0), 4),
            "nEps": s.get("n_eps", len(s.get("eps", []))),
            "options": options,
        }
    )

out = {"source": "毓彧庾《咒术转盘》ep74-ep82+特别篇 逐帧 OCR 还原", "stages": stages}
json.dump(out, open("scripts/video/source.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("stages", len(stages), "options", sum(len(s["options"]) for s in stages))
empty = [s["id"] for s in stages if len(s["options"]) < 2]
print("stages with <2 options:", len(empty), empty[:20])
print("max options:", max(len(s["options"]) for s in stages))
