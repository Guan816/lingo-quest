/**
 * 从题目里「提炼」公式与技巧，以及生成同类型变式题。
 *
 * 两个用途：
 *   ① 上传的题目 / 订正好的错题 → 生成技巧公式 → 自动进公式本
 *   ② 错题订正后问用户「要不要做几道同类型题」→ 生成变式题直接开练
 *
 * ── 额度纪律（每人每天 200 次 AI 调用）──
 * 逐题调用会瞬间吃掉额度：一份 30 题的卷子就是 30 次。
 * 所以这里**必须分批合并**（一次调用产出多题的公式/技巧），
 * 并给单次上传设上限，超出部分由用户手动点「继续生成」。
 */
import type { AIConfig } from '../types';
import { chatComplete } from './ai';
import { extractJsonObject } from './paper';
import { normalizeText } from './quiz';
import type { QuizItem, QuizItemMode } from './quiz';
import type { FormulaInput, FormulaSubject } from '../store/useFormulaBookStore';

/* ═══════════════ 额度控制 ═══════════════ */

/** 一次 AI 调用最多处理几道题的公式/技巧提炼 */
export const DERIVE_BATCH = 6;
/** 单次上传最多自动生成多少道题（超出给「继续生成」按钮兜底） */
export const DERIVE_MAX_PER_UPLOAD = 12;
/** 举一反三一次生成几道 */
export const VARIANT_COUNT = 3;

/* ═══════════════ 通用工具 ═══════════════ */

function subjectToFormula(s: 'math' | 'cs' | 'cet4'): FormulaSubject {
  return s === 'cet4' ? 'en' : s;
}

function str(v: unknown): string {
  return String(v ?? '').trim();
}

