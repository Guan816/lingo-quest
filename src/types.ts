/** 应用全局类型定义 */

export type LevelKind = 'phrase' | 'scenario' | 'boss';

/** 一句跟读句：英文原文 + 中文释义 + 可选发音/用法提示 */
export interface Phrase {
  id: string;
  en: string;
  zh: string;
  /** 句中重点词，用于高亮与拼句小游戏 */
  focus?: string[];
  /** 易错音提示 */
  tip?: string;
}

/** 单词卡片 */
export interface VocabItem {
  id: string;
  en: string;
  zh: string;
  ipa?: string;
  topic: string;
}

/** 剧本对话的一句。role=npc 由 AI/预置音频说出，role=user 由玩家说 */
export interface ScenarioLine {
  role: 'npc' | 'user';
  en: string;
  zh: string;
}

/** 剧本：一个可反复通关的角色扮演场景 */
export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  npcName: string;
  npcEmoji: string;
  intro: string;
  /** 通关目标描述 */
  goal: string;
  lines: ScenarioLine[];
}

/** 关卡 */
export interface LevelDef {
  id: string;
  worldId: string;
  order: number;
  title: string;
  kind: LevelKind;
  /** phrase 关卡的跟读句 */
  phrases?: Phrase[];
  scenarioId?: string;
  /** boss 关卡的对话设定 */
  boss?: {
    npcName: string;
    npcEmoji: string;
    systemPrompt: string;
    opener: string;
    openerZh: string;
    /** 通关所需最少有效发言轮数 */
    targetTurns: number;
  };
}

/** 世界（地图上的一大块区域） */
export interface WorldDef {
  id: string;
  name: string;
  emoji: string;
  subtitle: string;
  /** tailwind 渐变类名 */
  gradient: string;
  accent: string;
  levels: LevelDef[];
}

/** 发音评分结果 */
export interface ScoreResult {
  /** 0-100 */
  score: number;
  /** 逐词判定，用于 UI 染色 */
  words: { text: string; ok: boolean }[];
  /** 识别到的文本（可能为空，代表没听清） */
  transcript: string;
  /** 漏读的词 */
  missing: string[];
  /** 多读/读错的词 */
  extra: string[];
}

/** 成就 */
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  /** 达成条件：从统计数据中判定 */
  test: (s: PlayerStats) => boolean;
}

/** 玩家统计（成就与数据页都基于它） */
export interface PlayerStats {
  totalXp: number;
  sentencesSpoken: number;
  perfectScores: number;
  practiceDays: string[];
  wordsLearned: string[];
  bossCleared: number;
  comboBest: number;
  minutesSpoken: number;
}

/** 关卡进度 */
export interface LevelProgress {
  stars: number;
  bestScore: number;
  cleared: boolean;
}

/** AI 配置（OpenAI 兼容） */
export interface AIConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 聊天消息（Boss 对话与自由聊共用） */
export interface ChatMessage {
  id: string;
  role: 'npc' | 'user' | 'system';
  en: string;
  zh?: string;
  score?: number;
}
