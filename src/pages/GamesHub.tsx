import { useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { SectionTitle } from '../components/ui';

const GAMES = [
  {
    to: '/games/listen',
    emoji: '🎧',
    name: '听音选词',
    desc: '只放英文发音，从 4 个中文里挑对的。练的是耳朵反应速度。',
    tone: 'from-brand-400 to-brand-600',
    tag: '10 题一轮',
  },
  {
    to: '/games/build',
    emoji: '🧩',
    name: '拼句挑战',
    desc: '给你打散的词块和中文意思，在倒计时里把句子拼回原样。',
    tone: 'from-grape-400 to-grape-600',
    tag: '5 题一轮',
  },
  {
    to: '/games/shadow',
    emoji: '🎤',
    name: '影子跟读',
    desc: '先听标准发音再立刻复述，逐词告诉你哪里读漏了。',
    tone: 'from-coral-400 to-coral-600',
    tag: '5 句一轮',
  },
  {
    to: '/games/talk',
    emoji: '💬',
    name: '自由对话',
    desc: '挑一个角色聊到底，接了 AI 就有真人感，没接也能一直聊。',
    tone: 'from-mint-400 to-mint-600',
    tag: '不限时',
  },
];

export default function GamesHub() {
  const nav = useNavigate();
  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center gap-2 px-1">
        <Gamepad2 size={20} strokeWidth={3} className="text-grape-500" />
        <div>
          <h1 className="text-lg font-black text-ink">玩法合集</h1>
          <p className="text-xs text-ink-faint">每个 2 分钟，碎片时间就能来一局</p>
        </div>
      </div>

      {GAMES.map((g) => (
        <button
          key={g.to}
          onClick={() => nav(g.to)}
          className="btn-pop card flex w-full items-center gap-4 p-4 text-left"
        >
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${g.tone} text-3xl`}
          >
            {g.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-base font-black text-ink">{g.name}</p>
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-black text-ink-faint">
                {g.tag}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{g.desc}</p>
          </div>
        </button>
      ))}

      <SectionTitle>为什么这样练</SectionTitle>
      <div className="card space-y-2 p-4 text-xs leading-relaxed text-ink-soft">
        <p>
          <b className="text-ink">短回合 + 即时反馈</b>
          ：每句话说完立刻给分，错在哪一个词当场标红，比整段录音回放有效得多。
        </p>
        <p>
          <b className="text-ink">连击机制</b>
          ：连续拿高分会有连击加成，逼着自己每一句都认真读。
        </p>
        <p>
          <b className="text-ink">离线也能玩</b>
          ：没网、没 Key 时剧本和关键词引擎照常运行，进度与经验照常记录。
        </p>
      </div>
      <div className="h-2" />
    </div>
  );
}
