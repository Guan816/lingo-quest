/**
 * AI 批量出题引擎。
 *
 * ═══════════════════════════════════════════════════════════════
 *  三条铁律（都是踩过的坑，改代码前先看这里）
 * ═══════════════════════════════════════════════════════════════
 *
 * ① **必须小批量循环**，不能一次要几十题。
 *    server/src/services/ai.ts 里这行是硬上限：
 *        const maxTokens = Math.min(opts.maxTokens ?? cap, cap);
 *    而 6 家 provider 的 maxOutput 全是 2000。
 *    一道数学计算题含分步解析约 300~500 token，
 *    一次要 20 题必然被截断成半截 JSON，抠不出来，全部作废。
 *
 * ② **必须串行 + 间隔**。免费额度的 provider 对 QPS 敏感，
 *    并发 5 个请求会连续 429。每批之间 sleep(300ms)。
 *
 * ③ **一批失败不炸整轮**。记进 errors[] 跳过继续，
 *    最后统一汇报「成功 N / 失败 M」，重试由用户手动触发。
 *
 * ── 单题裁决 ──
 * 每道题生成后立刻走：去重 → L1~L3 本地校验 → L4 AI 复算（仅客观题）
 * 三条路：passed（可入库）/ doubtful（进人工复核队列）/ rejected（驳回）
 */

import type { AIConfig, BankQuestion, Difficulty, QuestionSource } from '../types';
import { chatComplete } from './ai';
import { extractJsonObject } from './paper';
import { EXPLAIN_STYLE_PROMPT, normalizeSteps } from './explain';
import { findDuplicate, fingerprint, type DedupeCandidate } from './dedupe';
import { verifyLocal, mergeAIVerdict, verifyByAI, isVerifiable, type Verdict } from './verify';
import { chaptersOf, chapterNameOf, kindNameOf, type SubjectLike } from './bankMeta';

/* ═══════════════ 批次大小 ═══════════════ */

/**
 * 各科目 / 题型的单批题量。
 *
 * 依据是「单题 JSON 的 token 量」和 provider 的 2000 硬上限：
 *   · 数学计算/证明/综合 —— 解析长（5~8 步），一题就 400+ token → 1 题
 *   · 数学选择/填空     —— 解析短 → 3 题
 *   · 计算机各题型      —— 题干和解析都短 → 4~5 题
 *   · 四级              —— 材料（英文原文）占大头 → 2 题
 *
 * 这些是实测建议值，偏保守。宁可多调用几次，也不能被截断。
 */
const BATCH_SIZE: Record<string, number> = {
  'math:choice': 3,
  'math:blank': 3,
  'math:calc': 1,
  'math:proof': 1,
  'math:synthetic': 1,
  'cs:judge': 5,
  'cs:single': 4,
  'cs:multi': 3,
  'cs:fill': 4,
  'cet4:news': 2,
  'cet4:conversation': 2,
  'cet4:passage': 1,
  'cet4:banked': 1,
  'cet4:matching': 1,
  'cet4:careful': 1,
  'cet4:vocab': 3,
};

export function batchSizeOf(subject: SubjectLike, kind: string): number {
  return BATCH_SIZE[`${subject}:${kind}`] ?? 2;
}

/** 每批之间的间隔，避免触发上游 QPS 限制 */
const BATCH_GAP_MS = 300;

/** 出题的 temperature —— 高一点，否则每批都出重复的题 */
const GEN_TEMPERATURE = 0.95;

/** 单批的输出上限，贴着 provider 的 2000 走 */
const GEN_MAX_TOKENS = 2000;

/* ═══════════════ 生成规格 ═══════════════ */

export interface GenSpec {
  subject: SubjectLike;
  /** 章节 key；四级用题型 key */
  chapter: string;
  /** 考点关键词（可选，留空则该章任意考点） */
  point?: string;
  /** 题型 key */
  kind: string;
  /** 难度；'mix' 表示按考纲比例混合 */
  difficulty: Difficulty | 'mix';
  /** 本次要出的总量 */
  count: number;
}

