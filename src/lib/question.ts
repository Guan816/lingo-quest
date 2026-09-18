/**
 * 线上题库 ↔ 静态题库的双向转换。
 *
 * ═══════════════════════════════════════════════════════════════
 *  为什么需要这一层
 * ═══════════════════════════════════════════════════════════════
 *
 * 线上题库（BankQuestion）是三科统一的形状，
 * 但答题页各自吃自己的类型：
 *   · 数学  MathQuestion —— steps: string[]、answer 是下标
 *   · 计算机 CsQuestion  —— explain 是一段话、answer 可能是数组
 *   · 四级  Cet4Question —— options 必填、有 material
 *
 * 让三个页面都改成吃 BankQuestion 会波及全站，
 * 所以在这里做一次转换：**DB 行 → 既有类型**，页面一行都不用改。
 *
 * ── 关键约定 ──
 *  · 答案一律用 answerText（选项原文）反算下标，
 *    绝不信任存下来的 answerLetters —— 选项会打乱，字母会指错。
 *  · steps 从 {text, math} 拍平成字符串时用 `｜` 连接，
 *    渲染层 explainOf() 会重新拆回两段，排版不丢。
 */

import type {
  BankQuestion,
  Cet4Kind,
  Cet4Question,
  CsChapter,
  CsKind,
  CsQuestion,
  Difficulty,
  MathChapter,
  MathKind,
  MathQuestion,
} from '../types';
import type { ExplainStep } from './explain';
import { fromCsKind, isCsChapter, isMathChapter } from './bankMeta';

/* ═══════════════ steps 的拍平与还原 ═══════════════ */

/**
 * {text, math} → string
 *
 * 用全角竖线 `｜` 做分隔符：
 *  · 题库正文里绝不会出现这个字符，不会误切
 *  · 半角 `|` 在 Markdown 表格里很常见，不能用
 */
export const STEP_SEP = '｜';

export function flattenSteps(steps: ExplainStep[] | undefined): string[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => {
      const text = String(s?.text ?? '').trim();
      const math = String(s?.math ?? '').trim();
      if (!text && !math) return '';
      if (!math) return text;
      if (!text) return `${STEP_SEP}${math}`;
      return `${text}${STEP_SEP}${math}`;
    })
    .filter(Boolean);
}

/* ═══════════════ 答案下标反算 ═══════════════ */

function norm(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。；：、（）【】《》""''！？,.;:()\[\]<>"']/g, '')
    .replace(/[−–—]/g, '-');
}

/**
 * 用答案原文在选项里找下标。找不到返回 -1。
 *
 * 三道防线：
 *   ① 归一化后完全相等
 *   ② 答案写成字母（'C'）—— 这时用 answerLetters 兜底
 *   ③ 互相包含（AI 常给答案加前后缀）
 */
export function answerIdxFrom(q: BankQuestion): number[] {
  const opts = q.options ?? [];
  if (!opts.length) return [];

  /*
   * ⓪ 库里已经存了下标就直接用。
   *
   * 这是最可靠的一档，且必须排在所有反算之前：
   *  · 反算依赖"答案原文能在选项里精确找到"，而 AI 的答案常带
   *    前后缀、单位、中文说明（「C. 3」「3（单位）」「①②都行」），
   *    这时只能落到 ④「互相包含」，可能命中错的选项，或者干脆返回 []；
   *  · 入库时由服务端按当时**未被显示层打乱**的选项顺序算好的下标，
   *    是唯一的权威值，重新推算只会引入偏差。
   */
  if (Array.isArray(q.answerIdx) && q.answerIdx.length) {
    const clean = q.answerIdx
      .filter((i) => Number.isInteger(i) && i >= 0 && i < opts.length);
    if (clean.length) return [...new Set(clean)].sort((a, b) => a - b);
  }

  const want = String(q.answerText ?? '').trim();
  if (!want) return [];

  const nWant = norm(want);

  // ① 精确匹配
  const exact = opts.findIndex((o) => norm(o) === nWant);
  if (exact >= 0) return [exact];

  // ② 答案本身是字母
  const letterOnly = /^[（(]?[A-Fa-f](?:[、,，／/\s]*[A-Fa-f])*[）)]?$/.test(want);
  if (letterOnly) {
    const idxs = (want.toUpperCase().match(/[A-F]/g) ?? [])
      .map((L) => L.charCodeAt(0) - 65)
      .filter((i) => i >= 0 && i < opts.length);
    if (idxs.length) return [...new Set(idxs)].sort((a, b) => a - b);
  }

  // ②.5 用存下来的字母兜底（answerLetters 仅供这种情况使用）
  if (q.answerLetters) {
    const idxs = (q.answerLetters.toUpperCase().match(/[A-F]/g) ?? [])
      .map((L) => L.charCodeAt(0) - 65)
      .filter((i) => i >= 0 && i < opts.length);
    if (idxs.length) return [...new Set(idxs)].sort((a, b) => a - b);
  }

  // ③ 多选题的答案用分隔符拼接
  if (q.mode === 'multi') {
    const parts = want.split(/[、,，;；|／/]/).map(norm).filter(Boolean);
    const idxs = parts
      .map((p) => opts.findIndex((o) => norm(o) === p))
      .filter((i) => i >= 0);
    if (idxs.length) return [...new Set(idxs)].sort((a, b) => a - b);
  }

  // ④ 互相包含
  const loose = opts.findIndex((o) => {
    const n = norm(o);
    return n.length >= 2 && (nWant.includes(n) || n.includes(nWant));
  });
  if (loose >= 0) return [loose];

  return [];
}

