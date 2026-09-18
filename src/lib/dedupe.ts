/**
 * 题库语义去重。
 *
 * ═══════════════════════════════════════════════════════════════
 *  为什么不能用现有的 normalizeText
 * ═══════════════════════════════════════════════════════════════
 *
 * quiz.ts 的 normalizeText() 和 useFormulaBookStore 的 normalize()
 * 都是**精确匹配** —— 去掉空白标点后完全相同才算重复。
 *
 * 但 AI 出的题经常只改数字或语序：
 *
 *   求 lim(x→0) (e^x − 1 − x) / x²
 *   计算 lim(x→0) (e^x − 1 − x) / x^2
 *
 * 归一化后仍然不同，可它们显然是同一道题。
 * 所以这里做的是**相似度**判定，不是相等判定。
 *
 * ── 算法选择 ──
 * 字符 3-gram + 余弦相似度。不引依赖、几十行、对中文短文本效果好。
 * 中文按字切即可（「等价无穷小」拆成 等价无/价无穷/无穷小），
 * 不需要分词 —— 引入分词器会让包体积和构建复杂度都上一个台阶，
 * 而题库去重根本用不着那个精度。
 */

import { normalizeText } from './quiz';

/* ═══════════════ 指纹 ═══════════════ */

/**
 * 把文本归一成「身份指纹」。
 *
 * 数字全部替换成 `#` 是关键一步 ——
 * 「只改了数字」的题必须被判为重复，否则 AI 换个数字就能绕过去重。
 * 字母保留，因为变量名（x / y / n）在数学题里是有语义的。
 */
