import { useEffect, useReducer, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Home, RotateCcw } from 'lucide-react';
import type { ChatMessage, LevelDef, Phrase, Scenario, WorldDef } from '../types';
import { getLevel, nextLevelOf } from '../data/curriculum';
import { getScenario } from '../data/scenarios';
import { speak } from '../lib/speech';
import { starsForScore } from '../lib/scoring';
import { ScenarioRunner, offlineReply } from '../lib/offlineEngine';
import { chatComplete } from '../lib/ai';
import { sfx } from '../lib/sfx';
import { uid } from '../lib/utils';
import { useProfileStore } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { SpeakPanel } from '../components/SpeakPanel';
import { Button, Confetti, ProgressBar, StarRow } from '../components/ui';

export default function LevelPlay() {
  const { levelId = '' } = useParams();
  const nav = useNavigate();
  const clearLevel = useProfileStore((s) => s.clearLevel);
  const [cleared, setCleared] = useState<{ stars: number; avg: number } | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const ctx = getLevel(levelId);
  if (!ctx) return <Navigate to="/map" replace />;
  const { world, level } = ctx;
  const scenario = level.scenarioId ? getScenario(level.scenarioId) : undefined;

  const finish = (scores: number[]) => {
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 70;
    const stars = starsForScore(avg);
    clearLevel(level.id, stars, avg, level.kind === 'boss');
    sfx.win();
    setCleared({ stars, avg });
  };

  const content = () => {
    if (level.kind === 'phrase' && level.phrases) {
      return <PhraseRunner key={retryKey} phrases={level.phrases} onFinish={finish} />;
    }
    if (level.kind === 'scenario' && scenario) {
      return <ScenarioPlay key={retryKey} scenario={scenario} onFinish={finish} />;
    }
    if (level.boss) {
      return <BossPlay key={retryKey} level={level} onFinish={finish} />;
    }
    return <p className="py-10 text-center text-sm text-ink-faint">这一关还没有内容</p>;
  };

  return (
    <div className="flex min-h-full flex-col bg-cream">
      <LevelHeader world={world} level={level} onBack={() => nav('/map')} />

      <div className="flex-1 px-4 pb-6 pt-3">
        {cleared ? (
          <ClearScreen
            stars={cleared.stars}
            avg={cleared.avg}
            level={level}
            onRetry={() => {
              setCleared(null);
              setRetryKey((k) => k + 1);
            }}
            onMap={() => nav('/map')}
            onNext={() => {
              const nxt = nextLevelOf(level.id);
              if (nxt) {
                setCleared(null);
                setRetryKey((k) => k + 1);
                nav(`/play/${nxt.id}`);
              } else nav('/map');
            }}
          />
        ) : (
          content()
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── 顶部条 ───────────────────────── */

function LevelHeader({ world, level, onBack }: { world: WorldDef; level: LevelDef; onBack: () => void }) {
  return (
    <header className="safe-top sticky top-0 z-20 bg-cream/95 px-4 pb-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="返回"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          <ArrowLeft size={18} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black text-ink-faint">
            {world.emoji} {world.name}
          </p>
          <h1 className="truncate text-base font-black text-ink">{level.title}</h1>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────── 跟读句关卡 ─────────────────────── */

function PhraseRunner({ phrases, onFinish }: { phrases: Phrase[]; onFinish: (s: number[]) => void }) {
  const [idx, setIdx] = useState(0);
  const scoresRef = useRef<number[]>([]);
  const cur = phrases[idx];

  const advance = () => {
    if (idx + 1 >= phrases.length) onFinish(scoresRef.current);
    else setIdx(idx + 1);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex justify-between text-xs font-black text-ink-faint">
          <span>
            第 {idx + 1} / {phrases.length} 句
          </span>
          <span>开口就能拿经验</span>
        </div>
        <ProgressBar value={(idx + 1) / phrases.length} barClass="bg-mint-500" height="h-2.5" />
      </div>

      <SpeakPanel
        key={cur.id}
        target={cur.en}
        zh={cur.zh}
        tip={cur.tip}
        onResult={(s) => scoresRef.current.push(s)}
        onAdvance={advance}
        advanceLabel={idx + 1 >= phrases.length ? '完成闯关' : '下一句'}
      />
    </div>
  );
}

/* ──────────────────────── 剧本对话关 ──────────────────────── */

function ScenarioPlay({ scenario, onFinish }: { scenario: Scenario; onFinish: (s: number[]) => void }) {
  const runnerRef = useRef(new ScenarioRunner(scenario.lines));
  const [, force] = useReducer((x: number) => x + 1, 0);
  const scoresRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  const [userLines, setUserLines] = useState<Record<number, { text: string; score: number }>>({});
  const autoSpeak = useSettingsStore((s) => s.autoSpeak);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const showZh = useSettingsStore((s) => s.showZh);

  const runner = runnerRef.current;
  const pending = runner.pendingNpc();
  const target = runner.nextUserTarget();
  const shown = scenario.lines.slice(0, runner.index);

  useEffect(() => {
    if (finishedRef.current) return;
    if (!pending.length) {
      if (runner.finished) {
        finishedRef.current = true;
        onFinish(scoresRef.current);
      }
      return;
    }
    if (!autoSpeak) return;
    let cancelled = false;
    void (async () => {
      for (const line of pending) {
        if (cancelled) return;
        await speak(line.en, { rate: ttsRate });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner.index, autoSpeak, ttsRate]);

  const advance = () => {
    if (!target) return;
    runner.commitUser();
    force();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xl">{scenario.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-ink">{scenario.title}</p>
            <p className="truncate text-[11px] text-ink-faint">目标：{scenario.goal}</p>
          </div>
        </div>
        <ProgressBar value={runner.progress} barClass="bg-grape-500" height="h-2" />
      </div>

      <div className="space-y-2.5">
        {shown.map((line, i) => {
          const mine = userLines[i];
          return (
            <Bubble
              key={i}
              role={line.role}
              en={mine ? mine.text : line.en}
              zh={line.zh}
              npcName={scenario.npcName}
              npcEmoji={scenario.npcEmoji}
              showZh={showZh}
              score={mine?.score}
            />
          );
        })}
        {pending.map((line, i) => (
          <Bubble
            key={`p-${runner.index}-${i}`}
            role="npc"
            en={line.en}
            zh={line.zh}
            npcName={scenario.npcName}
            npcEmoji={scenario.npcEmoji}
            showZh={showZh}
          />
        ))}
      </div>

      {target && (
        <div className="space-y-3">
          <p className="text-center text-xs font-black text-ink-faint">轮到你说了</p>
          <SpeakPanel
            key={`turn-${runner.index}`}
            target={target.en}
            zh={target.zh}
            autoPlayModel={false}
            onResult={(s, t) => {
              scoresRef.current.push(s);
              const idx = scenario.lines.indexOf(target);
              setUserLines((m) => ({ ...m, [idx]: { text: t || target.en, score: s } }));
            }}
            onAdvance={advance}
            advanceLabel="说下一句"
          />
        </div>
      )}
    </div>
  );
}

function Bubble({
  role,
  en,
  zh,
  npcName,
  npcEmoji,
  showZh,
  score,
}: {
  role: 'npc' | 'user';
  en: string;
  zh: string;
  npcName: string;
  npcEmoji: string;
  showZh: boolean;
  score?: number;
}) {
  const isNpc = role === 'npc';
  return (
    <div className={`flex items-end gap-2 ${isNpc ? '' : 'flex-row-reverse'}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-lg">
        {isNpc ? npcEmoji : '🙋'}
      </span>
      <div
        className={`max-w-[78%] rounded-3xl px-4 py-2.5 ${
          isNpc ? 'rounded-bl-lg bg-white shadow-sm' : 'rounded-br-lg bg-brand-500 text-white'
        }`}
      >
        <p className="text-[10px] font-black opacity-60">{isNpc ? npcName : '你'}</p>
        <p className="text-[15px] font-bold leading-snug">{en}</p>
        {showZh && zh && (
          <p className={`mt-0.5 text-[11px] ${isNpc ? 'text-ink-faint' : 'text-white/80'}`}>{zh}</p>
        )}
        {typeof score === 'number' && (
          <span className="mt-1 inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black">
            {score} 分
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── BOSS 战 ───────────────────────── */

function BossPlay({ level, onFinish }: { level: LevelDef; onFinish: (s: number[]) => void }) {
  const boss = level.boss!;
  const ai = useSettingsStore((s) => s.ai);
  const autoSpeak = useSettingsStore((s) => s.autoSpeak);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const showZh = useSettingsStore((s) => s.showZh);
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { id: uid('m'), role: 'npc', en: boss.opener, zh: boss.openerZh },
  ]);
  const [turn, setTurn] = useState(0);
  const [busy, setBusy] = useState(false);
  const scoresRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  // AI 由服务端统一提供，用户侧没有开关，永远在线
  const online = true;

  useEffect(() => {
    if (autoSpeak) void speak(boss.opener, { rate: ttsRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const npcReply = async (userText: string, currentTurn: number) => {
    setBusy(true);
    let reply: { en: string; zh?: string };
    if (online) {
      const history = msgs.slice(-6).map((m) => ({
        role: (m.role === 'npc' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.en,
      }));
      try {
        const text = await chatComplete(ai, [
          { role: 'system', content: boss.systemPrompt },
          ...history,
          { role: 'user', content: userText || '(the user said nothing)' },
        ]);
        reply = { en: text };
      } catch {
        reply = offlineReply(userText, currentTurn);
      }
    } else {
      reply = offlineReply(userText, currentTurn);
    }
    setMsgs((m) => [...m, { id: uid('m'), role: 'npc', en: reply.en, zh: reply.zh }]);
    setBusy(false);
    if (autoSpeak) void speak(reply.en, { rate: ttsRate });
  };

  const handleResult = (score: number, transcript: string) => {
    scoresRef.current.push(score);
    setMsgs((m) => [...m, { id: uid('m'), role: 'user', en: transcript || '(没听清)', score }]);
  };

  const handleAdvance = () => {
    const last = [...msgs].reverse().find((m) => m.role === 'user');
    const nextTurn = turn + 1;
    setTurn(nextTurn);
    if (nextTurn >= boss.targetTurns) {
      if (!doneRef.current) {
        doneRef.current = true;
        onFinish(scoresRef.current);
      }
      return;
    }
    void npcReply(last?.en ?? '', nextTurn);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-r from-coral-500 to-grape-500 p-4 text-white shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{boss.npcEmoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">BOSS · {boss.npcName}</p>
            <p className="text-[11px] text-white/85">
              {online ? 'AI 自由对话' : '离线引擎'} · 撑满 {boss.targetTurns} 轮即通关
            </p>
          </div>
          <span className="rounded-full bg-white/25 px-2.5 py-1 text-xs font-black">
            {turn}/{boss.targetTurns}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${(turn / boss.targetTurns) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        {msgs.map((m) => (
          <Bubble
            key={m.id}
            role={m.role === 'user' ? 'user' : 'npc'}
            en={m.en}
            zh={m.zh ?? ''}
            npcName={boss.npcName}
            npcEmoji={boss.npcEmoji}
            showZh={showZh && Boolean(m.zh)}
            score={m.score}
          />
        ))}
        {busy && (
          <div className="flex items-center gap-2 pl-11 text-xs font-bold text-ink-faint">
            <span className="h-2 w-2 animate-ping rounded-full bg-grape-500" />
            {boss.npcName} 正在思考…
          </div>
        )}
      </div>

      {!busy && (
        <SpeakPanel
          key={`boss-${turn}`}
          target={null}
          autoPlayModel={false}
          onResult={handleResult}
          onAdvance={handleAdvance}
          advanceLabel={turn + 1 >= boss.targetTurns ? '结束对话' : '发送'}
        />
      )}
      {busy && <div className="py-4 text-center text-sm font-bold text-ink-faint">等待对方回应…</div>}
    </div>
  );
}

/* ───────────────────────── 结算页 ───────────────────────── */

function ClearScreen({
  stars,
  avg,
  level,
  onMap,
  onNext,
  onRetry,
}: {
  stars: number;
  avg: number;
  level: LevelDef;
  onMap: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  const nxt = nextLevelOf(level.id);
  return (
    <div className="flex flex-col items-center gap-5 pt-6">
      {stars >= 3 && <Confetti />}
      <div className="animate-pop-in text-6xl">{stars >= 3 ? '🏆' : stars === 2 ? '🎉' : '✅'}</div>
      <div className="text-center">
        <h2 className="text-2xl font-black text-ink">闯关成功！</h2>
        <p className="mt-1 text-sm text-ink-faint">平均发音 {Math.round(avg)} 分</p>
      </div>
      <StarRow count={stars} size={40} animate delayStep={180} />

      <div className="w-full rounded-3xl bg-white p-4 text-center shadow-card">
        <p className="text-xs font-black text-ink-faint">获得</p>
        <p className="text-2xl font-black text-brand-600">
          +{30 + stars * 20 + (level.kind === 'boss' ? 50 : 0)} XP
        </p>
      </div>

      <div className="w-full space-y-2">
        {nxt ? (
          <Button block size="lg" onClick={onNext} icon={<ChevronRight size={20} strokeWidth={3} />}>
            下一关：{nxt.title}
          </Button>
        ) : (
          <div className="rounded-2xl bg-mint-100 p-3 text-center text-sm font-black text-mint-600">
            🎊 全部关卡通关，你已经很能说了！
          </div>
        )}
        <Button block size="md" variant="outline" onClick={onMap} icon={<Home size={18} strokeWidth={3} />}>
          回到地图
        </Button>
        <button
          onClick={onRetry}
          className="mx-auto flex items-center gap-1 py-1 text-xs font-bold text-ink-faint"
        >
          <RotateCcw size={12} strokeWidth={3} /> 再练一次这关
        </button>
      </div>
    </div>
  );
}
