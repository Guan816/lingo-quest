import { useState } from 'react';
import {
  Award,
  BookMarked,
  Bot,
  ChevronRight,
  ClipboardList,
  Flame,
  GraduationCap,
  LogIn,
  LogOut,
  RotateCcw,
  Sigma,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  UserRound,
} from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ACHIEVEMENTS } from '../data/achievements';
import { levelInfo } from '../lib/gamification';
import { streakOf } from '../lib/utils';
import { useProfileStore } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useFormulaBookStore } from '../store/useFormulaBookStore';
import { useCet4Store, pendingWrongCount } from '../store/useCet4Store';
import { useSubjectStore } from '../store/useSubjectStore';
import { useAuthStore } from '../lib/auth';
import { MATH_TOTAL } from '../data/math';
import { CS_TOTAL } from '../data/cs';
import { ProgressBar, SectionTitle } from '../components/ui';
import type { ReactNode } from 'react';

/** 底部保留的通用成就（口语类、英语专属的徽章不再展示） */
const KEEP_ACHIEVEMENTS = new Set([
  'a-first-word',
  'a-combo-10',
  'a-perfect-1',
  'a-perfect-20',
  'a-streak-3',
  'a-streak-7',
  'a-xp-500',
  'a-xp-2000',
  'a-vocab-40',
  'a-quiz-50',
  'a-quiz-200',
  'a-quiz-500',
  'a-correct-100',
  'a-quiz-streak-3',
  'a-quiz-streak-7',
]);

