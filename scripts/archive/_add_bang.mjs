/**
 * P3-4b 辅助：根据 tsc 错误位置，为「可证明安全」的索引访问追加非空断言 `!`。
 * 设计原则（吸取上一轮 AST 删除翻车教训）：
 *   - 纯追加，绝不删除任何节点/行
 *   - 优先修到 const 声明处（一处修复消除多处下游报错）
 *   - 只处理白名单错误码；无法确定的一律跳过并列入 MANUAL
 * 用完即删。
 */
import { readFileSync } from 'node:fs';
import { Project, SyntaxKind, Node } from 'ts-morph';

const LOG = process.argv[2];
const DRY = process.argv.includes('--dry');
const CODES = new Set(['TS2532', 'TS18048', 'TS2322', 'TS2345', 'TS2538', 'TS2722', 'TS2488', 'TS2769']);

const re = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const errs = [];
for (const line of readFileSync(LOG, 'utf8').split('\n')) {
  const m = re.exec(line);
  if (!m) continue;
  const [, file, ln, col, code] = m;
  if (!CODES.has(code)) continue;
  errs.push({ file, line: Number(ln), col: Number(col), code });
}

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' });

const typeHasUndefined = (node) => {
  try {
    const t = node.getType();
    if (t.isUndefined()) return true;
    return t.isUnion() && t.getUnionTypes().some((u) => u.isUndefined());
  } catch {
    return false;
  }
};

// 收集「待追加 ! 的绝对位置」，最后统一按倒序插入文本，避免位置漂移
const inserts = new Map(); // filePath -> Set<pos>
const manual = [];

const addInsert = (sf, pos) => {
  const p = sf.getFilePath();
  if (!inserts.has(p)) inserts.set(p, new Set());
  inserts.get(p).add(pos);
};

