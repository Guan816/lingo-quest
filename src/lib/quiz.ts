/**
 * 通用刷题引擎：数学 / 计算机两个科目共用。
 *
 * 设计要点：
 *  - 组卷：按章节 + 题型抽题，去掉「已掌握」的题，自动补充
 *  - 判分：客观题自动判，主观题（计算/证明/综合）对照答案自评
 *  - AI 解析：用户开启后，可让大模型针对某题给出分步讲解
 */
import type { AIConfig, CsQuestion, Difficulty, MathQuestion } from '../types';
import { chatComplete } from './ai';
import {
  EXPLAIN_STYLE_PROMPT,
  fromLegacySteps,
  makeExplain,
  normalizeSteps,
  type Explain,
  type ExplainStep,
} from './explain';

/* ===================== 通用题目视图 ===================== */

/** 把两个科目的题统一成一种形状，方便共用组件 */
export interface QuizItem {
  id: string;
  /** 题干 */
  stem: string;
  /** 选项（选择题/多选题有；判断题由前端补「正确/错误」） */
  options: string[];
  /** 已打乱的正确项下标（单选/多选为数组，判断题单值） */
  answerIdx: number[];
  /** 题型：single 单选 / multi 多选 / judge 判断 / fill 填空 / calc 计算 / proof 证明 / synthetic 综合 */
  mode: QuizItemMode;
  /** 难度 */
  difficulty: Difficulty;
  /** 章节 key */
  chapter: string;
  /** 参考答案文本 */
  refAnswer: string;
  /** 分步解析（本地已有则直接用，无需调用 AI） */
  steps: string[];
  /** 一句话考点 */
  point: string;
  /** 公式提示 */
  formula?: string;
  /**
   * 结构化的四模块解析（答案 / 考点 / 解 / 技巧）。
   *
   * 这是答题页排版的依据 —— 具体规范见 lib/explain.ts。
   * 由 explainOf() 懒构造并缓存在这里，避免每次渲染重算。
   */
  explain?: Explain;
  /** 原始题目对象，供 AI 解析时使用 */
  raw: MathQuestion | CsQuestion;
}

export type QuizItemMode = 'single' | 'multi' | 'judge' | 'fill' | 'calc' | 'proof' | 'synthetic';

/** 需要用户自己打字作答的题型（主观题） */
export const SUBJECTIVE_MODES: QuizItemMode[] = ['fill', 'calc', 'proof', 'synthetic'];

/** 选项类题型 */
export const OBJECTIVE_MODES: QuizItemMode[] = ['single', 'multi', 'judge'];

/* ===================== 乱序工具 ===================== */

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===================== 题目转换 ===================== */

/**
 * 打乱选项，并给出正确答案在**同一排列**下的下标。
 *
 * 这里曾经出过一个严重 bug：选项在算答案下标时打乱了一次，
 * 显示时又打乱了一次，两次是不同的排列 —— 结果是同一道题
 * 每次点开「正确选项」都指向不同选项，答案看着像随机的。
 * 所以现在强制只打乱一次，下标和显示共用同一个数组。
 */
function shuffledWithAnswer(
  all: string[],
  correctTexts: string[],
): { options: string[]; answerIdx: number[] } {
  const options = shuffle(all);
  const answerIdx = correctTexts
    .map((t) => options.findIndex((o) => o === t))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  return { options, answerIdx };
}

/** 从数学题构造 QuizItem（选项打乱） */
export function fromMath(q: MathQuestion): QuizItem {
  // 数学的 kind 里 'blank'（填空）在通用模型里对应 'fill'
  const mode: QuizItemMode =
    q.kind === 'choice' ? 'single' : q.kind === 'blank' ? 'fill' : q.kind;

  const raw = q.options ?? [];

  // 选择题：打乱一次，答案下标与显示选项共用同一排列
  if (mode === 'single' && q.answer !== undefined && raw[q.answer] !== undefined) {
    const correctText = raw[q.answer];
    const { options, answerIdx } = shuffledWithAnswer(raw, [correctText]);
    return {
      id: q.id,
      stem: q.stem,
      options,
      answerIdx,
      mode,
      difficulty: q.difficulty,
      chapter: q.chapter,
      // 参考答案取选项原文 —— 字母（A/B/C/D）在打乱后会失效
      refAnswer: correctText,
      steps: q.steps ?? [],
      point: q.point,
      formula: q.formula,
      raw: q,
    };
  }

  return {
    id: q.id,
    stem: q.stem,
    options: [],
    answerIdx: [],
    mode,
    difficulty: q.difficulty,
    chapter: q.chapter,
    refAnswer: q.refAnswer,
    steps: q.steps ?? [],
    point: q.point,
    formula: q.formula,
    raw: q,
  };
}

