import { useEffect, useState } from 'react';
import { Keyboard, RotateCcw, Volume2 } from 'lucide-react';
import { Button, Confetti, ScoreRing, WordDiff } from './ui';
import { MicOrb } from './MicOrb';
import { useSpeechRound } from '../hooks/useSpeechRound';
import { asrSupported, stopListening } from '../lib/speech';
import { scoreLabel } from '../lib/scoring';
import { useSettingsStore } from '../store/useSettingsStore';

interface Props {
  /** 目标句；传 null 表示自由发言（Boss 战） */
  target: string | null;
  zh?: string;
  /** 本句重点词，用于高亮展示 */
  tip?: string;
  onResult: (score: number, transcript: string) => void;
  /** 结果确认后调用 */
  onAdvance: () => void;
  advanceLabel?: string;
  /** 进入时是否自动朗读目标句（剧本关关掉，避免和 NPC 抢话） */
  autoPlayModel?: boolean;
}

export function SpeakPanel({
  target,
  zh,
  tip,
  onResult,
  onAdvance,
  advanceLabel = '继续',
  autoPlayModel = true,
}: Props) {
  const {
    state,
    partial,
    result,
    error,
    playModel,
    takeTurn,
    takeFreeTurn,
    submitTyped,
    submitFree,
    reset,
  } = useSpeechRound();
  const [typed, setTyped] = useState('');
  const [typedMode, setTypedMode] = useState(!asrSupported());
  const showZh = useSettingsStore((s) => s.showZh);
  const playModelFirst = useSettingsStore((s) => s.playModelFirst);
  const [scored, setScored] = useState(false);

  // 换句子就重置，并在设置允许时自动播放示范
  useEffect(() => {
    reset();
    setTyped('');
    setScored(false);
    if (target && playModelFirst && autoPlayModel) void playModel(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const handleTap = async () => {
    // 录音中再点一下 = 结束录音（原生侧监听提前收工，不用干等 8 秒）
    if (state === 'listening') {
      stopListening();
      return;
    }
    const r = target ? await takeTurn(target) : await takeFreeTurn();
    if (r) {
      setScored(true);
      onResult(r.score, r.transcript);
    }
  };

  const handleTypedSubmit = () => {
    if (!typed.trim()) return;
    const r = target ? submitTyped(target, typed) : submitFree(typed);
    setScored(true);
    onResult(r.score, r.transcript || typed);
  };

  const again = () => {
    reset();
    setTyped('');
    setScored(false);
  };

  const label = result ? scoreLabel(result.score) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      {result && result.score >= 92 && <Confetti />}

      {/* 目标句 */}
      {target && (
        <div className="w-full rounded-3xl bg-white p-5 text-center shadow-card">
          <p className="text-balance text-xl font-black leading-snug text-ink">{target}</p>
          {showZh && zh && <p className="mt-2 text-sm text-ink-faint">{zh}</p>}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => void playModel(target)}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-600 btn-pop"
            >
              <Volume2 size={13} strokeWidth={3} /> 听示范
            </button>
            {tip && <span className="text-[11px] font-bold text-sun-600">💡 {tip}</span>}
          </div>
        </div>
      )}

      {!scored ? (
        <>
          <MicOrb
            state={state}
            onClick={handleTap}
            hint={state === 'listening' ? '再点一次结束录音' : undefined}
          />

          {state === 'listening' && partial && (
            <p className="animate-pop-in max-w-full rounded-2xl bg-ink/5 px-4 py-2 text-center text-sm font-semibold text-ink-soft">
              “{partial}”
            </p>
          )}

          {error && (
            <p className="rounded-2xl bg-coral-100 px-4 py-2 text-center text-xs font-bold text-coral-600">
              {error}
            </p>
          )}

          <button
            onClick={() => setTypedMode((v) => !v)}
            className="flex items-center gap-1 text-xs font-bold text-ink-faint underline decoration-dotted"
          >
            <Keyboard size={13} strokeWidth={2.6} />
            {typedMode ? '改用语音' : '设备听不清？改用打字'}
          </button>

          {typedMode && (
            <div className="w-full space-y-2">
              <textarea
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                rows={2}
                placeholder="把你想说的句子打出来，一样能打分"
                className="w-full resize-none rounded-2xl border-2 border-ink/10 bg-white p-3 text-sm text-ink outline-none focus:border-brand-400"
              />
              <Button block size="sm" variant="mint" onClick={handleTypedSubmit} disabled={!typed.trim()}>
                提交打分
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full animate-pop-in space-y-4">
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-white p-5 shadow-card">
            <ScoreRing score={result?.score ?? 0} />
            <p className="text-base font-black text-ink">
              {label?.emoji} {label?.text}
            </p>
            {result && result.words.length > 0 && <WordDiff words={result.words} />}
            {result && result.transcript && (
              <p className="text-xs text-ink-faint">识别到：{result.transcript}</p>
            )}
            {result && result.missing.length > 0 && (
              <p className="text-xs font-bold text-coral-600">
                漏了：{result.missing.join(' · ')}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="md" icon={<RotateCcw size={16} strokeWidth={3} />} onClick={again}>
              再读一次
            </Button>
            <Button block variant="primary" size="md" onClick={onAdvance}>
              {advanceLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
