/**
 * 试卷上传与 AI 解析。
 *
 * 流程：
 *   选文件 → 提取内容（文本 / 图片）→ 交给 AI 结构化解析
 *   → 得到【题目】【核心公式】【解题技巧】
 *   → 用户选择「顺序答题」或「创新练习」
 *
 * 内容提取的三条路径：
 *   1. 纯文本文件：直接读取
 *   2. 图片：转 base64，交给视觉模型识别
 *   3. PDF：先用 pdfjs 抽文字层；如果是扫描件（抽不到字），
 *      就把页面渲染成图片走视觉模型 —— 这样扫描版试卷也能处理
 */
import type { AIConfig, MathChapter } from '../types';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { chatComplete, type ChatTurn, type ContentPart } from './ai';
import { MATH_CHAPTERS } from '../data/math';
import { CS_CHAPTERS } from '../data/cs';
import type { QuizItem, QuizItemMode } from './quiz';

/* ─────────────── 内容提取 ─────────────── */

export interface ExtractedContent {
  /** 提取到的纯文本（扫描件可能为空） */
  text: string;
  /** 需要视觉模型识别的图片（data URL） */
  images: string[];
  /** 页数 / 图片张数 */
  pages: number;
  /** 原文件名 */
  name: string;
  /** 给用户看的提取方式说明 */
  method: string;
}

/** 最多处理多少页，避免一次塞太多图把请求撑爆 */
const MAX_PAGES = 6;
/** PDF 渲染成图片时的缩放倍数 */
const RENDER_SCALE = 1.6;

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error('读取文件失败'));
    r.readAsText(file, 'utf-8');
  });
}

function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error('读取图片失败'));
    r.readAsDataURL(file);
  });
}

/** 把 PDF 页面渲染成图片（给扫描件用） */
async function renderPdfPages(pdf: PDFDocumentProxy): Promise<string[]> {
  const out: string[] = [];
  const n = Math.min(pdf.numPages, MAX_PAGES);

  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    // JPEG 比 PNG 小很多，试卷内容以线条文字为主，0.8 质量够用
    out.push(canvas.toDataURL('image/jpeg', 0.8));
  }
  return out;
}

/** 动态加载 pdfjs（体积较大，用到时才下载） */
async function loadPdfjs() {
  // 用 Vite 的 ?url 语法拿到 worker 地址，避免 worker 找不到
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

/**
 * 从文件里提取内容。
 * @param onStep 进度回调，用于界面提示
 */
export async function extractFromFile(
  file: File,
  onStep?: (msg: string) => void,
): Promise<ExtractedContent> {
  const name = file.name;
  const lower = name.toLowerCase();

  // ── 纯文本 ──
  if (file.type.startsWith('text/') || /\.(txt|md|csv)$/.test(lower)) {
    onStep?.('正在读取文本…');
    const text = await readAsText(file);
    return { text, images: [], pages: 1, name, method: '纯文本读取' };
  }

  // ── 图片 ──
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/.test(lower)) {
    onStep?.('正在处理图片…');
    const url = await readAsDataUrl(file);
    return { text: '', images: [url], pages: 1, name, method: '图片识别' };
  }

  // ── PDF ──
  if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
    onStep?.('正在加载 PDF 解析器…');
    let pdfjs: Awaited<ReturnType<typeof loadPdfjs>>;
    try {
      pdfjs = await loadPdfjs();
    } catch {
      throw new Error(
        'PDF 解析组件加载失败（可能是网络问题）。可以先把试卷截图，用图片方式上传。',
      );
    }

    onStep?.('正在读取 PDF…');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;

    // 先试文字层
    const textParts: string[] = [];
    const pagesToRead = Math.min(pdf.numPages, MAX_PAGES);
    for (let i = 1; i <= pagesToRead; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((it: unknown) => (it as { str?: string }).str ?? '')
        .join(' ');
      if (line.trim()) textParts.push(line);
    }
    const text = textParts.join('\n');

    // 文字够了就只用文本 —— 省 token，也更准
    if (text.replace(/\s/g, '').length >= 60) {
      return { text, images: [], pages: pdf.numPages, name, method: 'PDF 文字层提取' };
    }

    // 文字太少 → 多半是扫描件，渲染成图片走视觉
    onStep?.('PDF 没有文字层，正在转成图片识别…');
    const images = await renderPdfPages(pdf);
    if (!images.length) throw new Error('这份 PDF 没能提取出内容，可能已损坏');
    return {
      text,
      images,
      pages: pdf.numPages,
      name,
      method: `扫描件转图片识别（${images.length} 页）`,
    };
  }

  throw new Error('不支持的文件类型');
}