export default function Stats() {
  const nav = useNavigate();
  const stats = useProfileStore((s) => s.stats);
  const achievements = useProfileStore((s) => s.achievements);
  const resetProfile = useProfileStore((s) => s.resetProfile);
  const aiExplain = useSettingsStore((s) => s.aiExplain);
  const setSetting = useSettingsStore((s) => s.set);
  const formulaTotal = useFormulaBookStore((s) => s.entries.length);
  const cet4 = useCet4Store();
  const subj = useSubjectStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [confirmReset, setConfirmReset] = useState(false);

  const info = levelInfo(stats.totalXp);
  const streak = streakOf(stats.practiceDays);

  /** 三科合计 */
  const answered = subj.totals.math.answered + subj.totals.cs.answered + cet4.answered;
  const correct = subj.totals.math.correct + subj.totals.cs.correct + cet4.correct;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const wrongTotal = subj.wrong.length + pendingWrongCount(cet4.wrong);

  /** 掌握的知识点：练过且有正确率的章节数 + 四级练过的题型数 */
  const masteredChapters =
    Object.values(subj.chapterStats).filter((s) => s.answered > 0 && s.correct / s.answered >= 0.8)
      .length;
  const masteredKinds = Object.keys(cet4.bestStars).length;
  const mastered = masteredChapters + masteredKinds;

  /** 模拟次数：数学 + 计算机整卷次数 + 四级练习次数 */
  const mockCount = (subj.totals.math.answered > 0 ? 1 : 0) + cet4.sessions;

  const keptAchievements = ACHIEVEMENTS.filter((a) => KEEP_ACHIEVEMENTS.has(a.id));

  return (
    <div className="space-y-5 pt-1">
      {/* 顶部用户等级卡 */}
      <section className="rounded-[28px] bg-gradient-to-br from-brand-500 to-grape-600 p-5 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white/20">
            <span className="text-[10px] font-black leading-none opacity-80">LV</span>
            <span className="text-3xl font-black leading-none">{info.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{user?.display_name || info.title}</p>
            <p className="truncate text-xs text-white/85">
              {user?.email ? user.email : `累计 ${stats.totalXp} XP`}
            </p>
            <div className="mt-2">
              <ProgressBar
                value={info.ratio}
                barClass="bg-white"
                height="h-2"
                className="bg-white/25"
              />
              <p className="mt-1 text-[11px] text-white/80">
                {info.current} / {info.need} 升到 Lv.{info.level + 1}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {user ? (
            <button
              onClick={logout}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/20 py-2.5 text-xs font-black active:bg-white/30"
            >
              <LogOut size={14} strokeWidth={3} /> 退出登录
            </button>
          ) : (
            <button
              onClick={() => nav('/login')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white py-2.5 text-xs font-black text-brand-600 active:opacity-90"
            >
              <LogIn size={14} strokeWidth={3} /> 登录 / 注册
            </button>
          )}
        </div>
      </section>

      {/* 练习数据总览 */}
      <section>
        <SectionTitle>练习数据总览</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            icon={<ClipboardList size={16} strokeWidth={3} />}
            value={answered}
            label="总做题数"
            tone="text-brand-600"
          />
          <Metric
            icon={<TrendingUp size={16} strokeWidth={3} />}
            value={answered ? `${accuracy}%` : '—'}
            label="总正确率"
            tone="text-mint-600"
          />
          <Metric
            icon={<Flame size={16} strokeWidth={3} />}
            value={streak}
            label="连续打卡"
            tone="text-coral-500"
          />
          <Metric
            icon={<Target size={16} strokeWidth={3} />}
            value={wrongTotal}
            label="错题总数"
            tone="text-sun-600"
          />
          <Metric
            icon={<Award size={16} strokeWidth={3} />}
            value={mastered}
            label="掌握知识点"
            tone="text-grape-500"
          />
          <Metric
            icon={<Trophy size={16} strokeWidth={3} />}
            value={mockCount}
            label="模拟次数"
            tone="text-brand-600"
          />
        </div>
      </section>

      {/* 三科进度 */}
      <section>
        <SectionTitle>各科进度</SectionTitle>
        <div className="space-y-2">
          <SubjectRow
            icon={<Sigma size={17} strokeWidth={2.6} />}
            tone="from-brand-500 to-grape-600"
            name="高等数学"
            answered={subj.totals.math.answered}
            total={MATH_TOTAL}
            accuracy={
              subj.totals.math.answered
                ? Math.round((subj.totals.math.correct / subj.totals.math.answered) * 100)
                : null
            }
            onClick={() => nav('/stats/math')}
          />
          <SubjectRow
            icon={<Target size={17} strokeWidth={2.6} />}
            tone="from-mint-500 to-mint-600"
            name="计算机基础"
            answered={subj.totals.cs.answered}
            total={CS_TOTAL}
            accuracy={
              subj.totals.cs.answered
                ? Math.round((subj.totals.cs.correct / subj.totals.cs.answered) * 100)
                : null
            }
            onClick={() => nav('/stats/cs')}
          />
          <SubjectRow
            icon={<GraduationCap size={17} strokeWidth={2.6} />}
            tone="from-brand-400 to-brand-600"
            name="英语（四级）"
            answered={cet4.answered}
            total={0}
            accuracy={
              cet4.answered ? Math.round((cet4.correct / cet4.answered) * 100) : null
            }
            onClick={() => nav('/cet4')}
          />
        </div>
      </section>

      {/* AI 讲解开关：没有任何接口配置入口 */}
      <section>
        <SectionTitle action={<span className="text-xs font-black text-ink-faint">数学 / 计算机</span>}>
          AI 解析
        </SectionTitle>
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-grape-500 to-brand-500 text-white">
              <Bot size={18} strokeWidth={2.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">刷题时显示 AI 讲解</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                开启后答题页会出现「让 AI 讲讲这道题」。题库自带分步解析，这里是可选增强。
              </p>
            </div>
            <button
              role="switch"
              aria-checked={aiExplain}
              aria-label="刷题时显示 AI 讲解"
              onClick={() => setSetting('aiExplain', !aiExplain)}
              className={clsx(
                'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors',
                aiExplain ? 'bg-mint-500' : 'bg-ink/15',
              )}
            >
              <span
                className={clsx(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                  aiExplain ? 'left-6' : 'left-1',
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 学习工具 */}
      <section>
        <SectionTitle>学习工具</SectionTitle>
        <div className="space-y-2">
          <button
            onClick={() => nav('/paper/math')}
            className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-left shadow-pop-sm active:bg-ink/3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-grape-500 to-brand-500 text-white">
              <Upload size={17} strokeWidth={2.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-black text-ink">上传试卷 · AI 解析</span>
              <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                传 PDF 或拍照，拆出题目、公式与技巧
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
          </button>

          <button
            onClick={() => nav('/formulas')}
            className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-left shadow-pop-sm active:bg-ink/3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sun-500 to-coral-500 text-white">
              <BookMarked size={17} strokeWidth={2.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[13px] font-black text-ink">公式本 · 技巧本</span>
                {formulaTotal > 0 && (
                  <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-black text-brand-700">
                    {formulaTotal}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                自动去重，按考纲顺序排列
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
          </button>

          <button
            onClick={() => nav('/wrong')}
            className="flex w-full items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-left shadow-pop-sm active:bg-ink/3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white">
              <RotateCcw size={17} strokeWidth={2.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[13px] font-black text-ink">错题本 · 可重做</span>
                {wrongTotal > 0 && (
                  <span className="rounded-full bg-coral-100 px-1.5 py-0.5 text-[10px] font-black text-coral-700">
                    {wrongTotal}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                答错自动收录，重做答对就移出
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
          </button>
        </div>
      </section>

      {/* 通用成就 */}
      <section>
        <SectionTitle
          action={
            <span className="text-xs font-black text-ink-faint">
              {keptAchievements.filter((a) => achievements.includes(a.id)).length}/
              {keptAchievements.length}
            </span>
          }
        >
          成就徽章
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {keptAchievements.map((a) => {
            const got = achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={clsx('card flex items-center gap-3 p-3', got ? '' : 'opacity-45 grayscale')}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink/5 text-xl">
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink">{a.name}</p>
                  <p className="truncate text-[11px] text-ink-faint">{a.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 危险区 */}
      <section className="pb-4">
        {confirmReset ? (
          <div className="card space-y-3 p-4">
            <p className="text-sm font-black text-coral-600">确定清空全部进度？</p>
            <p className="text-xs text-ink-soft">经验、星星、成就、打卡记录都会消失，且无法恢复。</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-2xl border-2 border-ink/10 py-2.5 text-sm font-black text-ink-soft"
              >
                取消
              </button>
              <button
                onClick={() => {
                  resetProfile();
                  setConfirmReset(false);
                }}
                className="flex-1 rounded-2xl bg-coral-500 py-2.5 text-sm font-black text-white"
              >
                确认清空
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-coral-600 shadow-pop-sm btn-pop"
          >
            <UserRound size={15} strokeWidth={2.6} />
            清空练习数据
          </button>
        )}
      </section>
    </div>
  );
}

function Metric({
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
    <div className="card flex items-center gap-3 p-3.5">
      <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink/5', tone)}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-black text-ink">{value}</p>
        <p className="truncate text-[11px] font-bold text-ink-faint">{label}</p>
      </div>
    </div>
  );
}

/** 单个科目的进度行 */
function SubjectRow({
  icon,
  tone,
  name,
  answered,
  total,
  accuracy,
  onClick,
}: {
  icon: ReactNode;
  tone: string;
  name: string;
  answered: number;
  total: number;
  accuracy: number | null;
  onClick: () => void;
}) {
  const ratio = total > 0 ? Math.min(1, answered / total) : 0;
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
        <span className="flex items-baseline gap-2">
          <span className="text-[13px] font-black text-ink">{name}</span>
          <span className="ml-auto shrink-0 text-[11px] font-bold text-ink-faint">
            {total > 0 ? `${answered}/${total}` : `${answered} 题`}
          </span>
          {accuracy !== null && (
            <span className="shrink-0 text-[11px] font-black text-mint-600">{accuracy}%</span>
          )}
        </span>
        {total > 0 && (
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/8">
            <span
              className="block h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${ratio * 100}%` }}
            />
          </span>
        )}
      </span>
      <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
    </button>
  );
}
