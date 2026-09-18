import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Blocks,
  BookMarked,
  Brain,
  ChevronRight,
  Cloud,
  Cpu,
  Database,
  Dices,
  Globe,
  Layers,
  Link2,
  MonitorSmartphone,
  Network,
  Smartphone,
  Target,
  Upload,
} from 'lucide-react';
import { SectionTitle } from '../components/ui';
import {
  ChapterCard,
  DrillButton,
  MiniEntry,
  StructureCard,
  SubjectHero,
} from '../components/SubjectKit';
import {
  CS_CHAPTERS,
  CS_COURSES,
  CS_KINDS,
  CS_QUESTIONS,
  csChapterCount,
} from '../data/cs';
import { subjectStats, useSubjectStore } from '../store/useSubjectStore';
import type { CsChapter, CsCourse } from '../types';

const CHAPTER_ICON: Record<CsChapter, typeof Cpu> = {
  hardware: Cpu,
  software: Layers,
  network: Network,
  media: MonitorSmartphone,
  infosys: Database,
  iot: Link2,
  mobile: Smartphone,
  cloud: Cloud,
  bigdata: Blocks,
  ai: Brain,
  blockchain: Globe,
};

/** 章节在卷面中的分值权重（3 星制，与数学页口径一致） */
const CHAPTER_WEIGHT: Record<CsChapter, number> = {
  hardware: 3,
  software: 3,
  network: 3,
  media: 2,
  infosys: 3,
  iot: 2,
  mobile: 2,
  cloud: 2,
  bigdata: 2,
  ai: 2,
  blockchain: 1,
};

export default function CsPage() {
  const nav = useNavigate();
  const subj = useSubjectStore();
  const [active, setActive] = useState<CsCourse>('A');

  const counts = useMemo(() => csChapterCount(), []);
  const overall = subjectStats('cs', subj);

  /** 本科目总共做过多少题 */
  const doneTotal = useMemo(
    () => CS_CHAPTERS.reduce((n, c) => n + (subj.chapterStats[`cs-${c.key}`]?.answered ?? 0), 0),
    [subj.chapterStats],
  );

  const course = CS_COURSES.find((c) => c.key === active)!;
  const chapters = CS_CHAPTERS.filter((c) => c.course === active);

  const startDrill = (chapter?: CsChapter) => {
    nav(chapter ? `/cs/play/chapter/${chapter}` : `/cs/play/course/${active}`);
  };

  return (
    <div className="space-y-5 pt-1">
      <SubjectHero
        tag="江苏专转本 · 计算机基础理论"
        tagIcon={<Cpu size={13} strokeWidth={3} />}
        title="课程 A 60% + 课程 B 40%"
        desc="理论满分 150 / 90 分钟。单选 50 题占 100 分，是绝对主力。"
        bg="bg-gradient-to-br from-mint-500 via-mint-600 to-brand-600"
        deco={<Cpu className="h-28 w-28" strokeWidth={1.2} />}
        stats={[
          { label: '累计答题', value: overall.answered },
          { label: '正确率', value: overall.answered ? `${overall.accuracy}%` : '—' },
          { label: '已做 / 总题数', value: `${doneTotal}/${CS_QUESTIONS.length}` },
        ]}
      />

      {/* 试卷结构 & 分值 */}
      <StructureCard
        icon={<Target size={20} strokeWidth={2.6} />}
        accent="border-mint-500"
        iconClass="text-mint-600"
        rows={CS_KINDS.map((k) => ({
          name: k.name,
          count: `${k.count} 题 × ${k.perScore} 分`,
          score: `${k.perScore * k.count} 分`,
        }))}
        tip="单选 50 题占 100 分、占到卷面 2/3。专业综合 230 分 = 理论 150 + 操作技能 80，本模块只覆盖理论。"
      />

      {/* 课程切换 */}
      <section className="space-y-3">
        <SectionTitle>选择课程</SectionTitle>

        <div className="flex gap-2">
          {CS_COURSES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`flex-1 rounded-2xl border-2 p-3 text-left transition-colors ${
                active === c.key ? 'border-mint-500 bg-mint-50' : 'border-ink/8 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black ${active === c.key ? 'text-mint-700' : 'text-ink'}`}
                >
                  {c.short}
                </span>
                <span className="text-[10px] font-black text-ink-faint">{c.percent}</span>
              </div>
              <p className="mt-0.5 text-[13px] font-black text-ink">{c.name}</p>
              <p className="text-[10px] text-ink-faint">{c.score} 分</p>
            </button>
          ))}
        </div>

        <p className="rounded-2xl bg-ink/3 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-soft">
          {course.hint}
        </p>
      </section>

      {/* 刷题入口 */}
      <section className="space-y-2">
        <SectionTitle>开始刷题</SectionTitle>
        <DrillButton
          icon={<Dices size={20} strokeWidth={2.6} />}
          title={`${course.short} 整套练习`}
          desc="按真题题型配比出题，四种题型混排"
          onClick={() => startDrill()}
          tone="mint"
        />
        <DrillButton
          icon={<Upload size={20} strokeWidth={2.6} />}
          title="上传试卷，AI 解析"
          desc="传 PDF 或拍照，自动拆题并提取知识点"
          onClick={() => nav('/paper/cs')}
          tone="sun"
        />
        <div className="grid grid-cols-2 gap-2">
          <MiniEntry
            icon={<Target size={18} className="text-mint-500" strokeWidth={2.6} />}
            title="只练单选"
            desc="50 题 × 2 分 = 100 分"
            onClick={() => nav('/cs/play/kind/single')}
          />
          <MiniEntry
            icon={<Layers size={18} className="text-grape-500" strokeWidth={2.6} />}
            title="判断 / 多选 / 填空"
            desc="合计 50 分，易失分"
            onClick={() => nav('/cs/play/kind/memory')}
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

      {/* 章节列表 */}
      <section className="space-y-2">
        <SectionTitle
          action={<span className="text-xs font-black text-ink-faint">{chapters.length} 章</span>}
        >
          {course.name} · 章节
        </SectionTitle>
        <div className="space-y-2">
          {chapters.map((c) => {
            const Icon = CHAPTER_ICON[c.key];
            const key = `cs-${c.key}`;
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
                stars={CHAPTER_WEIGHT[c.key]}
                maxStars={3}
                accuracy={accuracy}
                icon={<Icon size={17} strokeWidth={2.6} />}
                onClick={() => startDrill(c.key)}
              />
            );
          })}
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-ink-faint">
        题库共 {CS_QUESTIONS.length} 题，按官方考纲原创命制，结构对齐真题
      </p>
    </div>
  );
}
