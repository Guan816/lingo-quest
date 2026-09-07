import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { SCENARIOS } from '../../data/scenarios';
import { speak } from '../../lib/speech';
import { offlineReply } from '../../lib/offlineEngine';
import { chatComplete } from '../../lib/ai';
import { starsForScore } from '../../lib/scoring';
import { uid } from '../../lib/utils';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SpeakPanel } from '../../components/SpeakPanel';
import { GameResult } from '../../components/GameResult';

const CHARACTERS = SCENARIOS.map((s) => ({
  id: s.id,
  name: s.npcName,
  emoji: s.npcEmoji,
  scene: s.title,
  intro: s.intro,
  opener: s.lines[0]?.en ?? 'Hi there!',
  openerZh: s.lines[0]?.zh ?? '嗨！',
  systemPrompt: `You are ${s.npcName}. Scene: ${s.intro}. You are helping a beginner practise spoken English. Reply in 1-2 short sentences using simple everyday words, and always end with a question to keep the conversation going. Never exceed 25 words.`,
}));

export default function FreeTalk() {
  const [charId, setCharId] = useState<string | null>(null);
  const char = CHARACTERS.find((c) => c.id === charId) ?? null;

  if (!char) {
    return (
      <div className="px-4 pb-6">
        <header className="safe-top flex items-center gap-3 py-3">
          <button
            onClick={() => window.history.back()}
            aria-label="返回"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
          >
            <ArrowLeft size={18} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-base font-black text-ink">选个角色开聊</h1>
            <p className="text-[11px] text-ink-faint">聊多久都行，随时可以结束</p>
          </div>
        </header>
        <div className="grid grid-cols-2 gap-3">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCharId(c.id)}
              className="btn-pop card flex flex-col items-center gap-1.5 p-4 text-center"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint-100 text-3xl">
                {c.emoji}
              </span>
              <p className="text-sm font-black text-ink">{c.name}</p>
              <p className="text-[11px] text-ink-faint">{c.scene}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <ChatView char={char} onChangeChar={() => setCharId(null)} />;
}

function ChatView({
  char,
  onChangeChar,
}: {
  char: (typeof CHARACTERS)[number];
  onChangeChar: () => void;
}) {
  const nav = useNavigate();
  const ai = useSettingsStore((s) => s.ai);
  const autoSpeak = useSettingsStore((s) => s.autoSpeak);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const showZh = useSettingsStore((s) => s.showZh);

  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { id: uid('m'), role: 'npc', en: char.opener, zh: char.openerZh },
  ]);
  const [turn, setTurn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const scoresRef = useRef<number[]>([]);
  const online = ai.enabled && Boolean(ai.apiKey);

  useEffect(() => {
    if (autoSpeak) void speak(char.opener, { rate: ttsRate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reply = async (userText: string, t: number) => {
    setBusy(true);
    let out: { en: string; zh?: string };
    if (online) {
      const history = msgs.slice(-6).map((m) => ({
        role: (m.role === 'npc' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.en,
      }));
      try {
        out = {
          en: await chatComplete(ai, [
            { role: 'system', content: char.systemPrompt },
            ...history,
            { role: 'user', content: userText || '(the user said nothing)' },
          ]),
        };
      } catch {
        out = offlineReply(userText, t);
      }
    } else {
      out = offlineReply(userText, t);
    }
    setMsgs((m) => [...m, { id: uid('m'), role: 'npc', en: out.en, zh: out.zh }]);
    setBusy(false);
    if (autoSpeak) void speak(out.en, { rate: ttsRate });
  };

  if (done) {
    const list = scoresRef.current;
    const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 70;
    return (
      <div className="px-4">
        <GameResult
          emoji="💬"
          title="对话结束"
          score={Math.round(avg)}
          stars={starsForScore(avg)}
          detail={`和 ${char.name} 聊了 ${list.length} 轮，平均 ${Math.round(avg)} 分。自由对话不比对答案，敢说就是赢。`}
          onAgain={() => {
            scoresRef.current = [];
            setMsgs([{ id: uid('m'), role: 'npc', en: char.opener, zh: char.openerZh }]);
            setTurn(0);
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
        <button onClick={onChangeChar} aria-label="换个角色" className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop">
          <ArrowLeft size={18} strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-ink">
            {char.emoji} {char.name}
          </p>
          <p className="truncate text-[11px] text-ink-faint">
            {online ? 'AI 自由对话' : '离线引擎'} · 已聊 {turn} 轮
          </p>
        </div>
        <button
          onClick={() => setDone(true)}
          className="flex items-center gap-1 rounded-full bg-coral-100 px-3 py-1.5 text-xs font-black text-coral-600 btn-pop"
        >
          <Flag size={12} strokeWidth={3} /> 结束
        </button>
      </header>

      <div className="flex-1 space-y-2.5 pb-4">
        {msgs.map((m) => (
          <div key={m.id} className={`flex items-end gap-2 ${m.role === 'npc' ? '' : 'flex-row-reverse'}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-lg">
              {m.role === 'npc' ? char.emoji : '🙋'}
            </span>
            <div
              className={`max-w-[78%] rounded-3xl px-4 py-2.5 ${
                m.role === 'npc'
                  ? 'rounded-bl-lg bg-white shadow-sm'
                  : 'rounded-br-lg bg-mint-500 text-white'
              }`}
            >
              <p className="text-[10px] font-black opacity-60">{m.role === 'npc' ? char.name : '你'}</p>
              <p className="text-[15px] font-bold leading-snug">{m.en}</p>
              {showZh && m.zh && (
                <p className={`mt-0.5 text-[11px] ${m.role === 'npc' ? 'text-ink-faint' : 'text-white/80'}`}>
                  {m.zh}
                </p>
              )}
              {typeof m.score === 'number' && (
                <span className="mt-1 inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black">
                  {m.score} 分
                </span>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <p className="pl-11 text-xs font-bold text-ink-faint">
            <span className="mr-1 inline-block h-2 w-2 animate-ping rounded-full bg-mint-500" />
            {char.name} 正在思考…
          </p>
        )}
      </div>

      {!busy && (
        <SpeakPanel
          key={`talk-${turn}`}
          target={null}
          autoPlayModel={false}
          onResult={(score, transcript) => {
            scoresRef.current.push(score);
            setMsgs((m) => [...m, { id: uid('m'), role: 'user', en: transcript || '(没听清)', score }]);
          }}
          onAdvance={() => {
            const last = [...msgs].reverse().find((m) => m.role === 'user');
            const t = turn + 1;
            setTurn(t);
            void reply(last?.en ?? '', t);
          }}
          advanceLabel="发送"
        />
      )}
      {busy && <p className="py-4 text-center text-sm font-bold text-ink-faint">等待回应…</p>}
    </div>
  );
}
