/**
 * 纸面数学排版引擎。
 *
 * 【目标】让屏幕上的式子长成纸上那样：
 *
 *        lim    eˣ − 1 − x       1
 *       x→0    ───────────  =  ───
 *                     x²           2
 *
 * 具体要排对这几件事：
 *   1. 分式 —— 分子在上、分母在下，中间一条真横线（不是斜杠）
 *   2. 极限 —— lim 下面挂 x→0；极限值在 lim 正下方而不是右侧
 *   3. 求和/求积/积分 —— ∑ 上下挂范围，∫ 上下挂限
 *   4. 根号 —— √ 带一条上横线盖住被开方数
 *   5. 上下标 —— eˣ、x²、aₙ、e^{-x²}
 *   6. 矩阵 / 方程组 —— 大括号包住的二维排布
 *
 * 【为什么自己写，不用 KaTeX】
 * KaTeX 要 270KB JS 加约 1MB 字体（一个字体包 30 个 woff2 文件），
 * 对一个手机 App 太重。而且我们题库里写的是「纯文本形态的数学」
 * —— lim(x→0) (e^x − 1 − x) / x² —— 不是 LaTeX 源码，
 * 硬接 KaTeX 就得把整个题库和 AI 输出全部改写成 \lim_{x\to 0}\frac{}{}。
 * 所以这里自己做一个能读懂人话的小引擎：**输入照旧，输出变纸面**。
 *
 * 【两条渲染路径】
 *   - <MathText>     行内数学：轻量排版，随文字流动，不撑行高
 *   - <MathBlock>    公式块：行间公式，单独占行、水平居中、稍大字号，
 *                    分式与根号按完整尺寸排（就是纸质试卷里那一行）
 *
 * 解析与渲染分离：tokenize 只做一次，渲染按需选紧凑/舒展两种模式。
 */
import { Fragment, type ReactNode } from 'react';

/* ═══════════════════ 词法：把纯文本切成结构 ═══════════════════ */

type Tok =
  | { k: 'text'; v: string }
  | { k: 'sup'; base: Tok[]; sup: Tok[] }
  | { k: 'sub'; base: Tok[]; sub: Tok[] }
  | { k: 'frac'; num: Tok[]; den: Tok[] }
  | { k: 'sqrt'; body: Tok[] }
  /** 大算符：∑ ∏ ∫ ∐ ⋃ ⋂ lim max min，带上下限 */
  | { k: 'bigop'; op: string; under?: Tok[]; over?: Tok[]; isLim?: boolean }
  /** 取模/整除这类前后有空隙的关系符 */
  | { k: 'rel'; v: string };

/** 能构成「数学原子」的字符：字母数字、上下标、常用数学符号 */
const ATOM_CHAR =
  /[\p{L}\p{N}⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉′″°∞πΠΣ∑∏∫∐√∛∜≈≠≤≥±∓·×÷−–—‐\.′]/u;

/** 括号配对表 */
const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '（': '）' };

/** 大算符表：这些符号后面可能跟上下限 */
const BIG_OPS = ['lim', 'max', 'min', 'sup', 'inf', '∑', '∏', '∐', '∫', '∬', '∭', '∮', '⋃', '⋂'];

/** 允许出现在「上下限」里的字符（要够宽，因为 lim 下面是 x→0 一整串） */
const LIMIT_CHAR = /[\p{L}\p{N}→←↔⇒⇔=≠<>≤≥+\-−·/^()\[\]{}，,.\s∞π′]/u;

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
  return null; // 括号不闭合，放弃转换
}

/** 从 pos 起读一个「上标/下标内容」：括号组、单字符、或一段连续原子字符 */
function readScript(src: string, pos: number): { body: string; next: number } | null {
  if (pos >= src.length) return null;
  const g = readGroup(src, pos);
  if (g) return g;
  let end = pos;
  while (end < src.length && ATOM_CHAR.test(src[end])) end++;
  if (end === pos) return null;
  return { body: src.slice(pos, end), next: end };
}

/**
 * 读一段上下限。
 *
 * lim 的写法有三种，都要认：
 *   lim(x→0)     ← 题库里最常见的写法
 *   lim_{x→0}    ← LaTeX 味
 *   下面直接跟 x→0  ← 少见
 * 前两种看到括号就吃，第三种只在「内容明显像极限条件」时才吃。
 */
