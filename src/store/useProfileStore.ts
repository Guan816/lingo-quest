import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LevelProgress, PlayerStats } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { levelInfo, xpForClear, xpForSentence } from '../lib/gamification';
import { todayKey, uid } from '../lib/utils';
import { api } from '../lib/api';

const EMPTY_STATS: PlayerStats = {
  totalXp: 0,
  sentencesSpoken: 0,
  perfectScores: 0,
  practiceDays: [],
  wordsLearned: [],
  bossCleared: 0,
  comboBest: 0,
  minutesSpoken: 0,
};

export interface SentenceInput {
  score: number;
  /** 本句涉及的重点词，用于统计词汇量 */
  words?: string[];
  /** 本次开口时长（秒） */
  seconds?: number;
}

/** 最近一次结算产生的奖励，供 UI 弹层展示 */
export interface RewardEvent {
  id: string;
  xp: number;
  combo: number;
  achievements: { id: string; name: string; emoji: string }[];
  leveledUp: boolean;
}

interface ProfileState {
  xp: number;
  combo: number;
  stats: PlayerStats;
  progress: Record<string, LevelProgress>;
  achievements: string[];
  todayXp: number;
  todaySentences: number;
  todayDate: string;
  dailyGoal: number;
  lastLevelId: string | null;
  lastReward: RewardEvent | null;
  lastSyncAt: string;
  isSyncing: boolean;

  addXp: (n: number) => void;
  registerSentence: (input: SentenceInput) => RewardEvent;
  breakCombo: () => void;
  clearLevel: (levelId: string, stars: number, avgScore: number, isBoss: boolean) => void;
  markToday: () => void;
  setDailyGoal: (n: number) => void;
  resetProfile: () => void;
  syncFromCloud: () => Promise<void>;
  pushToCloud: () => Promise<void>;
}

function unlockedFrom(stats: PlayerStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id);
}

/* ───── 云同步辅助：仅在已登录时排队推送 ───── */
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function getCloudToken(): string | null {
  try {
    const raw = localStorage.getItem('maneji-auth');
    if (!raw) return null;
    const j = JSON.parse(raw);
    return j?.state?.token ?? null;
  } catch {
    return null;
  }
}

