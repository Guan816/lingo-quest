import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  BookMarked,
  Camera,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Shuffle,
  Sigma,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { Card, Chip, SectionTitle } from '../components/ui';
import { MathText } from '../components/MathText';
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
            传一份卷子，让 AI 拆成题、公式和技巧
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/85">
            支持 PDF、图片（可直接拍）和纯文本。解析完可以顺序答题，也可以让 AI 照着考点出新题。
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
        <>
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

            {/* 点开系统文件选择器；AI 由服务端提供，无需任何配置 */}
            <button
              onClick={() => openPicker('file')}
              className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50/60 px-5 py-9 text-center transition-colors active:bg-brand-100"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white shadow-pop">
                <Upload size={24} strokeWidth={2.6} />
              </span>
              <span className="mt-1 text-sm font-black text-ink">选择文件</span>
              <span className="text-[11px] leading-relaxed text-ink-faint">
                PDF · 图片（JPG/PNG）· 文本，最大 12MB
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

            <p className="rounded-2xl bg-ink/3 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-soft">
              拍照或选文件由系统的文件选择器完成，按文件授权，不需要额外开存储权限。
              如果上传的是扫描版 PDF，会自动转成图片交给 AI 识别。
            </p>
          </section>
        </>
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
              PDF 转图片和视觉识别都比较慢，请耐心等一下，别退出页面。
            </p>
          </div>
        </Card>
      )}

      {/* 解析结果 */}
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
                      新收录 {savedCount} 条
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 公式 */}
          {analysis.formulas.length > 0 && (
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
                核心公式
              </SectionTitle>
              <div className="space-y-2">
                {analysis.formulas.map((f, i) => (
                  <div key={i} className="card p-3.5">
                    <p className="font-mono text-[13px] font-bold leading-relaxed text-ink">
                      <MathText>{f.text}</MathText>
                    </p>
                    {f.note && (
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                        <MathText>{f.note}</MathText>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 技巧 */}
          {analysis.tips.length > 0 && (
            <section className="space-y-2">
              <SectionTitle>解题技巧</SectionTitle>
              <div className="space-y-2">
                {analysis.tips.map((t, i) => (
                  <div key={i} className="card flex gap-3 p-3.5">
                    <Lightbulb
                      size={17}
                      className="mt-0.5 shrink-0 text-sun-500"
                      strokeWidth={2.6}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold leading-relaxed text-ink">
                        <MathText>{t.text}</MathText>
                      </p>
                      {t.note && (
                        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                          <MathText>{t.note}</MathText>
                        </p>
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
                <ImageIcon size={20} strokeWidth={2.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">顺序答题</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-white/85">
                  按原卷顺序一题一题做，共 {analysis.questions.length} 题
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
