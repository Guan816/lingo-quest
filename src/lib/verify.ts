/**
 * 入库前校验 —— 出题快，校验必须更严。
 *
 * 错题的代价比没题大得多：用户做了一道答案错的题，
 * 会怀疑整个题库，然后卸载。
 *
 * ── 四层校验 ──
 *   L1 结构完整性  纯本地、零成本
 *   L2 答案自洽    纯本地、零成本（是最高频的错误来源）
 *   L3 章节合法    纯本地、零成本
 *   L4 答案正确性  调 AI 独立复算，有成本，只对客观题同步做
 *
 * L1~L3 任何一层不通过 → rejected（直接驳回）
 * L4 不通过            → doubtful（进人工复核队列，不是驳回）
 *
 * 为什么 L4 只驳回不 reject：AI 复算本身也会错，
 * 两次不一致只说明「这题有问题」，不能断定「这题是错的」。
 * 交给人工看一眼，比自动丢掉一道好题划算。
 */

import type { AIConfig, BankQuestion } from '../types';
import { MATH_CHAPTERS } from '../data/math';
import { CS_CHAPTERS } from '../data/cs';
import { CET4_KINDS } from '../data/cet4';
import { chatComplete } from './ai';
import { normalizeText } from './quiz';
import { OBJECTIVE_MODES } from './quiz';

/* ═══════════════ 合法值集合 ═══════════════ */

/** 各科目合法的章节 key */
export function validChapters(subject: BankQuestion['subject']): Set<string> {
  if (subject === 'math') return new Set(MATH_CHAPTERS.map((c) => c.key));
  if (subject === 'cs') return new Set(CS_CHAPTERS.map((c) => c.key));
  // 四级没有「章节」概念，用题型 key 充当
  return new Set(CET4_KINDS.map((k) => k.kind));
}

/** 章节的兜底值（AI 返回目录外的 key 时落到这里） */
export function fallbackChapter(subject: BankQuestion['subject']): string {
  if (subject === 'math') return 'limit';
  if (subject === 'cs') return 'hardware';
  return 'careful';
}

/* ═══════════════ L1 结构完整性 ═══════════════ */

export function verifyStructure(q: Partial<BankQuestion>): string[] {
  const errs: string[] = [];

  if (!q.stem?.trim()) errs.push('题干为空');
  if (!q.answerText?.trim()) errs.push('标准答案为空');
  if (!Array.isArray(q.steps) || q.steps.length === 0) errs.push('解析步骤为空');

  const mode = q.mode;
  const isObjective = mode ? OBJECTIVE_MODES.includes(mode as never) : false;

  if (isObjective && mode !== 'judge') {
    const n = q.options?.length ?? 0;
    if (n < 2) errs.push(`客观题至少要有 2 个选项，实际 ${n} 个`);
    if (n > 6) errs.push(`选项过多（${n} 个），可能解析串行了`);
  }

  // 判断题的选项由前端固定成「正确/错误」，不该由 AI 提供
  if (mode === 'judge') {
    const opts = q.options ?? [];
    const ok =
      opts.length === 0 ||
      (opts.length === 2 && opts[0] === '正确' && opts[1] === '错误');
    if (!ok) errs.push('判断题的选项必须是「正确 / 错误」或留空');
  }

  return errs;
}

/* ═══════════════ L2 答案自洽 ═══════════════ */

/**
 * 检查标准答案与选项是否对得上。
 *
 * 这是**最高频的错误来源** —— AI 特别爱把答案写成字母 'C'，
 * 而 options 里存的是选项原文，两者永远匹配不上。
 * 现有试卷解析里也有这个坑（PaperQuestion.answer 的注释专门写明了）。
 */
