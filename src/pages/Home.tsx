import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  ChevronRight,
  ClipboardList,
  Flame,
  GraduationCap,
  Sigma,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { SectionTitle } from '../components/ui';
import { useProfileStore } from '../store/useProfileStore';
import { useCet4Store, pendingWrongCount } from '../store/useCet4Store';
import { useFormulaBookStore } from '../store/useFormulaBookStore';
import { useSubjectStore } from '../store/useSubjectStore';
import { MATH_TOTAL } from '../data/math';
import { CS_TOTAL } from '../data/cs';
import { CET4_QUESTIONS } from '../data/cet4';
import { streakOf } from '../lib/utils';

/** 三个科目的入口卡（信息密度一致，视觉只用主色调区分） */
const SUBJECTS = [
  {
    to: '/math',
    name: '高等数学',
    desc: '微积分 80% + 线代 20%',
    total: MATH_TOTAL,
    icon: Sigma,
    /** 数学用蓝紫 */
    grad: 'from-brand-500 to-grape-600',
    soft: 'bg-brand-50',
    ink: 'text-brand-600',
  },
  {
    to: '/cs',
    name: '计算机基础',
    desc: '课程 A 60% + 课程 B 40%',
    total: CS_TOTAL,
    icon: Target,
    /** 计算机用绿 */
    grad: 'from-mint-500 to-mint-600',
    soft: 'bg-mint-50',
    ink: 'text-mint-600',
  },
  {
    to: '/cet4',
    name: '英语（四级）',
    desc: '听力 35% + 阅读 35%',
    total: CET4_QUESTIONS.length,
    icon: GraduationCap,
    /** 英语用蓝 */
    grad: 'from-brand-400 to-brand-600',
    soft: 'bg-brand-50',
    ink: 'text-brand-600',
  },
] as const;

