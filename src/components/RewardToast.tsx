import { useEffect, useRef, useState } from 'react';
import { Sparkles, TrendingUp, X } from 'lucide-react';
import { useProfileStore } from '../store/useProfileStore';
import { sfx } from '../lib/sfx';

/**
 * 每次得分 / 解锁成就时，从顶部滑入一条反馈。
 *
 * 【为什么加关闭按钮】
 * 原先是 `pointer-events-none` 的纯展示条，2.6 秒后自动隐藏。
 * 问题出在「解锁成就」那种多行卡片：它们在屏幕上方叠成一摞，
 * 遮挡了顶部的返回按钮和题目区域，而用户**点不掉** ——
 * 因为整层是穿透的，点击直接落到底下；就算落到底下也没用。
 * 所以在成就/升级这种「有实质信息要读」的情况下，
 * 必须给一个真正的关闭入口，并且不再自动消失。
 *
 * 现在的规则：
 *   - 只有 XP 数字：轻量提示，2.6 秒自动收，不拦手势（防止打断答题节奏）
 *   - 带成就 / 升级：停留到用户主动关掉，可以点右上角 ×，也可以点整条卡片
 */
export function RewardToast() {
  const reward = useProfileStore((s) => s.lastReward);
  const clearReward = useProfileStore((s) => s.clearReward);
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef<string | null>(null);

  /** 是否是需要用户读完的「重要奖励」 */
  const important = Boolean(reward && (reward.achievements.length > 0 || reward.leveledUp));

  useEffect(() => {
    if (!reward) {
      setVisible(false);
      return;
    }
    // 同一条奖励不重复播（id 由 store 生成，每次结算都是新的）
    if (reward.id === lastIdRef.current) return;
    lastIdRef.current = reward.id;
    setVisible(true);
    if (reward.achievements.length || reward.leveledUp) sfx.levelUp();

    // 重要奖励不自动消失：留着让用户看清楚，点掉为止
    if (reward.achievements.length || reward.leveledUp) return;

    const t = window.setTimeout(() => {
      setVisible(false);
      clearReward();
    }, 2600);
    return () => window.clearTimeout(t);
  }, [reward, clearReward]);

  // 换页 / 卸载时别把状态留着，否则下次进来会「幽灵显示」
  useEffect(() => {
    return () => setVisible(false);
  }, []);

  const dismiss = () => {
    setVisible(false);
    clearReward();
  };

  if (!reward || !visible) return null;

  return (
    <div
      className={`fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-6 ${
        important ? '' : 'pointer-events-none'
      }`}
    >
      {/* XP 数字条：轻量、可穿透（不挡答题），但带成就时也允许点掉 */}
      <button
        type="button"
        onClick={important ? dismiss : undefined}
        className={`animate-pop-in flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-white shadow-card ${
          important ? 'btn-pop' : ''
        }`}
      >
        <TrendingUp size={16} strokeWidth={3} className="text-mint-300" />
        <span className="text-sm font-black">+{reward.xp} XP</span>
        {reward.combo >= 3 && (
          <span className="rounded-full bg-sun-500/90 px-2 py-0.5 text-xs font-black">
            {reward.combo} 连击
          </span>
        )}
      </button>

      {reward.leveledUp && (
        <div className="animate-pop-in relative w-full max-w-xs rounded-2xl bg-gradient-to-r from-grape-500 to-brand-500 px-5 py-3 text-center text-white shadow-card">
          <p className="text-sm font-black">🎉 升级了！继续冲</p>
          <CloseBtn onClick={dismiss} />
        </div>
      )}

      {reward.achievements.map((a) => (
        <div
          key={a.id}
          className="animate-pop-in relative flex w-full max-w-xs items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sun-100 text-xl">
            {a.emoji}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="flex items-center gap-1 text-[11px] font-black text-sun-600">
              <Sparkles size={12} strokeWidth={3} /> 解锁成就
            </p>
            <p className="truncate text-sm font-black text-ink">{a.name}</p>
          </div>
          <CloseBtn onClick={dismiss} />
        </div>
      ))}
    </div>
  );
}

/** 右上角关闭按钮：44px 的可点区域，手指不容易点偏 */
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="关闭奖励提示"
      className="absolute -right-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full bg-ink text-white shadow-pop-sm btn-pop"
    >
      <X size={14} strokeWidth={3.5} />
    </button>
  );
}
