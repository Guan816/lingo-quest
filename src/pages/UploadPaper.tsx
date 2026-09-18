/**
 * 试卷上传与 AI 解析。
 *
 * 【本轮重做的重点】
 * 以前解析结果页的主角是「公式卡片」和「技巧卡片」，题目藏在里面
 * 甚至压根没解析出来 —— 用户的原话是「不识别我的题目，直接给出公式」。
 * 现在结果页的主体是**逐题解析列表**：每题按标准试卷答案排版给出
 * 题干、选项、答案、考点、分步解析、技巧，公式本降级为附带产出。
 *
 * 页面结构：
 *   ① 顶部摘要卡     卷名 / 题数 / 收录条数
 *   ② 批量操作       整卷核心公式导出、整卷错题加入错题本
 *   ③ 逐题解析列表   主体，每题可折叠、可收藏、可提取
 *   ④ 底部练习入口   顺序作答（在线做题自动判分）/ 创新练习
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  BookMarked,
  Camera,
  Check,
  ClipboardList,
  FileText,
  ListChecks,
  Loader2,
  Shuffle,
  Sigma,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { Card, Chip, SectionTitle } from '../components/ui';
import { PaperQuestionCard } from '../components/PaperQuestionCard';
import { useSettingsStore } from '../store/useSettingsStore';
import { useFormulaBookStore } from '../store/useFormulaBookStore';
import { checkUploadable, formatSize, prepareFileAccess } from '../lib/permissions';
import {
  analyzePaper,
  extractFromFile,
  generateSimilarQuestions,
  paperQuestionsToQuizItems,
  type PaperAnalysis,
} from '../lib/paper';
import { QuizRunner } from '../components/QuizRunner';
import { QuizItem, starsForQuiz } from '../lib/quiz';
import { useSubjectStore } from '../store/useSubjectStore';
import { useProfileStore } from '../store/useProfileStore';

type Subject = 'math' | 'cs';
type Stage = 'idle' | 'working' | 'review' | 'answer';

export default function UploadPaper() {
  const nav = useNavigate();
  const params = useParams<{ subject?: string }>();
  const subject: Subject = params.subject === 'cs' ? 'cs' : 'math';

  const ai = useSettingsStore((s) => s.ai);
  const addFormulas = useFormulaBookStore((s) => s.addMany);
  const subjectStore = useSubjectStore();
  const clearLevel = useProfileStore((s) => s.clearLevel);
  const markToday = useProfileStore((s) => s.markToday);

  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [step, setStep] = useState('');
  const [err, setErr] = useState('');
  const [fileName, setFileName] = useState('');
  /** 已触发文件选择器 —— 用来区分「点了没反应」和「选择器没弹出」 */
  const [picking, setPicking] = useState<'file' | 'camera' | null>(null);

  /**
   * 打开文件选择器。
   *
   * 这里会先给出「已触发」的即时反馈：如果用户在手机上看到提示
   * 但系统选择器没弹出来，就能确定是 WebView/系统的限制，
   * 而不是按钮没响应 —— 这两种情况以前分不清。
   */
  const openPicker = (kind: 'file' | 'camera') => {
    setErr('');
    setPicking(kind);
    const el = kind === 'file' ? fileRef.current : camRef.current;
    try {
      el?.click();
    } catch {
      setPicking(null);
      setErr('这一步打不开文件选择器，换个方式试试（比如先截图再选图片）。');
      return;
    }
    // onChange 会把它关掉；用户取消选择时兜底收起
    window.setTimeout(() => setPicking((p) => (p === kind ? null : p)), 4000);
  };

  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [creating, setCreating] = useState(false);
  /** 已收藏的题号集合 */
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  /** 已加入错题本的题号集合 */
  const [wrongAdded, setWrongAdded] = useState<Set<string>>(new Set());
  /** 每题已提取的公式/技巧，用来把按钮切成「已收录」 */
  const [extracted, setExtracted] = useState<Record<string, { formula?: string; tip?: string }>>({});

  const subjName = subject === 'math' ? '数学' : '计算机';
  const chapterFallback = subject === 'math' ? 'limit' : 'hardware';

  /** 处理选中的文件 */
  const handleFile = async (file: File | undefined | null) => {
    setPicking(null);
    if (!file) return; // 用户取消了选择，静默返回
    setErr('');

    const chk = checkUploadable(file);
    if (!chk.ok) {
      setErr(chk.message ?? '文件不可用');
      return;
    }

    setFileName(`${file.name}（${formatSize(file.size)}）`);
    setStage('working');

    try {
      await prepareFileAccess(); // 走 SAF，通常无需权限；保留此步以便将来扩展
      const content = await extractFromFile(file, setStep);

      const result = await analyzePaper(ai, subject, content, setStep);

      // 公式与技巧自动入库（自动去重，按考纲顺序展示）
      const n = addFormulas([
        ...result.formulas.map((f) => ({
          subject,
          chapter: f.chapter || chapterFallback,
          kind: 'formula' as const,
          text: f.text,
          note: f.note,
          from: result.title,
        })),
        ...result.tips.map((t) => ({
          subject,
          chapter: t.chapter || chapterFallback,
          kind: 'tip' as const,
          text: t.text,
          note: t.note,
          from: result.title,
        })),
      ]);
      setSavedCount(n);
      setAnalysis(result);
      // 换卷子时清掉上一卷的操作痕迹
      setBookmarked(new Set());
      setWrongAdded(new Set());
      setExtracted({});
      setStage('review');
      setStep('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '解析失败，请重试');
      setStage('idle');
      setStep('');
    }
  };

  /** 顺序答题：直接答原卷题目 */
  const startOriginal = () => {
    if (!analysis) return;
    const list = paperQuestionsToQuizItems(analysis, fileName || analysis.title);
    if (!list.length) {
      setErr('这份试卷没有解析出可作答的题目');
      return;
    }
    setItems(list);
    setStage('answer');
  };

  /** 创新练习：让 AI 按同样考点出新题 */
  const startCreative = async () => {
    if (!analysis) return;
    setCreating(true);
    setErr('');
    try {
      const gen = await generateSimilarQuestions(ai, subject, analysis, 5, setStep);
      const list = paperQuestionsToQuizItems(gen, '创新练习');
      if (!list.length) throw new Error('AI 没能生成新题，稍后再试');
      setItems(list);
      setStage('answer');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '生成失败');
    } finally {
      setCreating(false);
      setStep('');
    }
  };

  /* ── 整卷批量操作 ── */

  /** 整卷核心公式导出：把本题库里的公式拼成纯文本复制走 */
  const exportAllFormulas = async () => {
    if (!analysis) return;
    const lines = [`${analysis.title} · 核心公式`, ''];
    analysis.formulas.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.text}`);
      if (f.note) lines.push(`   说明：${f.note}`);
    });
    if (analysis.tips.length) {
      lines.push('', '解题技巧', '');
      analysis.tips.forEach((t, i) => {
        lines.push(`${i + 1}. ${t.text}`);
        if (t.note) lines.push(`   说明：${t.note}`);
      });
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setErr('');
    } catch {
      setErr('剪贴板不可用，可以到公式本里用「导出全部」');
    }
  };

  /** 整卷错题加入错题本 */
  const addAllWrong = () => {
    if (!analysis) return;
    const all = new Set(analysis.questions.map((_, i) => String(i)));
    setWrongAdded(all);
  };

  /** 提取单条的公式/技巧到公式本 */
  const extractOne = (index: number, kind: 'formula' | 'tip', text: string) => {
    const n = addFormulas([
      {
        subject,
        chapter: analysis?.questions[index]?.chapter || chapterFallback,
        kind,
        text,
        from: analysis?.title,
        fromNo: analysis?.questions[index]?.no,
      },
    ]);
    setExtracted((prev) => ({
      ...prev,
      [index]: { ...prev[index], [kind]: n > 0 ? 'new' : 'dup' },
    }));
    setSavedCount((c) => c + n);
  };

  /**
   * 有题没解析出来时的诊断提示。
   * 「不识别我的题目」是用户报过的问题，这里如实说明原因，
   * 而不是让他对着一堆公式猜。
   */
  const noQuestionHint = useMemo(() => {
    if (!analysis) return '';
    if (analysis.questions.length > 0) return '';
    return (
      '这次没能从卷子里识别出题目。' +
      (analysis.formulas.length || analysis.tips.length
        ? '下面的公式和技巧是从图里读出来的，但题干部分没认出来 —— '
        : '') +
      '常见原因：图片太糊、光线太暗、拍歪了，或者整页是手写体。可以重新拍一张更清晰的，或者只拍一道题试试。'
    );
  }, [analysis]);

  /* ── 答题模式：交给通用答题器 ── */
  if (stage === 'answer' && items.length) {
    return (
      <QuizRunner
        title={`${subjName} · 试卷练习`}
        subtitle={`共 ${items.length} 题`}
        items={items}
        onExit={() => setStage('review')}
        onFinish={({ correct, total }) => {
          const acc = correct / total;
          const acc2 = Math.round(acc * 100);
          subjectStore.setStars(`paper-${subject}`, starsForQuiz(acc));
          clearLevel(`paper-${subject}`, starsForQuiz(acc), acc2, false);
          markToday();
          setStage('review');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pt-1">
      {/* 顶部 */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-grape-500 via-brand-500 to-brand-600 p-5 text-white shadow-card">
        <div className="relative z-10">
          <Chip tone="gray" className="mb-3 bg-white/25 text-white">
            <Wand2 size={13} strokeWidth={3} /> AI 试卷解析
          </Chip>
          <h1 className="text-balance text-2xl font-black leading-tight">
            传一份卷子，逐题拆给你看
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/85">
            支持 PDF、图片（可直接拍）和纯文本。每题都给答案、考点、分步解析和技巧，
            还能在线作答自动判分。
          </p>
        </div>
        <Sparkles className="absolute -right-5 -top-5 h-28 w-28 text-white/15" strokeWidth={1.2} />
      </section>

      {err && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-coral-50 px-4 py-3">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-coral-500" strokeWidth={2.6} />
          <p className="flex-1 text-[13px] font-bold leading-relaxed text-coral-700">{err}</p>
        </div>
      )}

      {/* 选择文件 */}
      {stage === 'idle' && (
        <section className="space-y-2">
          <SectionTitle>选择试卷</SectionTitle>

          {/*
            注意：这两个 input 不能用 className="hidden"（display:none）。
            部分 Android WebView 对 display:none 的 file input 不弹选择器，
            用 sr-only（视觉隐藏但仍在渲染树里）兼容性更好。
          */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*,text/plain,.txt,.md"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = ''; // 允许再次选同一个文件
              void handleFile(f);
            }}
          />
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              void handleFile(f);
            }}
          />

          <button
            onClick={() => openPicker('file')}
            className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50/60 px-5 py-9 text-center transition-colors active:bg-brand-100"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white shadow-pop">
              <Upload size={24} strokeWidth={2.6} />
            </span>
            <span className="mt-1 text-sm font-black text-ink">选择文件</span>
            <span className="text-[11px] leading-relaxed text-ink-faint">
              PDF · 图片（JPG/PNG）· 文本，最大 8MB
            </span>
          </button>

          {picking && (
            <div className="rounded-2xl bg-sun-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-sun-700">
              已触发系统{picking === 'file' ? '文件选择' : '相机'}。
              如果等了 2 秒还没弹出来，说明系统没响应这次调用 ——
              可以换个方式：先在相册里截图/拍照，再回这里点「选择文件」从图库挑。
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openPicker('camera')}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-ink/8 bg-white py-3.5 text-[13px] font-black text-ink active:border-brand-300"
            >
              <Camera size={17} className="text-brand-500" strokeWidth={2.6} />
              拍照上传
            </button>
            <button
              onClick={() => nav(`/${subject}`)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-ink/8 bg-white py-3.5 text-[13px] font-black text-ink active:border-brand-300"
            >
              <Sigma size={17} className="text-ink-soft" strokeWidth={2.6} />
              返回刷题
            </button>
          </div>

          <div className="rounded-2xl bg-ink/3 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-soft">
            <p>
              拍照或选文件由系统的文件选择器完成，按文件授权，不需要额外开存储权限。
            </p>
            {/* 把体积限制说清楚，省得用户拿扫描版大文件反复试 */}
            <p className="mt-1.5">
              <b className="text-ink">关于大小：</b>
              扫描版 PDF 动辄几十兆，上传前会被自动压缩；超过 8MB 的建议只截取要用的那几页。
              拍照上传的单张照片会自动压到 1.6MB 以内，字迹依然认得清。
            </p>
          </div>
        </section>
      )}

      {/* 解析中 */}
      {stage === 'working' && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 size={30} className="animate-spin text-brand-500" />
            <p className="text-sm font-black text-ink">正在处理</p>
            <p className="text-[12px] text-ink-soft">{step || '准备中…'}</p>
            {fileName && <p className="text-[11px] text-ink-faint">{fileName}</p>}
            <p className="mt-1 max-w-[16rem] text-[11px] leading-relaxed text-ink-faint">
              PDF 转图片和逐题识别都比较慢，请耐心等一下，别退出页面。
            </p>
          </div>
        </Card>
      )}

      {/* 解析结果 —— 主体是逐题解析列表 */}
      {stage === 'review' && analysis && (
        <>
          <Card className="border-l-4 border-mint-500">
            <div className="flex items-start gap-3">
              <FileText size={19} className="mt-0.5 shrink-0 text-mint-600" strokeWidth={2.6} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-ink">{analysis.title}</p>
                {analysis.summary && (
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{analysis.summary}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black">
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700">
                    {analysis.questions.length} 道题
                  </span>
                  <span className="rounded-full bg-grape-100 px-2 py-0.5 text-grape-700">
                    {analysis.formulas.length} 条公式
                  </span>
                  <span className="rounded-full bg-sun-100 px-2 py-0.5 text-sun-700">
                    {analysis.tips.length} 条技巧
                  </span>
                  {savedCount > 0 && (
                    <span className="rounded-full bg-mint-100 px-2 py-0.5 text-mint-700">
                      已收录 {savedCount} 条
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 题目没解析出来时的诊断 */}
          {analysis.questions.length === 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-sun-50 px-4 py-3">
              <AlertCircle size={17} className="mt-0.5 shrink-0 text-sun-600" strokeWidth={2.6} />
              <p className="flex-1 text-[12.5px] font-bold leading-relaxed text-sun-700">
                {noQuestionHint}
              </p>
            </div>
          )}

          {/* 批量操作 */}
          {analysis.questions.length > 0 && (
            <section className="space-y-2">
              <SectionTitle>整卷操作</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportAllFormulas}
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-[12.5px] font-black text-ink shadow-pop-sm btn-pop"
                >
                  <Sigma size={15} className="text-grape-500" strokeWidth={2.8} />
                  导出核心公式
                </button>
                <button
                  onClick={addAllWrong}
                  disabled={wrongAdded.size > 0}
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-white py-3 text-[12.5px] font-black text-ink shadow-pop-sm btn-pop disabled:opacity-60"
                >
                  {wrongAdded.size > 0 ? (
                    <>
                      <Check size={15} className="text-mint-500" strokeWidth={3} />
                      已全部加入
                    </>
                  ) : (
                    <>
                      <ClipboardList size={15} className="text-coral-500" strokeWidth={2.8} />
                      整卷加入错题本
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* ★ 逐题解析列表 —— 结果页的主体 */}
          {analysis.questions.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                action={
                  <span className="text-[10px] font-black text-ink-faint">
                    点题头可收起
                  </span>
                }
              >
                逐题解析（{analysis.questions.length} 题）
              </SectionTitle>

              <div className="space-y-3">
                {analysis.questions.map((q, i) => {
                  const key = String(i);
                  return (
                    <PaperQuestionCard
                      key={key}
                      q={q}
                      index={i}
                      // 题多时默认只展开前 3 题，避免一次渲染太长卡顿
                      defaultOpen={i < 3}
                      bookmarked={bookmarked.has(key)}
                      onToggleBookmark={() =>
                        setBookmarked((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        })
                      }
                      onAddWrong={() =>
                        setWrongAdded((prev) => new Set(prev).add(key))
                      }
                      onExtract={(kind, text) => extractOne(i, kind, text)}
                      extracted={extracted[key]}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* 公式 / 技巧（附带产出，折叠在下面） */}
          {(analysis.formulas.length > 0 || analysis.tips.length > 0) && (
            <section className="space-y-2">
              <SectionTitle
                action={
                  <button
                    onClick={() => nav('/formulas')}
                    className="text-xs font-black text-brand-600"
                  >
                    公式本 →
                  </button>
                }
              >
                本卷公式与技巧
              </SectionTitle>

              <div className="card divide-y divide-ink/6 p-0">
                {analysis.formulas.map((f, i) => (
                  <div key={`f${i}`} className="flex items-start gap-2 px-3.5 py-2.5">
                    <Sigma size={14} className="mt-0.5 shrink-0 text-grape-500" strokeWidth={2.8} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold leading-relaxed text-ink">
                        {f.text}
                      </p>
                      {f.note && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{f.note}</p>
                      )}
                    </div>
                  </div>
                ))}
                {analysis.tips.map((t, i) => (
                  <div key={`t${i}`} className="flex items-start gap-2 px-3.5 py-2.5">
                    <Sparkles size={14} className="mt-0.5 shrink-0 text-sun-500" strokeWidth={2.8} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold leading-relaxed text-ink">{t.text}</p>
                      {t.note && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{t.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 模式选择 */}
          <section className="space-y-2 pb-4">
            <SectionTitle>接下来怎么练</SectionTitle>
            <button
              onClick={startOriginal}
              disabled={!analysis.questions.length}
              className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-4 text-left text-white shadow-pop active:scale-[0.98] disabled:opacity-50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/25">
                <ListChecks size={20} strokeWidth={2.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">在线作答本卷</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-white/85">
                  按原卷顺序一题一题做，共 {analysis.questions.length} 题，做完自动判分
                </span>
              </span>
            </button>

            <button
              onClick={startCreative}
              disabled={creating}
              className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-br from-grape-500 to-brand-500 p-4 text-left text-white shadow-pop active:scale-[0.98] disabled:opacity-60"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/25">
                {creating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Shuffle size={20} strokeWidth={2.6} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">
                  {creating ? '正在出新题…' : '创新练习'}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-white/85">
                  不重复原题，AI 按同样考点与难度另出 5 道新题
                </span>
              </span>
            </button>

            <button
              onClick={() => {
                setStage('idle');
                setAnalysis(null);
                setSavedCount(0);
                setFileName('');
              }}
              className="w-full rounded-2xl bg-white py-3 text-sm font-black text-ink-soft shadow-pop-sm btn-pop"
            >
              换一份卷子
            </button>

            <button
              onClick={() => nav('/formulas')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink/4 py-3 text-[13px] font-black text-ink-soft"
            >
              <BookMarked size={16} strokeWidth={2.6} />
              查看公式本 / 技巧本
            </button>
          </section>
        </>
      )}
    </div>
  );
}
