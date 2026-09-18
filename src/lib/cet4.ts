import type { AIConfig, Cet4Kind, Cet4Question, Cet4Writing } from '../types';
import { CET4_WRITINGS, kindMeta } from '../data/cet4';
import { cet4QuestionsOfKind, allCet4Questions } from './bankMeta';
import { chatComplete } from './ai';
import { uid } from './utils';

/* ─────────────────────── 乱序工具 ─────────────────────── */

/** Fisher–Yates 洗牌，返回新数组（不改原数组） */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────── 组卷 ─────────────────────── */

/** 一道已打乱选项的客观题 */
export interface McqItem {
  /** 原始题目 */
  q: Cet4Question;
  /** 已打乱的选项 */
  options: string[];
  /** 打乱后正确选项的下标 */
  answer: number;
}

/** 默认每次练习的题量 */
export const SESSION_SIZE: Record<string, number> = {
  news: 4,
  conversation: 4,
  passage: 4,
  banked: 6,
  matching: 4,
  careful: 5,
  vocab: 10,
};

/**
 * 按题型组卷：题目顺序与选项顺序**都会打乱**。
 * 题量不足时有多少出多少（会循环补足，保证每题不重复）。
 *
 * 题库走 bankMeta 的合并入口（静态 + 线上），不要直接读 data/cet4 的数组。
 */
export function buildMcqSession(kind: Cet4Kind, count?: number): McqItem[] {
  const pool = cet4QuestionsOfKind(kind);
  if (pool.length === 0) return [];

  const size = count ?? SESSION_SIZE[kind] ?? Math.min(10, pool.length);

  // 题目顺序打乱；不够就从打乱后的池子里继续取
  const picked: Cet4Question[] = [];
  let bag = shuffle(pool);
  while (picked.length < size) {
    if (bag.length === 0) bag = shuffle(pool);
    picked.push(bag.pop() as Cet4Question);
  }

  return picked.map(toItem);
}

/** 打乱选项、重算正确项下标 */
function toItem(q: Cet4Question): McqItem {
  const correctText = q.options[q.answer];
  const shuffled = shuffle(q.options);
  return { q, options: shuffled, answer: Math.max(0, shuffled.indexOf(correctText)) };
}

/** 可以拿来刷题的客观题型（不含翻译/写作） */
export const OBJECTIVE_KINDS: Cet4Kind[] = [
  'news',
  'conversation',
  'passage',
  'banked',
  'matching',
  'careful',
  'vocab',
];

/**
 * 考官模式：从全部题型里随机抽题，模拟真实考卷的混排感。
 */
export function buildMixSession(count = 10): McqItem[] {
  const pool = allCet4Questions().filter((q) => OBJECTIVE_KINDS.includes(q.kind));
  const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
  return picked.map(toItem);
}

/** 错题重做：把错题本里的题重新组卷（选项同样打乱） */
export function buildWrongSession(questions: Cet4Question[], count = 10): McqItem[] {
  const picked = shuffle(questions).slice(0, Math.min(count, questions.length));
  return picked.map(toItem);
}

/** 按题型取主观题（翻译 / 写作），顺序打乱 */
export function buildWritingSession(kind: Cet4Kind, count = 1): Cet4Writing[] {
  const pool = CET4_WRITINGS.filter((w) => w.kind === kind);
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

/* ─────────────────────── 判分 ─────────────────────── */

/** 正确率 → 星数（3 星制） */
export function starsFor(accuracy: number): number {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.75) return 2;
  if (accuracy >= 0.6) return 1;
  return 0;
}

/** 一次练习的经验值：每题基础分 + 全对奖励 */
export function xpForSession(correct: number, total: number): number {
  const base = correct * 4;
  const bonus = total > 0 && correct === total ? 10 : 0;
  return base + bonus;
}

/* ─────────────────────── AI 出题 ─────────────────────── */