/* ═══════════════ prompt 组装 ═══════════════ */

const KIND_MODE: Record<SubjectLike, Record<string, string>> = {
  math: {
    choice: 'single',
    blank: 'fill',
    calc: 'calc',
    proof: 'proof',
    synthetic: 'synthetic',
  },
  cs: { judge: 'judge', single: 'single', multi: 'multi', fill: 'fill' },
  cet4: {
    news: 'single',
    conversation: 'single',
    passage: 'single',
    banked: 'single',
    matching: 'single',
    careful: 'single',
    vocab: 'single',
    translation: 'writing',
    writing: 'writing',
  },
};

/** 题型 → JSON 里 mode 字段的值（AI 要照着填） */
export function modeOf(subject: SubjectLike, kind: string): string {
  return KIND_MODE[subject]?.[kind] ?? 'single';
}

/** 该科目该题型要不要输出 options */
export function needsOptions(subject: SubjectLike, kind: string): boolean {
  if (subject === 'math') return kind === 'choice';
  if (subject === 'cs') return kind === 'single' || kind === 'multi';
  return !['translation', 'writing'].includes(kind);
}

const SUBJECT_NAME: Record<SubjectLike, string> = {
  math: '高等数学（含线性代数）',
  cs: '计算机专业综合基础理论',
  cet4: '大学英语四级（CET-4）',
};

const DIFF_HINT: Record<string, string> = {
  easy: '较易（对应考纲 30% 的容易题）',
  mid: '中等（对应考纲 50% 的中等题）',
  hard: '较难（对应考纲 20% 的难题）',
  mix: '按考纲比例混合：较易 3 成、中等 5 成、较难 2 成',
};

const KIND_HINT: Record<string, string> = {
  choice: '单项选择题（4 个选项，只有一个正确）',
  blank: '填空题（不输出 options，答案是一个具体的值或表达式）',
  calc: '计算题（不输出 options，要有完整的分步推导）',
  proof: '证明题（不输出 options，要有「证明：」起头的完整逻辑链）',
  synthetic: '综合题（不输出 options，跨章节综合，难度最高）',
  judge: '判断题（options 固定写 ["正确","错误"]，answer 只能是「正确」或「错误」）',
  single: '单项选择题（4 个选项，只有一个正确）',
  multi: '多项选择题（4 个选项，至少有 2 个正确项，answer 用「、」连接多个选项原文）',
  fill: '填空题（不输出 options，答案是一个具体的值或词组）',
  news: '短篇新闻听力（先给 80~120 词的英文新闻原文，再出一题）',
  conversation: '长对话听力（先给 100~160 词的英文对话原文，再出一题）',
  passage: '听力篇章（先给 150~220 词的英文短文，再出一题）',
  banked: '选词填空（先给挖了空的英文短文，options 是候选词表）',
  matching: '长篇阅读匹配（先给 250~350 词的英文短文，再出一题）',
  careful: '仔细阅读（先给 250~350 词的英文短文，再出一题）',
  vocab: '核心词汇题（考四级高频词的词义或搭配）',
  translation: '段落翻译（汉译英，不输出 options）',
  writing: '短文写作（120~180 词，不输出 options）',
};

/** 章节目录文本，喂给 AI 让它归类 */
function chapterCatalogue(subject: SubjectLike): string {
  return chaptersOf(subject)
    .map((k) => `${k} = ${chapterNameOf(subject, k)}`)
    .join('\n');
}

