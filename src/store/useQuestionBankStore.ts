/**
 * 线上题库的运行时缓存。
 *
 * ═══════════════════════════════════════════════════════════════
 *  两层题库模型
 * ═══════════════════════════════════════════════════════════════
 *
 *   用户能刷到的题 = 静态题库（编译进包，离线可用）
 *                  ∪ 线上题库（本 store 拉下来的，status='live'）
 *
 * 为什么不把静态题库也搬上服务器：
 *   App 是 Capacitor 打包的离线场景，断网时必须还能刷题。
 *
 * ── 刷新策略 ──
 *   · 增量拉取：带 since（上次成功拉取的时间），只取更新的
 *   · 启动时拉一次，之后距上次超过 6 小时再拉
 *   · 拉失败不抛错、不影响刷题 —— 静态题库照常能用
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BankQuestion, Cet4Question, CsQuestion, MathQuestion } from '../types';
import { api } from '../lib/api';
import { convertBankQuestions } from '../lib/question';
import { MATH_QUESTIONS } from '../data/math';
import { CS_QUESTIONS } from '../data/cs';
import { CET4_QUESTIONS } from '../data/cet4';

/** 多久算「缓存过期」，超过就重新拉 */
const STALE_MS = 6 * 60 * 60 * 1000;

/** 本地存的题量上限，防止 localStorage 被撑爆 */
const MAX_CACHE = 3000;

interface BankState {
  /** 拉下来的原始题（统一形状） */
  list: BankQuestion[];
  /** 转换后的三科题目，避免每次读取都重算 */
  math: MathQuestion[];
  cs: CsQuestion[];
  cet4: Cet4Question[];

  /** 上次成功拉取的时间戳 */
  fetchedAt: number;
  /** 是否正在拉取 */
  loading: boolean;
  /** 上次失败的原因（仅用于后台页展示，不阻塞刷题） */
  lastError?: string;

  refresh: (opts?: { force?: boolean }) => Promise<void>;
  clear: () => void;
}

const EMPTY = {
  list: [] as BankQuestion[],
  math: [] as MathQuestion[],
  cs: [] as CsQuestion[],
  cet4: [] as Cet4Question[],
  fetchedAt: 0,
  loading: false,
  lastError: undefined as string | undefined,
};

export const useQuestionBankStore = create<BankState>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      refresh: async (opts = {}) => {
        const { fetchedAt, loading } = get();
        if (loading) return;
        if (!opts.force && fetchedAt && Date.now() - fetchedAt < STALE_MS) return;

        set({ loading: true });
        try {
          const res = (await api.bankQuestions()) as { questions?: BankQuestion[] };
          const list = Array.isArray(res?.questions) ? res.questions.slice(0, MAX_CACHE) : [];
          const { math, cs, cet4 } = convertBankQuestions(list);

          set({
            list,
            math,
            cs,
            cet4,
            fetchedAt: Date.now(),
            loading: false,
            lastError: undefined,
          });
        } catch (e) {
          // 拉不到线上题库不影响刷题 —— 静态题库照常能用，所以这里只记不抛
          set({ loading: false, lastError: (e as Error).message });
        }
      },

      clear: () => set({ ...EMPTY }),
    }),
    {
      name: 'maneji.bank.v1',
      version: 1,
      // loading 是运行时状态，不该被持久化（否则刷新页面后永远卡在「加载中」）
      partialize: (s) => ({
        list: s.list,
        math: s.math,
        cs: s.cs,
        cet4: s.cet4,
        fetchedAt: s.fetchedAt,
      }),
    },
  ),
);

/* ═══════════════ 合并查询 ═══════════════ */

/**
 * 把线上题并入静态题库。
 *
 * 按 id 去重：线上题与静态题 id 撞车时**保留静态题** ——
 * 静态题是编译进包的、经过人工审核的，可信度更高。
 */
export function mergeById<T extends { id: string }>(base: readonly T[], extra: readonly T[]): T[] {
  if (!extra.length) return base as T[];
  const seen = new Set(base.map((q) => q.id));
  const add = extra.filter((q) => !seen.has(q.id));
  return add.length ? [...base, ...add] : (base as T[]);
}

/*
 * 三科的完整题库（静态 + 线上）。
 *
 * 这是各页面应该调用的**唯一入口** ——
 * 页面不要自己去读 data/*.ts 的数组，否则会漏掉线上题。
 *
 * 有意做成**每次现算**而不是模块级常量：
 * useQuestionBankStore 是 persist 的，localStorage 水合发生在首帧之后，
 * 顶层算出来的数组会漏掉线上题。
 */
export function mathBank(): MathQuestion[] {
  return mergeById(MATH_QUESTIONS, useQuestionBankStore.getState().math);
}

export function csBank(): CsQuestion[] {
  return mergeById(CS_QUESTIONS, useQuestionBankStore.getState().cs);
}

export function cet4Bank(): Cet4Question[] {
  return mergeById(CET4_QUESTIONS, useQuestionBankStore.getState().cet4);
}

/* ═══════════════ 动态计数 ═══════════════ */

const BASE_MATH_IDS = new Set(MATH_QUESTIONS.map((q) => q.id));
const BASE_CS_IDS = new Set(CS_QUESTIONS.map((q) => q.id));
const BASE_CET4_IDS = new Set(CET4_QUESTIONS.map((q) => q.id));

function uniqCount(baseLen: number, extra: readonly { id: string }[], baseIds: Set<string>): number {
  if (!extra.length) return baseLen;
  return baseLen + extra.filter((q) => !baseIds.has(q.id)).length;
}

/**
 * 各科目的用户可见题量。
 *
 * 所有「题库共 N 题」「已做 / 总题数」都必须走这里 ——
 * 否则用户会看到「总题数 42」却能刷出 2000 题。
 */
export function bankTotals(): { math: number; cs: number; cet4: number } {
  const s = useQuestionBankStore.getState();
  return {
    math: uniqCount(MATH_QUESTIONS.length, s.math, BASE_MATH_IDS),
    cs: uniqCount(CS_QUESTIONS.length, s.cs, BASE_CS_IDS),
    cet4: uniqCount(CET4_QUESTIONS.length, s.cet4, BASE_CET4_IDS),
  };
}

/** 单科题量（页面里更常用的形式） */
export function bankTotalOf(subject: 'math' | 'cs' | 'cet4'): number {
  return bankTotals()[subject];
}
