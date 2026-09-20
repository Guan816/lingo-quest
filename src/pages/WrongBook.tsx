/**
 * 数学 / 计算机共用错题本。
 *
 * ── 设计要点 ──
 *
 * 1. **必须能重新作答，而不只是「看」**。
 *    错题本的价值在于订正，只列出来等于没做。所以每道错题都能点进去
 *    重新做一遍；在重做模式下答对，系统自动把它从错题本移出。
 *
 * 2. 题目本体从题库按 qid 反查，错题本里只存 `{qid, chapter, userAnswer, at}` ——
 *    题库更新后，错题本里的题目也跟着更新，不会存成一份过期的快照。
 *
 * 3. 英语（四级）错题**已并入本页**（2026-09-20）。两边存储口径不同 ——
 *    数学/计算机存 `{qid, chapter}` 引用，四级存整题对象 `{q, chosenText, fixed}` ——
 *    所以列表各按各的口径渲染；四级的重做交给 `/cet4/play/wrong`
 *    （题型体系不同，不硬塞进通用答题器）。
 *
 * 4. **重做时要切全屏（隐藏 TabBar）**。
 *    错题本列表和重做答题共用 `/wrong` 这一个路由，路由级判断分不出来。
 *    不切的话底部 TabBar 会**盖在 QuizRunner 的「提交答案」按钮上**，
 *    提交点了没反应 —— 这个 bug 真出过，见下面 useEffect 的注释。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Eraser,
  Lightbulb,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button, Card, Chip, SectionTitle } from '../components/ui';
import { QuizRunner } from '../components/QuizRunner';
import { setImmersive } from '../App';
import { MATH_CHAPTERS, questionsOfChapter } from '../data/math';
import { CS_CHAPTERS, csQuestionsOfChapter } from '../data/cs';
import { fromMath, fromCs, type QuizItem } from '../lib/quiz';
import { MathText } from '../components/MathText';
import { useSubjectStore, type SubjectKey, type WrongRecord } from '../store/useSubjectStore';
import { useFormulaBookStore } from '../store/useFormulaBookStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCet4Store } from '../store/useCet4Store';
import { kindMeta } from '../data/cet4';
import { deriveFormulas, makeVariants, VARIANT_COUNT } from '../lib/derive';

/** 把错题记录还原成可渲染的完整题目 */
function resolveQuestion(w: WrongRecord): QuizItem | null {
  if (w.subject === 'math') {
    const raw = questionsOfChapter(w.chapter as any).find((q) => q.id === w.qid);
    return raw ? fromMath(raw) : null;
  }
  const raw = csQuestionsOfChapter(w.chapter as any).find((q) => q.id === w.qid);
  return raw ? fromCs(raw) : null;
}

/** 筛选态的显示名：'all' 与 'cet4' 都不在 SUBJECT_META 里，单独兜住 */
function subjectLabel(s: SubjectKey | 'cet4' | 'all'): string {
  if (s === 'all') return '全部';
  if (s === 'cet4') return '英语（四级）';
  return SUBJECT_META[s].name;
}

const SUBJECT_META: Record<SubjectKey, { name: string; back: string; tone: string }> = {
  math: { name: '高等数学', back: '/math', tone: 'text-brand-600 bg-brand-50' },
  cs: { name: '计算机基础', back: '/cs', tone: 'text-mint-600 bg-mint-50' },
};

