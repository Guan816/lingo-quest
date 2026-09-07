import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Volume2, X } from 'lucide-react';
import clsx from 'clsx';
import { VOCAB } from '../../data/vocabulary';
import type { VocabItem } from '../../types';
import { speak } from '../../lib/speech';
import { sfx } from '../../lib/sfx';
import { pickRandom, shuffle } from '../../lib/utils';
import { useProfileStore } from '../../store/useProfileStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { GameResult } from '../../components/GameResult';
import { ProgressBar } from '../../components/ui';

const TOTAL = 10;

interface Question {
  answer: VocabItem;
  options: string[];
}

function makeQuestion(): Question {
  const answer = VOCAB[Math.floor(Math.random() * VOCAB.length)];
  const others = pickRandom(
    VOCAB.filter((v) => v.id !== answer.id && v.zh !== answer.zh),
    3,
  );
  return { answer, options: shuffle([answer.zh, ...others.map((o) => o.zh)]) };
}

export default function ListenPick() {
  const nav = useNavigate();
  const register = useProfileStore((s) => s.registerSentence);
  const markToday = useProfileStore((s) => s.markToday);
  const ttsRate = useSettingsStore((s) => s.ttsRate);

  const [q, setQ] = useState<Question>(makeQuestion);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState(false);

  const play = useCallback(
    (word?: string) => void speak(word ?? q.answer.en, { rate: ttsRate }),
    [q.answer.en, ttsRate],
  );

  useEffect(() => {
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const choose = (zh: string) => {
    if (picked) return;
    setPicked(zh);
    const ok = zh === q.answer.zh;
    if (ok) {
      sfx.correct();
      setCorrect((c) => c + 1);
      setCombo((c) => c + 1);
      register({ score: 92, words: [q.answer.en], seconds: 2 });
    } else {
      sfx.wrong();
      setCombo(0);
      register({ score: 45, words: [q.answer.en], seconds: 2 });
    }
    markToday();
    window.setTimeout(() => {
      if (idx + 1 >= TOTAL) {
        setDone(true);
      } else {
        setIdx(idx + 1);
        setQ(makeQuestion());
        setPicked(null);
      }
    }, ok ? 700 : 1400);
  };

  if (done) {
    const score = correct * 10;
    const stars = correct >= 9 ? 3 : correct >= 6 ? 2 : 1;
    return (
      <div className="px-4">
        <GameResult
          emoji={correct >= 8 ? '🎧' : correct >= 5 ? '🙂' : '🐣'}
          title="听音选词完成"
          score={score}
          stars={stars}
          detail={`答对 ${correct} / ${TOTAL} 题。${correct >= 8 ? '耳朵很灵！' : '再来一轮，语感是听出来的。'}`}
          onAgain={() => {
            setIdx(0);
            setCorrect(0);
            setCombo(0);
            setPicked(null);
            setQ(makeQuestion());
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
            第 {idx + 1} / {TOTAL} 题
          </p>
          <ProgressBar value={(idx + 1) / TOTAL} barClass="bg-brand-500" height="h-2" />
        </div>
        {combo >= 2 && (
          <span className="rounded-full bg-sun-100 px-2.5 py-1 text-xs font-black text-sun-600">
            🔥 {combo}
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <button
          onClick={() => play()}
          className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-card btn-pop"
        >
          <Volume2 size={44} strokeWidth={2.6} />
        </button>
        <p className="text-xs font-bold text-ink-faint">点击喇叭再听一次</p>

        <div className="grid w-full grid-cols-2 gap-3">
          {q.options.map((zh) => {
            const isAnswer = zh === q.answer.zh;
            const isPicked = picked === zh;
            return (
              <button
                key={zh}
                disabled={Boolean(picked)}
                onClick={() => choose(zh)}
                className={clsx(
                  'flex items-center justify-between gap-2 rounded-3xl border-2 px-4 py-4 text-left text-base font-black transition-all btn-pop',
                  !picked && 'border-ink/10 bg-white text-ink',
                  picked && isAnswer && 'border-mint-500 bg-mint-100 text-mint-600',
                  isPicked && !isAnswer && 'border-coral-500 bg-coral-100 text-coral-600',
                  picked && !isAnswer && !isPicked && 'border-ink/10 bg-white text-ink-faint opacity-50',
                )}
              >
                {zh}
                {picked && isAnswer && <Check size={18} strokeWidth={3} />}
                {isPicked && !isAnswer && <X size={18} strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {picked && (
          <p className="animate-pop-in text-sm font-bold text-ink-soft">
            {q.answer.en} <span className="text-ink-faint">{q.answer.ipa}</span>
          </p>
        )}
      </div>
    </div>
  );
}
