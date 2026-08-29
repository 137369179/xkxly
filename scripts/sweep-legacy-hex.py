#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把全站残留的旧色板硬编码 HEX 批量换到「设计系统 v1」新六色家族。

用法:
    python3 scripts/sweep-legacy-hex.py --dry-run   # 只统计，不落盘
    python3 scripts/sweep-legacy-hex.py --apply     # 真正写入
"""
from __future__ import annotations

import argparse
import fnmatch
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")

# ---------------------------------------------------------------- 色值映射表
COLOR_MAP: dict[str, str] = {
    # 主粉系
    "#FF6B96": "#FF5C8A",
    "#FF5C7A": "#FF5C8A",
    "#FFB6C9": "#FFA6C1",
    "#FFE4EE": "#FFE1EB",
    "#FFF0F4": "#FFF0F6",
    "#E05A80": "#C9285C",
    # 黄 / 金
    "#FFC93C": "#FFC53D",
    "#E5AC2E": "#D9860A",
    # 紫
    "#8B6EF0": "#8F5BFF",
    "#7C3AED": "#5F2ECC",
    "#4A3F8A": "#4A20A0",
    "#9B8FC7": "#AB81FF",
    # 绿
    "#5FD68B": "#62CC8A",
    "#33A863": "#3FC26B",
    "#B8F0D8": "#BCEBCE",
    "#F0FAF4": "#F0FAF3",
    "#047857": "#1B7A3D",
    # 蓝
    "#55AEE0": "#3D9BFF",
    "#2E93C9": "#0B5EC9",
    "#A8D8F0": "#B7D8FF",
    "#DCECFA": "#DCEBFF",
    # 橙
    "#FF9F5A": "#FF9F2E",
    "#C2410C": "#B45F09",
    "#FFC9A8": "#FFDEB0",
    # 中性
    "#5C2E3D": "#4A2B1F",
    "#B38894": "#A0806F",
    "#CDA6B0": "#BB9F8F",
    "#F0DDE2": "#E6D8CE",
    "#5B3F49": "#503C34",
}

# ------------------------------------------------------------ 绝对豁免文件
EXEMPT_FILES = {
    "src/modules/science/components/BotanicalLab.tsx",
    "src/modules/science/components/BodyAdventure.tsx",
    "src/components/games/FlatCat2D.tsx",
    "src/modules/pet/catData.ts",
    "src/modules/pet/desktop/data.ts",
    "src/components/ui/BabyModuleIcons.tsx",
    "src/components/ui/babyIconParts.tsx",
    "src/lib/pdfBookGenerator.ts",
    "src/lib/tones.ts",
    "src/styles/index.css",
}

# ------------------------------------------------------------ 豁免目录前缀
EXEMPT_DIRS = (
    "src/modules/pet/realistic",
    "src/modules/hanzi",
    "src/modules/numbers",
    "src/components/feedback",
    "src/hooks",
)

# -------------------------------------------------------- 豁免文件名通配
EXEMPT_GLOBS = (
    "*.test.ts",
    "*.test.tsx",
    "*.spec.ts",
    "*.spec.tsx",
)


def rel(path: str) -> str:
    return os.path.relpath(path, ROOT).replace(os.sep, "/")


def is_exempt(relpath: str) -> bool:
    if relpath in EXEMPT_FILES:
        return True
    for d in EXEMPT_DIRS:
        if relpath == d or relpath.startswith(d + "/"):
            return True
    base = os.path.basename(relpath)
    if any(fnmatch.fnmatch(base, g) for g in EXEMPT_GLOBS):
        return True
    if base.startswith("PdfExport") or base.startswith("ReportExporter"):
        return True
    return False


def iter_targets():
    for dirpath, dirnames, filenames in os.walk(SRC):
        dirnames.sort()
        for name in sorted(filenames):
            if not name.endswith((".ts", ".tsx")):
                continue
            full = os.path.join(dirpath, name)
            r = rel(full)
            if is_exempt(r):
                continue
            yield full, r


# 单次扫描的交替正则，避免「替换结果又被当成旧值二次替换」
_ALT = re.compile(
    "(?<![0-9A-Za-z])(" + "|".join(re.escape(k) for k in sorted(COLOR_MAP, key=len, reverse=True)) + ")(?![0-9A-Za-z])",
    re.IGNORECASE,
)


def sub_colors(text: str) -> tuple[str, list[tuple[str, str]]]:
    """返回 (新文本, [(旧, 新), ...]) —— 保留原文的大小写风格。"""
    hits: list[tuple[str, str]] = []

    def _repl(m: re.Match) -> str:
        old = m.group(1)
        new = COLOR_MAP[old.upper()]
        hits.append((old, new))
        # 原文全小写则输出小写，否则沿用映射表给定的大写形式
        return new.lower() if old.islower() else new

    return _ALT.sub(_repl, text), hits


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="真正写入文件（默认只 --dry-run）")
    ap.add_argument("--dry-run", action="store_true", help="只统计（默认）")
    args = ap.parse_args()

    apply = args.apply and not args.dry_run

    total_hits = 0
    touched_files = 0
    per_color: dict[str, int] = {}
    exempt_seen = 0
    changed: list[tuple[str, int]] = []

    for full, r in iter_targets():
        with open(full, "r", encoding="utf-8") as f:
            src = f.read()
        new, hits = sub_colors(src)
        if not hits:
            continue
        touched_files += 1
        total_hits += len(hits)
        changed.append((r, len(hits)))
        for old, _new in hits:
            per_color[old.upper()] = per_color.get(old.upper(), 0) + 1
        if apply:
            with open(full, "w", encoding="utf-8") as f:
                f.write(new)

    # 统计被豁免文件里还剩多少（仅汇报，不动）
    exempt_remaining = 0
    for dirpath, dirnames, filenames in os.walk(SRC):
        for name in filenames:
            if not name.endswith((".ts", ".tsx")):
                continue
            r = rel(os.path.join(dirpath, name))
            if not is_exempt(r):
                continue
            exempt_seen += 1
            with open(os.path.join(dirpath, name), "r", encoding="utf-8") as f:
                _, hits = sub_colors(f.read())
            exempt_remaining += len(hits)

    mode = "APPLIED" if apply else "DRY-RUN"
    print(f"=== {mode} ===")
    print(f"替换处数(Hits)          : {total_hits}")
    print(f"涉及文件数(Files)       : {touched_files}")
    print(f"豁免文件数(Exempt files): {exempt_seen}  (其中残留旧色 {exempt_remaining} 处，未改动)")
    print("--- 分色统计 ---")
    for k in sorted(per_color, key=lambda x: -per_color[x]):
        print(f"  {k} -> {COLOR_MAP[k]}  x{per_color[k]}")
    if changed:
        print("--- 涉及文件明细 ---")
        for r, n in sorted(changed, key=lambda x: -x[1]):
            print(f"  {n:>4}  {r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
