/**
 * 数学 / 计算机两个科目的练习记录。
 *
 * 为什么不复用 useProfileStore：
 *   profile 里存的是「闯关」和「四级」的进度，结构和这两个科目不同
 *   （这两个科目是按章节 + 题型统计，还需要记录错题本）。
 * 单独一个 store 更清晰，也避免改动已有的四级逻辑。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SubjectKey = 'math' | 'cs';

export interface ChapterStat {
  answered: number;
  correct: number;
}

export interface WrongRecord {
  id: string;
  subject: SubjectKey;
  /** 章节 key，如 'limit' / 'hardware' */
  chapter: string;
  /** 题目 id，用于去重 */
  qid: string;
  /** 最近一次答错的作答内容（用于展示） */
  userAnswer?: string;
  /** 加入时间 */
  at: number;
  /** 已订正次数 */
  fixed?: number;
}

interface SubjectState {
  /** 章节统计，key 形如 'math-limit'、'cs-hardware' */
  chapterStats: Record<string, ChapterStat>;
  /** 按科目汇总 */
  totals: Record<SubjectKey, ChapterStat>;
  /** 每章星数，key 同 chapterStats */
  stars: Record<string, number>;
  /** 错题本 */
  wrong: WrongRecord[];

  record: (
    subject: SubjectKey,
    chapter: string,
    opts: { correct: boolean; qid: string; userAnswer?: string },
  ) => void;
  /** 记录一次整卷练习的星数 */
  setStars: (key: string, stars: number) => void;
  removeWrong: (qid: string) => void;
  clearWrong: (subject?: SubjectKey) => void;
  resetSubject: () => void;
}

const EMPTY: ChapterStat = { answered: 0, correct: 0 };
const MAX_WRONG = 300;

export const useSubjectStore = create<SubjectState>()(
  persist(
    (set) => ({
      chapterStats: {},
      totals: { math: { ...EMPTY }, cs: { ...EMPTY } },
      stars: {},
      wrong: [],

      record: (subject, chapter, { correct, qid, userAnswer }) => {
        const key = `${subject}-${chapter}`;
        set((s) => {
          const cur = s.chapterStats[key] ?? { ...EMPTY };
          const tot = s.totals[subject] ?? { ...EMPTY };
          const next: ChapterStat = {
            answered: cur.answered + 1,
            correct: cur.correct + (correct ? 1 : 0),
          };

          // 错题本：答错则加入（同一题去重，更新时间与作答）
          let wrong = s.wrong;
          if (!correct) {
            const exist = wrong.find((w) => w.qid === qid);
            if (exist) {
              wrong = wrong.map((w) =>
                w.qid === qid ? { ...w, at: Date.now(), userAnswer } : w,
              );
            } else {
              wrong = [
                { id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, subject, chapter, qid, userAnswer, at: Date.now() },
                ...wrong,
              ].slice(0, MAX_WRONG);
            }
          }

          return {
            chapterStats: { ...s.chapterStats, [key]: next },
            totals: {
              ...s.totals,
              [subject]: {
                answered: tot.answered + 1,
                correct: tot.correct + (correct ? 1 : 0),
              },
            },
            wrong,
          };
        });
      },

      setStars: (key, stars) =>
        set((s) => ({ stars: { ...s.stars, [key]: Math.max(stars, s.stars[key] ?? 0) } })),

      removeWrong: (qid) => set((s) => ({ wrong: s.wrong.filter((w) => w.qid !== qid) })),

      clearWrong: (subject) =>
        set((s) => ({
          wrong: subject ? s.wrong.filter((w) => w.subject !== subject) : [],
        })),

      resetSubject: () =>
        set({
          chapterStats: {},
          totals: { math: { ...EMPTY }, cs: { ...EMPTY } },
          stars: {},
          wrong: [],
        }),
    }),
    { name: 'maneji.subject.v1', version: 1 },
  ),
);

/** 汇总某科目的答题数与正确率 */
export function subjectStats(subject: SubjectKey, s: { totals: Record<SubjectKey, ChapterStat> }) {
  const t = s.totals[subject] ?? EMPTY;
  return {
    answered: t.answered,
    correct: t.correct,
    accuracy: t.answered > 0 ? Math.round((t.correct / t.answered) * 100) : 0,
  };
}

/** 某科目的待订正错题数 */
export function pendingWrong(subject: SubjectKey, wrong: WrongRecord[]): number {
  return wrong.filter((w) => w.subject === subject).length;
}
