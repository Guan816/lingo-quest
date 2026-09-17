import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cet4Question } from '../types';

/** 错题本里的一条记录 */
export interface Cet4WrongEntry {
  /** 原题（保留原始选项与正确答案） */
  q: Cet4Question;
  /** 答错时选的选项文本 */
  chosenText: string;
  /** 记录时间戳 */
  at: number;
  /** 重做时是否已答对（答对后可一键移出） */
  fixed: boolean;
}

/**
 * 四级练习的累计战绩 + 错题本。
 * 单独存一份，不去改已有的玩家存档结构（避免影响老数据）。
 * 「星数」的权威来源仍是 useProfileStore.progress，这里存一份方便展示。
 */
interface Cet4State {
  /** 累计答过多少题 */
  answered: number;
  /** 累计答对多少题 */
  correct: number;
  /** 题型 → 历史最好星数 */
  bestStars: Record<string, number>;
  /** 练习过多少次 */
  sessions: number;
  /** 最近一次练习的题型，用于首页「继续」 */
  lastKind: string | null;
  /** 错题本 */
  wrong: Cet4WrongEntry[];

  record: (kind: string, correct: number, total: number, stars: number) => void;
  /** 记入错题本（同题去重，保留最新一次） */
  addWrong: (q: Cet4Question, chosenText: string) => void;
  /** 重做答对：标记为已订正 */
  markFixed: (id: string) => void;
  removeWrong: (id: string) => void;
  clearWrong: () => void;
  resetCet4: () => void;
}

export const useCet4Store = create<Cet4State>()(
  persist(
    (set) => ({
      answered: 0,
      correct: 0,
      bestStars: {},
      sessions: 0,
      lastKind: null,
      wrong: [],

      record: (kind, correct, total, stars) =>
        set((s) => ({
          answered: s.answered + total,
          correct: s.correct + correct,
          sessions: s.sessions + 1,
          bestStars: { ...s.bestStars, [kind]: Math.max(stars, s.bestStars[kind] ?? 0) },
          lastKind: kind,
        })),

      addWrong: (q, chosenText) =>
        set((s) => {
          const rest = s.wrong.filter((w) => w.q.id !== q.id);
          const entry: Cet4WrongEntry = { q, chosenText, at: Date.now(), fixed: false };
          // 最新的放最前面，最多保留 200 条
          return { wrong: [entry, ...rest].slice(0, 200) };
        }),

      markFixed: (id) =>
        set((s) => ({
          wrong: s.wrong.map((w) => (w.q.id === id ? { ...w, fixed: true } : w)),
        })),

      removeWrong: (id) => set((s) => ({ wrong: s.wrong.filter((w) => w.q.id !== id) })),

      clearWrong: () => set({ wrong: [] }),

      resetCet4: () =>
        set({ answered: 0, correct: 0, bestStars: {}, sessions: 0, lastKind: null, wrong: [] }),
    }),
    { name: 'lingoquest.cet4.v1', version: 1 },
  ),
);

/** 未订正的错题数（用于徽标） */
export function pendingWrongCount(list: Cet4WrongEntry[]): number {
  return list.filter((w) => !w.fixed).length;
}
