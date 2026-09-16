import { useEffect, useState } from 'react';
import { Crown, Loader2, Trophy } from 'lucide-react';
import { useAuthStore } from '../lib/auth';
import { api } from '../lib/api';
import { TopBar } from '../components/TopBar';

interface Player {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  streak: number;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [me, setMe] = useState<Player | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [lb, mine] = await Promise.all([
          api.leaderboard(100),
          user ? api.leaderboardMe() : Promise.resolve(null),
        ]);
        if (!alive) return;
        setPlayers(lb.players || []);
        if (mine) {
          setMe(mine.me);
          setRank(mine.rank);
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);

  return (
    <>
      <TopBar />
      <div className="mx-auto max-w-lg px-4 pb-10 pt-2">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={22} className="text-sun-500" />
          <h1 className="text-xl font-black text-ink">排行榜</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-ink-faint">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : (
          <>
            {!user && (
              <p className="mb-3 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700">
                登录后即可上榜并查看你的排名
              </p>
            )}

            {me && rank && (
              <div className="mb-4 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-brand-500 to-brand-600 p-4 text-white shadow-pop">
                <Crown size={26} className="text-sun-300" />
                <div className="flex-1">
                  <p className="text-xs font-bold opacity-80">我的排名</p>
                  <p className="text-2xl font-black">第 {rank} 名</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold opacity-80">经验</p>
                  <p className="text-xl font-black">{me.total_xp}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {players.map((p, i) => {
                const isMe = me && p.id === me.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                      isMe ? 'border-brand-400 bg-brand-50' : 'border-ink/5 bg-white'
                    }`}
                  >
                    <div className="w-7 text-center text-lg font-black text-ink-soft">
                      {medal(i)}
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-black text-brand-600">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (p.display_name || '?').slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-ink">
                        {p.display_name}
                        {isMe && <span className="ml-1 text-xs text-brand-500">（你）</span>}
                      </p>
                      <p className="text-xs text-ink-faint">连续 {p.streak} 天</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-ink">{p.total_xp}</p>
                      <p className="text-[10px] text-ink-faint">XP</p>
                    </div>
                  </div>
                );
              })}
              {players.length === 0 && (
                <p className="py-12 text-center text-sm text-ink-faint">还没有人上榜，快来当第一名！</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