function buildPrompt(kind: Cet4Kind, count: number): string {
  const meta = kindMeta(kind);
  const extra: Record<string, string> = {
    news: '材料为一段 60-90 词的英文短新闻，问题考主旨或关键细节，共 1 题。',
    conversation: '材料为一段 60-100 词的两人英文对话（用 M: 和 W: 标注说话人），问题考对话中的关键信息。',
    passage: '材料为一段 90-130 词的英文短文，问题考主旨、推断或细节。',
    banked: '材料为一段 60-90 词的英文短文，其中留 1 个空用 (1)____ 表示；题干问该空应填哪个词，选项为 4 个同类词性的英文单词。',
    matching: '材料为 4 段带 A/B/C/D 标号的英文短文（每段 25-40 词，同一主题的不同方面）；题干为一句中文说明，问它对应哪一段，选项固定为 ["A 段","B 段","C 段","D 段"]。',
    careful: '材料为一段 110-160 词的英文短文，问题考主旨、细节或推断，注意设置干扰项。',
    vocab: '不给材料。题干为一个带 ____ 的英文句子（四级难度），选项为 4 个形近或义近的英文单词，考固定搭配或词义辨析。',
  };
  return [
    `你是大学英语四级（CET-4）命题专家。请按「${meta.name}」题型出 ${count} 道题，难度与近年真题一致。`,
    extra[kind] ?? '',
    '硬性要求：',
    '1) 题目必须原创，不得照抄任何真题原文；',
    '2) 每题 options 必须正好 4 个，正确项位置随机分布，不要总放在第一个；',
    '3) explain 用中文，一句话点出考点（如固定搭配、同义替换、转折词后是答案）；',
    '4) material 字段：需要材料的题型填英文材料，不需要材料的题型填空字符串 ""；',
    '5) 只输出 JSON 数组，不要任何解释文字、不要 markdown 代码块。',
    'JSON 格式：[{"stem":"题干（英文）","material":"英文材料或空字符串","options":["选项1","选项2","选项3","选项4"],"answer":0,"explain":"中文解析"}]',
    '其中 answer 是正确选项在 options 里的下标（0-3）。',
  ]
    .filter(Boolean)
    .join('\n');
}

/** 从模型返回里抠出 JSON 数组（容忍代码块、前后废话） */
function extractJsonArray(text: string): unknown[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('模型没有返回可用的题目格式');
  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) throw new Error('模型返回的不是题目数组');
  return parsed;
}

function normalizeGenerated(kind: Cet4Kind, raw: unknown): McqItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const stem = String(r.stem ?? '').trim();
  const options = Array.isArray(r.options) ? r.options.map((o) => String(o)).filter(Boolean) : [];
  if (!stem || options.length < 2) return null;

  const answerIdx = Number(r.answer);
  const safeAnswer = Number.isInteger(answerIdx) && answerIdx >= 0 && answerIdx < options.length ? answerIdx : 0;

  const q: Cet4Question = {
    id: uid('c4ai'),
    kind,
    stem,
    material: String(r.material ?? '').trim() || undefined,
    options,
    answer: safeAnswer,
    explain: String(r.explain ?? '').trim() || undefined,
    tag: 'AI 生成',
  };

  // 生成题同样打乱选项，保证答案位置随机
  const correctText = q.options[safeAnswer];
  const shuffled = shuffle(q.options);
  return { q, options: shuffled, answer: Math.max(0, shuffled.indexOf(correctText)) };
}

/**
 * 让 AI 依据四级真题风格生成新题。
 * 需要先在「设置 → AI 接口」里配置好 OpenAI 兼容接口。
 */
export async function generateQuestions(
  cfg: AIConfig,
  kind: Cet4Kind,
  count = 3,
): Promise<McqItem[]> {
  const text = await chatComplete(
    cfg,
    [
      { role: 'system', content: '你只输出 JSON，不输出任何其他内容。' },
      { role: 'user', content: buildPrompt(kind, count) },
    ],
    { maxTokens: 2400, temperature: 0.95, timeoutMs: 60000 },
  );

  const arr = extractJsonArray(text);
  const items = arr.map((r) => normalizeGenerated(kind, r)).filter((x): x is McqItem => Boolean(x));
  if (items.length === 0) throw new Error('AI 没能生成有效题目，请重试或换一个模型');
  return items;
}

/** 主观题批改：让 AI 按四级评分标准给出反馈 */
export async function reviewWriting(
  cfg: AIConfig,
  kind: 'translation' | 'writing',
  prompt: string,
  answer: string,
  sample: string,
): Promise<string> {
  const role =
    kind === 'translation'
      ? '你是大学英语四级翻译阅卷老师，按"信息完整、语法正确、表达自然"三项给分。'
      : '你是大学英语四级写作阅卷老师，按"内容切题、结构清晰、语言准确"三项给分。';
  return chatComplete(
    cfg,
    [
      { role: 'system', content: `${role} 请用中文回复。` },
      {
        role: 'user',
        content:
          `题目：\n${prompt}\n\n参考译文/范文：\n${sample}\n\n学生作答：\n${answer}\n\n` +
          '请给出：1) 预估得分（按四级 15 分制）；2) 两个最需要改的问题（指出原句并给出改法）；3) 一句鼓励。控制在 200 字内。',
      },
    ],
    { maxTokens: 600, temperature: 0.5, timeoutMs: 45000 },
  );
}