export default function WrongBook() {
  const params = useParams<{ mode?: string; value?: string }>();
  const nav = useNavigate();
  const wrong = useSubjectStore((s) => s.wrong);
  const removeWrong = useSubjectStore((s) => s.removeWrong);
  const clearWrong = useSubjectStore((s) => s.clearWrong);
  const record = useSubjectStore((s) => s.record);

  /** 当前筛选的科目；'all' 表示不分科目。路由 /wrong/math、/wrong/cs 可直接定位 */
  const [subject, setSubject] = useState<SubjectKey | 'cet4' | 'all'>(() =>
    params.mode === 'cs' || params.mode === 'math' || params.mode === 'cet4'
      ? (params.mode as SubjectKey | 'cet4')
      : 'all',
  );

  /*
   * 英语（四级）错题**并入本页**。
   *
   * 为什么不能直接混进同一个数组：两边存储口径不同 ——
   * 数学/计算机只存 `{qid, chapter}` 引用（题目从题库反查），
   * 四级存的是**整题对象** `{q, chosenText, fixed}`。
   * 所以这里各按各的口径渲染，但入口、列表、计数都统一到这一个错题本；
   * 四级的重做交给它自己的答题器（/cet4/play/wrong），因为题型体系不同。
   */
  const cet4Wrong = useCet4Store((s) => s.wrong);
  const clearCet4Wrong = useCet4Store((s) => s.clearWrong);
  const cet4PendingList = useMemo(() => cet4Wrong.filter((w) => !w.fixed), [cet4Wrong]);
  const cet4Pending = cet4PendingList.length;
  const showCet4 = subject === 'all' || subject === 'cet4';

  const list = useMemo(
    () =>
      subject === 'cet4'
        ? []
        : subject === 'all'
          ? wrong
          : wrong.filter((w) => w.subject === subject),
    [wrong, subject],
  );

  /** 重做模式：把错题还原成题目，交给通用答题器 */
  const [retryItems, setRetryItems] = useState<QuizItem[] | null>(null);
  const [retryFrom, setRetryFrom] = useState<WrongRecord[]>([]);

  const ai = useSettingsStore((s) => s.ai);
  const addFormulas = useFormulaBookStore((s) => s.addMany);

  /** 刚订正对的题（用来问「要不要举一反三」） */
  const [askItems, setAskItems] = useState<{ item: QuizItem; rec: WrongRecord }[] | null>(null);
  /** 生成出来的变式题，非空则直接进答题页 */
  const [variantItems, setVariantItems] = useState<QuizItem[] | null>(null);
  const [variantBusy, setVariantBusy] = useState(false);
  const [toast, setToast] = useState('');

  const startRetry = (records: WrongRecord[]) => {
    const items = records.map(resolveQuestion).filter((x): x is QuizItem => !!x);
    if (!items.length) {
      window.alert('这些错题关联的题目已经不在题库里了，可能题库更新过，建议移出。');
      return;
    }
    setRetryItems(items);
    setRetryFrom(records);
  };

  /**
   * 重做时隐藏顶部/底部栏。
   *
   * ── 为什么必须这么做 ──
   * 底部那根 TabBar 是 `sticky bottom-0`，高 78px；QuizRunner 的提交栏是
   * `fixed bottom-0`，提交按钮实测 top=786 / bottom=836，而 TabBar 占
   * top=767 ~ bottom=844 —— **完全压在提交按钮上面**。
   *
   * 表现就是：用户答完点「提交答案」，事件被 TabBar 接走，
   * 页面毫无反应；一路点下去永远是第一题，也就永远走不到结算，
   * 错题本自然一道都清不掉。
   *
   * 卸载时复位，避免回到别的页面还留着全屏态。
   */
  useEffect(() => {
    setImmersive(!!retryItems || !!variantItems);
    return () => setImmersive(false);
  }, [retryItems, variantItems]);

  /**
   * 错题**订正为正确**之后的收尾（触发时机：重做答对那一刻，不是答错时）：
   *   ① 提炼技巧公式 → 公式本
   *   ② 弹窗问一句「要不要做几道同类型题」
   */
  const afterCorrect = async (corrected: { item: QuizItem; rec: WrongRecord }[]) => {
    try {
      setToast('正在把订正后的技巧收进公式本…');
      const inputs = await deriveFormulas(
        ai,
        corrected.map(({ item, rec }) => ({
          subject: rec.subject,
          chapter: rec.chapter,
          stem: item.stem,
          answerText: item.refAnswer,
          steps: item.steps.map((s) => ({ text: s })),
          tip: item.explain?.tip,
          from: '错题订正',
        })),
        { maxItems: 6 },
      );
      if (inputs.length) addFormulas(inputs);
    } catch {
      /* 提炼失败不影响订正结果 */
    } finally {
      setToast('');
    }
    setAskItems(corrected);
  };

  /** 用户点了「来几道」→ 生成同类型变式题并直接开练 */
  const startVariants = async () => {
    const first = askItems?.[0];
    if (!first) return;
    setVariantBusy(true);
    try {
      const list = await makeVariants(
        ai,
        {
          subject: first.rec.subject,
          chapter: first.rec.chapter,
          mode: first.item.mode,
          stem: first.item.stem,
          answerText: first.item.refAnswer,
          point: first.item.point,
        },
        VARIANT_COUNT,
      );
      setAskItems(null);
      if (!list.length) {
        setToast('这次没生成出变式题，稍后再试');
        return;
      }
      setVariantItems(list);
    } catch (e) {
      setToast(`生成失败：${(e as Error).message}`);
    } finally {
      setVariantBusy(false);
    }
  };

  // ── 举一反三：练变式题（练完即走，写进任何题库）──
  if (variantItems) {
    return (
      <QuizRunner
        title="举一反三 · 同类型题"
        subtitle={`${variantItems.length} 道 · 练完即走，不进题库`}
        items={variantItems}
        onExit={() => setVariantItems(null)}
        onFinish={() => {
          setVariantItems(null);
          setToast('练完了，这几道是临时生成的，不会进错题本');
        }}
      />
    );
  }

  // ── 重做模式 ──
  if (retryItems) {
    const title = subject === 'all' ? '错题重做' : `${subjectLabel(subject)} · 错题重做`;
    return (
      <QuizRunner
        title={title}
        subtitle={`重做 ${retryItems.length} 道 · 答对会自动移出错题本`}
        items={retryItems}
        onExit={() => {
          setRetryItems(null);
          setRetryFrom([]);
        }}
        onFinish={({ answered, userAnswers }) => {
          // 重做答对的 → 移出错题本；仍然答错的 → 更新作答与时间
          const corrected: { item: QuizItem; rec: WrongRecord }[] = [];
          for (const it of retryItems) {
            const ok = answered[it.id];
            if (ok === undefined) continue;
            const src = retryFrom.find((r) => r.qid === it.id);
            if (ok) {
              removeWrong(it.id);
              if (src) corrected.push({ item: it, rec: src });
            } else if (src) {
              record(src.subject, src.chapter, {
                correct: false,
                qid: it.id,
                userAnswer: userAnswers?.[it.id],
              });
            }
          }
          setRetryItems(null);
          setRetryFrom([]);
          // 订正对了 → 收技巧进公式本，再问要不要举一反三
          if (corrected.length) void afterCorrect(corrected);
        }}
      />
    );
  }

  const pending = list.length;

  return (
    <div className="space-y-5 pt-1">
      {/* 订正对了 → 问要不要举一反三（fixed 覆盖层，不影响列表布局） */}
      {askItems && askItems.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-sun-500" strokeWidth={2.8} />
              <p className="text-[15px] font-black text-ink">这道题订正好了</p>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
              技巧已经收进公式本。要不要再做几道
              <span className="font-black text-ink">同类型</span>的题巩固一下？
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setAskItems(null)}
                disabled={variantBusy}
                className="flex-1 rounded-2xl border-2 border-ink/10 py-2.5 text-[13px] font-black text-ink-soft"
              >
                先不用
              </button>
              <button
                onClick={startVariants}
                disabled={variantBusy}
                className="flex-1 rounded-2xl bg-brand-500 py-2.5 text-[13px] font-black text-white disabled:opacity-70"
              >
                {variantBusy ? '出题中…' : '来几道'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 轻提示 */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-sm px-4">
          <div className="rounded-2xl bg-ink px-4 py-2.5 text-center text-[12px] font-bold text-white shadow-pop">
            {toast}
          </div>
        </div>
      )}

      {/* 头部 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => nav(-1)}
          aria-label="返回"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          <ArrowLeft size={18} strokeWidth={2.8} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-ink">错题本</h1>
          <p className="text-xs text-ink-faint">
            答错的题自动收进来，重做答对就自动移出
          </p>
        </div>
      </div>

      {/* 概览 + 重做入口 */}
      <Card className="border-l-4 border-coral-500">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coral-100">
            <Lightbulb size={22} className="text-coral-600" strokeWidth={2.4} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-ink">
              待订正 <b className="text-coral-600">{pending + (showCet4 ? cet4Pending : 0)}</b> 道
            </p>
            <p className="text-xs text-ink-faint">
              {subject === 'all'
                ? '数学 · 计算机 · 英语 三科合计'
                : subject === 'cet4'
                  ? '英语（四级）'
                  : SUBJECT_META[subject].name}
            </p>
          </div>
        </div>
        {subject === 'cet4' ? (
          <Button
            variant="coral"
            size="sm"
            block
            className="mt-3"
            disabled={cet4Pending === 0}
            icon={<Play size={15} strokeWidth={3} fill="currentColor" />}
            onClick={() => nav('/cet4/play/wrong')}
          >
            {cet4Pending === 0 ? '暂无错题' : `重做这 ${cet4Pending} 道（英语）`}
          </Button>
        ) : (
          <Button
            variant="coral"
            size="sm"
            block
            className="mt-3"
            disabled={pending === 0}
            icon={<Play size={15} strokeWidth={3} fill="currentColor" />}
            onClick={() => startRetry(list)}
          >
            {pending === 0 ? '暂无错题' : `重做这 ${pending} 道`}
          </Button>
        )}
      </Card>

      {/* 科目筛选 */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={subject === 'all'} onClick={() => setSubject('all')}>
          全部 {wrong.length}
        </FilterChip>
        <FilterChip active={subject === 'math'} onClick={() => setSubject('math')}>
          数学 {wrong.filter((w) => w.subject === 'math').length}
        </FilterChip>
        <FilterChip active={subject === 'cs'} onClick={() => setSubject('cs')}>
          计算机 {wrong.filter((w) => w.subject === 'cs').length}
        </FilterChip>
        <FilterChip active={subject === 'cet4'} onClick={() => setSubject('cet4')}>
          英语 {cet4Pending}
        </FilterChip>
      </div>

      {/* 列表：数学 / 计算机 */}
      {subject !== 'cet4' &&
        (list.length === 0 ? (
          <Card>
            <p className="py-10 text-center text-sm text-ink-faint">
              {wrong.length === 0
                ? cet4Pending > 0
                  ? '数学与计算机没有错题（英语的在下面）'
                  : '错题本还是空的 —— 去刷几道题吧，答错的会自动进来'
                : '这个科目下没有错题'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((w) => (
              <WrongCard
                key={w.id}
                entry={w}
                onRemove={() => removeWrong(w.qid)}
                onRetry={() => startRetry([w])}
              />
            ))}
          </div>
        ))}

      {/* 列表：英语（四级）—— 口径不同，单独渲染；重做走四级自己的答题器 */}
      {showCet4 && cet4Pending > 0 && (
        <section>
          <SectionTitle
            action={
              <button
                onClick={() => nav('/cet4/play/wrong')}
                className="inline-flex items-center gap-1 text-[11px] font-black text-brand-600"
              >
                <Play size={12} strokeWidth={3} fill="currentColor" /> 重做英语错题
              </button>
            }
          >
            英语（四级）· {cet4Pending} 道
          </SectionTitle>
          <div className="space-y-2">
            {cet4PendingList.map((w) => (
              <div key={w.q.id} className="rounded-2xl bg-white p-3.5 shadow-pop-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone="brand">{kindMeta(w.q.kind).name}</Chip>
                  {w.q.tag && (
                    <span className="text-[10px] font-bold text-ink-faint">{w.q.tag}</span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-ink">
                  <MathText>{w.q.stem}</MathText>
                </p>
                <p className="mt-1.5 text-[11px] text-coral-600">
                  你选了：{w.chosenText || '（未作答）'}
                </p>
                <p className="mt-0.5 text-[11px] font-black text-mint-700">
                  正确答案：{w.q.options[w.q.answer] ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {wrong.length > 0 && (
        <section>
          <SectionTitle>清理</SectionTitle>
          <Button
            variant="ghost"
            size="sm"
            block
            icon={<Eraser size={15} strokeWidth={3} />}
            onClick={() => {
              if (window.confirm('确定清空错题本吗？此操作不可撤销。')) {
                // 英语错题存在另一个 store，清空时要一起清
                if (subject === 'all') {
                  clearWrong();
                  clearCet4Wrong();
                } else if (subject === 'cet4') {
                  clearCet4Wrong();
                } else {
                  clearWrong(subject);
                }
              }
            }}
          >
            {subject === 'all' ? '清空全部错题' : `清空${subjectLabel(subject)}错题`}
          </Button>
        </section>
      )}

      <div className="h-4" />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-black text-white'
          : 'rounded-full bg-ink/5 px-3.5 py-1.5 text-xs font-black text-ink-soft'
      }
    >
      {children}
    </button>
  );
}

function WrongCard({
  entry,
  onRemove,
  onRetry,
}: {
  entry: WrongRecord;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const meta = SUBJECT_META[entry.subject];
  const chapterName =
    entry.subject === 'math'
      ? (MATH_CHAPTERS.find((c) => c.key === entry.chapter)?.short ?? entry.chapter)
      : (CS_CHAPTERS.find((c) => c.key === entry.chapter)?.name ?? entry.chapter);

  const item = resolveQuestion(entry);
  const correctText = item
    ? item.answerIdx.map((i) => item.options[i]).filter(Boolean).join('、') || item.refAnswer
    : '（题目已不在题库中）';

  return (
    <Card className="border-l-4 border-coral-500">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Chip tone="brand">{chapterName}</Chip>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${meta.tone}`}>
          {meta.name}
        </span>
        <span className="text-[11px] text-ink-faint">
          {new Date(entry.at).toLocaleDateString('zh-CN')}
        </span>
      </div>

      <div className="mb-2.5 text-sm font-black leading-relaxed text-ink">
        <MathText>{item?.stem ?? '（题目已不在题库中）'}</MathText>
      </div>

      <div className="space-y-1.5">
        {entry.userAnswer && (
          <div className="flex items-start gap-2 rounded-2xl bg-coral-50 px-3 py-2">
            <span className="mt-0.5 shrink-0 text-[11px] font-black text-coral-600">你写了</span>
            <span className="text-xs font-semibold leading-relaxed text-coral-600 line-through">
              <MathText>{entry.userAnswer}</MathText>
            </span>
          </div>
        )}
        <div className="flex items-start gap-2 rounded-2xl bg-mint-50 px-3 py-2">
          <span className="mt-0.5 shrink-0 text-[11px] font-black text-mint-600">正确答案</span>
          <span className="text-xs font-semibold leading-relaxed text-mint-600">
            <MathText>{correctText}</MathText>
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-brand-100 py-2 text-[11px] font-black text-brand-600"
        >
          <RotateCcw size={12} strokeWidth={3} /> 重做这题
        </button>
        <button
          onClick={onRemove}
          className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-ink/5 py-2 text-[11px] font-black text-ink-soft"
        >
          <Trash2 size={12} strokeWidth={3} /> 移出
        </button>
      </div>
    </Card>
  );
}