for (const e of errs) {
  const sf = project.getSourceFile(e.file);
  if (!sf) { manual.push(`${e.file}:${e.line} NO SOURCEFILE`); continue; }
  let pos;
  try {
    pos = sf.compilerNode.getPositionOfLineAndCharacter(e.line - 1, e.col - 1);
  } catch { manual.push(`${e.file}:${e.line}:${e.col} BAD POS`); continue; }

  const deepest = sf.getDescendantAtPos(pos);
  if (!deepest) { manual.push(`${e.file}:${e.line}:${e.col} NO NODE`); continue; }

  // 收集所有「起始位置相同」的祖先链候选
  const chain = [];
  let cur = deepest;
  while (cur && cur.getStart() === pos) {
    chain.push(cur);
    cur = cur.getParent();
  }

  // 取「类型含 undefined」的最大候选
  let target = null;
  for (const n of chain) {
    if (typeHasUndefined(n)) target = n;
  }

  // 解构交换回退：[a[i], a[j]] = [a[j], a[i]] —— 左值在数组字面量内，需给右侧同序号元素加 !
  if (!target) {
    let swapped = false;
    for (const n of chain) {
      const arrLit = n.getParent();
      if (!arrLit || !Node.isArrayLiteralExpression(arrLit)) continue;
      const bin = arrLit.getParent();
      if (bin && Node.isBinaryExpression(bin) &&
          bin.getOperatorToken().getKind() === SyntaxKind.EqualsToken &&
          bin.getLeft() === arrLit && Node.isArrayLiteralExpression(bin.getRight())) {
        for (const el of bin.getRight().getElements()) {
          if (typeHasUndefined(el)) addInsert(sf, el.getEnd());
        }
        swapped = true;
        break;
      }
    }
    if (swapped) continue;
  }

  // 结构性回退：错误位置落在语句/属性赋值上时，下钻到真正需要断言的表达式
  if (!target) {
    for (const n of chain) {
      let cand = null;
      if (Node.isReturnStatement(n)) cand = n.getExpression();
      else if (Node.isPropertyAssignment(n)) cand = n.getInitializer();
      else if (Node.isBinaryExpression(n) && n.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
        // 解构交换 [a[i], a[j]] = [a[j], a[i]]：需给右侧对应元素加 !
        const left = n.getLeft();
        const right = n.getRight();
        if (Node.isArrayLiteralExpression(left) && Node.isArrayLiteralExpression(right)) {
          for (const el of right.getElements()) {
            if (typeHasUndefined(el)) addInsert(sf, el.getEnd());
          }
          cand = null;
          target = 'HANDLED';
          break;
        }
        cand = right;
      }
      if (cand && typeHasUndefined(cand)) { target = cand; break; }
    }
  }
  if (target === 'HANDLED') continue;

  // JSX 属性：char={word.word[0]} —— 下钻到花括号内表达式
  if (target && Node.isJsxAttribute(target)) {
    const ini = target.getInitializer();
    if (ini && Node.isJsxExpression(ini)) {
      const inner = ini.getExpression();
      if (inner && typeHasUndefined(inner)) target = inner;
    }
  }

  // 属性赋值 / 二元赋值：改为处理其值表达式
  if (target && Node.isPropertyAssignment(target)) {
    const init = target.getInitializer();
    if (init && typeHasUndefined(init)) target = init;
  }
  if (target && Node.isBinaryExpression(target) &&
      target.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
    const right = target.getRight();
    if (typeHasUndefined(right)) target = right;
  }

  // 解构声明回退：const [a, b] = arr[i] —— 报错落在绑定名上，实际应给初始化器加 !
  if (!target) {
    let up = deepest;
    while (up && !Node.isVariableDeclaration(up) && !Node.isStatement(up)) up = up.getParent();
    if (up && Node.isVariableDeclaration(up)) {
      const ini = up.getInitializer();
      if (ini && typeHasUndefined(ini)) { addInsert(sf, ini.getEnd()); continue; }
    }
  }

  if (!target) { manual.push(`${e.file}:${e.line}:${e.col} [${e.code}] no undefined-typed node`); continue; }

  // 若 target 是标识符且指向本文件内 const 声明（初始化器为索引访问），改修声明处
  if (Node.isIdentifier(target)) {
    const defs = target.getDefinitionNodes();
    const decl = defs.find((d) => Node.isVariableDeclaration(d) && d.getSourceFile() === sf);
    if (decl) {
      const init = decl.getInitializer();
      if (init && (Node.isElementAccessExpression(init) || Node.isCallExpression(init)) && typeHasUndefined(init)) {
        addInsert(sf, init.getEnd());
        continue;
      }
      // 声明无法安全处理（如 useState 解构），退回在使用点加 !
    }
  }

  const kind = target.getKind();
  const OK = [
    SyntaxKind.ElementAccessExpression,
    SyntaxKind.PropertyAccessExpression,
    SyntaxKind.Identifier,
    SyntaxKind.CallExpression,
  ];
  if (!OK.includes(kind)) {
    manual.push(`${e.file}:${e.line}:${e.col} [${e.code}] kind=${target.getKindName()} :: ${target.getText().slice(0, 70)}`);
    continue;
  }
  // 赋值左侧不能加 ! —— 跳过
  const parent = target.getParent();
  if (parent && Node.isBinaryExpression(parent) &&
      parent.getOperatorToken().getKind() === SyntaxKind.EqualsToken &&
      parent.getLeft() === target) {
    manual.push(`${e.file}:${e.line}:${e.col} [${e.code}] assignment target :: ${target.getText().slice(0, 60)}`);
    continue;
  }
  addInsert(sf, target.getEnd());
}

let total = 0;
for (const [filePath, posSet] of inserts) {
  const sf = project.getSourceFile(filePath);
  let text = sf.getFullText();
  const positions = [...posSet].sort((a, b) => b - a);
  for (const p of positions) {
    if (text[p] === '!') continue; // 已有断言
    text = text.slice(0, p) + '!' + text.slice(p);
    total++;
  }
  if (!DRY) sf.replaceWithText(text);
}

if (!DRY) project.saveSync();

console.log(`errors scanned : ${errs.length}`);
console.log(`bangs inserted : ${total}${DRY ? ' (dry-run)' : ''}`);
console.log(`manual needed  : ${manual.length}`);
if (manual.length) {
  console.log('\n=== MANUAL ===');
  for (const m of manual.slice(0, 60)) console.log(m);
}
