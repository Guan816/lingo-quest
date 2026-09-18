import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  BookMarked,
  Bot,
  ChevronRight,
  Flame,
  Mic2,
  Settings2,
  Sparkles,
  Sword,
  Timer,
  TrendingUp,
  Upload,
} from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ACHIEVEMENTS } from '../data/achievements';
import { ALL_LEVELS, WORLDS } from '../data/curriculum';
import { levelInfo } from '../lib/gamification';
import { formatMinutes, streakOf, todayKey } from '../lib/utils';
import { useProfileStore } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useFormulaBookStore } from '../store/useFormulaBookStore';
import { Button, ProgressBar, SectionTitle } from '../components/ui';

export default function Stats() {
  const nav = useNavigate();
  const stats = useProfileStore((s) => s.stats);
  const achievements = useProfileStore((s) => s.achievements);
  const progress = useProfileStore((s) => s.progress);
  const resetProfile = useProfileStore((s) => s.resetProfile);
  const ai = useSettingsStore((s) => s.ai);
  const aiExplain = useSettingsStore((s) => s.aiExplain);
  const setSetting = useSettingsStore((s) => s.set);
  const formulaTotal = useFormulaBookStore((s) => s.entries.length);
  const [confirmReset, setConfirmReset] = useState(false);

  const info = levelInfo(stats.totalXp);
  const streak = streakOf(stats.practiceDays);
  const totalStars = Object.values(progress).reduce((a, p) => a + p.stars, 0);
  const cleared = Object.values(progress).filter((p) => p.cleared).length;
  const aiReady = ai.enabled;

  return (
    <div className="space-y-6 pt-1">
      {/* 等级卡 */}
      <section className="rounded-[28px] bg-gradient-to-br from-brand-500 to-grape-600 p-5 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white/20">
            <span className="text-[10px] font-black leading-none opacity-80">LV</span>
            <span className="text-3xl font-black leading-none">{info.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black">{info.title}</p>
            <p className="text-xs text-white/85">累计 {stats.totalXp} XP</p>
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
      </section>

      {/* AI 解析开关 */}
      <section>
        <SectionTitle
          action={<span className="text-xs font-black text-ink-faint">数学 / 计算机</span>}
        >
          AI 解析
        </SectionTitle>
        <div className="card space-y-3 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-grape-500 to-brand-500 text-white">
              <Bot size={18} strokeWidth={2.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">刷题时显示 AI 讲解</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                开启后，数学与计算机的答题页会出现「让 AI 讲讲这道题」按钮。
                题库本身已自带分步解析，这里是可选增强——答错时让 AI 换个角度讲一遍。
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

          {aiExplain && !aiReady && (
            <div className="rounded-2xl bg-sun-50 px-3 py-2.5">
              <p className="text-[11px] font-bold leading-relaxed text-sun-700">
                还没配置 AI 接口，AI 解析暂时用不了。去设置里填一个 OpenAI 兼容的地址和 Key 就能用。
              </p>
            </div>
          )}

          <button
            onClick={() => nav('/settings')}
            className="flex w-full items-center gap-2.5 rounded-2xl bg-ink/4 px-3.5 py-3 text-left active:bg-ink/8"
          >
            <Settings2 size={17} className="shrink-0 text-ink-soft" strokeWidth={2.6} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-black text-ink">AI 接口设置</span>
              <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                {aiReady ? `已配置 · ${ai.model}` : '未配置 · 点这里填写地址与 Key'}
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
          </button>
        </div>
      </section>

      {/* 试卷上传 + 公式本 */}
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
              <span className="mt-0.5 block text-[11px] text-ink-faint">
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
              <span className="mt-0.5 block text-[11px] text-ink-faint">
                自动去重，按考纲顺序排列
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-ink-faint" strokeWidth={2.6} />
          </button>
        </div>
      </section>

      {/* 数据 */}
      <section>
        <SectionTitle>练习数据</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={<Mic2 size={16} strokeWidth={3} />} value={stats.sentencesSpoken} label="开口句数" tone="text-brand-600" />
          <Metric icon={<TrendingUp size={16} strokeWidth={3} />} value={stats.perfectScores} label="90 分以上" tone="text-mint-600" />
          <Metric icon={<Flame size={16} strokeWidth={3} />} value={streak} label="连续天数" tone="text-coral-500" />
          <Metric icon={<Sword size={16} strokeWidth={3} />} value={stats.bossCleared} label="击败 BOSS" tone="text-grape-500" />
          <Metric icon={<Sparkles size={16} strokeWidth={3} />} value={stats.wordsLearned.length} label="掌握词汇" tone="text-sun-600" />
          <Metric icon={<Timer size={16} strokeWidth={3} />} value={formatMinutes(stats.minutesSpoken)} label="开口时长" tone="text-ink" />
        </div>
      </section>

      {/* 闯关进度 */}
      <section>
        <SectionTitle
          action={
            <span className="text-xs font-black text-ink-faint">
              {cleared}/{ALL_LEVELS.length} 关 · {totalStars} 星
            </span>
          }
        >
          闯关进度
        </SectionTitle>
        <div className="card space-y-3 p-4">
          {WORLDS.map((w) => {
            const c = w.levels.filter((l) => progress[l.id]?.cleared).length;
            return (
              <div key={w.id}>
                <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft">
                  <span>
                    {w.emoji} {w.name}
                  </span>
                  <span>
                    {c}/{w.levels.length}
                  </span>
                </div>
                <ProgressBar value={c / w.levels.length} barClass="bg-sun-500" height="h-2" />
              </div>
            );
          })}
        </div>
      </section>

      {/* 打卡 */}
      <section>
        <SectionTitle>最近 14 天</SectionTitle>
        <div className="card p-4">
          <div className="flex justify-between gap-1">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const key = todayKey(d);
              const on = stats.practiceDays.includes(key);
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <span
                    className={clsx(
                      'h-7 w-7 rounded-lg',
                      on ? 'bg-mint-500' : 'bg-ink/8',
                      key === todayKey() && !on && 'ring-2 ring-brand-300',
                    )}
                  />
                  <span className="text-[9px] font-bold text-ink-faint">{d.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 成就 */}
      <section>
        <SectionTitle
          action={
            <span className="text-xs font-black text-ink-faint">
              {achievements.length}/{ACHIEVEMENTS.length}
            </span>
          }
        >
          成就徽章
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const got = achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={clsx(
                  'card flex items-center gap-3 p-3',
                  got ? '' : 'opacity-45 grayscale',
                )}
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
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                取消
              </Button>
              <Button
                variant="coral"
                size="sm"
                onClick={() => {
                  resetProfile();
                  setConfirmReset(false);
                }}
              >
                确认清空
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full rounded-2xl bg-white py-3 text-sm font-black text-coral-600 shadow-pop-sm btn-pop"
          >
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
