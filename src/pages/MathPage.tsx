import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  Brain,
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
import { Card, Chip, SectionTitle } from '../components/ui';
import { ChapterCard, DrillButton, SubjectHero } from '../components/SubjectKit';
import { MATH_CHAPTERS, MATH_QUESTIONS, MATH_KINDS, chapterCount } from '../data/math';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
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
  const progress = useProfileStore((s) => s.progress);
  const subj = useSubjectStore();
  const aiExplain = useSettingsStore((s) => s.aiExplain);
  const [linearOpen, setLinearOpen] = useState(true);

  const counts = useMemo(() => chapterCount(), []);

  const calc = MATH_CHAPTERS.filter((c) => !c.linear);
  const linear = MATH_CHAPTERS.filter((c) => c.linear);

  const overall = subjectStats('math', subj);
  const totalStars = MATH_CHAPTERS.reduce(
    (n, c) => n + (progress[`math-${c.key}`]?.stars ?? subj.stars[`math-${c.key}`] ?? 0),
    0,
  );
  const maxStars = MATH_CHAPTERS.length * 3;

  const startDrill = (chapter?: MathChapter) => {
    nav(chapter ? `/math/play/chapter/${chapter}` : '/math/play/mix');
  };

  const renderChapter = (c: (typeof MATH_CHAPTERS)[number]) => {
    const Icon = CHAPTER_ICON[c.key];
    const key = `math-${c.key}`;
    const stars = progress[key]?.stars ?? subj.stars[key] ?? 0;
    const st = subj.chapterStats[key];
    const accuracy =
      st && st.answered > 0 ? Math.round((st.correct / st.answered) * 100) : null;
    return (
      <ChapterCard
        key={c.key}
        name={c.name}
        hint={c.hint}
        count={counts[c.key] ?? 0}
        stars={stars}
        maxStars={3}
        accuracy={accuracy}
        badge={c.linear ? '线代' : undefined}
        icon={<Icon size={17} strokeWidth={2.6} />}
        onClick={() => startDrill(c.key)}
      />
    );
  };

  return (
    <div className="space-y-6 pt-1">
      <SubjectHero
        tag="江苏专转本 · 高等数学"
        tagIcon={<Sigma size={13} strokeWidth={3} />}
        title="微积分 80% + 线代 20%"
        desc="满分 150 / 120 分钟。计算题占 43%，是拉开差距的地方；先啃极限与微分，再攻积分。"
        bg="bg-gradient-to-br from-brand-500 via-brand-600 to-grape-600"
        deco={<Sigma className="h-28 w-28" strokeWidth={1.2} />}
        stats={[
          { label: '累计答题', value: overall.answered },
          { label: '正确率', value: overall.answered ? `${overall.accuracy}%` : '—' },
          { label: '星数', value: `${totalStars}/${maxStars}` },
        ]}
      />

      {/* 卷面结构提示 */}
      <Card className="border-l-4 border-sun-500">
        <div className="flex items-start gap-3">
          <Brain size={20} className="mt-0.5 shrink-0 text-sun-600" strokeWidth={2.6} />
          <div className="text-xs leading-relaxed text-ink-soft">
            <p className="mb-1.5 text-sm font-black text-ink">卷面长什么样？</p>
            <div className="space-y-1">
              {MATH_KINDS.map((k) => (
                <div key={k.key} className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{k.name}</span>
                  <span className="text-ink-faint">{k.hint}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 border-t border-ink/8 pt-2 text-ink-faint">
              难度结构：较易 30% / 中等 50% / 较难 20%。先把较易、中等拿到手，就有 120 分。
            </p>
          </div>
        </div>
      </Card>

      {/* 刷题入口 */}
      <section className="space-y-2">
        <SectionTitle
          action={
            aiExplain ? (
              <Chip tone="gray" className="bg-grape-100 text-grape-700">
                AI 解析已开
              </Chip>
            ) : null
          }
        >
          开始刷题
        </SectionTitle>
        <DrillButton
          icon={<Dices size={20} strokeWidth={2.6} />}
          title="整套模拟卷"
          desc="按真题题型配比出题：单选 + 填空 + 计算 + 证明 + 综合"
          onClick={() => startDrill()}
        />
        <DrillButton
          icon={<Upload size={20} strokeWidth={2.6} />}
          title="上传试卷，AI 解析"
          desc="传 PDF 或拍照，AI 拆出题目、核心公式与解题技巧，再选顺序答题或创新练习"
          onClick={() => nav('/paper/math')}
          tone="sun"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => nav('/math/play/kind/choice')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border-2 border-ink/8 bg-white p-3.5 text-left active:border-brand-300"
          >
            <Target size={18} className="text-brand-500" strokeWidth={2.6} />
            <span className="text-sm font-black text-ink">只练选择填空</span>
            <span className="text-[11px] leading-relaxed text-ink-faint">8×4 + 6×4 = 56 分</span>
          </button>
          <button
            onClick={() => nav('/math/play/kind/calc')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border-2 border-ink/8 bg-white p-3.5 text-left active:border-brand-300"
          >
            <Sigma size={18} className="text-grape-500" strokeWidth={2.6} />
            <span className="text-sm font-black text-ink">只练计算证明</span>
            <span className="text-[11px] leading-relaxed text-ink-faint">8×8 + 1×10 = 74 分</span>
          </button>
        </div>

        <button
          onClick={() => nav('/formulas')}
          className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-left shadow-pop-sm active:bg-ink/3"
        >
          <BookMarked size={17} className="shrink-0 text-grape-500" strokeWidth={2.6} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black text-ink">公式本 · 技巧本</span>
            <span className="mt-0.5 block text-[11px] text-ink-faint">
              做题与解析中收集的公式技巧，按考纲顺序排好
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
