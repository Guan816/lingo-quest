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

  setAi: (patch: Partial<AIConfig>) => void;
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
}

type MutableKey = 'ttsRate' | 'autoSpeak' | 'sfxEnabled' | 'showZh' | 'playModelFirst';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: { ...DEFAULT_AI_CONFIG },
      ttsRate: 0.92,
      autoSpeak: true,
      sfxEnabled: true,
      showZh: true,
      playModelFirst: true,

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
        }),
    }),
    {
      name: 'maneji.settings.v1',
      version: 1,
    },
  ),
);

export type { MutableKey };
