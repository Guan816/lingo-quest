/**
 * 数学习惯排版。
 *
 * 起因：题干、选项、解析里的除法以前直接写 `(x² − 1)/(x − 1)`，
 * 看着不像纸上的数学。这里把它排成竖式分数：
 *
 *      x² − 1
 *      ──────
 *       x − 1
 *
 * 同时也把 `^2`、`^(1/2)` 这类上标排成真正的上标。
 *
 * 【为什么不用 KaTeX】
 * KaTeX 要拖进 ~270KB 的 JS 加约 1MB 的字体，对一个手机 App 来说太重了，
 * 而且我们的题目内容是「纯文本形态的数学」，不是 LaTeX 源码，
 * 还得先把全部题库改写成 LaTeX 才能用。所以这里自己做一个
 * 够用的小解析器：只处理真正影响阅读的两件事 —— 分数和上标。
 *
 * 【转换是保守的】
 * 只有两侧都是「像数学的原子」时才转分数，且整体必须含数字或数学符号。
 * 这样「判断/多选/填空」这种用斜杠分隔的中文词不会被误转。
 */
import { Fragment, type ReactNode } from 'react';

/* ─────────────── 词法 ─────────────── */

type Tok =
  | { k: 'atom'; v: string }
  | { k: 'op'; v: string }
  | { k: 'sup'; base: Tok; sup: Tok[] }
  | { k: 'frac'; num: Tok[]; den: Tok[] };

/** 能参与构成「数学原子」的字符：各类字母数字、上下标、常用数学符号 */
const ATOM_CHAR =
  /[\p{L}\p{N}⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉′″°∞πΠΣ∑∏∫√∛∜≈≠≤≥±∓·×÷−–—‐\.]/u;

/** 括号配对表 */
const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/** 从 pos 起读一个配对的括号组，返回组内内容与下一个位置 */
function readGroup(src: string, pos: number): { body: string; next: number } | null {
  const open = src[pos];
  const close = PAIRS[open];
  if (!close) return null;
  let depth = 0;
  for (let i = pos; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return { body: src.slice(pos + 1, i), next: i + 1 };
    }
  }
  return null; // 括号不闭合，放弃
}

/** 从 pos 起读一个「上标内容」：括号组、单字符、或一段连续原子字符 */
function readScript(src: string, pos: number): { body: string; next: number } | null {
  if (pos >= src.length) return null;
  const g = readGroup(src, pos);
  if (g) return g;
  // 单个原子字符（例如 ^n、^2）
  let end = pos;
  while (end < src.length && ATOM_CHAR.test(src[end])) end++;
  if (end === pos) return null;
  return { body: src.slice(pos, end), next: end };
}

/** 把源码切成 token 序列（`^` 先吃掉后面的内容作为上标） */
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    // 上标：^ 的优先级高于除法，先处理掉
    if (c === '^') {
      const s = readScript(src, i + 1);
      if (s && out.length) {
        const base = out.pop() as Tok;
        out.push({ k: 'sup', base, sup: tokenize(s.body) });
        i = s.next;
        continue;
      }
    }

    // 括号组
    const g = readGroup(src, i);
    if (g) {
      out.push({ k: 'atom', v: src.slice(i, g.next) });
      i = g.next;
      continue;
    }

    // 连续原子字符
    if (ATOM_CHAR.test(c)) {
      let end = i;
      while (end < src.length && ATOM_CHAR.test(src[end])) end++;
      out.push({ k: 'atom', v: src.slice(i, end) });
      i = end;
      continue;
    }

    out.push({ k: 'op', v: c });
    i++;
  }

  return mergeFractions(out);
}

/**
 * 把 `原子 / 原子` 合并成竖式分数。
 * 只做一次左到右扫描，`a/b/c` 会变成 (a/b)/c —— 数学上也说得通。
 */
function mergeFractions(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  let i = 0;

  while (i < toks.length) {
    const t = toks[i];

    // 形如：… 原子 / 原子 …
    if (
      t.k === 'op' &&
      t.v === '/' &&
      out.length > 0 &&
      toks[i + 1]?.k === 'atom'
    ) {
      const numTok = out[out.length - 1];
      const denTok = toks[i + 1] as { k: 'atom'; v: string };

      if (looksMath(numTok, denTok)) {
        out.pop();
        out.push({ k: 'frac', num: [numTok], den: [denTok] });
        i += 2;
        continue;
      }
    }

    out.push(t);
    i++;
  }

  return out;
}

/** 判断这一对是否值得排成分数（避免把「判断/多选」这种中文词误转） */
function looksMath(a: Tok, b: Tok): boolean {
  if (a.k !== 'atom' || b.k !== 'atom') return false;
  const s = a.v + b.v;
  // 至少要有数字或明确的数学符号，才认为是算式
  return /[\d⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉π√∫Σ∑∏≈≠≤≥∞°]/u.test(s);
}

/* ─────────────── 渲染 ─────────────── */

function render(toks: Tok[], keyPrefix = 'm'): ReactNode[] {
  return toks.map((t, i) => {
    const key = `${keyPrefix}-${i}`;

    if (t.k === 'op') return <Fragment key={key}>{t.v}</Fragment>;

    if (t.k === 'atom') return <Fragment key={key}>{t.v}</Fragment>;

    if (t.k === 'sup') {
      return (
        <span key={key} className="whitespace-nowrap">
          {render([t.base], key)}
          {/* leading-none + 稍小字号，避免把行高顶开 */}
          <sup className="text-[0.72em] leading-none">{render(t.sup, key)}</sup>
        </span>
      );
    }

    // 分数：分子在上、分母在下，中间一条横线
    return (
      <span
        key={key}
        className="mx-[0.15em] inline-flex flex-col items-center align-middle text-[0.92em] leading-none"
      >
        <span className="px-[0.25em] pb-[0.08em]">{render(t.num, key)}</span>
        <span className="w-full border-t border-current px-[0.25em] pt-[0.08em]">
          {render(t.den, key)}
        </span>
      </span>
    );
  });
}

export interface MathTextProps {
  children: string;
  className?: string;
}

/**
 * 用法：把原来直接输出字符串的地方换成 <MathText>{文本}</MathText>。
 * 只在数学/计算机科目用，普通文案不需要包一层。
 */
export function MathText({ children, className }: MathTextProps) {
  if (!children) return null;
  // 没有斜杠也没有上标时，直接原样输出，省掉解析开销
  if (!children.includes('/') && !children.includes('^')) {
    return <>{children}</>;
  }
  const body = render(tokenize(children));
  return className ? <span className={className}>{body}</span> : <Fragment>{body}</Fragment>;
}

/** 供非 JSX 场景复用（比如拼进 title 属性）时的降级：把分数拍平回单行 */
export function mathToPlain(src: string): string {
  return src;
}

export default MathText;