/** 组装一次出题的 prompt */
export function buildGenPrompt(spec: GenSpec, batchSize: number, seed: string): string {
  const { subject, chapter, kind } = spec;
  const subjName = SUBJECT_NAME[subject];
  const chName = chapterNameOf(subject, chapter);
  const kindHint = KIND_HINT[kind] ?? kindNameOf(subject, kind);
  const diffHint = DIFF_HINT[spec.difficulty] ?? DIFF_HINT.mid;
  const mode = modeOf(subject, kind);
  const withOptions = needsOptions(subject, kind);

  const lines: string[] = [
    `你在为江苏省普通高校"专转本"选拔考试命制模拟题。科目：${subjName}。`,
    '',
    '【命制约束】',
    `- 章节：${chName}（key = ${chapter}）`,
    spec.point
      ? `- 考点：必须围绕「${spec.point}」来出，不要跑题`
      : '- 考点：该章考纲范围内的任意考点',
    `- 题型：${kindHint}`,
    `- 难度：${diffHint}`,
    `- 数量：${batchSize} 道`,
    `- 这 ${batchSize} 道题之间**必须互相不同** —— 情境、数字、设问角度都要换`,
    '',
    '【质量要求】',
    '- 严格贴合考纲，不超纲；不使用考纲外的记号或定义',
    '- 题干表述完整，可以直接作答，不需要额外补充条件',
    '- **每道题都要给出完整的分步解析**，不能省略中间步骤、不能只写答案',
  ];

  if (withOptions && kind !== 'judge') {
    lines.push('- 4 个选项都要有迷惑性，错误选项要是「算错/记混会得到的结果」，不能一眼排除');
  }

  if (subject === 'cet4') {
    lines.push(
      '',
      '【四级专项】',
      '- 听力与阅读题：必须把英文原文写在 stem 字段最前面，格式为',
      '  【原文】...英文原文...【题目】...具体问题...',
      '- 原文长度按上面的题型要求来，不要过短（信息量不够出不了题）。',
      '- 题目难度对标四级真题，不要出成高考难度。',
    );
  }

  lines.push(
    '',
    EXPLAIN_STYLE_PROMPT,
    '',
    '【去重要求】',
    `本次生成的随机种子：${seed}，请避免与常见教材例题雷同。`,
    '',
    '章节 key 只能从下面这个目录里选（chapter 字段直接填 key，不要填中文名）：',
    chapterCatalogue(subject),
    '',
    '只输出 JSON（不要 markdown 代码块、不要任何解释文字）：',
    '{',
    '  "questions": [',
    '    {',
    '      "stem": "题干",',
  );

  if (withOptions) {
    lines.push(
      kind === 'judge'
        ? '      "options": ["正确", "错误"],'
        : '      "options": ["选项原文1", "选项原文2", "选项原文3", "选项原文4"],',
      '      "answer": "标准答案（选择题必须与上面某个 option 的原文完全一致，不要写字母）",',
    );
  } else {
    lines.push(
      '      "options": [],',
      '      "answer": "标准答案的最终结论",',
    );
  }

  lines.push(
    '      "point": "考点名称（12 字以内的短词）",',
    '      "steps": [{ "text": "这一步在做什么", "math": "这一步得到的式子，没有就留空字符串" }],',
    '      "tip": "解题技巧或速记结论，没有就留空字符串",',
    '      "pitfall": "易错提醒，没有就留空字符串",',
    `      "mode": "${mode}",`,
    '      "difficulty": "easy | mid | hard 之一",',
    `      "chapter": "${chapter}"`,
    '    }',
    '  ]',
    '}',
  );

  return lines.join('\n');
}

/* ═══════════════ 生成结果的规整 ═══════════════ */

interface RawQ {
  stem?: unknown;
  options?: unknown;
  answer?: unknown;
  point?: unknown;
  steps?: unknown;
  tip?: unknown;
  pitfall?: unknown;
  mode?: unknown;
  difficulty?: unknown;
  chapter?: unknown;
}

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function splitPoints(v: unknown): string {
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join('、');
  return str(v);
}

