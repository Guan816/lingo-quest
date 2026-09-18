/**
 * 分科目做题统计页。
 *
 * ── 为什么要单独一页 ──
 *
 * 「我的」页只给了三个总数（做题数 / 正确率 / 错题数），
 * 但考生真正想知道的是「**哪一章我弱**」—— 只看总数没法定位问题。
 * 所以这里下钻到章节粒度，并把错题数也按章列出，直接指向该补哪儿。
 *
 * 数学、计算机各自独立成页（路由 /stats/math、/stats/cs），
 * 统计口径与错题本完全分开，互不污染。
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Sigma,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Card, Chip, SectionTitle } from '../components/ui';
import { MATH_CHAPTERS, chapterCount, questionsOfChapter } from '../data/math';
import { CS_CHAPTERS, csChapterCount, csQuestionsOfChapter } from '../data/cs';
import { useSubjectStore, subjectStats, type SubjectKey } from '../store/useSubjectStore';

interface Row {
  key: string;
  name: string;
  group: string;
  total: number;
  answered: number;
  correct: number;
  wrong: number;
}

export default function SubjectStats() {
  const params = useParams<{ subject?: string }>();
  const nav = useNavigate();
  const subj = useSubjectStore();

  const subject: SubjectKey = params.subject === 'cs' ? 'cs' : 'math';
  const isMath = subject === 'math';

  const meta = isMath
    ? { name: '高等数学', back: '/math', icon: Sigma }
    : { name: '计算机基础', back: '/cs', icon: Target };

  const overall = subjectStats(subject, subj);

  /** 逐章统计 —— 这是本页的核心 */
  const rows: Row[] = useMemo(() => {
    const mathCount = isMath ? chapterCount() : null;
    const csCount: Record<string, number> = isMath ? {} : csChapterCount();

    const wrongPerChapter = subj.wrong
      .filter((w) => w.subject === subject)
      .reduce<Record<string, number>>((a, w) => {
        a[w.chapter] = (a[w.chapter] ?? 0) + 1;
        return a;
      }, {});

    if (isMath) {
      return MATH_CHAPTERS.map((c) => {
        const st = subj.chapterStats[`math-${c.key}`] ?? { answered: 0, correct: 0 };
        return {
          key: c.key,
          name: c.name,
          group: c.linear ? '线性代数' : '微积分',
          total: mathCount?.[c.key] ?? questionsOfChapter(c.key).length,
          answered: st.answered,
          correct: st.correct,
          wrong: wrongPerChapter[c.key] ?? 0,
        };
      });
    }

    return CS_CHAPTERS.map((c) => {
      const st = subj.chapterStats[`cs-${c.key}`] ?? { answered: 0, correct: 0 };
      return {
        key: c.key,
        name: c.name,
        group: c.course === 'A' ? '课程 A · 60%' : '课程 B · 40%',
        total: csCount[c.key] ?? csQuestionsOfChapter(c.key).length,
        answered: st.answered,
        correct: st.correct,
        wrong: wrongPerChapter[c.key] ?? 0,
      };
    });
  }, [isMath, subj.chapterStats, subj.wrong, subject]);

  /** 按分组归类 */
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      if (!m.has(r.group)) m.set(r.group, []);
      m.get(r.group)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  /** 最该补的章节：正确率最低且做过题的；没做过题就按错题数 */
  const weakest = useMemo(() => {
    const done = rows.filter((r) => r.answered > 0);
    if (!done.length) return null;
    return done.sort(
      (a, b) => a.correct / a.answered - b.correct / b.answered
        || b.wrong - a.wrong,
    )[0];
  }, [rows]);

  const totalWrong = rows.reduce((n, r) => n + r.wrong, 0);
  const answeredRows = rows.filter((r) => r.answered > 0);

  return (
    <div className="space-y-5 pt-1">
      {/* 头部 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => nav(meta.back)}
          aria-label="返回"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          <ArrowLeft size={18} strokeWidth={2.8} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-ink">{meta.name} · 做题统计</h1>
          <p className="text-xs text-ink-faint">按章节看强弱，错题数单独统计</p>
        </div>
      </div>

      {/* 总览 */}
      <section>
        <SectionTitle>总览</SectionTitle>
        <div className="card grid grid-cols-3 gap-2 p-3">
          <Metric value={overall.answered} label="已做题数" tone="text-brand-600" />
          <Metric
            value={overall.answered ? `${overall.accuracy}%` : '—'}
            label="正确率"
            tone="text-mint-600"
          />
          <Metric value={totalWrong} label="错题数" tone="text-coral-600" />
        </div>
      </section>

      {/* 薄弱点提示 */}
      {weakest && (
        <Card className="border-l-4 border-sun-400">
          <div className="flex items-start gap-2.5">
            <TrendingUp size={17} className="mt-0.5 shrink-0 text-sun-600" strokeWidth={2.6} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black text-ink">
                最该补：{weakest.name}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                已做 {weakest.answered} / {weakest.total} 题，正确率{' '}
                {Math.round((weakest.correct / weakest.answered) * 100)}%
                {weakest.wrong > 0 && ` · 挂账 ${weakest.wrong} 道错题`}
              </p>
            </div>
            <button
              onClick={() => nav(`/wrong/${subject}`)}
              className="shrink-0 rounded-full bg-sun-100 px-2.5 py-1 text-[11px] font-black text-sun-700"
            >
              看错题
            </button>
          </div>
        </Card>
      )}

      {/* 错题本入口（与统计分开） */}
      <button
        onClick={() => nav(`/wrong/${subject}`)}
        className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-left shadow-pop-sm active:bg-ink/3"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white">
          <RotateCcw size={17} strokeWidth={2.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-black text-ink">
            {meta.name}错题本
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
            {totalWrong > 0 ? `${totalWrong} 道待订正，可重做` : '答错自动收录'}
          </span>
        </span>
        <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
      </button>

      {/* 逐章明细 */}
      {groups.map(([g, list]) => (
        <section key={g} className="space-y-2">
          <SectionTitle>{g}</SectionTitle>
          <div className="space-y-2">
            {list.map((r) => (
              <ChapterRow
                key={r.key}
                row={r}
                onWrong={() => nav(`/wrong/${subject}`)}
              />
            ))}
          </div>
        </section>
      ))}

      {answeredRows.length === 0 && (
        <Card>
          <p className="py-8 text-center text-sm text-ink-faint">
            还没有做题记录 —— 去做一组练习，这里就会自动出图表
          </p>
        </Card>
      )}

      <div className="h-4" />
    </div>
  );
}