/* ═══════════════ → 数学 ═══════════════ */

export function toMathQuestion(q: BankQuestion): MathQuestion {
  const idx = answerIdxFrom(q);
  const isChoice = q.mode === 'single' && idx.length > 0;

  return {
    id: q.id,
    chapter: (isMathChapter(q.chapter) ? q.chapter : 'limit') as MathChapter,
    kind: (isMathKind(q.kind) ? q.kind : 'calc') as MathKind,
    difficulty: q.difficulty as Difficulty,
    stem: q.stem,
    options: isChoice ? q.options : undefined,
    answer: isChoice ? idx[0] : undefined,
    refAnswer: q.answerText,
    steps: flattenSteps(q.steps),
    point: q.point,
    formula: q.formula,
    tag: q.sourceRef,
  };
}

function isMathKind(k: string): boolean {
  return ['choice', 'blank', 'calc', 'proof', 'synthetic'].includes(k);
}

/* ═══════════════ → 计算机 ═══════════════ */

export function toCsQuestion(q: BankQuestion): CsQuestion {
  const idx = answerIdxFrom(q);

  let answer: number | number[] | undefined;
  if (q.mode === 'judge') {
    // 判断题：1 = 正确，0 = 错误
    answer = /正确|对|是|^t/i.test(q.answerText.trim()) ? 1 : 0;
  } else if (q.mode === 'multi') {
    answer = idx;
  } else if (q.mode === 'single' && idx.length) {
    answer = idx[0];
  }

  // 计算机的解析是一段话，不是步骤数组 —— 拍平后用换行连接。
  // 渲染层 explainOf() 会按「1. 2. 3.」编号重新拆开，排版不丢。
  const explainText =
    flattenSteps(q.steps)
      .map((s, i) => {
        const [text, math] = s.split(STEP_SEP);
        const body = math ? `${text || ''}${text && math ? '：' : ''}${math}` : text;
        return `${i + 1}. ${body}`;
      })
      .join('\n') || q.answerText;

  return {
    id: q.id,
    course: CS_CHAPTER_COURSE[q.chapter] ?? 'A',
    chapter: (isCsChapter(q.chapter) ? q.chapter : 'hardware') as CsChapter,
    kind: (isCsKind(q.kind) ? q.kind : fromCsKind(q.mode)) as CsKind,
    difficulty: q.difficulty as Difficulty,
    stem: q.stem,
    options: q.mode === 'judge' ? undefined : q.options,
    answer,
    refAnswer: q.mode === 'fill' ? q.answerText : undefined,
    explain: explainText,
    point: q.point,
    tag: q.sourceRef,
  };
}

function isCsKind(k: string): boolean {
  return ['judge', 'single', 'multi', 'fill'].includes(k);
}

/** 章节 → 课程（A / B）。CS_CHAPTERS 里已经声明过，这里做一份扁平表避免每次查数组 */
const CS_CHAPTER_COURSE: Record<string, 'A' | 'B'> = {
  hardware: 'A',
  software: 'A',
  network: 'A',
  media: 'A',
  infosys: 'B',
  iot: 'B',
  mobile: 'B',
  cloud: 'B',
  bigdata: 'B',
  ai: 'B',
  blockchain: 'B',
};

/* ═══════════════ → 四级 ═══════════════ */

export function toCet4Question(q: BankQuestion): Cet4Question {
  const idx = answerIdxFrom(q);
  return {
    id: q.id,
    kind: (CET4_KIND_SET.has(q.chapter) ? q.chapter : 'careful') as Cet4Kind,
    material: q.material,
    stem: q.stem,
    options: q.options ?? [],
    answer: idx[0] ?? 0,
    explain: flattenSteps(q.steps).join('\n') || undefined,
    tag: q.sourceRef,
  };
}

const CET4_KIND_SET = new Set<string>([
  'news',
  'conversation',
  'passage',
  'banked',
  'matching',
  'careful',
  'vocab',
  'translation',
  'writing',
]);

/* ═══════════════ 统一入口 ═══════════════ */

/**
 * 把一批线上题按科目转成既有类型。
 *
 * 返回的是**已经转好的静态类型数组**，直接 concat 到静态题库后面即可。
 */
export function convertBankQuestions(list: readonly BankQuestion[]): {
  math: MathQuestion[];
  cs: CsQuestion[];
  cet4: Cet4Question[];
} {
  const math: MathQuestion[] = [];
  const cs: CsQuestion[] = [];
  const cet4: Cet4Question[] = [];

  for (const q of list) {
    if (q.subject === 'math') math.push(toMathQuestion(q));
    else if (q.subject === 'cs') cs.push(toCsQuestion(q));
    else cet4.push(toCet4Question(q));
  }

  return { math, cs, cet4 };
}