/** 把题目压成喂给模型的短文本（题面 + 答案 + 已有解析要点） */
function compactQ(q: { stem: string; answerText?: string; steps?: { text: string; math?: string }[]; tip?: string }, idx: number): string {
  const steps = (q.steps ?? [])
    .map((s) => [s.text, s.math].filter(Boolean).join(' '))
    .filter(Boolean)
    .slice(0, 5)
    .join(' ');
  return [
    `[${idx}] 题干：${q.stem}`,
    q.answerText ? `答案：${q.answerText}` : '',
    steps ? `已给解析：${steps}` : '',
    q.tip ? `已有技巧：${q.tip}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/* ═══════════════ ① 提炼公式 / 技巧 ═══════════════ */

const DERIVE_PROMPT = `你在为一款备考 App 从题目中提炼「核心公式」与「解题技巧」。

【提炼要求】
- 公式：写该题真正用到的、可复用的数学/专业公式本体，不要抄题干数字。
  能用一行写清就用一行；公式里不要夹中文说明（说明放到 note）。
- 技巧：一句话可操作的解题套路或速记结论，例如「等价无穷小替换只适用于乘除」。
- **不要编造**：题目里没用到、看不出来的公式宁可不给，返回空数组。
- 同一道题最多 2 条公式、2 条技巧，只留最有价值的。

只输出 JSON（不要 markdown 代码块、不要任何解释文字）：
{
  "items": [
    { "ref": 0, "formulas": [{ "text": "公式本体", "note": "适用条件，可空" }], "tips": [{ "text": "技巧结论", "note": "怎么用，可空" }] }
  ]
}
ref 对应下面每道题前面的序号，必须原样回填。`;

interface RawDeriveItem {
  ref?: unknown;
  formulas?: unknown;
  tips?: unknown;
}

function pickPairs(v: unknown): { text: string; note?: string }[] {
  if (!Array.isArray(v)) return [];
  const out: { text: string; note?: string }[] = [];
  for (const it of v) {
    const o = (it ?? {}) as { text?: unknown; note?: unknown };
    const text = str(o.text);
    if (text.length < 2) continue;
    out.push({ text, note: str(o.note) || undefined });
  }
  return out;
}

export interface DeriveTarget {
  subject: 'math' | 'cs' | 'cet4';
  chapter: string;
  stem: string;
  answerText?: string;
  steps?: { text: string; math?: string }[];
  tip?: string;
  /** 来源标注，写进公式本的 from */
  from: string;
  fromNo?: string;
}

/**
 * 批量提炼：把 targets 分批（DERIVE_BATCH 一call），产出可直接喂 addMany 的 FormulaInput[]。
 * 任何一批失败只跳过该批，不炸整轮。
 */
export async function deriveFormulas(
  cfg: AIConfig,
  targets: DeriveTarget[],
  opts: { maxItems?: number; shouldCancel?: () => boolean; onProgress?: (done: number, total: number) => void } = {},
): Promise<FormulaInput[]> {
  const maxItems = opts.maxItems ?? DERIVE_MAX_PER_UPLOAD;
  const list = targets.slice(0, maxItems);
  const out: FormulaInput[] = [];

  for (let i = 0; i < list.length; i += DERIVE_BATCH) {
    if (opts.shouldCancel?.()) break;
    const batch = list.slice(i, i + DERIVE_BATCH);
    const body = batch.map((t, k) => compactQ(t, k)).join('\n\n');

    try {
      const reply = await chatComplete(
        cfg,
        [
          { role: 'system', content: '你只输出 JSON，不输出任何其他内容。' },
          { role: 'user', content: `${DERIVE_PROMPT}\n\n【题目】\n${body}` },
        ],
        { maxTokens: 1800, temperature: 0.4, timeoutMs: 90000 },
      );

      const obj = extractJsonObject(reply);
      const items = Array.isArray(obj.items) ? (obj.items as RawDeriveItem[]) : [];

      for (const raw of items) {
        const ref = Number(raw.ref);
        const t = Number.isInteger(ref) ? batch[ref] : undefined;
        if (!t) continue;
        const subject = subjectToFormula(t.subject);
        for (const f of pickPairs(raw.formulas)) {
          out.push({ subject, chapter: t.chapter, kind: 'formula', text: f.text, note: f.note, from: t.from, fromNo: t.fromNo });
        }
        for (const f of pickPairs(raw.tips)) {
          out.push({ subject, chapter: t.chapter, kind: 'tip', text: f.text, note: f.note, from: t.from, fromNo: t.fromNo });
        }
      }
    } catch {
      /* 本批失败：跳过，继续下一批 */
    }
    opts.onProgress?.(Math.min(i + DERIVE_BATCH, list.length), list.length);
  }

  return out;
}

/* ═══════════════ ② 举一反三：同类型变式题 ═══════════════ */

const VARIANT_PROMPT = `你在为备考 App 出「同类型变式题」。

【要求】
- 保持与原题**同一个考点、同一种题型**，但换情境/换数字/换设问角度，不要只是改个数字。
- 每道题都要有完整分步解析。
- 选项给 4 个（判断题给 ["正确","错误"]），答案必须与某个选项原文完全一致，不要写 A/B/C/D 字母。

只输出 JSON（不要 markdown 代码块、不要任何解释文字）：
{
  "questions": [
    {
      "stem": "题干",
      "options": ["选项1","选项2","选项3","选项4"],
      "answer": "标准答案（选项原文）",
      "point": "考点短词",
      "steps": [{ "text": "这一步做什么", "math": "这一步的式子，没有就空字符串" }],
      "tip": "技巧，可空",
      "pitfall": "易错，可空"
    }
  ]
}`;

const MODES = new Set<QuizItemMode>(['single', 'multi', 'judge', 'fill', 'calc', 'proof', 'synthetic']);

/**
 * 由一道原题生成 n 道同类型变式题，产出可直接交给 QuizRunner 的 QuizItem[]。
 *
 * answerIdx 的算法（与项目「选项只打乱一次」的约定一致）：
 * 这里**不打乱**选项 —— 直接按模型给的顺序呈现，答案下标 = 选项原文与 answer 归一化后相等的那一项。
 * 找不到匹配项时退回 0 并在 refAnswer 里保留原文，由主观题分支兜底。
 */
export async function makeVariants(
  cfg: AIConfig,
  base: { subject: 'math' | 'cs' | 'cet4'; chapter: string; mode: string; stem: string; answerText?: string; point?: string },
  n = VARIANT_COUNT,
): Promise<QuizItem[]> {
  const mode: QuizItemMode = MODES.has(base.mode as QuizItemMode) ? (base.mode as QuizItemMode) : 'calc';

  const reply = await chatComplete(
    cfg,
    [
      { role: 'system', content: '你只输出 JSON，不输出任何其他内容。' },
      {
        role: 'user',
        content:
          `${VARIANT_PROMPT}\n\n【原题】\n科目：${base.subject}\n章节：${base.chapter}\n题型：${mode}\n` +
          `题干：${base.stem}\n${base.answerText ? `答案：${base.answerText}\n` : ''}` +
          `\n请出 ${n} 道同类型变式题。`,
      },
    ],
    { maxTokens: 2000, temperature: 0.9, timeoutMs: 90000 },
  );

  const obj = extractJsonObject(reply);
  const arr = Array.isArray(obj.questions) ? (obj.questions as Record<string, unknown>[]) : [];
  return buildVariantItems(arr, mode, base.chapter, base.point);
}

/**
 * 纯函数：把模型返回的变式题原文 → QuizItem[]（**答案下标在这里算**）。
 *
 * 单独抽出来是为了能确定性单测 —— 答案下标算错是本项目最危险的一类 bug：
 * 界面完全正常，只有判分是错的（历史上真出过）。
 *
 * answerIdx 规则：**不打乱选项**，下标 = 选项原文与答案归一化后相等的那一项。
 * 判断题选项固定为 ["正确","错误"]，答案按真值映射归一。
 * 找不到匹配项时退回 0，并保留 refAnswer 原文，由主观题分支兜底。
 */
/**
 * 剥掉选项字母前缀。
 *
 * 模型很爱把答案写成「（C）CPU的中断机制…」「C. ln(1+x)」「C、xx」，
 * 而库里存的是选项原文。不剥的话比对失败 → 下标退回 0 → **判分错误**
 * （界面看不出来，是本项目最阴的一类 bug）。实测里确实出现过。
 */
function stripOptionLetter(s: string): string {
  return s.replace(/^[\s（(【\[]*[A-Da-d][\s)）】\].、,，:：]+/, '').trim();
}

export function buildVariantItems(
  arr: Record<string, unknown>[],
  mode: QuizItemMode,
  chapter: string,
  point?: string,
): QuizItem[] {
  const out: QuizItem[] = [];
  for (const item of arr) {
    // 结构化输出里偶尔会混进 null / 非对象项，直接取属性会崩
    const raw = (item ?? {}) as Record<string, unknown>;
    const stem = str(raw.stem);
    if (!stem) continue;
    const options = Array.isArray(raw.options) ? raw.options.map(str).filter(Boolean) : [];
    const answer = str(raw.answer);
    const steps = (Array.isArray(raw.steps) ? raw.steps : [])
      .map((s) => (s ?? {}) as { text?: unknown; math?: unknown })
      .map((s) => [str(s.text), str(s.math)].filter(Boolean).join(' ｜ '))
      .filter(Boolean);

    let opts = options;
    let answerIdx: number[] = [];
    if (mode === 'judge') {
      opts = ['正确', '错误'];
      answerIdx = [/^(正确|对|是|true|t|√|y)/i.test(answer) ? 0 : 1];
    } else if (opts.length >= 2) {
      // 答案可能带「（C）」这类字母前缀，剥掉后再与选项原文比对
      const want = normalizeText(stripOptionLetter(answer));
      let hit = opts.findIndex((o) => normalizeText(stripOptionLetter(o)) === want);
      // 退一步：互相包含（模型偶尔把选项写长/写短一点）
      if (hit < 0 && want.length >= 2) {
        hit = opts.findIndex((o) => {
          const t = normalizeText(stripOptionLetter(o));
          return t.includes(want) || want.includes(t);
        });
      }
      answerIdx = [hit >= 0 ? hit : 0];
    }

    out.push({
      id: `var-${Date.now().toString(36)}-${out.length}`,
      stem,
      options: mode === 'judge' || opts.length >= 2 ? opts : [],
      answerIdx,
      mode,
      difficulty: 'mid',
      chapter,
      refAnswer: answer,
      steps,
      point: str(raw.point) || point || '',
      raw: { id: '', stem, options: opts, answerIdx, mode, difficulty: 'mid', chapter, refAnswer: answer, steps, point: '' } as never,
    });
  }
  return out;
}