function readLimits(src: string, pos: number): { over?: string; under?: string; next: number } {
  // 跳过空格
  let i = pos;
  while (i < src.length && src[i] === ' ') i++;

  const braced = readGroup(src, i);
  const bracedRaw = braced ? braced : null;

  // 花括号 { } 形式（LaTeX 味）
  if (src[i] === '_' || src[i] === '^') {
    const under = src[i] === '_' ? readScript(src, i + 1) : null;
    const afterUnder = under ? under.next : i + 1;
    const over =
      src[afterUnder] === '^' ? readScript(src, afterUnder + 1) : null;
    return {
      under: under?.body,
      over: over?.body,
      next: over ? over.next : afterUnder,
    };
  }

  if (bracedRaw && /[→←↔⇒⇔=<>]/.test(bracedRaw.body)) {
    return { under: bracedRaw.body, next: bracedRaw.next };
  }

  // 没有括号，直接跟条件（如 lim x→∞ 后面接式子）
  let end = i;
  while (end < src.length && end - i < 12 && LIMIT_CHAR.test(src[end])) {
    // 遇到「空格 + 字母」就停，避免把整个式子吃进来
    if (src[end] === ' ' && end + 1 < src.length && /[a-z(]/i.test(src[end + 1]) && end > i) break;
    end++;
  }
  const probed = src.slice(i, end).trim();
  if (probed && /[→←↔⇒⇔]/.test(probed)) {
    return { under: probed, next: end };
  }
  return { next: pos };
}

/** 把源码切成 token 序列 */
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;

  while (i < src.length) {
    // ── 大算符（lim / ∑ / ∫ …），可能带上下限 ──
    const big = BIG_OPS.find((b) => src.startsWith(b, i));
    if (big) {
      // 「limit」这种英文词不当作 lim
      const after = src[i + big.length];
      if (!(big === 'lim' || big === 'max' || big === 'min' || big === 'sup' || big === 'inf') ||
        after === undefined || !/[a-zA-Z]/.test(after)) {
        const lim = readLimits(src, i + big.length);
        if (lim.under || lim.over) {
          out.push({
            k: 'bigop',
            op: big,
            under: lim.under ? tokenize(lim.under) : undefined,
            over: lim.over ? tokenize(lim.over) : undefined,
            isLim: big === 'lim' || big === 'max' || big === 'min' || big === 'sup' || big === 'inf',
          });
          i = lim.next;
          continue;
        }
      }
    }

    // ── 根号：√ 后面的括号组，或紧跟的一段原子 ──
    if (src[i] === '√' || src[i] === '∛' || src[i] === '∜') {
      const g = readGroup(src, i + 1);
      if (g) {
        out.push({ k: 'sqrt', body: tokenize(g.body) });
        i = g.next;
        continue;
      }
      // √x 这种只盖一个原子
      let end = i + 1;
      while (end < src.length && ATOM_CHAR.test(src[end])) end++;
      if (end > i + 1) {
        out.push({ k: 'sqrt', body: tokenize(src.slice(i + 1, end)) });
        i = end;
        continue;
      }
    }

    const c = src[i];

    // ── 上标：^ 的优先级高于除法，先处理 ──
    if (c === '^') {
      const s = readScript(src, i + 1);
      if (s && out.length) {
        const base = out.pop() as Tok;
        out.push({ k: 'sup', base: [base], sup: tokenize(s.body) });
        i = s.next;
        continue;
      }
    }

    // ── 下标：_ ──
    if (c === '_') {
      const s = readScript(src, i + 1);
      if (s) {
        const base = out.length ? [(out.pop() as Tok)] : [];
        out.push({ k: 'sub', base, sub: tokenize(s.body) });
        i = s.next;
        continue;
      }
    }

    // ── 括号组：整段当一个原子 ──
    // ⚠️ 但组内还要继续分词！以前直接把整串当成一块死文本，
    // 于是 `(e^x − 1 − x)` 里的 `^` 永远不会变成上标，
    // `f(x) = (x² − 1)/(x − 1)` 这种也没法排成分数。
    // 现在把「左括号 + 组内 token + 右括号」拼成一个完整表达式，
    // 比分数字段内识别出「(a)/(b)」时才能正确把括号一起拿走。
    const g = readGroup(src, i);
    if (g) {
      const inner = tokenize(g.body);
      const whole: Tok[] = [
        { k: 'text', v: src[i] },
        ...inner,
        { k: 'text', v: src[g.next - 1] },
      ];
      out.push(...whole);
      i = g.next;
      continue;
    }

    // ── 连续原子字符 ──
    if (ATOM_CHAR.test(c)) {
      let end = i;
      while (end < src.length && ATOM_CHAR.test(src[end])) end++;
      out.push({ k: 'text', v: src.slice(i, end) });
      i = end;
      continue;
    }

    out.push({ k: 'text', v: c });
    i++;
  }

  return mergeFractions(out);
}

