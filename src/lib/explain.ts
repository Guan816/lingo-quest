/**
 * 解析排版规范 —— 全站数学题解析的唯一格式真源。
 *
 * ═══════════════════════════════════════════════════════════════
 *  标准纸质试卷答案的排版格式
 * ═══════════════════════════════════════════════════════════════
 *
 * 所有题目解析统一分四个模块，顺序固定：
 *
 *   ① 答案     加粗标亮的最终结果（选择题还要给出对应选项）
 *   ② 考点     对应考纲的知识点，可多个
 *   ③ 解       分步推导 —— 解析的主体
 *   ④ 技巧     解题技巧 / 总结（可省）速记结论、易错点
 *
 * ── 解题步骤的写法规范 ──
 *
 *   · 用阿拉伯数字编号（1. 2. 3. …），每步只做一个逻辑动作
 *   · 每步**先写文字说明**（「识别题型」「凑型变形」），**再给式子**
 *   · 核心公式**单独占一行、水平居中**，禁止与说明文字混排
 *   · 步骤之间保留间距，读起来像卷子上手写的一行行推导
 *
 * 数据结构上用 ExplainStep 把「说明」和「式子」分开存，
 * 而不是塞进一个字符串里 —— 因为混在一个字符串里，
 * 渲染时没法知道哪一段该居中、哪一段该跟着文字走。
 *
 * ── 兼容性 ──
 * 老题库（data/math.ts、data/cs.ts）的解析是 steps: string[]，
 * 用 fromLegacySteps() 转过来，不需要动题库文件。
 */

/* ═══════════════ 结构定义 ═══════════════ */

/**
 * 解析中的一步。
 *
 * text  这一步在做什么（文字说明，必填）
 * math  这一步得到的核心式子（**单独占行、居中**，可省）
 */
export interface ExplainStep {
  /** 文字说明：「识别题型」「两边求导」等 */
  text: string;
  /** 核心公式，单独占行居中；没有则只显示文字 */
  math?: string;
}

/** 标准四模块解析 */
export interface Explain {
  /** ① 答案：加粗标亮的最终结果 */
  answer: string;
  /** 选择题正确项对应的选项字母，例如 'C' 或 'A、C' */
  answerOption?: string;
  /** ② 考点：考纲知识点，可多个 */
  points: string[];
  /** ③ 解：分步推导 */
  steps: ExplainStep[];
  /** ④ 解题技巧 / 总结（可省） */
  tip?: string;
  /** 易错提醒（可选，从 tip 里拆出来单独醒目显示） */
  pitfall?: string;
}

/* ═══════════════ 从各种来源规整成 Explain ═══════════════ */

/**
 * 判断一段文字是不是「公式行」。
 *
 * 老题库的 steps 是「说明 + 式子」混在一行里的，比如：
 *   '方法一（洛必达）：分子求导 e^x − 1，分母求导 2x，仍为 0/0；再求导得 e^x / 2'
 * 我们要把它拆成 { text: '方法一（洛必达）：…', math: '…' }。
 *
 * 拆不动也没关系 —— 整行进 text 一样能读，只是不居中而已。
 */
function splitStepLine(line: string): ExplainStep {
  const s = line.trim();
  if (!s) return { text: '' };

  // 情况一：形如「设 …… ，得 ……」「当 …… 时 ……」—— 冒号/逗号后再判断
  // 情况二：整行就是一个短式子（很短、中文极少、含等号或极限号）
  const cn = (s.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  if (s.length <= 40 && cn / s.length < 0.25 && /[=＝→∫∑∏]/.test(s)) {
    return { text: '', math: s };
  }

  // 情况三：末尾有一小段「= 结果」，把它抽出来当公式
  //   例如 '括号内趋于 e，因此极限为 e²。' 抽不出东西，就整行当文字
  const m = s.match(/^(.*[。；;]\s*)([^。；;]{2,50})$/);
  if (m) {
    const head = m[1].trim();
    const tail = m[2].trim();
    const tailCn = (tail.match(/[\u4e00-\u9fa5]/g) ?? []).length;
    // 尾巴里中文够多就说明还是句人话，不抽
    if (tailCn / Math.max(tail.length, 1) < 0.4 && /[=＝]/.test(tail)) {
      return { text: head, math: tail };
    }
  }

  return { text: s };
}

/**
 * 把老格式（steps: string[]）转成标准步骤。
 *
 * 转换是**保守**的：拆不出来就整行进 text，宁可排版朴素一点，
 * 也不能把说明文字误判成公式去居中 —— 那读起来会莫名其妙。
 */
export function fromLegacySteps(steps: string[]): ExplainStep[] {
  return steps
    .flatMap((raw) => {
      const s = String(raw ?? '').trim();
      if (!s) return [];
      // 一行里塞了多个「1. 2. 3.」编号的，先按编号拆开
      const numbered = s.split(/(?=(?:^|[；;。]\s*)\d+[.、)）]\s)/).filter(Boolean);
      if (numbered.length > 1) {
        return numbered.map((p) => splitStepLine(p.replace(/^[；;。]\s*/, '')));
      }
      return [splitStepLine(s)];
    })
    .filter((st) => st.text || st.math);
}