/* ─────────────── AI 解析 ─────────────── */

export interface PaperQuestion {
  stem: string;
  options?: string[];
  /** 正确选项的**原文**（不是下标，避免位置对不上） */
  answer?: string;
  explain?: string;
  mode: QuizItemMode;
  /** AI 判定的章节 key */
  chapter?: string;
}

export interface PaperKnowledge {
  text: string;
  note?: string;
  chapter: string;
}

export interface PaperAnalysis {
  title: string;
  subject: 'math' | 'cs';
  questions: PaperQuestion[];
  /** 核心公式 */
  formulas: PaperKnowledge[];
  /** 解题技巧 */
  tips: PaperKnowledge[];
  /** 总体说明/难度判断等 */
  summary?: string;
}

/** 章节目录文本，喂给 AI 让它归类 */
function chapterCatalogue(subject: 'math' | 'cs'): string {
  if (subject === 'math') {
    return MATH_CHAPTERS.map((c) => `${c.key} = ${c.name}`).join('\n');
  }
  return CS_CHAPTERS.map((c) => `${c.key} = 课程${c.course} ${c.name}`).join('\n');
}

function buildPrompt(subject: 'math' | 'cs', hasImages: boolean, text: string): string {
  const subjName = subject === 'math' ? '高等数学' : '计算机基础理论';
  const examName = '江苏省普通高校"专转本"选拔考试';

  return [
    `你在帮一位备考${examName}的学生整理试卷。科目：${subjName}。`,
    hasImages ? '试卷以图片形式给出，请先识别图中的题目文字。' : '试卷内容以文本给出。',
    '',
    '请完成三件事：',
    '1) 把试卷里的**每一道题**提取出来，保留题干与选项；',
    '2) 挑出这份卷子涉及的**核心公式**（只挑真的用到的、值得记的，不要凑数）；',
    '3) 总结**解题技巧**（例如某种题型的通用套路、常见陷阱、快速判断方法）。',
    '',
    '章节归类请从下面这份考纲目录里选 key，不要自创：',
    chapterCatalogue(subject),
    '',
    hasImages ? '' : `试卷文本如下：\n"""\n${text.slice(0, 12000)}\n"""`,
    '',
    '严格按要求输出 JSON（不要 markdown 代码块、不要任何解释文字）：',
    '{',
    '  "title": "给这份试卷起个短标题",',
    '  "summary": "一句话说明这份卷子的重点与难度",',
    '  "questions": [',
    '    {',
    '      "stem": "题干原文",',
    '      "options": ["选项A内容","选项B内容"],',
    '      "answer": "正确选项的原文内容，没有就留空",',
    '      "explain": "简要解析",',
    '      "mode": "single|multi|judge|fill|calc|proof|synthetic",',
    '      "chapter": "上面目录里的 key"',
    '    }',
    '  ],',
    '  "formulas": [{ "text": "公式本体", "note": "适用条件或说明", "chapter": "key" }],',
    '  "tips":     [{ "text": "技巧描述", "note": "什么时候用", "chapter": "key" }]',
    '}',
    '',
    '注意：',
    '- 选择题的 answer 必须是选项中出现的**原文**，不要写 A/B/C/D；',
    '- 填空题给答案值；计算/证明/综合题 answer 写最终结论；',
    '- 判断题 options 固定为 ["正确","错误"]；',
    '- 没有选项的题（计算、证明等）options 留空数组；',
    '- formulas 和 tips 各控制在 8 条以内，宁少勿滥。',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** 从模型回复里抠出 JSON 对象 */
function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('模型没有返回可用的解析结果');
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

const VALID_MODES: QuizItemMode[] = ['single', 'multi', 'judge', 'fill', 'calc', 'proof', 'synthetic'];

function validChapters(subject: 'math' | 'cs'): Set<string> {
  return new Set(
    subject === 'math' ? MATH_CHAPTERS.map((c) => c.key) : CS_CHAPTERS.map((c) => c.key),
  );
}

/** 把 AI 返回的东西规整成可靠的数据结构 */
function normalizeAnalysis(
  subject: 'math' | 'cs',
  raw: Record<string, unknown>,
): PaperAnalysis {
  const okCh = validChapters(subject);
  const fallbackCh = subject === 'math' ? 'limit' : 'hardware';

  const questions: PaperQuestion[] = (Array.isArray(raw.questions) ? raw.questions : [])
    .map((q) => {
      const o = (q ?? {}) as Record<string, unknown>;
      const stem = String(o.stem ?? '').trim();
      if (!stem) return null;
      const options = Array.isArray(o.options)
        ? o.options.map((x) => String(x)).filter(Boolean)
        : [];
      const modeRaw = String(o.mode ?? '');
      const mode: QuizItemMode = VALID_MODES.includes(modeRaw as QuizItemMode)
        ? (modeRaw as QuizItemMode)
        : options.length >= 2
          ? 'single'
          : 'calc';
      return {
        stem,
        options,
        answer: String(o.answer ?? '').trim() || undefined,
        explain: String(o.explain ?? '').trim() || undefined,
        mode,
        chapter: okCh.has(String(o.chapter)) ? String(o.chapter) : undefined,
      } as PaperQuestion;
    })
    .filter((x): x is PaperQuestion => Boolean(x));

  const pickList = (v: unknown): PaperKnowledge[] =>
    (Array.isArray(v) ? v : [])
      .map((it) => {
        const o = (it ?? {}) as Record<string, unknown>;
        const text = String(o.text ?? '').trim();
        if (text.length < 2) return null;
        const ch = String(o.chapter ?? '');
        return {
          text,
          note: String(o.note ?? '').trim() || undefined,
          chapter: okCh.has(ch) ? ch : fallbackCh,
        } as PaperKnowledge;
      })
      .filter((x): x is PaperKnowledge => Boolean(x))
      .slice(0, 8);

  return {
    title: String(raw.title ?? '试卷解析').trim().slice(0, 60),
    subject,
    questions,
    formulas: pickList(raw.formulas),
    tips: pickList(raw.tips),
    summary: String(raw.summary ?? '').trim() || undefined,
  };
}

/**
 * 调用 AI 解析试卷内容。
 * 有图片时走视觉模型；纯文本则直接塞进 prompt。
 */
export async function analyzePaper(
  cfg: AIConfig,
  subject: 'math' | 'cs',
  content: ExtractedContent,
  onStep?: (msg: string) => void,
): Promise<PaperAnalysis> {
  const prompt = buildPrompt(subject, content.images.length > 0, content.text);
  const hasImages = content.images.length > 0;

  onStep?.(hasImages ? 'AI 正在识别图片中的题目…' : 'AI 正在解析题目…');

  const userContent: string | ContentPart[] = hasImages
    ? [
        { type: 'text', text: prompt },
        ...content.images.slice(0, MAX_PAGES).map(
          (url): ContentPart => ({ type: 'image_url', image_url: { url } }),
        ),
      ]
    : prompt;

  const turns: ChatTurn[] = [
    { role: 'system', content: '你只输出 JSON，不输出任何其他内容。' },
    { role: 'user', content: userContent },
  ];

  // 有图片就走视觉接口 —— 服务端会自动挑一个支持读图的服务商
  let reply: string;
  try {
    reply = await chatComplete(cfg, turns, {
      maxTokens: 4000,
      temperature: 0.3,
      vision: hasImages,
      // 视觉 + 长输出，给足时间
      timeoutMs: hasImages ? 120000 : 90000,
    });
  } catch (e) {
    // 图片解析失败时给一条能对症的提示 —— 多数情况是服务端没配视觉模型
    const msg = e instanceof Error ? e.message : String(e);
    if (hasImages && /视觉|读图|vision|image|模型/i.test(msg)) {
      throw new Error(
        '图片解析失败：服务端可能没有配置支持读图的模型。'
        + '也可以先把试卷里的文字打出来，用文字方式上传。',
      );
    }
    throw e;
  }

  const raw = extractJsonObject(reply);
  const analysis = normalizeAnalysis(subject, raw);

  if (!analysis.questions.length && !analysis.formulas.length && !analysis.tips.length) {
    throw new Error('没能从这份文件里解析出内容，换一张更清晰的图试试');
  }
  return analysis;
}

/* ─────────────── 转成可作答的题 ─────────────── */

let paperSeq = 0;

/**
 * 把解析出的题目转成通用答题模型。
 * 选择题会打乱选项，并把「正确答案原文」重新定位到新下标。
 */
export function paperQuestionsToQuizItems(
  analysis: PaperAnalysis,
  from: string,
): QuizItem[] {
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  return analysis.questions.map((q) => {
    const id = `paper-${Date.now()}-${paperSeq++}`;
    const chapter = q.chapter ?? (analysis.subject === 'math' ? 'limit' : 'hardware');
    const opts = q.options ?? [];

    // 判断题：固定选项顺序
    if (q.mode === 'judge') {
      const isTrue = /^(正确|对|true|是)/i.test(q.answer ?? '');
      return {
        id,
        stem: q.stem,
        options: ['正确', '错误'],
        answerIdx: [isTrue ? 0 : 1],
        mode: 'judge' as QuizItemMode,
        difficulty: 'mid' as const,
        chapter,
        refAnswer: q.answer || (isTrue ? '正确' : '错误'),
        steps: q.explain ? [q.explain] : ['这份题来自你上传的试卷，解析由 AI 生成。'],
        point: `来自试卷 · ${from}`,
        raw: { id, kind: 'judge' } as never,
      } satisfies QuizItem;
    }

    // 有选项的题：打乱并重定位答案
    if (opts.length >= 2) {
      const shuffled = shuffle(opts);
      const ansText = (q.answer ?? '').trim();
      let idx: number[] = [];
      if (ansText) {
        const hit = shuffled.findIndex((o) => o.trim() === ansText || o.includes(ansText));
        if (hit >= 0) idx = [hit];
      }
      if (!idx.length) {
        // AI 给的答案对不上任何选项时，退而求其次：标出原位置
        const orig = opts.findIndex((o) => o.trim() === ansText);
        if (orig >= 0) idx = [opts.findIndex((o) => o === shuffled[orig])];
      }
      const mode: QuizItemMode = q.mode === 'multi' ? 'multi' : 'single';
      return {
        id,
        stem: q.stem,
        options: shuffled,
        answerIdx: idx,
        mode,
        difficulty: 'mid' as const,
        chapter,
        refAnswer: ansText || '（AI 未给出答案）',
        steps: q.explain ? [q.explain] : ['这份题来自你上传的试卷，解析由 AI 生成。'],
        point: `来自试卷 · ${from}`,
        raw: { id, kind: mode } as never,
      } satisfies QuizItem;
    }

    // 主观题
    return {
      id,
      stem: q.stem,
      options: [],
      answerIdx: [],
      mode: q.mode,
      difficulty: 'mid' as const,
      chapter,
      refAnswer: q.answer || '（AI 未给出参考答案）',
      steps: q.explain ? [q.explain] : ['这份题来自你上传的试卷，解析由 AI 生成。'],
      point: `来自试卷 · ${from}`,
      raw: { id, kind: q.mode } as never,
    } satisfies QuizItem;
  });
}

/**
 * 创新模式：让 AI 照着原卷的知识点另出一批**新题**。
 * 与「顺序答题」的区别：这里不重复原题，只沿用考点与难度。
 */
export async function generateSimilarQuestions(
  cfg: AIConfig,
  subject: 'math' | 'cs',
  analysis: PaperAnalysis,
  count = 5,
  onStep?: (msg: string) => void,
): Promise<PaperAnalysis> {
  const sample = analysis.questions
    .slice(0, 6)
    .map((q, i) => `${i + 1}. ${q.stem}${q.options?.length ? `（选项：${q.options.join(' / ')}）` : ''}`)
    .join('\n');

  const known = [...analysis.formulas, ...analysis.tips]
    .map((k) => `- ${k.text}`)
    .join('\n');

  onStep?.('AI 正在按同样考点出新题…');

  const prompt = [
    `一位学生上传了${subject === 'math' ? '高等数学' : '计算机基础理论'}试卷，原题如下：`,
    sample,
    known ? `\n这份卷子涉及的公式与技巧：\n${known}` : '',
    '',
    `请**另出 ${count} 道全新的题**，要求：`,
    '- 考点与原卷一致，但题目情境、数字、表述都要换新，不能是原题改个数字；',
    '- 难度分布参考原卷；',
    '- 每道题都要给出答案与解析。',
    '',
    '章节从下面目录里选 key：',
    chapterCatalogue(subject),
    '',
    '只输出 JSON（不要代码块）：',
    '{ "title": "同类练习", "questions": [{ "stem": "", "options": [], "answer": "", "explain": "", "mode": "single", "chapter": "" }] }',
  ]
    .filter(Boolean)
    .join('\n');

  const reply = await chatComplete(
    cfg,
    [
      { role: 'system', content: '你只输出 JSON，不输出任何其他内容。' },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 3000, temperature: 0.95, timeoutMs: 90000 },
  );

  const raw = extractJsonObject(reply);
  const out = normalizeAnalysis(subject, raw);
  // 创新题只保留题目，不重复收录公式与技巧
  return { ...out, formulas: [], tips: [] };
}

/** 数学章节 key 的展示名（备用） */
export function mathChapterName(key: string): string {
  return MATH_CHAPTERS.find((c) => c.key === (key as MathChapter))?.name ?? key;
}
