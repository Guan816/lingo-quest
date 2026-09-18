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
 * 3. 四级有自己的错题本（Cet4Wrong），因为结构和交互都不同，没强行合并。
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

/** 把错题记录还原成可渲染的完整题目 */
function resolveQuestion(w: WrongRecord): QuizItem | null {
  if (w.subject === 'math') {
    const raw = questionsOfChapter(w.chapter as any).find((q) => q.id === w.qid);
    return raw ? fromMath(raw) : null;
  }
  const raw = csQuestionsOfChapter(w.chapter as any).find((q) => q.id === w.qid);
  return raw ? fromCs(raw) : null;
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
  const [subject, setSubject] = useState<SubjectKey | 'all'>(() =>
    params.mode === 'cs' || params.mode === 'math' ? params.mode : 'all',
  );

  const list = useMemo(
    () => (subject === 'all' ? wrong : wrong.filter((w) => w.subject === subject)),
    [wrong, subject],
  );

  /** 重做模式：把错题还原成题目，交给通用答题器 */
  const [retryItems, setRetryItems] = useState<QuizItem[] | null>(null);
  const [retryFrom, setRetryFrom] = useState<WrongRecord[]>([]);

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
    setImmersive(!!retryItems);
    return () => setImmersive(false);
  }, [retryItems]);

  // ── 重做模式 ──
  if (retryItems) {
    const title = subject === 'all' ? '错题重做' : `${SUBJECT_META[subject].name} · 错题重做`;
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
          for (const it of retryItems) {
            const ok = answered[it.id];
            if (ok === undefined) continue;
            if (ok) {
              removeWrong(it.id);
            } else {
              const src = retryFrom.find((r) => r.qid === it.id);
              if (src) {
                record(src.subject, src.chapter, {
                  correct: false,
                  qid: it.id,
                  userAnswer: userAnswers?.[it.id],
                });
              }
            }
          }
          setRetryItems(null);
          setRetryFrom([]);
          // 回到错题本，让用户看到结果
        }}
      />
    );
  }

  const pending = list.length;

  return (
    <div className="space-y-5 pt-1">
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
              待订正 <b className="text-coral-600">{pending}</b> 道
            </p>
            <p className="text-xs text-ink-faint">
              {subject === 'all' ? '数学与计算机合计' : SUBJECT_META[subject].name}
            </p>
          </div>
        </div>
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
      </div>

      {/* 列表 */}
      {list.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-ink-faint">
            {wrong.length === 0
              ? '错题本还是空的 —— 去刷几道题吧，答错的会自动进来'
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
                clearWrong(subject === 'all' ? undefined : subject);
              }
            }}
          >
            {subject === 'all' ? '清空全部错题' : `清空${SUBJECT_META[subject].name}错题`}
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