/** 规整 AI 返回的 steps：既接受 ["..."]，也接受 [{text, math}] */
export function normalizeSteps(input: unknown): ExplainStep[] {
  if (!Array.isArray(input)) return [];
  const out: ExplainStep[] = [];
  for (const it of input) {
    if (typeof it === 'string') {
      const st = splitStepLine(it);
      if (st.text || st.math) out.push(st);
    } else if (it && typeof it === 'object') {
      const o = it as Record<string, unknown>;
      const text = String(o.text ?? '').trim();
      const math = String(o.math ?? '').trim();
      if (text || math) out.push({ text, math: math || undefined });
    }
  }
  return out;
}

/** 组装一个 Explain（把散落各处的字段收拢） */
export function makeExplain(input: {
  answer: string;
  answerOption?: string;
  point?: string | string[];
  steps?: ExplainStep[];
  tip?: string;
  pitfall?: string;
}): Explain {
  const points = Array.isArray(input.point)
    ? input.point
    : String(input.point ?? '')
        .split(/[；;，,、]/)
        .map((s) => s.trim())
        .filter(Boolean);
  return {
    answer: input.answer,
    answerOption: input.answerOption,
    points,
    steps: input.steps ?? [],
    tip: input.tip,
    pitfall: input.pitfall,
  };
}

/* ═══════════════ 给 AI 用的排版规范原文 ═══════════════ */

/**
 * 喂给大模型的排版规范。
 *
 * 抽成常量而不是散在各处拼字符串，是为了保证
 * 「答题页的解析」和「试卷解析的解析」看起来是同一份东西 ——
 * 两处各写一份 prompt，迟早会漂移成两种风格。
 */
export const EXPLAIN_STYLE_PROMPT = [
  '解析必须遵循下面的「标准试卷答案排版规范」：',
  '',
  '【四模块结构】按顺序给出，一个都不能少（tip 除外，没内容可省）：',
  '  1. answer  — 最终答案。选择题写选项原文，计算/证明题写最终结论',
  '  2. points  — 考点，对应考纲的知识点，可以给多个',
  '  3. steps   — 分步推导，这是解析的主体',
  '  4. tip     — 解题技巧或总结（速记结论、通用套路），可省',
  '',
  '【steps 的写法】steps 是数组，每个元素是一个对象 {"text": "说明", "math": "式子"}：',
  '  · text 写这一步在做什么，例如「识别题型：0/0 型未定式」「两边同时对 x 求导」；',
  '  · math 写这一步得到的**核心式子**，例如 "lim(x→0) (e^x − 1) / 2x = 1/2"；',
  '  · **说明和式子必须分开写**，不要把公式塞进 text 里；',
  '  · 每一步只做一个逻辑动作，不要一步写三件事；',
  '  · 没有产生新式子的步骤，math 留空字符串即可。',
  '',
  '【数学写法】用纯文本形态的数学，**不要用 LaTeX 反斜杠命令**：',
  '  · 极限写成 lim(x→0)；积分写成 ∫(0,1)；求和写成 ∑(n=1..∞)',
  '  · 分数写成 a/b；根号写成 √(x+1)；幂写成 x^2 或直接用 x²',
  '  · 不要出现 \\frac、\\lim、$ 这类 LaTeX 标记 —— 前端认不出反斜杠命令',
].join('\n');
