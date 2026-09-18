/**
 * 题库的「合法值」查询层。
 *
 * ── 为什么单独一个文件 ──
 * 章节 key / 题型 key 的合法性检查被三处用到：
 *   · lib/verify.ts   —— 入库校验
 *   · lib/gen.ts      —— 出题时给 AI 的目录
 *   · lib/question.ts —— 转换时兜底
 * 各自内联一份 Set 迟早会漂移，所以收在这里。
 *
 * 值的**真源**仍然是 data/math.ts / data/cs.ts / data/cet4.ts，
 * 这里只是把它们包成查询函数，不重复定义任何数据。
 */

import { MATH_CHAPTERS, MATH_KINDS, chapterMeta, kindMeta } from '../data/math';
import { CS_CHAPTERS, CS_KINDS, csChapterMeta, csCourseMeta, csKindMeta } from '../data/cs';
import { CET4_KINDS, kindMeta as cet4KindMeta } from '../data/cet4';
import { cet4Bank, csBank, mathBank } from '../store/useQuestionBankStore';
import type {
  Cet4Question,
  CsChapter,
  CsQuestion,
  MathChapter,
  MathQuestion,
  QuizItemModeLike,
} from '../types';

/* ═══════════════ 数学 ═══════════════ */

const MATH_CH_SET = new Set<string>(MATH_CHAPTERS.map((c) => c.key));
const MATH_KIND_SET = new Set<string>(MATH_KINDS.map((k) => k.key));

export function isMathChapter(k: string): boolean {
  return MATH_CH_SET.has(k);
}

export function mathChapterName(k: string): string {
  return MATH_CH_SET.has(k) ? chapterMeta(k as MathChapter).name : k;
}

export function mathKindName(k: string): string {
  return MATH_KIND_SET.has(k) ? kindMeta(k as never).name : k;
}

/* ═══════════════ 计算机 ═══════════════ */

const CS_CH_SET = new Set<string>(CS_CHAPTERS.map((c) => c.key));
const CS_KIND_SET = new Set<string>(CS_KINDS.map((k) => k.key));

export function isCsChapter(k: string): boolean {
  return CS_CH_SET.has(k);
}

export function csChapterName(k: string): string {
  return CS_CH_SET.has(k) ? csChapterMeta(k as CsChapter).name : k;
}

export function csKindName(k: string): string {
  return CS_KIND_SET.has(k) ? csKindMeta(k as never).name : k;
}

/** 「课程 A · 计算机硬件」这种完整展示名 */
export function csChapterFullName(k: string): string {
  if (!CS_CH_SET.has(k)) return k;
  const meta = csChapterMeta(k as CsChapter);
  return `${csCourseMeta(meta.course).short} · ${meta.name}`;
}

/* ═══════════════ 四级 ═══════════════ */

const CET4_KIND_SET = new Set<string>(CET4_KINDS.map((k) => k.kind));

export function isCet4Kind(k: string): boolean {
  return CET4_KIND_SET.has(k);
}

export function cet4KindName(k: string): string {
  return CET4_KIND_SET.has(k) ? cet4KindMeta(k as never).name : k;
}

/* ═══════════════ 跨科目的统一查询 ═══════════════ */

export type SubjectLike = 'math' | 'cs' | 'cet4';

/** 统一查章节展示名（四级传题型 key） */
export function chapterNameOf(subject: SubjectLike, key: string): string {
  if (subject === 'math') return mathChapterName(key);
  if (subject === 'cs') return csChapterName(key);
  return cet4KindName(key);
}

/** 统一查章节完整名（计算机带课程前缀） */
export function chapterFullNameOf(subject: SubjectLike, key: string): string {
  if (subject === 'cs') return csChapterFullName(key);
  return chapterNameOf(subject, key);
}

/** 该科目下所有合法章节 key */
export function chaptersOf(subject: SubjectLike): string[] {
  if (subject === 'math') return MATH_CHAPTERS.map((c) => c.key);
  if (subject === 'cs') return CS_CHAPTERS.map((c) => c.key);
  return CET4_KINDS.map((k) => k.kind);
}

