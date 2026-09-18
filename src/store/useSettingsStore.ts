import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIConfig } from '../types';
import { DEFAULT_AI_PREFS } from '../lib/ai';

interface SettingsState {
  /**
   * AI 增强开关。
   * 【重要】这里只有「开 / 关 + 要不要联网」——没有地址、没有 Key、没有模型名。
   * 服务端统一持有密钥并自动切换免费服务商，用户配置一律不暴露在界面上。
   */
  ai: AIConfig;
  /** TTS 语速 0.5 ~ 1.3 */
  ttsRate: number;
  /** NPC 说完自动播放 */
  autoSpeak: boolean;
  sfxEnabled: boolean;
  /** 是否显示中文释义 */
  showZh: boolean;
  /** 跟读时是否先听一遍示范 */
  playModelFirst: boolean;
  /**
   * 数学 / 计算机刷题时的 AI 讲解开关。
   * 默认关闭 —— 本地题库已自带分步解析，AI 讲解是可选增强。
   */
  aiExplain: boolean;

  setAi: (patch: Partial<AIConfig>) => void;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
}

/** AI 增强的默认开关（数学 / 计算机刷题时的讲解按钮） */
const DEFAULT_AI: AIConfig = {
  enabled: true,
  ...DEFAULT_AI_PREFS,
};

type MutableKey = 'ttsRate' | 'autoSpeak' | 'sfxEnabled' | 'showZh' | 'playModelFirst' | 'aiExplain';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: { ...DEFAULT_AI },
      ttsRate: 0.92,
      autoSpeak: true,
      sfxEnabled: true,
      showZh: true,
      playModelFirst: true,
      aiExplain: true,

      setAi: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      resetSettings: () =>
        set({
          ai: { ...DEFAULT_AI },
          ttsRate: 0.92,
          autoSpeak: true,
          sfxEnabled: true,
          showZh: true,
          playModelFirst: true,
          aiExplain: true,
        }),
    }),
    {
      name: 'maneji.settings.v1',
      version: 2,
      /**
       * 从 v1 升上来：老存档里存的是 ai.enabled=false（因为当年没配 Key），
       * 现在服务端已经把 Key 接好了、配置入口也删了，再保留 false 会让
       * 用户看到一个「关不掉也开不了」的 AI。所以统一打开。
       */
      migrate: (persisted) => {
        const s = persisted as Partial<SettingsState> | undefined;
        if (!s) return s as unknown as SettingsState;
        return {
          ...s,
          ai: { ...DEFAULT_AI, ...s.ai, enabled: true },
          aiExplain: true,
        } as SettingsState;
      },
    },
  ),
);

export type { MutableKey };
