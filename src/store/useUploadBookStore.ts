/**
 * 上传本 —— 存**用户自己上传的题目**（试卷 / PDF / 拍照解析出来的题）。
 *
 * ── 为什么单独一个本子 ──
 * 用户上传的卷子是「我的资料」，不是公共题库：
 *   ① 写进线上 `questions` 表会污染全站题库（别人也会刷到你的卷子）；
 *   ② 断网也要能翻，所以存在本机。
 * 真题/公共题走 `questions` 表，上传的题只留在上传本，两者互不干扰。
 *
 * ── 去重 ──
 * id 由题干归一化派生，同一道题重复上传只更新、不重复占位。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UploadSubject = 'math' | 'cs' | 'cet4';

export interface UploadStep {
  text: string;
  math?: string;
}

export interface UploadQuestion {
  /** 由题干归一化派生，天然去重 */
  id: string;
  subject: UploadSubject;
  /** 章节 key（考纲集合内；解析不出来时用兜底章） */
  chapter: string;
  /** 题型 key */
  kind: string;
  /** 答题模式：single|multi|judge|fill|calc|proof|synthetic|writing */
  mode: string;
  stem: string;
  options?: string[];
  answerText: string;
  steps: UploadStep[];
  tip?: string;
  pitfall?: string;
  /** 卷面题号，如 '12'、'二(3)' */
  no?: string;
  /** 来源文件名 */
  sourceName: string;
  at: number;
}

export interface UploadInput {
  subject: UploadSubject;
  chapter: string;
  kind: string;
  mode: string;
  stem: string;
  options?: string[];
  answerText: string;
  steps?: UploadStep[];
  tip?: string;
  pitfall?: string;
  no?: string;
  sourceName: string;
}

/** 归一化：去空白与常见标点，统一全半角 —— 只用来算 id */
export function normalizeStem(s: string): string {
  return (s || '')
    .replace(/\s+/g, '')
    .replace(/[，。；：、（）【】《》""''！？,.;:()\[\]<>"']/g, '')
    .replace(/[−–—]/g, '-')
    .toLowerCase();
}

function makeId(stem: string): string {
  return 'uq:' + normalizeStem(stem).slice(0, 120);
}

const MAX_ENTRIES = 800;

interface UploadBookState {
  items: UploadQuestion[];
  /** 批量写入；同题干更新、新题干追加。返回 {added, updated} */
  upsertMany: (list: UploadInput[]) => { added: number; updated: number };
  remove: (id: string) => void;
  clear: (subject?: UploadSubject) => void;
}

export const useUploadBookStore = create<UploadBookState>()(
  persist(
    (set, get) => ({
      items: [],

      upsertMany: (list) => {
        const cur = get().items;
        const byId = new Map(cur.map((e) => [e.id, e]));
        let added = 0;
        let updated = 0;

        for (const it of list) {
          const stem = (it.stem || '').trim();
          if (stem.length < 4) continue; // 太短的不要（多半是解析噪声）
          const id = makeId(stem);
          const next: UploadQuestion = {
            id,
            subject: it.subject,
            chapter: it.chapter,
            kind: it.kind,
            mode: it.mode,
            stem,
            options: it.options?.length ? it.options : undefined,
            answerText: it.answerText || '',
            steps: (it.steps ?? []).filter((s) => (s.text || '').trim() || (s.math || '').trim()),
            tip: it.tip?.trim() || undefined,
            pitfall: it.pitfall?.trim() || undefined,
            no: it.no?.trim() || undefined,
            sourceName: it.sourceName,
            at: byId.get(id)?.at ?? Date.now(),
          };
          if (byId.has(id)) updated += 1;
          else added += 1;
          byId.set(id, next);
        }

        if (added || updated) {
          // 新的在前，最多留 MAX_ENTRIES 条
          const merged = [...byId.values()].sort((a, b) => b.at - a.at).slice(0, MAX_ENTRIES);
          set({ items: merged });
        }
        return { added, updated };
      },

      remove: (id) => set((s) => ({ items: s.items.filter((e) => e.id !== id) })),

      clear: (subject) =>
        set((s) => ({
          items: subject ? s.items.filter((e) => e.subject !== subject) : [],
        })),
    }),
    { name: 'maneji.upload.v1', version: 1 },
  ),
);

export const UPLOAD_SUBJECT_LABEL: Record<UploadSubject, string> = {
  math: '数学',
  cs: '计算机',
  cet4: '英语',
};
