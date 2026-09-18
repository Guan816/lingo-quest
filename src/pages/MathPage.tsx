import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  Calculator,
  ChevronRight,
  Dices,
  GitBranch,
  Infinity as InfinityIcon,
  Layers,
  LineChart,
  Sigma,
  Target,
  Upload,
  Variable,
} from 'lucide-react';
import { SectionTitle } from '../components/ui';
import {
  ChapterCard,
  DrillButton,
  MiniEntry,
  StructureCard,
  SubjectHero,
} from '../components/SubjectKit';
import { MATH_CHAPTERS, MATH_QUESTIONS, MATH_KINDS, chapterCount } from '../data/math';
import { useSubjectStore, subjectStats } from '../store/useSubjectStore';
import type { MathChapter } from '../types';

/** 章节图标 */
const CHAPTER_ICON: Record<MathChapter, typeof Sigma> = {
  limit: InfinityIcon,
  deriv: LineChart,
  integral: Sigma,
  multivar: Layers,
  series: Variable,
  ode: GitBranch,
  detmat: Calculator,
  linalg: BookOpen,
};

export default function MathPage() {
  const nav = useNavigate();
  const subj = useSubjectStore();
  const [linearOpen, setLinearOpen] = useState(true);

  const counts = useMemo(() => chapterCount(), []);

  const calc = MATH_CHAPTERS.filter((c) => !c.linear);
  const linear = MATH_CHAPTERS.filter((c) => c.linear);

  const overall = subjectStats('math', subj);

  /** 本科目总共做过多少题（按章节统计累加，用于「已做 / 总题数」） */
  const doneTotal = useMemo(
    () =>
      MATH_CHAPTERS.reduce((n, c) => n + (subj.chapterStats[`math-${c.key}`]?.answered ?? 0), 0),
    [subj.chapterStats],
  );

  const startDrill = (chapter?: MathChapter) => {
    nav(chapter ? `/math/play/chapter/${chapter}` : '/math/play/mix');
  };

  const renderChapter = (c: (typeof MATH_CHAPTERS)[number]) => {
    const Icon = CHAPTER_ICON[c.key];
    const key = `math-${c.key}`;
    const st = subj.chapterStats[key];
    const accuracy =
      st && st.answered > 0 ? Math.round((st.correct / st.answered) * 100) : null;
    return (
      <ChapterCard
        key={c.key}
        name={c.name}
        hint={c.hint}
        count={counts[c.key] ?? 0}
        done={st?.answered ?? 0}
        /* 星 = 该章在卷面中的分值权重（满分 3 星），不是熟练度 */
        stars={c.weight >= 18 ? 3 : c.weight >= 12 ? 2 : 1}
        maxStars={3}
        accuracy={accuracy}
        badge={c.linear ? '线代' : undefined}
        icon={<Icon size={17} strokeWidth={2.6} />}
        onClick={() => startDrill(c.key)}
      />
    );
  };

  return (
    <div className="space-y-5 pt-1">
      <SubjectHero
        tag="江苏专转本 · 高等数学"
        tagIcon={<Sigma size={13} strokeWidth={3} />}
        title="微积分 80% + 线代 20%"
        desc="满分 150 / 120 分钟。计算题独占 43%，是拉开差距的地方。"
        bg="bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600"
        deco={<Sigma className="h-28 w-28" strokeWidth={1.2} />}
        stats={[
          { label: '累计答题', value: overall.answered },
          { label: '正确率', value: overall.answered ? `${overall.accuracy}%` : '—' },
          { label: '已做 / 总题数', value: `${doneTotal}/${MATH_QUESTIONS.length}` },
        ]}
      />

      {/* 试卷结构 & 分值 */}
      <StructureCard
        icon={<Calculator size={20} strokeWidth={2.6} />}
        accent="border-brand-500"
        iconClass="text-brand-600"
        rows={MATH_KINDS.map((k) => ({
          name: k.name,
          count: `${k.count} 题 × ${k.perScore} 分`,
          score: `${k.perScore * k.count} 分`,
        }))}
        tip="计算题独占 43%、选择填空 21%+16%，难度结构为较易 30% / 中等 50% / 较难 20%。"
      />

      {/* 刷题入口 */}
      <section className="space-y-2">
        <SectionTitle>开始刷题</SectionTitle>
        <DrillButton
          icon={<Dices size={20} strokeWidth={2.6} />}
          title="整套模拟卷"
          desc="按真题题型配比出题，五种题型混排"
          onClick={() => startDrill()}
        />
        <DrillButton
          icon={<Upload size={20} strokeWidth={2.6} />}
          title="上传试卷，AI 解析"
          desc="传 PDF 或拍照，自动拆题并提取公式技巧"
          onClick={() => nav('/paper/math')}
          tone="sun"
        />
        <div className="grid grid-cols-2 gap-2">
          <MiniEntry
            icon={<Target size={18} className="text-brand-500" strokeWidth={2.6} />}
            title="只练选择填空"
            desc="8×4 + 6×4 = 56 分"
            onClick={() => nav('/math/play/kind/choice')}
          />
          <MiniEntry
            icon={<Sigma size={18} className="text-grape-500" strokeWidth={2.6} />}
            title="只练计算证明"
            desc="8×8 + 1×10 = 74 分"
            onClick={() => nav('/math/play/kind/calc')}
          />
        </div>

        <button
          onClick={() => nav('/formulas')}
          className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-left shadow-pop-sm active:bg-ink/3"
        >
          <BookMarked size={17} className="shrink-0 text-grape-500" strokeWidth={2.6} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black text-ink">公式本 · 技巧本</span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
              自动去重，按考纲顺序排列
            </span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
        </button>
      </section>

      {/* 微积分 */}
      <section className="space-y-2">
        <SectionTitle action={<span className="text-xs font-black text-ink-faint">约 80%</span>}>
          第一部分 微积分 · {calc.length} 章
        </SectionTitle>
        <div className="space-y-2">{calc.map(renderChapter)}</div>
      </section>

      {/* 线性代数 */}
      <section className="space-y-2">
        <SectionTitle
          action={
            <button
              onClick={() => setLinearOpen((v) => !v)}
              className="text-xs font-black text-brand-600"
            >
              {linearOpen ? '收起' : '展开'}
            </button>
          }
        >
          第二部分 线性代数 · {linear.length} 章 · 约 20%
        </SectionTitle>
        {linearOpen && <div className="space-y-2">{linear.map(renderChapter)}</div>}
      </section>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-ink-faint">
        题库共 {MATH_QUESTIONS.length} 题 · 章节与题型严格对齐省教育厅官方考纲
      </p>
    </div>
  );
}