/**
 * 把 `原子 / 原子` 合并成竖式分数。
 *
 * ⚠️ 必须容忍斜杠两侧的空格！
 * 题库里的写法是「(3x² − 2x + 1) / (2x² + 5)」——
 * 分词器会把两个空格各自拆成独立 token，于是原来的实现拿到的是
 * 「分子 = 空格、分母 = 空格」，looksMath 判定 false，分数永远合不出来。
 * 表现就是题干里显示成一行斜杠，纸上那种竖式分数完全没生效。
 * 这里先把两侧空白跳过去，再判断真正的分子/分母。
 *
 * 只做一次左到右扫描，`a/b/c` 会变成 (a/b)/c —— 数学上也说得通。
 * 分数是「纸面感」最关键的改进点：斜杠写法在手机上尤其难读。
 */
function mergeFractions(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  let i = 0;

  /** 该 token 是不是「无意义的空白占位」 */
  const isSpace = (t: Tok | undefined): boolean =>
    !!t && t.k === 'text' && t.v.trim() === '';

  /**
   * 从下标 idx 起取一个「分数操作数」。
   *
   * 分两种：
   *   1. 以 `(` 开头 → 一直吃到配对的 `)`，整组当一个操作数
   *      （括号组在分词阶段已经被拆开了，这里要合回去，
   *        否则 `(x² − 1)/(x − 1)` 的分子会被误认成单个 `)`）
   *   2. 否则就是一个原子的 token（text/sup/sub/frac/sqrt）
   *
   * 返回 [操作数 token 数组, 下一个待处理下标]；取不到返回 null。
   */
  const takeOperand = (idx: number, dir: 1 | -1): [Tok[], number] | null => {
    if (dir === 1) {
      if (idx >= toks.length) return null;
      const first = toks[idx];
      // 情形 1：括号组
      if (first.k === 'text' && first.v === '(') {
        let depth = 0;
        let j = idx;
        for (; j < toks.length; j++) {
          const t = toks[j];
          if (t.k !== 'text') continue;
          if (t.v.includes('(')) depth++;
          if (t.v.includes(')')) {
            depth--;
            if (depth === 0) return [toks.slice(idx, j + 1), j + 1];
          }
        }
        return null; // 括号不闭合，不冒险
      }
      // 情形 2：单个原子
      if (['text', 'sup', 'sub', 'frac', 'sqrt'].includes(first.k)) {
        return [[first], idx + 1];
      }
      return null;
    }

    // dir === -1：向左取，只在 out 里找
    if (idx < 0) return null;
    const last = out[idx];
    // 情形 1：以 `)` 结尾 → 向左找到配对的 `(`
    if (last.k === 'text' && last.v === ')') {
      let depth = 0;
      let j = idx;
      for (; j >= 0; j--) {
        const t = out[j];
        if (t.k !== 'text') continue;
        if (t.v.includes(')')) depth++;
        if (t.v.includes('(')) {
          depth--;
          if (depth === 0) return [out.slice(j, idx + 1), j];
        }
      }
      return null;
    }
    if (['text', 'sup', 'sub', 'frac', 'sqrt'].includes(last.k)) {
      return [[last], idx];
    }
    return null;
  };

  while (i < toks.length) {
    const t = toks[i];

    if (t.k === 'text' && t.v === '/') {
      // ── 向左找分子：跳过空白 ──
      let li = out.length - 1;
      while (li >= 0 && isSpace(out[li])) li--;

      // ── 向右找分母：跳过空白 ──
      let ri = i + 1;
      while (ri < toks.length && isSpace(toks[ri])) ri++;

      const left = takeOperand(li, -1);
      const right = takeOperand(ri, 1);

      if (left && right) {
        const [numToks, numStart] = left;
        const [denToks, denEnd] = right;
        // 用整组内容做「像不像算式」的判断（把非文本 token 当作有值）
        const probe = (xs: Tok[]): Tok => ({
          k: 'text',
          v: xs.map((x) => (x.k === 'text' ? x.v : '1')).join(''),
        });
        if (looksMath(probe(numToks), probe(denToks))) {
          out.length = numStart;
          out.push({ k: 'frac', num: numToks, den: denToks });
          i = denEnd;
          continue;
        }
      }
    }

    out.push(t);
    i++;
  }

  return out;
}