export function fingerprintText(s: string): string {
  return normalizeText(s)
    .replace(/\d+(?:\.\d+)?/g, '#')
    .replace(/#+/g, '#');
}

/** 题干指纹：取前 120 个归一化字符，用于快筛与精确命中判定 */
export function fingerprint(stem: string): string {
  return fingerprintText(stem).slice(0, 120);
}

/* ═══════════════ 相似度 ═══════════════ */

/** 字符 n-gram 词袋（带频次） */
function grams(text: string, n = 3): Map<string, number> {
  const bag = new Map<string, number>();
  if (text.length < n) {
    // 太短的文本（如判断题「行列式一定是方阵」）整串当一个 gram，
    // 否则 grams 为空、相似度恒为 0，短题永远去不掉重
    if (text) bag.set(text, 1);
    return bag;
  }
  for (let i = 0; i + n <= text.length; i++) {
    const g = text.slice(i, i + n);
    bag.set(g, (bag.get(g) ?? 0) + 1);
  }
  return bag;
}

/**
 * 余弦相似度，返回 0~1。
 *
 * ═══════════════════════════════════════════════════════════════
 *  ⚠️ 这里用 normalizeText 而**不是** fingerprintText —— 踩过的坑
 * ═══════════════════════════════════════════════════════════════
 *
 * 最初的版本在网上比「数字归一成 #」之后的文本。结果是
 * `f(x)=x^2 在 x=1 处的导数` 和 `f(x)=x^3 在 x=1 处的导数`
 * 双双变成 `函数fx=x^#在x=#处的导数等于多少` —— 相似度 **1.0000**，
 * 直接被指纹漏斗判成同一道题丢掉。
 *
 * 可这类题**恰恰是必须同时存在**的：同一个考点换一组数字就是一道新题，
 * 这是最正常的出题方式。数字归一让「同考点不同数值」全部阵亡，
 * 也就干掉了 AI 出题的绝大部分有效产出。
 *
 * 所以两个度量必须分工，不能混用：
 *   · 相似度（normalizeText，**保留数字**）→ 唯一有权下判定的东西。
 *     数字不同的题相似度会掉到 0.9 以下，落进软阈值区间标存疑，
 *     由人工决定要不要，而不是被机器直接删掉。
 *   · 指纹（fingerprintText，**抹掉数字**）→ 只用来存库、做统计和
 *     快速分组（如"同一考点的题有多少道"）。**不参与去重判定** ——
 *     它连"两道题是不是同一道"都分不清，见 findDuplicate 的说明。
 *
 * 换句话说：数字抹掉 = 判"是不是同一串文字"（两回事）；
 *          数字保留 = 判"是不是同一道题"（要去重就得用这个）。
 * 反过来的话，换汤不换药的题全会被误杀。
 *
 * 用频次向量而不是集合，是为了让「同一批术语重复出现」的题更相似 ——
 * 数学题的题干里「极限」「连续」这类词出现两次和一次，
 * 语义上确实更接近。
 *
 * ── 为什么同一段文本要先归一一次再算 ──
 * normalizeText 会把中文标点、上下标符号、全角字符全部抹掉：
 * 「lim x→0」和「lim x->0」归一后是同一串，本来就该判相似。
 * 但**数字和字母必须原样保留** —— 它们才是区分两道数学题的东西。
 */
export function similarity(a: string, b: string): number {
  const ta = normalizeText(a);
  const tb = normalizeText(b);
  if (!ta || !tb) return 0;

  const ga = grams(ta);
  const gb = grams(tb);
  if (!ga.size || !gb.size) return 0;

  let dot = 0;
  for (const [g, ca] of ga) {
    const cb = gb.get(g);
    if (cb) dot += ca * cb;
  }
  if (dot === 0) return 0;

  let na = 0;
  for (const v of ga.values()) na += v * v;
  let nb = 0;
  for (const v of gb.values()) nb += v * v;

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;

  /*
   * 必须夹到 [0, 1]。
   * 余弦公式在浮点下会飘：完全相同的两串算出来是 1.0000000000000002。
   * 不夹的话「identical ⇒ sim === 1」不成立，
   * 阈值比较（sim >= hard）虽然不受影响，但任何 `sim > 1` 的断言、
   * 以及把它当百分比显示的地方都会出怪值。
   */
  const sim = dot / denom;
  return sim > 1 ? 1 : sim < 0 ? 0 : sim;
}

/* ═══════════════ 三级漏斗 ═══════════════ */

/**
 * 去重阈值。
 *
 * 硬阈值：≥ 这个值直接丢弃。
 * 软阈值：介于两者之间标 doubtful，进人工复核队列。
 *
 * 刻意做成函数参数而非常量，是因为上线后必然要按实际效果回调 ——
 * 硬编码在算法里到时候就得改代码重新发版。
 */
export const DEDUPE_HARD = 0.9;
export const DEDUPE_SOFT = 0.75;

export interface DedupeCandidate {
  id: string;
  stem: string;
}

export interface DedupeHit {
  id: string;
  sim: number;
}

export interface DedupeResult {
  /** 是否算重复（相似度 ≥ 硬阈值） */
  dup: boolean;
  /** 是否可疑（相似度 ≥ 软阈值但 < 硬阈值） */
  doubtful: boolean;
  /** 最相似的那道题 */
  best?: DedupeHit;
}

/**
 * 判定一道新题是否与已有题库重复。
 *
 * 只比**题干**，不比选项 —— 选项是每次显示都会打乱的，
 * 同一道题的选项顺序在两次生成里可能完全不同，比选项会引入假阳性。
 * 题干 + 考点才是题目的唯一身份。
 *
 * ── ⚠️ 指纹只能用来跳过计算，绝不能用来下判定 ──
 *
 * 这里连跳过计算都得用 `sameAsText`（**保留数字**的归一比较），
 * 不能用 `fingerprint`。原因是它们抹掉的信息不一样：
 *
 *     f(x)=x^2 在 x=1 处的导数  ──指纹──▶  函数fx=x^#在x=#处的导数
 *     f(x)=x^3 在 x=1 处的导数  ──指纹──▶  函数fx=x^#在x=#处的导数
 *
 * 两道**不同**的题指纹一模一样。所以「指纹相等」只能推出
 * "把数字抹掉后长得一样"，绝推不出"是同一道题"。
 * 早先的版本拿指纹当判定，换数字的题成批被当成重复丢掉 ——
 * 可换一组数字本来就是最正常的出题方式。
 *
 * 现在判定权 100% 交给 sim 与阈值比；指纹只在不改变结论的地方
 * 帮我们少算几次（见下面的 `identical` 快路径）。
 */
export function findDuplicate(
  stem: string,
  candidates: readonly DedupeCandidate[],
  opts: { hard?: number; soft?: number } = {},
): DedupeResult {
  const hard = opts.hard ?? DEDUPE_HARD;
  const soft = opts.soft ?? DEDUPE_SOFT;

  /*
   * 保留数字的归一形态。它和 fingerprint 的区别就一个数字，
   * 但那一个数字恰好是「同不同一道题」的分水岭。
   */
  const self = normalizeText(stem);

  let best: DedupeHit | undefined;
  for (const c of candidates) {
    /*
     * 唯一的快路径：**保留数字**的归一文本一字不差。
     * 这种情况下 sim 必然是 1，可以直接给，省掉 n-gram 计算。
     *
     * 注意这里刻意**不用指纹**。指纹抹掉了数字，
     * 「x^2 求导」和「x^3 求导」指纹相同 —— 拿它做快路径会把
     * 两道不同的题算成 sim=1 直接判重，换数字的题就全没了。
     * 见函数头部的说明。
     */
    const identical = normalizeText(c.stem) === self;
    const sim = identical ? 1 : similarity(stem, c.stem);

    if (!best || sim > best.sim) best = { id: c.id, sim };
    // 已经超过硬阈值就不用再算了，早退
    if (sim >= hard) return { dup: true, doubtful: false, best: { id: c.id, sim } };
  }

  if (!best) return { dup: false, doubtful: false };

  return {
    dup: false,
    doubtful: best.sim >= soft,
    best,
  };
}

/**
 * 在一组新题内部互相去重（AI 一批里经常会自己重复）。
 *
 * 用法：先对老题库查重，再调一次这个函数处理批内重复。
 */
export function dedupeWithin<T extends { stem: string }>(
  items: readonly T[],
  opts: { hard?: number } = {},
): { kept: T[]; dropped: { item: T; simTo: number }[] } {
  const hard = opts.hard ?? DEDUPE_HARD;
  const kept: T[] = [];
  const dropped: { item: T; simTo: number }[] = [];

  for (const it of items) {
    let hit: number | undefined;
    for (const k of kept) {
      const sim = similarity(it.stem, k.stem);
      if (sim >= hard) {
        hit = sim;
        break;
      }
    }
    if (hit === undefined) kept.push(it);
    else dropped.push({ item: it, simTo: hit });
  }

  return { kept, dropped };
}