export default function Home() {
  const nav = useNavigate();

  const stats = useProfileStore((s) => s.stats);
  const cet4 = useCet4Store();
  const subj = useSubjectStore();
  const formulaTotal = useFormulaBookStore((s) => s.entries.length);

  const streak = streakOf(stats.practiceDays);

  /** 三科合计的做题数与正确率 —— 首页只报一个总盘子 */
  const answered = subj.totals.math.answered + subj.totals.cs.answered + cet4.answered;
  const correct = subj.totals.math.correct + subj.totals.cs.correct + cet4.correct;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const wrongTotal = subj.wrong.length + pendingWrongCount(cet4.wrong);

  /**
   * 「继续练习」推荐哪一科。
   *
   * 手机用户点开 App 十有八九是想接着刷，而不是从头挑科目。
   * 规则：挑**做过题但还没做满**的那一科；都没进度就默认高等数学
   * （它是考纲第一科，分值也最重）。
   */
  const resume = (() => {
    const stats = [
      { ...SUBJECTS[0], done: subj.totals.math.answered },
      { ...SUBJECTS[1], done: subj.totals.cs.answered },
      { ...SUBJECTS[2], done: cet4.answered },
    ];
    const started = stats.filter((s) => s.done > 0 && s.done < s.total);
    if (started.length) {
      // 做题最多的那科最可能是「正在刷」的
      return started.sort((a, b) => b.done - a.done)[0];
    }
    return stats[0];
  })();

  return (
    <div className="space-y-5 pt-1">
      {/* 顶部不再重复画等级栏 —— 全局顶栏（TopBar）已经有了 LV + 进度 + 设置，
          在首页再画一遍会出现「两个 LV、两个设置按钮」，手机小屏白占一整行。
          这里改成「继续上次练习」的直达入口，一键回到未完的题。 */}
      <button
        onClick={() => nav(resume.to)}
        className="btn-pop flex w-full items-center gap-3.5 rounded-3xl bg-gradient-to-br from-brand-500 to-grape-600 p-4 text-left text-white shadow-card"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">
          <resume.icon size={23} strokeWidth={2.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black">继续练习 · {resume.name}</span>
          <span className="mt-0.5 block text-[11px] font-bold text-white/80">
            {resume.done > 0
              ? `已做 ${resume.done} / ${resume.total} 题，接着往下刷`
              : `还没开始，${resume.total} 题等着你`}
          </span>
        </span>
        <ChevronRight size={19} className="shrink-0 text-white/85" strokeWidth={2.8} />
      </button>

      {/* 今日学习概览 */}
      <section>
        <SectionTitle>今日学习概览</SectionTitle>
        <div className="card grid grid-cols-2 gap-2 p-3">
          <Overview
            icon={<ClipboardList size={15} strokeWidth={3} />}
            value={answered}
            label="做题数"
            tone="text-brand-600"
          />
          <Overview
            icon={<TrendingUp size={15} strokeWidth={3} />}
            value={answered ? `${accuracy}%` : '—'}
            label="总正确率"
            tone="text-mint-600"
          />
          <Overview
            icon={<Flame size={15} strokeWidth={3} />}
            value={streak}
            label="连续打卡"
            tone="text-coral-500"
          />
          <Overview
            icon={<Target size={15} strokeWidth={3} />}
            value={wrongTotal}
            label="错题数"
            tone="text-sun-600"
          />
        </div>
      </section>

      {/* 三科入口 */}
      <section className="space-y-2.5">
        <SectionTitle>开始刷题</SectionTitle>
        {SUBJECTS.map((s) => (
          <button
            key={s.to}
            onClick={() => nav(s.to)}
            className="btn-pop flex w-full items-center gap-3.5 rounded-3xl bg-white p-4 text-left shadow-card"
          >
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${s.grad} text-white`}
            >
              <s.icon size={22} strokeWidth={2.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-ink">{s.name}</span>
              <span className="mt-0.5 block truncate text-[11px] text-ink-faint">{s.desc}</span>
              <span className={`mt-1 inline-block rounded-full ${s.soft} px-2 py-0.5 text-[10px] font-black ${s.ink}`}>
                题库 {s.total} 题
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-black text-brand-600">
              进入
              <ChevronRight size={14} strokeWidth={3} />
            </span>
          </button>
        ))}
      </section>

      {/* 快捷工具 */}
      <section className="space-y-2.5">
        <SectionTitle>快捷工具</SectionTitle>

        <ToolRow
          icon={<ClipboardList size={18} strokeWidth={2.6} />}
          tone="from-coral-400 to-coral-600"
          title="错题本"
          desc={
            wrongTotal > 0 ? `${wrongTotal} 道待订正，按科目分类` : '答错的题自动收进来'
          }
          badge={wrongTotal > 0 ? wrongTotal : undefined}
          onClick={() => nav('/wrong')}
        />

        <ToolRow
          icon={<Upload size={18} strokeWidth={2.6} />}
          tone="from-grape-500 to-brand-500"
          title="上传试卷 · AI 解析"
          desc="传 PDF 或拍照，拆出题目、公式与技巧"
          onClick={() => nav('/paper/math')}
        />

        <ToolRow
          icon={<BookMarked size={18} strokeWidth={2.6} />}
          tone="from-sun-500 to-coral-500"
          title="公式本 · 技巧本"
          desc="自动去重，按考纲顺序排好"
          badge={formulaTotal > 0 ? formulaTotal : undefined}
          onClick={() => nav('/formulas')}
        />
      </section>

      <div className="h-2" />
    </div>
  );
}

/** 今日概览里的一个数据格 */
function Overview({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-ink/[0.04] px-3 py-2.5">
      <div className={`flex items-center gap-1.5 ${tone}`}>
        {icon}
        <span className="text-xl font-black leading-none">{value}</span>
      </div>
      <p className="mt-1 text-[11px] font-bold text-ink-faint">{label}</p>
    </div>
  );
}

/** 快捷工具行 */
function ToolRow({
  icon,
  tone,
  title,
  desc,
  badge,
  onClick,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  desc: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-left shadow-pop-sm active:bg-ink/3"
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-black text-ink">{title}</span>
          {badge !== undefined && (
            <span className="rounded-full bg-coral-100 px-1.5 py-0.5 text-[10px] font-black text-coral-600">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-faint">{desc}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
    </button>
  );
}