/**
 * 判断这一对是否值得排成分数。
 * 避免把「判断/多选」这种用斜杠分隔的中文词误转成竖式。
 */
function looksMath(a: Tok, b: Tok): boolean {
  const text = (t: Tok): string => (t.k === 'text' ? t.v : '');
  const s = text(a) + text(b);
  // 至少要有数字或明确的数学符号，才认为是算式
  return /[\d⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉π√∫Σ∑∏≈≠≤≥∞°]/u.test(s);
}

/* ═══════════════════ 渲染 ═══════════════════ */

/**
 * 渲染模式。
 *   inline —— 行内，字号收着，别把行高顶开
 *   block  —— 行间公式，舒展排版，就是纸质卷子上单独那一行
 */
type Mode = 'inline' | 'block';

interface Ctx {
  mode: Mode;
}

/** 分式：分子在上、分母在下，中间一条横线 */
function Frac({ num, den, ctx, k }: { num: Tok[]; den: Tok[]; ctx: Ctx; k: string }) {
  const block = ctx.mode === 'block';
  return (
    <span
      className={
        block
          ? 'mx-[0.18em] inline-flex flex-col items-center align-middle text-[1em] leading-none'
          : // 行内标一点：0.94em 是「看得清但不太挤」的折中
            'mx-[0.14em] inline-flex flex-col items-center align-middle text-[0.94em] leading-none'
      }
    >
      <span className={block ? 'px-[0.3em] pb-[0.14em]' : 'px-[0.25em] pb-[0.08em]'}>
        <Inner toks={num} ctx={ctx} k={`${k}n`} />
      </span>
      <span className="w-full border-t border-current px-[0.3em] pt-[0.1em]">
        <Inner toks={den} ctx={ctx} k={`${k}d`} />
      </span>
    </span>
  );
}

/** 根号：√ 符号 + 一条盖住被开方数的上横线 */
function Sqrt({ body, ctx, k }: { body: Tok[]; ctx: Ctx; k: string }) {
  return (
    <span className="inline-flex items-stretch align-middle">
      <span className="self-start leading-none">√</span>
      {/* 那条盖住内容的横线，用 border-t 做，随内容自动伸缩 */}
      <span className="border-t border-current pt-[0.18em] text-[0.96em]">
        <Inner toks={body} ctx={ctx} k={`${k}s`} />
      </span>
    </span>
  );
}

/**
 * 大算符。
 *
 * lim 最特殊：纸面上 `x→0` 是写在 lim **正下方**的，
 * 而且字号要收小（否则「x → 0」比 lim 还宽，看着很怪）。
 * ∑ / ∫ 这类上下限都挂，同理。
 */
function BigOp({
  op,
  under,
  over,
  isLim,
  ctx,
  k,
}: {
  op: string;
  under?: Tok[];
  over?: Tok[];
  isLim?: boolean;
  ctx: Ctx;
  k: string;
}) {
  const noScript = !under && !over;
  // 单独的 lim / ∫ 不需要特殊处理，直接当普通字排
  if (noScript) return <Fragment>{op}</Fragment>;

  const block = ctx.mode === 'block';

  return (
    <span className={`inline-flex flex-col items-center align-middle ${block ? 'mx-[0.1em]' : 'mx-[0.06em]'}`}>
      {over && (
        <span className={`leading-none text-ink ${block ? 'text-[0.72em]' : 'text-[0.66em]'}`}>
          <Inner toks={over} ctx={ctx} k={`${k}o`} />
        </span>
      )}
      <span className={`leading-none ${block ? '' : 'text-[0.96em]'}`}>{op}</span>
      {under && (
        <span
          className={`leading-none text-ink-soft ${block ? 'text-[0.72em]' : 'text-[0.66em]'} ${
            // lim 的下标贴着底边；∑/∫ 的上下限留一点空隙
            isLim ? 'mt-[0.06em]' : 'mt-[0.1em]'
          }`}
        >
          <Inner toks={under} ctx={ctx} k={`${k}u`} />
        </span>
      )}
    </span>
  );
}