export function verifyAnswer(q: Partial<BankQuestion>): string[] {
  const errs: string[] = [];
  const opts = q.options ?? [];

  if (!opts.length) return errs; // 主观题没有选项，跳过

  const want = String(q.answerText ?? '').trim();
  if (!want) return errs; // 交给 L1 报

  const nWant = normalizeText(want);

  /*
   * ⓪ 判断题必须最先处理。
   *
   * AI 答判断题时习惯写 T / F / 对 / 错 / √ / ×，而库里存的选项是
   * 「正确 / 错误」。如果先走下面的字母分支，'T' 会被当成"第 20 个选项"
   * （T 的 charCode 减 65 = 19），直接报一个莫名其妙的"找不到对应项"，
   * 把一道完全正确的判断题打成 rejected。
   */
  if (q.mode === 'judge') {
    if (!judgeSide(want)) {
      errs.push(`判断题的标准答案「${want}」不是「正确 / 错误」的任一种写法`);
    }
    return errs;
  }

  // ① 答案是不是直接写了字母？'C' / 'A、C' / 'ABD' / '（A）'
  const letterLike = /^[（(]?[A-Fa-f](?:[、,，／/\s]*[A-Fa-f])*[）)]?$/.test(want);
  if (letterLike) {
    const letters = want.toUpperCase().match(/[A-F]/g) ?? [];
    const idxs = letters
      .map((L) => L.charCodeAt(0) - 65)
      .filter((i) => i >= 0 && i < opts.length);
    if (idxs.length !== letters.length) {
      errs.push(`答案字母「${want}」在 ${opts.length} 个选项里找不到对应项`);
    } else if (q.mode === 'multi' && idxs.length < 2) {
      errs.push(`多选题只给了一个答案（${want}），至少要有两个正确项`);
    } else if (q.mode === 'single' && idxs.length !== 1) {
      errs.push(`单选题给了 ${idxs.length} 个答案（${want}）`);
    }
    return errs;
  }

  // ② 答案是不是某条选项的原文？
  const exact = opts.findIndex((o) => normalizeText(o) === nWant);
  if (exact >= 0) {
    if (q.mode === 'multi') {
      // 多选题答案会是「选项1、选项2」这种拼接形式
      errs.push('多选题的答案只能匹配到一个选项，可能漏了其他正确项');
    }
    return errs;
  }

  // ③ 多选题的答案用分隔符拼接了多条
  if (q.mode === 'multi') {
    const parts = want
      .split(/[、,，;；|／/]/)
      .map((p) => normalizeText(p))
      .filter(Boolean);
    if (parts.length >= 2) {
      const hit = parts.filter((p) => opts.some((o) => normalizeText(o) === p)).length;
      if (hit === 0) {
        errs.push('多选题的答案与任何选项都对不上');
      } else if (hit < parts.length) {
        errs.push(`多选题答案里有 ${parts.length - hit} 项在选项中找不到原文`);
      }
      return errs;
    }
  }

  // ④ 容忍「答案包含选项」或「选项包含答案」的写法（AI 常加前后缀）
  const loose = opts.findIndex((o) => {
    const n = normalizeText(o);
    return n.length >= 2 && (nWant.includes(n) || n.includes(nWant));
  });
  if (loose >= 0) return errs;

  errs.push(`标准答案「${trunc(want)}」不在选项里`);
  return errs;
}

function trunc(s: string, n = 20): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/* ═══════════════ L3 章节合法 ═══════════════ */

/**
 * 章节校验。
 *
 * 和 L1/L2 不同，这一层**不产生 rejected** ——
 * 章节归类错不影响题目本身能不能做，只是归错地方了。
 * 所以自动落到兜底章节并标 doubtful，让用户在复核时改。
 */
export function verifyChapter(q: Partial<BankQuestion>): {
  chapter: string;
  fixed: boolean;
  note?: string;
} {
  const subject = q.subject ?? 'math';
  const ok = validChapters(subject);
  const ch = String(q.chapter ?? '');

  if (ok.has(ch)) return { chapter: ch, fixed: false };

  const fb = fallbackChapter(subject);
  return {
    chapter: fb,
    fixed: true,
    note: `章节 key「${ch || '空'}」不在考纲目录里，已暂归到「${fb}」`,
  };
}