function Metric({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-black ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-bold text-ink-faint">{label}</p>
    </div>
  );
}

function ChapterRow({ row, onWrong }: { row: Row; onWrong: () => void }) {
  const done = row.answered > 0;
  const acc = done ? Math.round((row.correct / row.answered) * 100) : 0;
  const pct = row.total > 0 ? Math.min(100, (row.answered / row.total) * 100) : 0;

  /** 正确率配色：≥80 绿 / ≥60 琥珀 / 其余红。没用色阶组件，直接给类名 */
  const accTone = !done
    ? 'text-ink-faint'
    : acc >= 80
      ? 'text-mint-600'
      : acc >= 60
        ? 'text-sun-600'
        : 'text-coral-600';

  return (
    <div className="rounded-2xl bg-white px-3.5 py-3 shadow-pop-sm">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-black text-ink">{row.name}</span>
        {row.wrong > 0 && (
          <button onClick={onWrong} className="shrink-0">
            <Chip tone="coral">错 {row.wrong}</Chip>
          </button>
        )}
        <span className={`shrink-0 text-[13px] font-black ${accTone}`}>
          {done ? `${acc}%` : '未做'}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-1 text-[11px] font-bold text-ink-faint">
        已做 {row.answered} / {row.total} 题
        {done && ` · 对 ${row.correct} 道`}
      </p>
    </div>
  );
}