/** 从计算机题构造 QuizItem（选项打乱；判断题不做乱序） */
export function fromCs(q: CsQuestion): QuizItem {
  const mode: QuizItemMode =
    q.kind === 'single'
      ? 'single'
      : q.kind === 'multi'
        ? 'multi'
        : q.kind === 'judge'
          ? 'judge'
          : 'fill';

  // ── 判断题：选项固定「正确 / 错误」，不参与打乱 ──
  if (mode === 'judge') {
    const correct = q.answer === 1;
    return {
      id: q.id,
      stem: q.stem,
      options: ['正确', '错误'],
      answerIdx: [correct ? 0 : 1],
      mode,
      difficulty: q.difficulty,
      chapter: q.chapter,
      refAnswer: correct ? '正确' : '错误',
      steps: [q.explain],
      point: q.point,
      raw: q,
    };
  }

  const raw = q.options ?? [];

  // ── 多选题 ──
  if (mode === 'multi') {
    const idxs = Array.isArray(q.answer) ? q.answer : [];
    const correctTexts = idxs
      .map((i) => raw[i])
      .filter((x): x is string => typeof x === 'string');
    const { options, answerIdx } = shuffledWithAnswer(raw, correctTexts);
    return {
      id: q.id,
      stem: q.stem,
      options,
      answerIdx,
      mode,
      difficulty: q.difficulty,
      chapter: q.chapter,
      refAnswer: correctTexts.join('、') || '（未提供答案）',
      steps: [q.explain],
      point: q.point,
      raw: q,
    };
  }

  // ── 单选题 ──
  if (mode === 'single' && typeof q.answer === 'number' && raw[q.answer] !== undefined) {
    const correctText = raw[q.answer];
    const { options, answerIdx } = shuffledWithAnswer(raw, [correctText]);
    return {
      id: q.id,
      stem: q.stem,
      options,
      answerIdx,
      mode,
      difficulty: q.difficulty,
      chapter: q.chapter,
      refAnswer: correctText,
      steps: [q.explain],
      point: q.point,
      raw: q,
    };
  }

  // ── 填空（主观）──
  return {
    id: q.id,
    stem: q.stem,
    options: [],
    answerIdx: [],
    mode: 'fill',
    difficulty: q.difficulty,
    chapter: q.chapter,
    refAnswer: q.refAnswer ?? '',
    steps: [q.explain],
    point: q.point,
    raw: q,
  };
}

/* ===================== 解析的组装 ===================== */

/**
 * 取一道题的标准四模块解析。
 *
 * 优先用已经结构化好的 explain；没有就从老字段
 * （refAnswer / point / steps / formula）现场转一份。
 * 这样老题库一行都不用改，排版就能升级。
 */
export function explainOf(item: QuizItem): Explain {
  if (item.explain) return item.explain;

  const steps: ExplainStep[] = fromLegacySteps(item.steps ?? []);
  // 选项类题目：把正确项对应的字母算出来，答案里要标亮「C. xxx」
  const answerOption =
    item.answerIdx.length && item.options.length
      ? item.answerIdx
          .slice()
          .sort((a, b) => a - b)
          .map((i) => String.fromCharCode(65 + i))
          .join('、')
      : undefined;

  const ex = makeExplain({
    answer: item.refAnswer || '（未提供参考答案）',
    answerOption,
    point: item.point,
    steps,
    // 题库里的 formula 字段正好对应「速记结论」，放进技巧模块
    tip: item.formula ? `速记：${item.formula}` : undefined,
  });

  // 缓存起来：解析区会在一次渲染里被读多次
  item.explain = ex;
  return ex;
}