function queuePush() {
  if (!getCloudToken()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    useProfileStore.getState().pushToCloud();
  }, 1200);
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      xp: 0,
      combo: 0,
      stats: { ...EMPTY_STATS },
      progress: {},
      achievements: [],
      todayXp: 0,
      todaySentences: 0,
      todayDate: todayKey(),
      dailyGoal: 60,
      lastLevelId: null,
      lastReward: null,
      lastSyncAt: '1970-01-01T00:00:00.000Z',
      isSyncing: false,

      addXp: (n) => {
        const s = get();
        set({
          xp: s.xp + n,
          todayXp: (s.todayDate === todayKey() ? s.todayXp : 0) + n,
          todayDate: todayKey(),
          stats: { ...s.stats, totalXp: s.stats.totalXp + n },
        });
        queuePush();
      },

      registerSentence: (input) => {
        const s = get();
        const good = input.score >= 65;
        const combo = good ? s.combo + 1 : 0;
        const gained = xpForSentence(input.score, combo);

        const wordsLearned = new Set(s.stats.wordsLearned);
        input.words?.forEach((w) => {
          if (w && w.length > 1) wordsLearned.add(w.toLowerCase());
        });

        const minutesAdded = (input.seconds ?? 0) / 60;
        const stats: PlayerStats = {
          ...s.stats,
          totalXp: s.stats.totalXp + gained,
          sentencesSpoken: s.stats.sentencesSpoken + 1,
          perfectScores: s.stats.perfectScores + (input.score >= 90 ? 1 : 0),
          comboBest: Math.max(s.stats.comboBest, combo),
          wordsLearned: [...wordsLearned],
          minutesSpoken: s.stats.minutesSpoken + minutesAdded,
        };

        const nowUnlocked = unlockedFrom(stats);
        const fresh = nowUnlocked.filter((id) => !s.achievements.includes(id));
        const leveledUp = levelInfo(stats.totalXp).level > levelInfo(s.stats.totalXp).level;

        const reward: RewardEvent = {
          id: uid('rw'),
          xp: gained,
          combo,
          achievements: fresh.map((id) => {
            const a = ACHIEVEMENTS.find((x) => x.id === id)!;
            return { id, name: a.name, emoji: a.emoji };
          }),
          leveledUp,
        };

        set({
          xp: s.xp + gained,
          combo,
          stats,
          achievements: nowUnlocked,
          todayXp: (s.todayDate === todayKey() ? s.todayXp : 0) + gained,
          todaySentences: (s.todayDate === todayKey() ? s.todaySentences : 0) + 1,
          todayDate: todayKey(),
          lastReward: reward,
        });
        queuePush();
        return reward;
      },

      breakCombo: () => set({ combo: 0 }),

      clearLevel: (levelId, stars, avgScore, isBoss) => {
        const s = get();
        const prev = s.progress[levelId];
        const best: LevelProgress = {
          stars: Math.max(stars, prev?.stars ?? 0),
          bestScore: Math.max(Math.round(avgScore), prev?.bestScore ?? 0),
          cleared: true,
        };
        const bonus = xpForClear(stars, isBoss);
        const stats: PlayerStats = {
          ...s.stats,
          totalXp: s.stats.totalXp + bonus,
          bossCleared: s.stats.bossCleared + (isBoss && !prev?.cleared ? 1 : 0),
        };
        const nowUnlocked = unlockedFrom(stats);
        set({
          progress: { ...s.progress, [levelId]: best },
          xp: s.xp + bonus,
          stats,
          achievements: nowUnlocked,
          todayXp: (s.todayDate === todayKey() ? s.todayXp : 0) + bonus,
          todayDate: todayKey(),
          lastLevelId: levelId,
        });
        queuePush();
      },

      markToday: () => {
        const s = get();
        const key = todayKey();
        if (s.stats.practiceDays.includes(key)) return;
        set({ stats: { ...s.stats, practiceDays: [...s.stats.practiceDays, key] } });
        queuePush();
      },

      setDailyGoal: (n) => set({ dailyGoal: n }),

      resetProfile: () =>
        set({
          xp: 0,
          combo: 0,
          stats: { ...EMPTY_STATS },
          progress: {},
          achievements: [],
          todayXp: 0,
          todaySentences: 0,
          todayDate: todayKey(),
          lastLevelId: null,
          lastReward: null,
        }),

      syncFromCloud: async () => {
        if (get().isSyncing || !getCloudToken()) return;
        set({ isSyncing: true });
        try {
          const data = await api.syncPull(get().lastSyncAt);
          set((state) => {
            const progress = { ...state.progress };
            for (const p of data.progress as Array<{
              level_id: string;
              stars: number;
              best_score: number;
              data?: { cleared?: boolean };
            }>) {
              const cur = progress[p.level_id];
              progress[p.level_id] = {
                stars: Math.max(p.stars ?? 0, cur?.stars ?? 0),
                bestScore: Math.max(p.best_score ?? 0, cur?.bestScore ?? 0),
                cleared: cur?.cleared || p.data?.cleared || false,
              };
            }
            const totalXp = Math.max(state.stats.totalXp, data.user.total_xp ?? 0);
            return {
              progress,
              stats: { ...state.stats, totalXp },
              lastSyncAt: data.serverTime,
            };
          });
        } catch {
          /* 离线或失败忽略 */
        } finally {
          set({ isSyncing: false });
        }
      },

      pushToCloud: async () => {
        if (!getCloudToken()) return;
        const s = get();
        try {
          await api.syncPush({
            total_xp: s.stats.totalXp,
            streak: s.stats.practiceDays.length,
            progress: Object.entries(s.progress).map(([levelId, p]) => ({
              level_id: levelId,
              stars: p.stars,
              best_score: p.bestScore,
              data: { cleared: p.cleared },
              updated_at: new Date().toISOString(),
            })),
          });
          set({ lastSyncAt: new Date().toISOString() });
        } catch {
          /* 离线忽略 */
        }
      },
    }),
    {
      name: 'maneji.profile.v1',
      version: 1,
      partialize: (s) => ({
        xp: s.xp,
        combo: s.combo,
        stats: s.stats,
        progress: s.progress,
        achievements: s.achievements,
        todayXp: s.todayXp,
        todaySentences: s.todaySentences,
        todayDate: s.todayDate,
        dailyGoal: s.dailyGoal,
        lastLevelId: s.lastLevelId,
        lastSyncAt: s.lastSyncAt,
      }),
    },
  ),
);

/** 今日经验（跨天自动归零，不需要副作用） */
export function useTodayXp(): number {
  const todayXp = useProfileStore((s) => s.todayXp);
  const todayDate = useProfileStore((s) => s.todayDate);
  return todayDate === todayKey() ? todayXp : 0;
}

export function useIsCleared(levelId: string): boolean {
  return useProfileStore((s) => Boolean(s.progress[levelId]?.cleared));
}