const MODES = new Set([
  'single', 'multi', 'judge', 'fill', 'calc', 'proof', 'synthetic', 'writing',
]);

const DIFFS = new Set(['easy', 'mid', 'hard']);

/** 把 AI 返回的一道原始题规整成 BankQuestion（还未分配 id / 校验） */
export function normalizeGenerated(
  raw: RawQ,
  spec: GenSpec,
  sourceRef: string,
): Omit<BankQuestion, 'id' | 'status'> | null {
  const stem = str(raw.stem);
  if (!stem) return null;

  const options = Array.isArray(raw.options)
    ? raw.options.map(str).filter(Boolean)
    : [];

  const modeRaw = str(raw.mode);
  const mode = MODES.has(modeRaw) ? modeRaw : (modeOf(spec.subject, spec.kind) as never);

  const diffRaw = str(raw.difficulty);
  const difficulty: Difficulty = DIFFS.has(diffRaw)
    ? (diffRaw as Difficulty)
    : spec.difficulty === 'mix'
      ? 'mid'
      : spec.difficulty;

  const steps = normalizeSteps(raw.steps);
  const tips = str(raw.tip);
  const pitfalls = str(raw.pitfall);

  const answerText = str(raw.answer);

  // 判断题：把答案规范成「正确 / 错误」
  let finalAnswer = answerText;
  if (mode === 'judge') {
    finalAnswer = /^(正确|对|是|true|t|√|y)/i.test(answerText) ? '正确' : '错误';
  }

  const q: Omit<BankQuestion, 'id' | 'status'> = {
    subject: spec.subject,
    chapter: str(raw.chapter) || spec.chapter,
    point: splitPoints(raw.point),
    kind: spec.kind,
    difficulty,
    mode: mode as never,
    stem,
    options: options.length ? options : undefined,
    answerText: finalAnswer,
    steps: steps.map((s) => ({ text: s.text, math: s.math })),
    tip: tips || undefined,
    pitfall: pitfalls || undefined,
    source: 'ai' as QuestionSource,
    sourceRef,
    fingerprint: fingerprint(stem),
  };

  // 判断题的选项由前端固定，不存进库，避免 AI 自造选项污染数据
  if (mode === 'judge') q.options = undefined;

  return q;
}

/**
 * 从 AI 回复里抠出题目数组。
 *
 * 顶层结构是 **{ questions: [...] }** —— prompt 里就是这么要求的，
 * 裸数组（模型偶尔自作主张）会安静地当成"没有题目"，不会被误当成题库。
 *
 * ── 为什么这里要自己吞掉 extractJsonObject 的抛错 ──
 * extractJsonObject 在找不到 JSON 时会 throw（那是给试卷解析用的，
 * 那里"整份试卷解析失败"就该让用户看到错误）。
 * 但出题是**小批量循环**：某一批模型跑偏返回一段废话，
 * 只是这一批白跑，后面几批完全正常。如果异常一路冒到调用方，
 * 用户会看到"生成失败"而丢掉已经成功的那几批。
 *
 * 所以这里统一返回 []：调用方按"本批无有效题目"记账、继续下一批，
 * 和 raws.length === 0 那条分支走同一套处理，不用额外分支。
 */
export function parseGeneratedReply(
  reply: string,
  spec: GenSpec,
  sourceRef: string,
): Omit<BankQuestion, 'id' | 'status'>[] {
  let obj: Record<string, unknown>;
  try {
    obj = extractJsonObject(reply);
  } catch {
    // 模型没吐 JSON（返回了散文 / 被截断 / 空回复）—— 本批作废，不抛
    return [];
  }

  const arr = Array.isArray(obj.questions) ? obj.questions : [];
  const out: Omit<BankQuestion, 'id' | 'status'>[] = [];
  for (const item of arr) {
    const q = normalizeGenerated((item ?? {}) as RawQ, spec, sourceRef);
    if (q) out.push(q);
  }
  return out;
}

