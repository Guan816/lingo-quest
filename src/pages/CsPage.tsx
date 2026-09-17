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
import { Card, Chip, SectionTitle } from '../components/ui';
import { ChapterCard, DrillButton, SubjectHero } from '../components/SubjectKit';
import {
  CS_CHAPTERS,
  CS_COURSES,
  CS_KINDS,
  CS_QUESTIONS,
  csChapterCount,
  csQuestionsOfCourse,
} from '../data/cs';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
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

export default function CsPage() {
  const nav = useNavigate();
  const progress = useProfileStore((s) => s.progress);
  const subj = useSubjectStore();
  const aiExplain = useSettingsStore((s) => s.aiExplain);
  const [active, setActive] = useState<CsCourse>('A');

  const counts = useMemo(() => csChapterCount(), []);
  const overall = subjectStats('cs', subj);
  const totalStars = CS_CHAPTERS.reduce(
    (n, c) => n + (progress[`cs-${c.key}`]?.stars ?? subj.stars[`cs-${c.key}`] ?? 0),
    0,
  );
  const maxStars = CS_CHAPTERS.length * 3;
  const course = CS_COURSES.find((c) => c.key === active)!;
  const chapters = CS_CHAPTERS.filter((c) => c.course === active);
  const courseQuestions = csQuestionsOfCourse(active);

  const startDrill = (chapter?: CsChapter) => {
    nav(chapter ? `/cs/play/chapter/${chapter}` : `/cs/play/course/${active}`);
  };

  return (
    <div className="space-y-6 pt-1">
      <SubjectHero
        tag="江苏专转本 · 计算机基础理论"
        tagIcon={<Cpu size={13} strokeWidth={3} />}
        title="课程 A 60% + 课程 B 40%"
        desc="理论满分 150。单选 50 题占 100 分是绝对主力，进制转换、存储量、IP 地址这几类计算题必须练熟。"
        bg="bg-gradient-to-br from-mint-500 via-mint-600 to-brand-600"
        deco={<Cpu className="h-28 w-28" strokeWidth={1.2} />}
        stats={[
          { label: '累计答题', value: overall.answered },
          { label: '正确率', value: overall.answered ? `${overall.accuracy}%` : '—' },
          { label: '星数', value: `${totalStars}/${maxStars}` },
        ]}
      />

      {/* 题型分布 */}
      <Card className="border-l-4 border-brand-500">
        <div className="flex items-start gap-3">
          <Target size={20} className="mt-0.5 shrink-0 text-brand-600" strokeWidth={2.6} />
          <div className="w-full text-xs leading-relaxed text-ink-soft">
            <p className="mb-1.5 text-sm font-black text-ink">卷面题型分布</p>
            <div className="space-y-1">
              {CS_KINDS.map((k) => (
                <div key={k.key} className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{k.name}</span>
                  <span className="text-right text-ink-faint">{k.hint}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 border-t border-ink/8 pt-2 text-ink-faint">
              专业综合 230 分 = 理论 150（A 90 + B 60）+ 操作技能 80。技能部分含 C 语言、MySQL、UML、局域网搭建等，本模块只覆盖理论。
            </p>
          </div>
        </div>
      </Card>

      {/* 课程切换 */}
      <section className="space-y-3">
        <SectionTitle
          action={
            aiExplain ? (
              <Chip tone="gray" className="bg-grape-100 text-grape-700">
                AI 解析已开
              </Chip>
            ) : null
          }
        >
          选择课程
        </SectionTitle>

        <div className="flex gap-2">
          {CS_COURSES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`flex-1 rounded-2xl border-2 p-3 text-left transition-colors ${
                active === c.key
                  ? 'border-mint-500 bg-mint-50'
                  : 'border-ink/8 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black ${active === c.key ? 'text-mint-700' : 'text-ink'}`}>
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
          desc={`按真题题型配比出题：判断 + 单选 + 多选 + 填空（共 ${courseQuestions.length} 题可选）`}
          onClick={() => startDrill()}
          tone="mint"
        />
        <DrillButton
          icon={<Upload size={20} strokeWidth={2.6} />}
          title="上传试卷，AI 解析"
          desc="传 PDF 或拍照，AI 拆出题目、核心公式与解题技巧，再选顺序答题或创新练习"
          onClick={() => nav('/paper/cs')}
          tone="sun"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => nav('/cs/play/kind/single')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border-2 border-ink/8 bg-white p-3.5 text-left active:border-mint-300"
          >
            <Target size={18} className="text-mint-500" strokeWidth={2.6} />
            <span className="text-sm font-black text-ink">只练单选</span>
            <span className="text-[11px] leading-relaxed text-ink-faint">50 题 × 2 分 = 100 分</span>
          </button>
          <button
            onClick={() => nav('/cs/play/kind/memory')}
            className="flex flex-col items-start gap-1.5 rounded-2xl border-2 border-ink/8 bg-white p-3.5 text-left active:border-mint-300"
          >
            <Layers size={18} className="text-grape-500" strokeWidth={2.6} />
            <span className="text-sm font-black text-ink">判断 / 多选 / 填空</span>
            <span className="text-[11px] leading-relaxed text-ink-faint">合计 50 分，易失分</span>
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

      {/* 章节列表 */}
      <section className="space-y-2">
        <SectionTitle action={<span className="text-xs font-black text-ink-faint">{chapters.length} 章</span>}>
          {course.name} · 章节
        </SectionTitle>
        <div className="space-y-2">
          {chapters.map((c) => {
            const Icon = CHAPTER_ICON[c.key];
            const key = `cs-${c.key}`;
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
