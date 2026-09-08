#!/usr/bin/env python3
"""验证构建产物模块图完整性（不依赖浏览器）。

从 index.html 入口出发，递归解析所有 ESM import/export 的 chunk 引用，
确认每个被引用的文件都真实存在 —— 这能发现「index.html 引用了不存在的 chunk」
这类会导致浏览器拒绝执行模块、React 无法水合的致命问题。

用法: python3 verify_module_graph.py <dist_dir>
"""
import re
import sys
from pathlib import Path

# 匹配 ESM 的 import/export ... from "./xxx.js"
FROM_RE = re.compile(r'(?:import|export)\s*(?:\{[^}]*\}|\*\s*as\s+\w+|\w+)?\s*from\s*["\']([^"\']+)["\']')
# 匹配动态 import("./xxx.js")
DYN_RE = re.compile(r'import\s*\(\s*["\']([^"\']+)["\']\s*\)')


def main():
    dist = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
    index = dist / "index.html"
    if not index.exists():
        print(f"❌ 入口不存在: {index}")
        return 1

    html = index.read_text(encoding="utf-8")
    entries = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html)
    entries = [e.lstrip("./") for e in entries if e.endswith(".js")]
    if not entries:
        print("❌ index.html 中未找到 script 入口")
        return 1

    print(f"入口: {entries}")

    seen = set()
    missing = []
    queue = [e for e in entries]
    count = 0

    while queue:
        rel = queue.pop()
        if rel in seen:
            continue
        seen.add(rel)
        f = dist / rel
        if not f.exists():
            missing.append(rel)
            continue
        count += 1
        try:
            src = f.read_text(encoding="utf-8")
        except Exception as ex:
            print(f"⚠️ 读取失败 {rel}: {ex}")
            continue
        base = f.parent
        for m in list(FROM_RE.finditer(src)) + list(DYN_RE.finditer(src)):
            spec = m.group(1)
            if not spec.startswith("."):
                continue  # 外部依赖（如裸模块名）
            try:
                target = (base / spec).resolve().relative_to(dist.resolve())
            except Exception:
                continue
            queue.append(str(target))

    print(f"\n=== 模块图验证 ===")
    print(f"可达 chunk 数: {count}")
    print(f"缺失引用: {len(missing)}")
    for m in missing[:10]:
        print(f"  ❌ {m}")

    if missing:
        print("\n❌ 模块图不完整：存在被引用但缺失的 chunk")
        return 1
    print("✅ 模块图完整：所有被引用 chunk 均存在")
    return 0


if __name__ == "__main__":
    sys.exit(main())
