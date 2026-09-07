import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { useProfileStore } from '../store/useProfileStore';
import { sfx } from '../lib/sfx';

/** 每次得分/解锁成就时，从顶部滑入一条反馈 */
export function RewardToast() {
  const reward = useProfileStore((s) => s.lastReward);
  const [visible, setVisible] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => {
    if (!reward || reward.id === lastId) return;
    setLastId(reward.id);
    setVisible(true);
    if (reward.achievements.length || reward.leveledUp) sfx.levelUp();
    const t = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(t);
  }, [reward, lastId]);

  if (!reward || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-6">
      <div className="animate-pop-in flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-white shadow-card">
        <TrendingUp size={16} strokeWidth={3} className="text-mint-300" />
        <span className="text-sm font-black">+{reward.xp} XP</span>
        {reward.combo >= 3 && (
          <span className="rounded-full bg-sun-500/90 px-2 py-0.5 text-xs font-black">
            {reward.combo} 连击
          </span>
        )}
      </div>

      {reward.leveledUp && (
        <div className="animate-pop-in rounded-2xl bg-gradient-to-r from-grape-500 to-brand-500 px-5 py-3 text-center text-white shadow-card">
          <p className="text-sm font-black">🎉 升级了！继续冲</p>
        </div>
      )}

      {reward.achievements.map((a) => (
        <div
          key={a.id}
          className="animate-pop-in flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sun-100 text-xl">
            {a.emoji}
          </span>
          <div className="text-left">
            <p className="flex items-center gap-1 text-[11px] font-black text-sun-600">
              <Sparkles size={12} strokeWidth={3} /> 解锁成就
            </p>
            <p className="text-sm font-black text-ink">{a.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
