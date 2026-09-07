import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Flame, Headphones, Mic2, Play, Sparkles } from 'lucide-react';
import { Button, Chip, ProgressBar, SectionTitle } from '../components/ui';
import { useProfileStore, useTodayXp } from '../store/useProfileStore';
import { ALL_LEVELS, getLevel } from '../data/curriculum';
import { ACHIEVEMENTS } from '../data/achievements';
import { levelInfo } from '../lib/gamification';
import { streakOf, todayKey } from '../lib/utils';
import { asrSupported } from '../lib/speech';

const QUICK_GAMES = [
  {
    to: '/games/listen',
    name: '听音选词',
    desc: '耳朵先动起来',
    emoji: '🎧',
    tone: 'from-brand-400 to-brand-600',
  },
  {
    to: '/games/build',
    name: '拼句挑战',
    desc: '打乱的词块归位',
    emoji: '🧩',
    tone: 'from-grape-400 to-grape-600',
  },
  {
    to: '/games/shadow',
    name: '影子跟读',
    desc: '一句一句磨发音',
    emoji: '🎤',
    tone: 'from-coral-400 to-coral-600',
  },
  {
    to: '/games/talk',
    name: '自由对话',
    desc: '和 AI 角色闲聊',
    emoji: '💬',
    tone: 'from-mint-400 to-mint-600',
  },
];

export default function Home() {
  const nav = useNavigate();
  const progress = useProfileStore((s) => s.progress);
  const stats = useProfileStore((s) => s.stats);
  const achievements = useProfileStore((s) => s.achievements);
  const dailyGoal = useProfileStore((s) => s.dailyGoal);
  const xp = useProfileStore((s) => s.xp);
  const todaySentences = useProfileStore((s) => s.todaySentences);
  const todayDate = useProfileStore((s) => s.todayDate);
  const todayXp = useTodayXp();

  const nextLevel = ALL_LEVELS.find((l) => !progress[l.id]?.cleared) ?? ALL_LEVELS[0];
  const nextCtx = getLevel(nextLevel.id);
  const info = levelInfo(xp);
  const streak = streakOf(stats.practiceDays);
  const sentencesToday = todayDate === todayKey() ? todaySentences : 0;
  const unlocked = ACHIEVEMENTS.filter((a) => achievements.includes(a.id));

  return (
    <div className="space-y-6 pt-1">
      {/* 主 CTA：永远只有一个最该做的事 */}
      <section
        className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${nextCtx?.world.gradient ?? 'from-brand-400 to-brand-600'} p-5 text-white shadow-card`}
      >
        <div className="relative z-10">
          <Chip tone="gray" className="mb-3 bg-white/25 text-white">
            {nextCtx ? `第 ${nextLevel.order} 关 · ${nextCtx.world.name}` : '继续'}
          </Chip>
          <h1 className="text-balance text-2xl font-black leading-tight">
            {nextLevel.title}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {nextLevel.kind === 'boss' ? 'BOSS 战 · 自由对话 6 轮' : '约 2 分钟 · 开口就能拿经验'}
          </p>
          <Button
            variant="ghost"
            size="md"
            className="mt-4 bg-white text-ink shadow-pop-sm"
            icon={<Play size={18} strokeWidth={3} fill="currentColor" />}
            onClick={() => nav(`/play/${nextLevel.id}`)}
          >
            开始闯关
          </Button>
        </div>
        <Sparkles
          className="absolute -right-4 -top-4 h-28 w-28 text-white/15"
          strokeWidth={1.5}
        />
      </section>

      {/* 今日进度 */}
      <section className="card p-4">
        <SectionTitle
          action={
            <span className="text-xs font-black text-ink-faint">
              Lv.{info.level} · {info.title}
            </span>
          }
        >
          今日进度
        </SectionTitle>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft">
              <span>经验值</span>
              <span>
                {todayXp} / {dailyGoal}
              </span>
            </div>
            <ProgressBar value={todayXp / Math.max(1, dailyGoal)} striped />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat icon={<Mic2 size={15} strokeWidth={3} />} value={sentencesToday} label="今日开口" />
            <Stat
              icon={<Flame size={15} strokeWidth={3} />}
              value={streak}
              label="连续天数"
              tone="text-coral-500"
            />
            <Stat
              icon={<Sparkles size={15} strokeWidth={3} />}
              value={unlocked.length}
              label="成就徽章"
              tone="text-sun-600"
            />
          </div>
        </div>
      </section>

      {/* 快捷玩法 */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => nav('/games')}
              className="flex items-center gap-0.5 text-xs font-black text-brand-600"
            >
              全部玩法 <ChevronRight size={14} strokeWidth={3} />
            </button>
          }
        >
          玩着学
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_GAMES.map((g) => (
            <button
              key={g.to}
              onClick={() => nav(g.to)}
              className="btn-pop overflow-hidden rounded-3xl bg-white text-left shadow-card"
            >
              <div className={`grid h-16 place-items-center bg-gradient-to-br ${g.tone} text-3xl`}>
                {g.emoji}
              </div>
              <div className="p-3">
                <p className="text-sm font-black text-ink">{g.name}</p>
                <p className="text-xs text-ink-faint">{g.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 成就墙 */}
      <section>
        <SectionTitle>成就徽章</SectionTitle>
        <div className="card flex flex-wrap gap-2 p-4">
          {unlocked.length === 0 ? (
            <p className="text-sm text-ink-faint">还没解锁徽章，开口说第一句就有了 🐣</p>
          ) : (
            unlocked.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-2xl bg-ink/5 py-1.5 pl-2 pr-3"
              >
                <span className="text-lg">{a.emoji}</span>
                <span className="text-xs font-black text-ink">{a.name}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {!asrSupported() && (
        <div className="card flex items-start gap-3 border-l-4 border-sun-500 p-4">
          <Headphones size={20} className="mt-0.5 shrink-0 text-sun-600" strokeWidth={2.6} />
          <p className="text-xs leading-relaxed text-ink-soft">
            当前浏览器不支持语音识别，应用会自动切换到
            <b className="text-ink"> 打字模式</b>：你输入自己打算说的句子，照样能打分、拿经验、闯关。
          </p>
        </div>
      )}

      <div className="h-2" />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  tone = 'text-brand-600',
}: {
  icon: ReactNode;
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl bg-ink/[0.04] py-2.5">
      <div className={`flex items-center justify-center gap-1 text-lg font-black ${tone}`}>
        {icon}
        {value}
      </div>
      <p className="mt-0.5 text-[11px] font-bold text-ink-faint">{label}</p>
    </div>
  );
}
