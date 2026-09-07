import { useCallback, useRef, useState } from 'react';
import type { ScoreResult } from '../types';
import { listen, speak, SpeechError, stopListening } from '../lib/speech';
import { freeScore, scoreSpeech, tokenize } from '../lib/scoring';
import { sfx } from '../lib/sfx';
import { useProfileStore } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { OrbState } from '../components/MicOrb';

/**
 * 一次「听示范 → 开口说 → 打分 → 记经验」的完整回合。
 * 页面只需关心 target 与 UI 状态。
 */
export function useSpeechRound() {
  const [state, setState] = useState<OrbState>('idle');
  const [partial, setPartial] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);

  const registerSentence = useProfileStore((s) => s.registerSentence);
  const markToday = useProfileStore((s) => s.markToday);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);

  const reset = useCallback(() => {
    setResult(null);
    setPartial('');
    setError(null);
  }, []);

  /** 播放标准发音 */
  const playModel = useCallback(
    async (text: string) => {
      setState('speaking');
      await speak(text, { rate: ttsRate });
      setState('idle');
    },
    [ttsRate],
  );

  /** 录一次并打分；返回 null 表示被中止 */
  const takeTurn = useCallback(
    async (target: string): Promise<ScoreResult | null> => {
      setError(null);
      setResult(null);
      startedAt.current = Date.now();
      setState('listening');
      try {
        const heard = await listen({ onPartial: setPartial });
        setState('thinking');
        const seconds = (Date.now() - startedAt.current) / 1000;
        const scored = scoreSpeech(target, heard.transcript);
        setResult(scored);
        setPartial('');
        registerSentence({ score: scored.score, words: tokenize(target), seconds });
        markToday();
        if (sfxEnabled) {
          if (scored.score >= 65) sfx.correct();
          else sfx.wrong();
        }
        return scored;
      } catch (err) {
        const msg =
          err instanceof SpeechError ? err.message : err instanceof Error ? err.message : '录音失败';
        setError(msg);
        return null;
      } finally {
        setState('idle');
      }
    },
    [markToday, registerSentence, sfxEnabled],
  );

  /**
   * 自由发言回合（Boss 战）：没有标准答案，
   * 只要开口、说得够长就给鼓励分，目的是把对话撑下去。
   */
  const takeFreeTurn = useCallback(async (): Promise<ScoreResult | null> => {
    setError(null);
    setResult(null);
    startedAt.current = Date.now();
    setState('listening');
    try {
      const heard = await listen({ onPartial: setPartial });
      setState('thinking');
      const seconds = (Date.now() - startedAt.current) / 1000;
      const scored: ScoreResult = {
        score: freeScore(heard.transcript),
        words: [],
        transcript: heard.transcript,
        missing: [],
        extra: [],
      };
      setResult(scored);
      setPartial('');
      registerSentence({ score: scored.score, words: tokenize(heard.transcript), seconds });
      markToday();
      if (sfxEnabled && scored.score >= 65) sfx.correct();
      return scored;
    } catch (err) {
      setError(err instanceof SpeechError ? err.message : '录音失败');
      return null;
    } finally {
      setState('idle');
    }
  }, [markToday, registerSentence, sfxEnabled]);

  /** 自由发言的打字版 */
  const submitFree = useCallback(
    (text: string): ScoreResult => {
      const scored: ScoreResult = {
        score: freeScore(text),
        words: [],
        transcript: text,
        missing: [],
        extra: [],
      };
      setResult(scored);
      registerSentence({ score: scored.score, words: tokenize(text), seconds: 4 });
      markToday();
      if (sfxEnabled && scored.score >= 65) sfx.correct();
      return scored;
    },
    [markToday, registerSentence, sfxEnabled],
  );

  /** 打字模式打分：设备不支持语音识别时的兜底路径 */
  const submitTyped = useCallback(
    (target: string, typed: string): ScoreResult => {
      const scored = scoreSpeech(target, typed);
      setResult(scored);
      registerSentence({ score: scored.score, words: tokenize(target), seconds: 3 });
      markToday();
      if (sfxEnabled) {
        if (scored.score >= 65) sfx.correct();
        else sfx.wrong();
      }
      return scored;
    },
    [markToday, registerSentence, sfxEnabled],
  );

  const cancel = useCallback(() => {
    stopListening();
    setState('idle');
  }, []);

  return {
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
    cancel,
  };
}
