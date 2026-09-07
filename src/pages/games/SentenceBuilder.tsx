import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eraser, Volume2 } from 'lucide-react';
import clsx from 'clsx';
import type { Phrase } from '../../types';
import { ALL_PHRASES } from '../../data/curriculum';
import { speak } from '../../lib/speech';
import { normalize } from '../../lib/scoring';
import { sfx } from '../../lib/sfx';
import { shuffle } from '../../lib/utils';
import { useProfileStore } from '../../store/useProfileStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { GameResult } from '../../components/GameResult';
import { ProgressBar } from '../../components/ui';

const TOTAL = 5;

/** 词数适中的句子更适合做拼图 */
const POOL: Phrase[] =
  ALL_PHRASES.filter((p) => p.en.split(' ').length >= 4 && p.en.split(' ').length <= 9).length > 0
    ? ALL_PHRASES.filter((p) => p.en.split(' ').length >= 4 && p.en.split(' ').length <= 9)
    : ALL_PHRASES;

function makeRound() {
  const phrase = POOL[Math.floor(Math.random() * POOL.length)];
  const words = phrase.en.replace(/[?.!,]/g, '').split(' ');
  return { phrase, blocks: shuffle(words.map((w, i) => ({ id: `${w}-${i}`, word: w }))) };
}

export default function SentenceBuilder() {
  const nav = useNavigate();
  const register = useProfileStore((s) => s.registerSentence);
  const markToday = useProfileStore((s) => s.markToday);
  const ttsRate = useSettingsStore((s) => s.ttsRate);

  const [round, setRound] = useState(makeRound);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<{ id: string; word: string }[]>([]);
  const [verdict, setVerdict] = useState<'none' | 'ok' | 'bad'>('none');
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const remaining = round.blocks.filter((b) => !chosen.some((c) => c.id === b.id));

  const check = () => {
    if (!chosen.length) return;
    const mine = normalize(chosen.map((c) => c.word).join(' '));
    const target = normalize(round.phrase.en.replace(/[?.!,]/g, ''));
    const ok = mine === target;
    if (ok) {
      sfx.correct();
      setVerdict('ok');
      setCorrect((c) => c + 1);
      register({ score: 95, words: chosen.map((c) => c.word), seconds: 6 });
      void speak(round.phrase.en, { rate: ttsRate });
    } else {
      sfx.wrong();
      setVerdict('bad');
      register({ score: 50, words: chosen.map((c) => c.word), seconds: 6 });
    }
    markToday();
    window.setTimeout(() => {
      if (idx + 1 >= TOTAL) {
        setDone(true);
      } else {
        setIdx(idx + 1);
        setRound(makeRound());
        setChosen([]);
        setVerdict('none');
      }
    }, ok ? 900 : 1800);
  };

  if (done) {
    const score = correct * 20;
    const stars = correct >= 5 ? 3 : correct >= 3 ? 2 : 1;
    return (
      <div className="px-4">
        <GameResult
          emoji={correct >= 4 ? '🧩' : correct >= 2 ? '🙂' : '🐣'}
          title="拼句挑战完成"
          score={score}
          stars={stars}
          detail={`拼对 ${correct} / ${TOTAL} 句。${
            correct >= 4 ? '语序感很棒！' : '拼句最能练「英语怎么说」，多来几轮。'
          }`}
          onAgain={() => {
            setIdx(0);
            setCorrect(0);
            setChosen([]);
            setVerdict('none');
            setRound(makeRound());
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
          <ProgressBar value={(idx + 1) / TOTAL} barClass="bg-grape-500" height="h-2" />
        </div>
      </header>

      <div className="flex flex-1 flex-col">
        <div className="rounded-3xl bg-white p-5 text-center shadow-card">
          <p className="text-[11px] font-black text-ink-faint">把这句话拼出来</p>
          <p className="mt-1 text-lg font-black text-ink">{round.phrase.zh}</p>
          <button
            onClick={() => void speak(round.phrase.en, { rate: ttsRate })}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-grape-100 px-3 py-1.5 text-xs font-black text-grape-600 btn-pop"
          >
            <Volume2 size={13} strokeWidth={3} /> 听完整句
          </button>
        </div>

        {/* 已选区 */}
        <div
          className={clsx(
            'mt-4 min-h-[92px] rounded-3xl border-2 border-dashed p-3 transition-colors',
            verdict === 'ok' && 'border-mint-500 bg-mint-100',
            verdict === 'bad' && 'border-coral-500 bg-coral-100',
            verdict === 'none' && 'border-ink/15 bg-white',
          )}
        >
          <div className="flex flex-wrap gap-2">
            {chosen.length === 0 && (
              <p className="w-full py-6 text-center text-xs font-bold text-ink-faint">
                点下面的词块，按顺序拼成句子
              </p>
            )}
            {chosen.map((c) => (
              <button
                key={c.id}
                disabled={verdict !== 'none'}
                onClick={() => setChosen((list) => list.filter((x) => x.id !== c.id))}
                className="rounded-xl bg-grape-500 px-3 py-2 text-sm font-black text-white shadow-pop-sm btn-pop"
              >
                {c.word}
              </button>
            ))}
          </div>
        </div>

        {verdict !== 'none' && (
          <p
            className={clsx(
              'animate-pop-in mt-2 text-center text-sm font-black',
              verdict === 'ok' ? 'text-mint-600' : 'text-coral-600',
            )}
          >
            {verdict === 'ok' ? '✅ 完全正确！' : `❌ 正确语序：${round.phrase.en}`}
          </p>
        )}

        {/* 候选区 */}
        <div className="mt-3 flex flex-wrap gap-2">
          {remaining.map((b) => (
            <button
              key={b.id}
              disabled={verdict !== 'none'}
              onClick={() => setChosen((list) => [...list, b])}
              className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-sm font-black text-ink shadow-pop-sm btn-pop"
            >
              {b.word}
            </button>
          ))}
        </div>

        <div className="mt-auto flex gap-2 pt-6">
          <button
            onClick={() => setChosen([])}
            disabled={verdict !== 'none'}
            className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3 text-sm font-black text-ink-soft shadow-pop-sm btn-pop"
          >
            <Eraser size={15} strokeWidth={3} /> 清空
          </button>
          <button
            onClick={check}
            disabled={verdict !== 'none' || !chosen.length}
            className="btn-pop flex-1 rounded-2xl bg-grape-500 px-4 py-3 text-base font-black text-white shadow-pop disabled:opacity-40"
          >
            检查
          </button>
        </div>
      </div>
    </div>
  );
}
