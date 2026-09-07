import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ALL_PHRASES } from '../../data/curriculum';
import { starsForScore } from '../../lib/scoring';
import { pickRandom } from '../../lib/utils';
import { SpeakPanel } from '../../components/SpeakPanel';
import { GameResult } from '../../components/GameResult';
import { ProgressBar } from '../../components/ui';

const TOTAL = 5;

export default function Shadowing() {
  const nav = useNavigate();
  const [session, setSession] = useState(() => pickRandom(ALL_PHRASES, TOTAL));
  const [idx, setIdx] = useState(0);
  const scoresRef = useRef<number[]>([]);
  const [done, setDone] = useState(false);
  const [avg, setAvg] = useState(0);

  const cur = session[idx];

  const finish = () => {
    const list = scoresRef.current;
    const a = list.length ? list.reduce((x, y) => x + y, 0) / list.length : 70;
    setAvg(a);
    setDone(true);
  };

  if (done) {
    return (
      <div className="px-4">
        <GameResult
          emoji={avg >= 88 ? '🎤' : avg >= 70 ? '🙂' : '🐣'}
          title="影子跟读完成"
          score={Math.round(avg)}
          stars={starsForScore(avg)}
          detail={`平均 ${Math.round(avg)} 分。${
            avg >= 88 ? '发音很稳，可以挑战更长的句子了。' : '把标红的词单独练几遍，进步会很快。'
          }`}
          onAgain={() => {
            scoresRef.current = [];
            setSession(pickRandom(ALL_PHRASES, TOTAL));
            setIdx(0);
            setDone(false);
          }}
          onBack={() => nav('/games')}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-4 pb-6">
      <header className="safe-top flex items-center gap-3 py-3">
        <button
          onClick={() => nav('/games')}
          aria-label="返回"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          <ArrowLeft size={18} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-ink-faint">
            第 {idx + 1} / {TOTAL} 句
          </p>
          <ProgressBar value={(idx + 1) / TOTAL} barClass="bg-coral-500" height="h-2" />
        </div>
      </header>

      <div className="flex-1 pt-4">
        <SpeakPanel
          key={cur.id}
          target={cur.en}
          zh={cur.zh}
          tip={cur.tip}
          onResult={(s) => scoresRef.current.push(s)}
          onAdvance={() => (idx + 1 >= TOTAL ? finish() : setIdx(idx + 1))}
          advanceLabel={idx + 1 >= TOTAL ? '查看成绩' : '下一句'}
        />
      </div>
    </div>
  );
}