/** 该科目下所有合法题型 key */
export function kindsOf(subject: SubjectLike): string[] {
  if (subject === 'math') return MATH_KINDS.map((k) => k.key);
  if (subject === 'cs') return CS_KINDS.map((k) => k.key);
  // 四级没有单独的「题型」维度，章节就是题型
  return [];
}

export function kindNameOf(subject: SubjectLike, key: string): string {
  if (subject === 'math') return mathKindName(key);
  if (subject === 'cs') return csKindName(key);
  return cet4KindName(key);
}

/**
 * 「答题模式」→ 该科目下最接近的题型 key。
 *
 * 用在两个地方：
 *  · AI 只给了 mode 没给 kind 时兜底
 *  · 筛选题型时按 mode 反查
 */
export function fromCsKind(mode: QuizItemModeLike): string {
  switch (mode) {
    case 'judge':
      return 'judge';
    case 'multi':
      return 'multi';
    case 'single':
      return 'single';
    default:
      return 'fill';
  }
}

/**
 * 各科目的「默认题型」—— AI 返回的 kind 不合法时用它接住。
 * 选的是该科最主流的题型（数学计算题占 43%、计算机单选占 2/3）。
 */
export function defaultKindOf(subject: SubjectLike): string {
  if (subject === 'math') return 'calc';
  if (subject === 'cs') return 'single';
  return 'careful';
}

/** 该科目「模式 → 合法 kind 集合」的映射，用于出题时约束 AI */
export const MODE_TO_KIND: Record<SubjectLike, Partial<Record<QuizItemModeLike, string[]>>> = {
  math: {
    single: ['choice'],
    fill: ['blank'],
    calc: ['calc'],
    proof: ['proof'],
    synthetic: ['synthetic'],
  },
  cs: {
    judge: ['judge'],
    single: ['single'],
    multi: ['multi'],
    fill: ['fill'],
  },
  cet4: {
    single: ['news', 'conversation', 'passage', 'banked', 'matching', 'careful', 'vocab'],
    writing: ['translation', 'writing'],
  },
};

/* ═══════════════ 题库查询（静态 + 线上合并） ═══════════════ */

/**
 * 页面应该用的题库查询入口。
 *
 * ── 为什么不用 data/math.ts 的 questionsOfChapter ──
 * 那些函数只读静态数组，会漏掉线上题。
 * 这个文件是「题库元信息 + 合并查询」的统一出口，
 * 页面 import 这里就够了，不用同时 import 两个来源。
 *
 * 每次调用现算，不缓存 —— 线上题库是异步水合的，
 * 顶层缓存会漏掉后拉到的题。
 */
export function mathQuestionsOfChapter(chapter: string): MathQuestion[] {
  return mathBank().filter((q) => q.chapter === chapter);
}

export function mathQuestionsOfKind(kind?: string): MathQuestion[] {
  const all = mathBank();
  return kind ? all.filter((q) => q.kind === kind) : all;
}

export function allMathQuestions(): MathQuestion[] {
  return mathBank();
}

/** 各章题量统计 */
export function mathChapterCount(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of mathBank()) out[q.chapter] = (out[q.chapter] ?? 0) + 1;
  return out;
}

export function csQuestionsOfChapter(chapter: string, kind?: string): CsQuestion[] {
  const all = csBank();
  return all.filter((q) => q.chapter === chapter && (!kind || q.kind === kind));
}

export function csQuestionsOfCourse(course: 'A' | 'B'): CsQuestion[] {
  return csBank().filter((q) => q.course === course);
}

export function allCsQuestions(): CsQuestion[] {
  return csBank();
}

export function csChapterCount(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of csBank()) out[q.chapter] = (out[q.chapter] ?? 0) + 1;
  return out;
}

/** 四级按题型取题（静态 + 线上） */
export function cet4QuestionsOfKind(kind: string): Cet4Question[] {
  return cet4Bank().filter((q) => q.kind === kind);
}

export function allCet4Questions(): Cet4Question[] {
  return cet4Bank();
}