/* ═══════════════ 单题裁决 ═══════════════ */

export interface GenResult {
  /** 规整后的题（已分配临时 id） */
  question: BankQuestion;
  verdict: Verdict;
  reasons: string[];
  /** 撞了的题 id */
  dupOf?: string;
  /** 相似度 */
  sim?: number;
}

/** 生成时给题分配的临时 id 前缀 —— 入库时服务端会重新分配正式 id */
const TEMP_PREFIX = 'gen-';

function tempId(n: number): string {
  return `${TEMP_PREFIX}${Date.now().toString(36)}-${n}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 单题走完完整裁决链。
 *
 * @param existing 同科目同章节的已有题（去重候选，由调用方粗筛好）
 * @param doAI    是否做 L4 AI 复算（客观题才有效果；批量时可关掉省额度）
 */
export async function judgeOne(
  cfg: AIConfig,
  q: Omit<BankQuestion, 'id' | 'status'>,
  existing: readonly DedupeCandidate[],
  doAI: boolean,
): Promise<GenResult> {
  const withId: BankQuestion = { ...q, id: tempId(Math.floor(Math.random() * 1e6)), status: 'pending' };

  // ① 去重（只比题干）
  const dup = findDuplicate(q.stem, existing);
  if (dup.dup) {
    return {
      question: withId,
      verdict: 'rejected',
      reasons: [`与已有题 ${dup.best?.id} 相似度 ${(dup.best?.sim ?? 1).toFixed(2)}，判定重复`],
      dupOf: dup.best?.id,
      sim: dup.best?.sim,
    };
  }

  // ② L1~L3 本地校验（零成本）
  const local = verifyLocal(withId);
  const chapter = local.chapterFix?.chapter ?? withId.chapter;
  if (chapter !== withId.chapter) withId.chapter = chapter;

  if (local.verdict === 'rejected') {
    return { question: withId, verdict: 'rejected', reasons: local.reasons, dupOf: dup.best?.id, sim: dup.best?.sim };
  }

  // ③ 相似但没超硬阈值 → 存疑
  if (dup.doubtful) {
    return {
      question: withId,
      verdict: 'doubtful',
      reasons: [...local.reasons, `与 ${dup.best?.id} 相似度 ${(dup.best?.sim ?? 0).toFixed(2)} 偏高`],
      dupOf: dup.best?.id,
      sim: dup.best?.sim,
    };
  }

  // ④ L4 AI 独立复算（只对客观题，且用户开了才做）
  if (doAI && isVerifiable(withId)) {
    const ai = await verifyByAI(cfg, withId);
    const merged = mergeAIVerdict(local, ai);
    return {
      question: withId,
      verdict: merged.verdict,
      reasons: merged.reasons,
      dupOf: dup.best?.id,
      sim: dup.best?.sim,
    };
  }

  return { question: withId, verdict: 'passed', reasons: [], dupOf: dup.best?.id, sim: dup.best?.sim };
}

/* ═══════════════ 批量生成 ═══════════════ */

export interface GenProgress {
  done: number;
  total: number;
  /** 刚生成完的一道（用来说「正在生成…」的实时列表） */
  item?: GenResult;
  message: string;
}

export interface GenOptions {
  /** 同科目同章节的已有题（去重候选）。不传则跳过去重 */
  existing?: readonly DedupeCandidate[];
  /** 是否做 L4 AI 复算，默认 true。批量灌库时可关掉省额度 */
  verifyWithAI?: boolean;
  onProgress?: (p: GenProgress) => void;
  /** 返回 true 则中止（用户点了「中止」） */
  shouldCancel?: () => boolean;
}

export interface GenOutcome {
  results: GenResult[];
  /** 每批失败的说明 */
  errors: string[];
  cancelled: boolean;
}

/**
 * 批量出题。
 *
 * 串行 + 小批量循环 + 批内去重 + 完整裁决链。
 * 任何一批失败都只记错跳过，不中断整轮。
 */
export async function generateBatch(
  cfg: AIConfig,
  spec: GenSpec,
  opts: GenOptions = {},
): Promise<GenOutcome> {
  const { existing = [], verifyWithAI = true, onProgress, shouldCancel } = opts;

  const size = batchSizeOf(spec.subject, spec.kind);
  const batchId = `b_${Date.now().toString(36)}`;
  const results: GenResult[] = [];
  const errors: string[] = [];
  let done = 0;
  let cancelled = false;

  // 批内已出的题也要参与去重 —— AI 一个批次里经常会自己重复
  const seen: DedupeCandidate[] = [...existing];

  while (done < spec.count) {
    if (shouldCancel?.()) {
      cancelled = true;
      break;
    }

    const n = Math.min(size, spec.count - done);
    const seed = Math.random().toString(36).slice(2, 8);

    try {
      const reply = await chatComplete(
        cfg,
        [
          { role: 'system', content: '你只输出 JSON，不输出任何其他内容。' },
          { role: 'user', content: buildGenPrompt(spec, n, seed) },
        ],
        { maxTokens: GEN_MAX_TOKENS, temperature: GEN_TEMPERATURE, timeoutMs: 90000 },
      );

      const raws = parseGeneratedReply(reply, spec, batchId);

      // 这一批一道都没解析出来，说明被截断或格式崩了
      if (!raws.length) {
        errors.push(`第 ${done + 1}~${done + n} 题：模型返回里没有可用的题目`);
        done += n;
        onProgress?.({ done, total: spec.count, message: '本批无有效题目，继续' });
        continue;
      }

      for (const raw of raws) {
        if (done >= spec.count) break;
        if (shouldCancel?.()) { cancelled = true; break; }

        const r = await judgeOne(cfg, raw, seen, verifyWithAI);
        results.push(r);
        // 通过和存疑的题都要进 seen，避免下一批又出一遍
        if (r.verdict !== 'rejected') {
          seen.push({ id: r.question.id, stem: r.question.stem });
        }

        done += 1;
        onProgress?.({ done, total: spec.count, item: r, message: '已生成' });
      }

      // 模型少给了几道，也要把进度补上，否则进度条永远到不了 100%
      if (!cancelled && done < spec.count) {
        const missing = Math.min(n, spec.count - done) - raws.length;
        if (missing > 0 && raws.length < n) {
          errors.push(`第 ${done + 1} 题起：本批只返回了 ${raws.length}/${n} 道`);
          done += missing;
        }
      }
    } catch (e) {
      const msg = (e as Error).message.slice(0, 120);
      errors.push(`第 ${done + 1}~${done + n} 题失败：${msg}`);
      done += n;
      onProgress?.({ done, total: spec.count, message: '本批失败，继续下一批' });
    }

    if (done < spec.count && !cancelled) {
      await sleep(BATCH_GAP_MS);
    }
  }

  return { results, errors, cancelled };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ═══════════════ 额度预估 ═══════════════ */

/**
 * 预估这次出题要消耗多少次 AI 调用。
 *
 * 必须展示给用户 —— 「一题一调用」意味着生成 50 道数学计算题
 * 就吃掉 50 次调用，而日配额默认只有 200。
 * 不提示的话用户点完才发现额度没了。
 */
export function estimateCalls(spec: GenSpec, verifyWithAI = true): number {
  const size = batchSizeOf(spec.subject, spec.kind);
  const gen = Math.ceil(spec.count / size);
  if (!verifyWithAI) return gen;

  // L4 复算只对客观题做，且一题一次
  const objective = ['choice', 'judge', 'single', 'multi', 'news', 'conversation', 'passage', 'banked', 'matching', 'careful', 'vocab'];
  const perQ = objective.includes(spec.kind) ? 1 : 0;
  return gen + spec.count * perQ;
}