/** 递归渲染一组 token */
function Inner({ toks, ctx, k }: { toks: Tok[]; ctx: Ctx; k: string }): ReactNode {
  return (
    <>
      {toks.map((t, i) => {
        const key = `${k}-${i}`;
        const block = ctx.mode === 'block';

        switch (t.k) {
          case 'text':
            return <Fragment key={key}>{t.v}</Fragment>;

          case 'sup':
            return (
              <span key={key} className="whitespace-nowrap">
                <Inner toks={t.base} ctx={ctx} k={key} />
                {/* leading-none 避免把行高顶开 */}
                <sup className={block ? 'text-[0.7em] leading-none' : 'text-[0.72em] leading-none'}>
                  <Inner toks={t.sup} ctx={ctx} k={`${key}s`} />
                </sup>
              </span>
            );

          case 'sub':
            return (
              <span key={key} className="whitespace-nowrap">
                <Inner toks={t.base} ctx={ctx} k={key} />
                <sub className={block ? 'text-[0.7em] leading-none' : 'text-[0.72em] leading-none'}>
                  <Inner toks={t.sub} ctx={ctx} k={`${key}b`} />
                </sub>
              </span>
            );

          case 'frac':
            return <Frac key={key} num={t.num} den={t.den} ctx={ctx} k={key} />;

          case 'sqrt':
            return <Sqrt key={key} body={t.body} ctx={ctx} k={key} />;

          case 'bigop':
            return (
              <BigOp
                key={key}
                op={t.op}
                under={t.under}
                over={t.over}
                isLim={t.isLim}
                ctx={ctx}
                k={key}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
}

/* ═══════════════════ 对外组件 ═══════════════════ */

/** 只有出现这些特征时才值得走解析器 —— 否则原样输出，省掉开销 */
const NEEDS_PARSING = /[/^_√∑∏∫∐]|\blim\b|lim\(/;

export interface MathTextProps {
  children: string;
  className?: string;
}

/**
 * 行内数学文本。
 *
 * 用法：把原来直接输出字符串的地方换成 <MathText>{文本}</MathText>。
 * 只在数学/计算机科目用，普通文案不需要包一层。
 */
export function MathText({ children, className }: MathTextProps) {
  if (!children) return null;
  if (!NEEDS_PARSING.test(children)) {
    return className ? <span className={className}>{children}</span> : <>{children}</>;
  }
  const body = <Inner toks={tokenize(children)} ctx={{ mode: 'inline' }} k="m" />;
  return className ? <span className={className}>{body}</span> : <Fragment>{body}</Fragment>;
}

/**
 * 行间公式块：**单独占一行、水平居中、字号略大**。
 *
 * 这是「文字和公式不能混排」这条要求的落点 ——
 * 解析里的每一步，凡是核心式子都用这个组件单独排一行。
 * 分式与根号在这里按完整尺寸渲染，读起来和纸质卷子一致。
 */
export function MathBlock({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  if (!children) return null;
  if (!NEEDS_PARSING.test(children)) {
    // 纯文字也能居中当结论行用
    return (
      <p className={`my-2 text-center text-[14px] font-black leading-relaxed text-ink ${className}`}>
        {children}
      </p>
    );
  }
  return (
    <p
      className={`my-2.5 overflow-x-auto whitespace-nowrap text-center text-[15px] font-bold leading-[1.5] text-ink ${className}`}
      // 长公式允许横向滚动，不换行 —— 换行会把分数拆得没法读
      style={{ scrollbarWidth: 'none' }}
    >
      <Inner toks={tokenize(children)} ctx={{ mode: 'block' }} k="b" />
    </p>
  );
}

/**
 * 判断一段文字是不是「公式行」。
 *
 * 解析里 AI 会混着给说明和公式，我们需要挑出公式行用 MathBlock 排。
 * 判据保守：整行短、且含数学符号、且中文占比低 —— 宁可漏判也不误判，
 * 把说明文字当成公式居中会很怪。
 */
export function looksLikeFormula(line: string): boolean {
  const s = line.trim();
  if (!s || s.length > 60) return false;
  if (!/[=＝<>≤≥→∫∑∏√^_/+\-−×·]/.test(s)) return false;
  // 中文字符占比超过三成就当说明文字
  const cn = (s.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  return cn / s.length < 0.3;
}

/** 供非 JSX 场景复用（比如拼进导出文本）时的降级：拍平回单行 */
export function mathToPlain(src: string): string {
  // 导出纯文本时把结构还原成斜杠写法，至少机器还能算
  return src
    .replace(/\s*lim\s*\(([^)]*)\)/g, 'lim($1) ')
    .replace(/\s*lim\s*_\{([^}]*)\}/g, 'lim($1) ')
    .replace(/√\(/g, '√(')
    .trim();
}

export default MathText;