/* ===================== 组卷 ===================== */

export interface BuildOpts {
  /** 要出题的数量 */
  count?: number;
  /** 只取某几个题型 */
  modes?: QuizItemMode[];
  /** 排除的题目 id（如已答对的题） */
  exclude?: string[];
  /** 优先级更高的难度 */
  prefer?: Difficulty[];
}

/** 从一组 QuizItem 里组卷 */
export function pickItems(pool: QuizItem[], opts: BuildOpts = {}): QuizItem[] {
  const { count = 10, modes, exclude = [], prefer } = opts;

  let list = pool.filter((it) => !exclude.includes(it.id));
  if (modes?.length) list = list.filter((it) => modes.includes(it.mode));
  if (list.length === 0) return [];

  // 优先难度：把 prefer 里的排前面（但不影响随机性）
  if (prefer?.length) {
    const hot = list.filter((it) => prefer.includes(it.difficulty));
    const rest = list.filter((it) => !prefer.includes(it.difficulty));
    list = [...shuffle(hot), ...shuffle(rest)];
  } else {
    list = shuffle(list);
  }

  if (list.length <= count) return list;

  // 尽量让题型均衡：按 mode 分组轮流取
  const byMode = new Map<QuizItemMode, QuizItem[]>();
  for (const it of list) {
    const g = byMode.get(it.mode) ?? [];
    g.push(it);
    byMode.set(it.mode, g);
  }
  if (byMode.size <= 1) return list.slice(0, count);

  const groups = [...byMode.values()].map((g) => [...g]);
  const out: QuizItem[] = [];
  let round = 0;
  while (out.length < count) {
    let added = false;
    for (const g of groups) {
      if (round < g.length && out.length < count) {
        out.push(g[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return out;
}

/* ===================== 判分 ===================== */

export interface GradeResult {
  /** 是否判定为正确 */
  correct: boolean;
  /** 得分（0~100，按题计） */
  score: number;
  /** 给用户的反馈文字 */
  feedback: string;
}

/** 选项类题目的判分 */
export function gradeObjective(item: QuizItem, picked: number[]): GradeResult {
  const need = [...item.answerIdx].sort().join(',');
  const got = [...picked].sort().join(',');
  const correct = need === got && need !== '';
  return {
    correct,
    score: correct ? 100 : 0,
    feedback: correct ? '答对了' : `正确答案：${item.refAnswer}`,
  };
}

/** 主观题的文本比对：归一化后看是否命中参考答案要点 */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。；：、（）【】《》""''！？,.;:()\[\]<>"']/g, '')
    .replace(/[−–—]/g, '-');
}

/**
 * 主观题自评辅助：给出「看起来对不对」的粗判，最终由用户确认。
 * 不做严格数学等价判断（那需要 CAS），只做保守的关键片段匹配。
 */
export function hintSubjective(item: QuizItem, input: string): GradeResult {
  const user = normalizeText(input);
  if (!user) {
    return { correct: false, score: 0, feedback: '还没作答' };
  }

  const ref = normalizeText(item.refAnswer);
  // 参考答案拆成若干片段，命中越多越可能对
  const parts = item.refAnswer
    .split(/[；;，,]/)
    .map((p) => normalizeText(p))
    .filter((p) => p.length >= 2);

  if (!parts.length) {
    return { correct: false, score: 0, feedback: '请对照参考答案自评' };
  }

  const hit = parts.filter((p) => user.includes(p) || p.includes(user)).length;
  const ratio = hit / parts.length;

  if (user === ref || (ref && (user.includes(ref) || ref.includes(user)))) {
    return { correct: true, score: 100, feedback: '与参考答案一致' };
  }
  if (ratio >= 0.6) {
    return { correct: true, score: 80, feedback: `命中 ${hit}/${parts.length} 个要点，基本正确` };
  }
  if (ratio > 0) {
    return { correct: false, score: 40, feedback: `只命中 ${hit}/${parts.length} 个要点，请对照解析核对` };
  }
  return { correct: false, score: 0, feedback: '与参考答案不符，请对照解析核对' };
}

/* ===================== AI 解析 ===================== */

/**
 * 让大模型针对单题给一份**符合排版规范**的四模块解析。
 *
 * 与老版本的区别：以前要求它「控制篇幅 400 字以内、每步一行」，
 * 结果和本地解析的排版完全不是一个风格。现在两处共用
 * EXPLAIN_STYLE_PROMPT，输出直接能喂给同一套渲染组件。
 */
export async function explainWithAI(
  cfg: AIConfig,
  item: QuizItem,
  opts: { userAnswer?: string; onDelta?: (t: string) => void } = {},
): Promise<Explain> {
  const modeName: Record<QuizItemMode, string> = {
    single: '单项选择题',
    multi: '多项选择题',
    judge: '判断题',
    fill: '填空题',
    calc: '计算题',
    proof: '证明题',
    synthetic: '综合题',
  };

  const lines = [
    `题型：${modeName[item.mode]}`,
    `题目：${item.stem}`,
  ];
  if (item.options.length) {
    lines.push(`选项：${item.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('  ')}`);
  }
  lines.push(`参考答案：${item.refAnswer}`);
  if (opts.userAnswer?.trim()) lines.push(`学生的作答：${opts.userAnswer.trim()}`);
  if (item.point) lines.push(`本题考点：${item.point}`);

  const sys =
    '你是一位江苏专转本考试的资深辅导老师，擅长把数学与计算机基础题讲透。' +
    '请用中文讲解，只输出 JSON。';

  const user = [
    lines.join('\n'),
    '',
    EXPLAIN_STYLE_PROMPT,
    '',
    '严格按下面的 JSON 结构输出（不要 markdown 代码块、不要任何解释文字）：',
    '{',
    '  "answer": "最终答案（选择题写选中项的原文）",',
    '  "points": ["考点1", "考点2"],',
    '  "steps": [',
    '    { "text": "第一步在做什么", "math": "这一步得到的式子，没有就留空" },',
    '    { "text": "第二步在做什么", "math": "" }',
    '  ],',
    '  "tip": "解题技巧或速记结论",',
    '  "pitfall": "易错提醒，没有就留空"',
    '}',
    '',
    '如果学生答错了，在 pitfall 里指出他可能的错误思路。',
  ].join('\n');

  const reply = await chatComplete(
    cfg,
    [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    { maxTokens: 1200, temperature: 0.4, timeoutMs: 60000 },
  );

  return parseExplainReply(reply, item);
}

/**
 * 把模型返回的解析 JSON 抠出来。
 * 模型偶尔会包代码块或加前后缀，这里做容错；彻底解析失败则退回原文当解析。
 */
function parseExplainReply(reply: string, item: QuizItem): Explain {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : reply;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start >= 0 && end > start) {
    try {
      const o = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      const answer = String(o.answer ?? '').trim() || item.refAnswer;
      const points = Array.isArray(o.points)
        ? o.points.map((p) => String(p).trim()).filter(Boolean)
        : item.point
          ? [item.point]
          : [];
      const steps = normalizeSteps(o.steps);
      return {
        answer,
        points,
        steps,
        tip: String(o.tip ?? '').trim() || undefined,
        pitfall: String(o.pitfall ?? '').trim() || undefined,
      };
    } catch {
      /* 落到下面的降级 */
    }
  }

  // 降级：模型没给合法 JSON 时，把纯文本按行切成步骤，至少还能读
  const lines = reply
    .split(/\n+/)
    .map((l) => l.replace(/^\s*\d+[.、)）]\s*/, '').trim())
    .filter((l) => l.length > 1);

  return {
    answer: item.refAnswer,
    points: item.point ? [item.point] : [],
    steps: normalizeSteps(lines),
  };
}

/** 把一次练习的经验值算出来 */
export function xpForQuiz(correct: number, total: number): number {
  const base = correct * 5;
  const bonus = total > 0 && correct === total ? 12 : 0;
  return base + bonus;
}

/** 正确率 → 星数 */
export function starsForQuiz(accuracy: number): number {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.75) return 2;
  if (accuracy >= 0.6) return 1;
  return 0;
}
