import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIConfig } from '../types';
import { DEFAULT_AI_CONFIG } from '../lib/ai';

interface SettingsState {
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
   * 数学 / 计算机刷题时的 AI 解析开关。
   * 默认关闭 —— 本地题库已自带分步解析，AI 解析是可选增强，
   * 而且不是所有人都配了 API Key。
   */
  aiExplain: boolean;
  /** 上次选择的备考科目（用于「我的」页展示） */
  examSubjects: ('math' | 'cs')[];

  setAi: (patch: Partial<AIConfig>) => void;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
}

type MutableKey =
  | 'ttsRate'
  | 'autoSpeak'
  | 'sfxEnabled'
  | 'showZh'
  | 'playModelFirst'
  | 'aiExplain'
  | 'examSubjects';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: { ...DEFAULT_AI_CONFIG },
      ttsRate: 0.92,
      autoSpeak: true,
      sfxEnabled: true,
      showZh: true,
      playModelFirst: true,
      aiExplain: false,
      examSubjects: ['math', 'cs'],

      setAi: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      resetSettings: () =>
        set({
          ai: { ...DEFAULT_AI_CONFIG },
          ttsRate: 0.92,
          autoSpeak: true,
          sfxEnabled: true,
          showZh: true,
          playModelFirst: true,
          aiExplain: false,
          examSubjects: ['math', 'cs'],
        }),
    }),
    {
      name: 'maneji.settings.v1',
      version: 1,
    },
  ),
);

export type { MutableKey };
