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
  /** 备考模块：累计做过的题数（数学 + 计算机 + 英语） */
  questionsDone?: number;
  /** 备考模块：累计答对的题数 */
  questionsCorrect?: number;
}

/** 关卡进度 */
export interface LevelProgress {
  stars: number;
  bestScore: number;
  cleared: boolean;
}

/**
 * AI 相关的**用户偏好**。
 *
 * 【重要】这里没有 BaseURL / API Key / 模型名，以后也不要再加回来 ——
 * 那些都由服务端持有并自动在多家免费服务商之间故障转移，
 * 前端只负责发消息。用户不需要（也不应该）接触任何密钥。
 */
export interface AIConfig {
  /** 是否启用 AI 增强（讲解 / 解析 / 出题） */
  enabled: boolean;
  /** 接入联网搜索：让模型能查实时信息（新闻、赛事、新词等） */
  webSearch?: boolean;
  /** 搜索服务地址，留空用默认的自建 SearXNG */
  searchBaseUrl?: string;
  /** 以下字段已废弃，仅为兼容老版本存档保留，代码中不再使用 */
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  visionModel?: string;
}

/** 聊天消息（Boss 对话与自由聊共用） */
export interface ChatMessage {
  id: string;
  role: 'npc' | 'user' | 'system';
  en: string;
  zh?: string;
  score?: number;
}

/* ============================================================
 *  大学英语四级（CET-4）专项
 *  题型对齐真实四级卷：听力 35% / 阅读 35% / 写作 15% / 翻译 15%
 * ============================================================ */

/** 四级题型 */
export type Cet4Kind =
  // 听力（35%）
  | 'news' // 短篇新闻
  | 'conversation' // 长对话
  | 'passage' // 听力篇章
  // 阅读（35%）
  | 'banked' // 选词填空
  | 'matching' // 长篇阅读匹配
  | 'careful' // 仔细阅读
  // 词汇 / 语法基础（贯穿各题型）
  | 'vocab'
  // 翻译 / 写作（主观题）
  | 'translation'
  | 'writing';

/** 客观题（选择题 / 选词填空 / 匹配题都归到这里） */
export interface Cet4Question {
  id: string;
  kind: Cet4Kind;
  /** 听力原文或阅读文章；听力题会用 TTS 朗读它 */
  material?: string;
  /** 材料的中文提示（如场景说明） */
  materialZh?: string;
  /** 题干 */
  stem: string;
  /** 选项（一般 4 个） */
  options: string[];
  /** 正确选项下标 */
  answer: number;
  /** 中文解析 */
  explain?: string;
  /** 来源风格标注，如「2023.6 真题风格」 */
  tag?: string;
}

/** 主观题：翻译 / 写作 */
export interface Cet4Writing {
  id: string;
  kind: 'translation' | 'writing';
  /** 翻译给中文段落；写作给英文题目要求 */
  prompt: string;
  /** 写作的中文提示 */
  promptZh?: string;
  /** 参考译文 / 范文 */
  sample: string;
  /** 评分要点 */
  points: string[];
  /** 高分表达 */
  phrases?: { en: string; zh: string }[];
  tag?: string;
}

/* ============================================================
 *  江苏专转本 · 数学（高等数学 + 线性代数）
 *  官方构成：微积分 80% + 线性代数 20%，满分 150 / 120 分钟
 *  题型：单选 8×4=32 · 填空 6×4=24 · 计算 8×8=64 · 证明 1×10=10 · 综合 2×10=20
 * ============================================================ */

/** 数学题型（对齐官方卷面） */
export type MathKind =
  | 'choice' // 单项选择题
  | 'blank' // 填空题（客观判分）
  | 'calc' // 计算题（主观作答，对照答案）
  | 'proof' // 证明题
  | 'synthetic'; // 综合题

/**
 * 数学考点所属章节。
 *
 * 严格对齐《江苏省普通高校"专转本"选拔考试 高等数学考试大纲》
 * （省教育厅，2022 年起实施）的考查内容顺序：
 *   第一部分 微积分：(一)函数极限连续 (二)一元函数微分学 (三)一元函数积分学
 *                     (四)多元函数微积分学 (五)无穷级数 (六)常微分方程
 *   第二部分 线性代数：(一)行列式与矩阵 (二)向量与线性方程组
 *
 * 注意：考纲**不含**「向量代数与空间解析几何」。其中的「向量」指
 * n 维向量（属线性代数），不是空间几何向量。
 */
export type MathChapter =
  // ── 第一部分 微积分（约 80%）──
  | 'limit' // (一) 函数、极限与连续
  | 'deriv' // (二) 一元函数微分学
  | 'integral' // (三) 一元函数积分学
  | 'multivar' // (四) 多元函数微积分学
  | 'series' // (五) 无穷级数
  | 'ode' // (六) 常微分方程
  // ── 第二部分 线性代数（约 20%）──
  | 'detmat' // (一) 行列式与矩阵
  | 'linalg'; // (二) 向量与线性方程组

/** 难度层级（对齐官方「较易 30% / 中等 50% / 较难 20%」） */
export type Difficulty = 'easy' | 'mid' | 'hard';

/** 一道数学题 */
export interface MathQuestion {
  id: string;
  chapter: MathChapter;
  kind: MathKind;
  difficulty: Difficulty;
  /** 题干 */
  stem: string;
  /** 选择题选项；非选择题为空 */
  options?: string[];
  /** 选择题正确项下标 */
  answer?: number;
  /** 参考答案（填空题给答案文本，计算/证明给解题过程要点） */
  refAnswer: string;
  /** 分步解析 */
  steps: string[];
  /** 一句话考点 */
  point: string;
  /** 公式提示（可选） */
  formula?: string;
  tag?: string;
}

/* ============================================================
 *  江苏专转本 · 计算机
 *  课程 A：计算机应用基础（约 60%）
 *  课程 B：信息技术导论（约 40%）
 *  题型：判断 10×1 · 单选 50×2 · 多选 10×2 · 填空 10×2
 * ============================================================ */

/** 计算机试卷课程 */
export type CsCourse = 'A' | 'B';

/** 计算机题型 */
export type CsKind =
  | 'judge' // 判断题
  | 'single' // 单选题
  | 'multi' // 多选题
  | 'fill'; // 填空题

/** 课程 A 章节（计算机应用基础） */
export type CsChapterA =
  | 'hardware' // 计算机硬件
  | 'software' // 计算机软件
  | 'network' // 计算机网络与互联网
  | 'media'; // 多媒体技术

/** 课程 B 章节（信息技术导论） */
export type CsChapterB =
  | 'infosys' // 信息和信息系统
  | 'iot' // 物联网技术
  | 'mobile' // 移动互联网技术
  | 'cloud' // 云计算技术
  | 'bigdata' // 大数据技术
  | 'ai' // 人工智能技术
  | 'blockchain'; // 区块链

export type CsChapter = CsChapterA | CsChapterB;

/** 一道计算机题 */
export interface CsQuestion {
  id: string;
  course: CsCourse;
  chapter: CsChapter;
  kind: CsKind;
  difficulty: Difficulty;
  stem: string;
  /** 单选 / 多选 的选项；判断题不必填（前端固定「正确/错误」）；填空无选项 */
  options?: string[];
  /**
   * 单选：正确项下标；多选：正确项下标数组；判断题：1=正确 0=错误。
   * 填空题是主观作答（对照 refAnswer 自评），所以可不填。
   */
  answer?: number | number[];
  /** 填空题的参考答案 */
  refAnswer?: string;
  /** 解析 */
  explain: string;
  point: string;
  tag?: string;
}

