/**
 * 公式本 / 技巧本。
 *
 * 需求要点：
 *  - 每次做题或试卷解析产出的核心公式、解题技巧都归到这里
 *  - **不重复保存**：同一内容只留一条（按归一化文本判重）
 *  - **按考纲顺序排列**：数学按官方 8 章的先后，计算机按课程 A→B、章节序
 *
 * 排序不是「按时间」也不是「按字母」，而是严格跟考纲章节走 ——
 * 这样复习时翻公式本，顺序和考纲过一遍的节奏一致。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MATH_CHAPTERS } from '../data/math';
import { CS_CHAPTERS } from '../data/cs';

export type FormulaKind = 'formula' | 'tip';
export type FormulaSubject = 'math' | 'cs' | 'en';

export interface FormulaEntry {
  /** 归一化内容算出的稳定 id，天然去重 */
  id: string;
  subject: FormulaSubject;
  /** 章节 key（数学如 'limit'，计算机如 'hardware'） */
  chapter: string;
  kind: FormulaKind;
  /** 公式本体或技巧正文 */
  text: string;
  /** 适用条件、注意事项 */
  note?: string;
  /** 来源标注，如「极限章节练习」「上传的试卷.pdf」 */
  from?: string;
  /**
   * 来源题号，如 '12'、'二(3)'。
   * 有了它卡片才能跳回原题解析 —— 光有「来自某份卷子」找不回去。
   */
  fromNo?: string;
  /** 首次收录时间 */
  at: number;
}

export interface FormulaInput {
  subject: FormulaSubject;
  chapter: string;
  kind: FormulaKind;
  text: string;
  note?: string;
  from?: string;
  fromNo?: string;
}

/** 归一化：去掉空格与常见标点，统一全半角，用于判重 */
function normalize(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/[，。；：、（）【】《》""''！？,.;:()\[\]<>"']/g, '')
    .replace(/[−–—]/g, '-')
    .toLowerCase();
}

/** 由内容生成稳定 id */
function makeId(subject: string, kind: string, text: string): string {
  return `${subject}:${kind}:${normalize(text).slice(0, 120)}`;
}

/* ─────────── 考纲顺序 ─────────── */

/** 数学章节顺序索引 */
const MATH_ORDER: Record<string, number> = Object.fromEntries(
  MATH_CHAPTERS.map((c, i) => [c.key, i]),
);
/** 计算机章节顺序索引（课程 A 在前，课程 B 在后） */
const CS_ORDER: Record<string, number> = Object.fromEntries(
  CS_CHAPTERS.map((c, i) => [c.key, i]),
);

/** 学科之间的排序：数学 → 计算机 → 英语 */
const SUBJECT_ORDER: Record<FormulaSubject, number> = { math: 0, cs: 1, en: 2 };

/** 取某条目的考纲序号，用于排序 */
function syllabusIndex(e: FormulaEntry): number {
  if (e.subject === 'math') return MATH_ORDER[e.chapter] ?? 99;
  if (e.subject === 'cs') return CS_ORDER[e.chapter] ?? 99;
  return 99;
}

/** 按考纲顺序排序（同章节内：公式在前，技巧在后，再按收录时间） */
export function sortBySyllabus(list: FormulaEntry[]): FormulaEntry[] {
  return [...list].sort((a, b) => {
    const s = SUBJECT_ORDER[a.subject] - SUBJECT_ORDER[b.subject];
    if (s !== 0) return s;
    const c = syllabusIndex(a) - syllabusIndex(b);
    if (c !== 0) return c;
    if (a.kind !== b.kind) return a.kind === 'formula' ? -1 : 1;
    return a.at - b.at;
  });
}

/** 章节显示名 */
export function chapterLabel(e: FormulaEntry): string {
  if (e.subject === 'math') {
    return MATH_CHAPTERS.find((c) => c.key === e.chapter)?.name ?? '其他';
  }
  if (e.subject === 'cs') {
    const c = CS_CHAPTERS.find((x) => x.key === e.chapter);
    if (!c) return '其他';
    return `${c.course === 'A' ? 'A' : 'B'} · ${c.name}`;
  }
  return '英语';
}

/* ─────────── Store ─────────── */

interface FormulaBookState {
  entries: FormulaEntry[];
  /** 批量收录，返回实际新增条数（重复的不计入） */
  addMany: (list: FormulaInput[]) => number;
  remove: (id: string) => void;
  clear: (subject?: FormulaSubject) => void;
}

const MAX_ENTRIES = 500;

export const useFormulaBookStore = create<FormulaBookState>()(
  persist(
    (set, get) => ({
      entries: [],

      addMany: (list) => {
        const cur = get().entries;
        const seen = new Set(cur.map((e) => e.id));
        const fresh: FormulaEntry[] = [];

        for (const item of list) {
          const text = (item.text ?? '').trim();
          if (text.length < 2) continue;
          const id = makeId(item.subject, item.kind, text);
          if (seen.has(id)) continue; // 不重复保存
          seen.add(id);
          fresh.push({
            id,
            subject: item.subject,
            chapter: item.chapter,
            kind: item.kind,
            text,
            note: item.note?.trim() || undefined,
            from: item.from,
            fromNo: item.fromNo?.trim() || undefined,
            at: Date.now(),
          });
        }

        if (fresh.length) {
          set({ entries: [...fresh, ...cur].slice(0, MAX_ENTRIES) });
        }
        return fresh.length;
      },

      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      clear: (subject) =>
        set((s) => ({
          entries: subject ? s.entries.filter((e) => e.subject !== subject) : [],
        })),
    }),
    { name: 'maneji.formula.v1', version: 1 },
  ),
);

/** 按学科分组并排好序，供页面直接渲染 */
export function groupedBySubject(list: FormulaEntry[]) {
  const sorted = sortBySyllabus(list);
  const groups: { subject: FormulaSubject; items: FormulaEntry[] }[] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.subject === e.subject) last.items.push(e);
    else groups.push({ subject: e.subject, items: [e] });
  }
  return groups;
}

export const SUBJECT_LABEL: Record<FormulaSubject, string> = {
  math: '数学',
  cs: '计算机',
  en: '英语',
};