/* ═══════════════ L4 答案正确性（AI 独立复算） ═══════════════ */

/** 这道题是不是客观题（能用复算验证） */
export function isVerifiable(q: Partial<BankQuestion>): boolean {
  return Boolean(q.mode && OBJECTIVE_MODES.includes(q.mode as never));
}

/**
 * 让 AI **独立**做一遍这道题，只输出答案，不要解析。
 *
 * 关键在「独立」：不能把生成答案告诉它，否则它只会附和。
 * 提示词里刻意强调「只输出答案本身」，
 * temperature 设 0 —— 复算温度高了它就会「创造性」地给出错答案。
 */
export async function verifyByAI(cfg: AIConfig, q: Partial<BankQuestion>): Promise<{
  agree: boolean;
  aiAnswer: string;
  /** 调用本身失败（超时 / 无额度），此时不该判 doubtful */
  error?: string;
}> {
  const lines: string[] = [];
  lines.push('你是一个答案校验器。下面是一道题，请独立作答。');
  lines.push('');
  lines.push(`题干：${q.stem ?? ''}`);
  if (q.options?.length) {
    lines.push('选项：');
    q.options.forEach((o, i) => lines.push(`${String.fromCharCode(65 + i)}. ${o}`));
  }
  if (q.mode === 'judge') lines.push('（判断题，答案只能是「正确」或「错误」）');
  if (q.mode === 'multi') lines.push('（多选题，可能有多个正确选项）');
  lines.push('');
  lines.push('只输出答案本身，不要任何解析、说明、步骤或多余文字。');

  try {
    const reply = await chatComplete(
      cfg,
      [
        { role: 'system', content: '你只输出答案，不输出任何其他内容。' },
        { role: 'user', content: lines.join('\n') },
      ],
      { maxTokens: 200, temperature: 0, timeoutMs: 45000 },
    );

    const aiAnswer = String(reply ?? '').trim();
    if (!aiAnswer) return { agree: false, aiAnswer: '', error: '复算返回为空' };

    return { agree: answersAgree(q, aiAnswer), aiAnswer };
  } catch (e) {
    return { agree: true, aiAnswer: '', error: (e as Error).message.slice(0, 100) };
  }
}

/**
 * 判断题答案的「真值侧」判定：'T' / 'F' / ''（认不出来）。
 *
 * 单独抽出来是因为 verifyAnswer（L2）和 answersAgree（L4）都要用，
 * 各写一份迟早会漂移 —— 一边认「√」另一边不认，题目就会被误判。
 */
export function judgeSide(text: unknown): 'T' | 'F' | '' {
  const v = normalizeText(String(text ?? '')).replace(/[。.，,]$/, '');
  if (!v) return '';
  if (JUDGE_TRUE.has(v)) return 'T';
  if (JUDGE_FALSE.has(v)) return 'F';
  return '';
}

const JUDGE_TRUE = new Set(['正确', '对', '是', 't', 'true', '√', 'y', 'yes', '真的']);
const JUDGE_FALSE = new Set(['错误', '错', '否', 'f', 'false', '×', 'x', 'n', 'no', '假的']);

/**
 * 比对两个答案是否一致。
 *
 * 归一化后比较，容忍空格与全半角差异。
 * 再放宽一层：一方包含另一方（AI 常带「答案：」前缀或在末尾加句号）。
 */
export function answersAgree(q: Partial<BankQuestion>, other: unknown): boolean {
  const want = String(q.answerText ?? '').trim();
  if (!want) return true;

  const otherText = String(other ?? '').trim();

  /*
   * ⚠️ 必须守卫 string 类型。
   * 这个方法会被 verifyByAI 之外的调用方直接喂进模型返回的原始值，
   * 而 OpenAI 兼容接口在 structured output 模式下会返回
   * {"answer": true} 这样的布尔 —— 直接传进来会让 normalizeText
   * 内部调用 .toLowerCase() 抛 TypeError，整批出题中途崩掉。
   */
  if (typeof other !== 'string') {
    if (q.mode === 'judge') {
      const sa = judgeSide(want);
      const sb = typeof other === 'boolean' ? (other ? 'T' : 'F') : '';
      if (sa && sb) return sa === sb;
    }
    // 非字符串且认不出来 → 不当成"一致"，让它进人工复核
    return false;
  }

  // 选择题：把两边都翻译成「选项下标集合」再比，
  // 这样 'C' 和「ln(1 + x)」也能对上
  const opts = q.options ?? [];
  if (opts.length) {
    const a = toIdxSet(want, opts);
    const b = toIdxSet(otherText, opts);
    if (a.size && b.size) return sameSet(a, b);
  }

  // 判断题：放在文本比对之前。
  // 「对」和「正确」归一后一个是 1 字符一个是 2 字符，互相不包含，
  // 靠下面的子串规则根本比不上，必须先用真值映射对一次。
  if (q.mode === 'judge') {
    const sa = judgeSide(want);
    const sb = judgeSide(otherText);
    if (sa && sb) return sa === sb;
  }

  const na = normalizeText(want);
  const nb = normalizeText(otherText);
  if (!na || !nb) return true;
  if (na === nb) return true;
  if (na.length >= 2 && nb.length >= 2 && (na.includes(nb) || nb.includes(na))) return true;

  return false;
}

function toIdxSet(text: string, options: string[]): Set<number> {
  const out = new Set<number>();
  const t = String(text).trim();

  // 字母形式
  const letters = t.toUpperCase().match(/\b[A-F]\b/g);
  if (letters && letters.length) {
    for (const L of letters) {
      const i = L.charCodeAt(0) - 65;
      if (i >= 0 && i < options.length) out.add(i);
    }
    if (out.size) return out;
  }

  // 原文形式
  const nt = normalizeText(t);
  options.forEach((o, i) => {
    const no = normalizeText(o);
    if (!no) return;
    if (no === nt || (no.length >= 2 && (nt.includes(no) || no.includes(nt)))) out.add(i);
  });
  return out;
}

function sameSet(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/* ═══════════════ 统一入口 ═══════════════ */

export type Verdict = 'passed' | 'doubtful' | 'rejected';

export interface VerifyResult {
  verdict: Verdict;
  reasons: string[];
  /** 被自动修正过的章节（原 key 不合法时） */
  chapterFix?: { chapter: string; note: string };
}

/** L1 + L2 + L3 的同步校验（不含 AI 复算） */
export function verifyLocal(q: Partial<BankQuestion>): VerifyResult {
  const reasons = [...verifyStructure(q), ...verifyAnswer(q)];

  const ch = verifyChapter(q);

  if (reasons.length) return { verdict: 'rejected', reasons };

  const res: VerifyResult = { verdict: 'passed', reasons: [] };
  if (ch.fixed) {
    res.verdict = 'doubtful';
    res.reasons.push(ch.note!);
    res.chapterFix = { chapter: ch.chapter, note: ch.note! };
  }
  return res;
}

/** 在本地校验结果上叠加 AI 复算结论 */
export function mergeAIVerdict(
  local: VerifyResult,
  ai: { agree: boolean; aiAnswer: string; error?: string },
): VerifyResult {
  if (local.verdict === 'rejected') return local;

  if (ai.error) {
    // 复算没跑成功（没额度 / 超时）不该冤枉题目
    return local;
  }
  if (ai.agree) return local;

  return {
    verdict: 'doubtful',
    reasons: [...local.reasons, `AI 独立复算得「${trunc(ai.aiAnswer, 16)}」，与给定答案不一致`],
    chapterFix: local.chapterFix,
  };
}
