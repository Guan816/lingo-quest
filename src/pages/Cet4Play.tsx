import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  Volume2,
  Wand2,
} from 'lucide-react';
import clsx from 'clsx';
import { Button, Card, Chip, Confetti, ProgressBar, ScoreRing, StarRow } from '../components/ui';
import { kindMeta } from '../data/cet4';
import {
  buildMcqSession,
  buildMixSession,
  buildWrongSession,
  buildWritingSession,
  generateQuestions,
  reviewWriting,
  starsFor,
  xpForSession,
  type McqItem,
} from '../lib/cet4';
import { cancelSpeak, speak, ttsSupported } from '../lib/speech';
import { useProfileStore } from '../store/useProfileStore';
import { useCet4Store } from '../store/useCet4Store';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Cet4Kind, Cet4Question, Cet4Writing } from '../types';

/** 练习模式：具体题型 + 考官随机抽题 + 错题重做 */
type PlayMode = Cet4Kind | 'mix' | 'wrong';

const CET4_MCQ_KINDS: Cet4Kind[] = [
  'news',
  'conversation',
  'passage',
  'banked',
  'matching',
  'careful',
  'vocab',
];

/** 需要用语音朗读材料的题型 */
const LISTENING: Cet4Kind[] = ['news', 'conversation', 'passage'];

const ALL_MODES: string[] = [...CET4_MCQ_KINDS, 'translation', 'writing', 'mix', 'wrong'];

/** 把对话里的 "M:" / "W:" 去掉，朗读更自然 */
function stripSpeakers(text: string): string {
  return text.replace(/^\s*[MW]:\s*/gim, '');
}

function modeTitle(mode: PlayMode): string {
  if (mode === 'mix') return '考官随机抽题';
  if (mode === 'wrong') return '错题重做';
  return kindMeta(mode).name;
}

/** 按模式组卷（都做了乱序处理） */
function makeSession(mode: PlayMode): McqItem[] {
  if (mode === 'mix') return buildMixSession(10);
  if (mode === 'wrong') {
    const qs = useCet4Store.getState().wrong.map((w) => w.q);
    return buildWrongSession(qs, 10);
  }
  return buildMcqSession(mode);
}

export default function Cet4Play() {
  const { kind: rawKind } = useParams<{ kind: string }>();
  const mode: PlayMode = (ALL_MODES.includes(rawKind ?? '') ? rawKind : 'vocab') as PlayMode;
  const title = modeTitle(mode);

  if (mode === 'translation' || mode === 'writing') {
    return <WritingPlay mode={mode} title={title} />;
  }
  return <McqPlay mode={mode} title={title} />;
}

/* ============================================================
 *  客观题答题器（含考官模式 / 错题重做）
 * ============================================================ */

function McqPlay({ mode, title }: { mode: PlayMode; title: string }) {
  const nav = useNavigate();
  const ai = useSettingsStore((s) => s.ai);
  const ttsRate = useSettingsStore((s) => s.ttsRate);
  const addXp = useProfileStore((s) => s.addXp);
  const clearLevel = useProfileStore((s) => s.clearLevel);
  const markToday = useProfileStore((s) => s.markToday);
  const record = useCet4Store((s) => s.record);
  const addWrong = useCet4Store((s) => s.addWrong);
  const markFixed = useCet4Store((s) => s.markFixed);
  const wrongList = useCet4Store((s) => s.wrong);

  const listening = LISTENING.includes(mode as Cet4Kind);
  const isRetry = mode === 'wrong';

  const [items, setItems] = useState<McqItem[]>(() => makeSession(mode));
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [showMaterial, setShowMaterial] = useState(!listening);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboBest, setComboBest] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [done, setDone] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [fixedThisRun, setFixedThisRun] = useState<string[]>([]);

  const cur = items[idx];
  const total = items.length;

  useEffect(() => {
    setShowMaterial(!listening);
    cancelSpeak();
    setSpeaking(false);
  }, [idx, listening]);

  useEffect(() => () => cancelSpeak(), []);

  const playMaterial = useCallback(async () => {
    if (!cur?.q.material) return;
    setSpeaking(true);
    await speak(stripSpeakers(cur.q.material), { rate: ttsRate });
    setSpeaking(false);
  }, [cur, ttsRate]);

  const choose = (i: number) => {
    if (chosen !== null || !cur) return;
    setChosen(i);
    const ok = i === cur.answer;

    if (ok) {
      setCorrectCount((c) => c + 1);
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setComboBest((b) => Math.max(b, nextCombo));
      // 曾经做错的题这次答对了 → 自动订正
      if (wrongList.some((w) => w.q.id === cur.q.id && !w.fixed)) {
        markFixed(cur.q.id);
        setFixedThisRun((prev) => [...prev, cur.q.id]);
      }
    } else {
      setCombo(0);
      addWrong(cur.q, cur.options[i]); // 答错自动进错题本
    }
  };

  const finish = (finalCorrect: number) => {
    const accuracy = total > 0 ? finalCorrect / total : 0;
    const stars = starsFor(accuracy);
    // clearLevel 负责落库星数（同时给通关经验），addXp 给每题答题经验
    clearLevel(`cet4-${mode}`, stars, Math.round(accuracy * 100), false);
    addXp(xpForSession(finalCorrect, total));
    markToday();
    record(mode, finalCorrect, total, stars);
    setDone(true);
  };

  const next = () => {
    if (idx + 1 >= total) {
      finish(correctCount);
      return;
    }
    setIdx((i) => i + 1);
    setChosen(null);
  };

  const aiGenerate = async () => {
    setAiBusy(true);
    setAiMsg('');
    try {
      // 考官模式默认按仔细阅读生成，其余按当前题型
      const genKind: Cet4Kind = mode === 'mix' || mode === 'wrong' ? 'careful' : (mode as Cet4Kind);
      const more = await generateQuestions(ai, genKind, 3);
      setItems((prev) => [...prev, ...more]);
      setAiMsg(`已加入 ${more.length} 道 AI 新题`);
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : 'AI 出题失败');
    } finally {
      setAiBusy(false);
    }
  };

  const restart = () => {
    cancelSpeak();
    setItems(makeSession(mode));
    setIdx(0);
    setChosen(null);
    setCorrectCount(0);
    setCombo(0);
    setComboBest(0);
    setDone(false);
    setAiMsg('');
    setFixedThisRun([]);
  };

  /* ---------- 结算页 ---------- */
  if (done) {
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const stars = starsFor(total > 0 ? correctCount / total : 0);
    return (
      <Shell title={title} onBack={() => nav('/cet4')}>
        {stars === 3 && <Confetti />}
        <div className="flex flex-col items-center gap-4 pt-6">
          <ScoreRing score={accuracy} />
          <StarRow count={stars} size={30} animate />
          <p className="text-lg font-black text-ink">
            {stars === 3
              ? '满分表现，稳！'
              : stars === 2
                ? '不错，再抠两题就满分'
                : stars === 1
                  ? '及格线守住了'
                  : '别急，先看解析再来一遍'}
          </p>
          <p className="text-sm text-ink-soft">
            答对 <b className="text-ink">{correctCount}</b> / {total} 题 · 最高连击 {comboBest}
          </p>
          <p className="text-sm font-black text-brand-600">+{xpForSession(correctCount, total)} XP</p>

          {fixedThisRun.length > 0 && (
            <Chip tone="mint">已订正 {fixedThisRun.length} 道错题 🎉</Chip>
          )}
          {correctCount < total && (
            <p className="text-xs text-ink-faint">
              这次答错的题已自动记入<b className="text-ink">错题本</b>，随时可以重做
            </p>
          )}

          <div className="mt-2 grid w-full grid-cols-2 gap-3">
            <Button variant="outline" icon={<RotateCcw size={16} strokeWidth={3} />} onClick={restart}>
              再来一组
            </Button>
            <Button variant="primary" onClick={() => nav('/cet4')}>
              返回四级
            </Button>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={<ClipboardList size={15} strokeWidth={3} />}
              onClick={() => nav('/cet4/wrong')}
            >
              打开错题本
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Wand2 size={15} strokeWidth={3} />}
              disabled={aiBusy}
              onClick={aiGenerate}
            >
              {aiBusy ? '正在出题…' : 'AI 再出几道'}
            </Button>
          </div>
          {aiMsg && <p className="text-xs text-ink-faint">{aiMsg}</p>}
        </div>
      </Shell>
    );
  }

  /* ---------- 空状态 ---------- */
  if (!cur) {
    const empty = isRetry ? '错题本是空的——这说明你练得很干净 👏' : '这个题型暂时还没有题目。';
    return (
      <Shell title={title} onBack={() => nav('/cet4')}>
        <p className="py-16 text-center text-sm text-ink-faint">{empty}</p>
      </Shell>
    );
  }

  const answered = chosen !== null;
  const isRight = answered && chosen === cur.answer;

  return (
    <Shell
      title={title}
      onBack={() => nav('/cet4')}
      right={
        <button
          onClick={aiGenerate}
          disabled={aiBusy}
          className="flex items-center gap-1 rounded-2xl bg-grape-100 px-3 py-1.5 text-xs font-black text-grape-600 disabled:opacity-50"
        >
          {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={3} />}
          AI 出题
        </button>
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <ProgressBar value={total ? idx / total : 0} className="flex-1" />
        <span className="shrink-0 text-xs font-black text-ink-soft">
          {idx + 1}/{total}
        </span>
        {combo >= 2 && <Chip tone="sun">🔥 连击 {combo}</Chip>}
      </div>

      {aiMsg && <p className="mb-2 text-xs text-ink-faint">{aiMsg}</p>}

      {/* 听力播放区 */}
      {listening && (
        <Card className="mb-3 bg-gradient-to-br from-brand-50 to-white">
          <div className="flex items-center gap-3">
            <button
              onClick={playMaterial}
              disabled={speaking || !ttsSupported()}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-500 text-white shadow-pop btn-pop disabled:opacity-50"
            >
              {speaking ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Volume2 size={24} strokeWidth={2.6} />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">
                {speaking ? '正在播放…' : '点击播放听力材料'}
              </p>
              <p className="text-xs text-ink-faint">
                {ttsSupported() ? '可以反复听，真实考试只播一遍' : '当前设备不支持语音朗读，可直接看原文'}
              </p>
            </div>
            <button
              onClick={() => setShowMaterial((v) => !v)}
              className="flex shrink-0 items-center gap-1 rounded-2xl bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-soft shadow-pop-sm"
            >
              {showMaterial ? <EyeOff size={12} strokeWidth={3} /> : <Eye size={12} strokeWidth={3} />}
              {showMaterial ? '藏原文' : '看原文'}
            </button>
          </div>
          {showMaterial && cur.q.material && (
            <p className="mt-3 whitespace-pre-line rounded-2xl bg-white/70 p-3 text-sm leading-relaxed text-ink-soft">
              {cur.q.material}
            </p>
          )}
        </Card>
      )}

      {/* 阅读材料 */}
      {!listening && cur.q.material && (
        <Card className="mb-3 max-h-64 overflow-y-auto">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{cur.q.material}</p>
          {cur.q.materialZh && (
            <p className="mt-2 border-t border-ink/5 pt-2 text-xs text-ink-faint">{cur.q.materialZh}</p>
          )}
        </Card>
      )}

      {/* 题干 */}
      <Card className="mb-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {mode === 'mix' && <Chip tone="brand">{kindMeta(cur.q.kind).name}</Chip>}
          {isRetry && <Chip tone="coral">错题重做</Chip>}
          {cur.q.tag && <span className="text-[11px] text-ink-faint">{cur.q.tag}</span>}
        </div>
        <p className="text-base font-black leading-relaxed text-ink">{cur.q.stem}</p>
      </Card>

      {/* 选项 */}
      <div className="space-y-2.5">
        {cur.options.map((opt, i) => {
          const state = !answered
            ? 'idle'
            : i === cur.answer
              ? 'right'
              : i === chosen
                ? 'wrong'
                : 'dim';
          return (
            <button
              key={`${opt}-${i}`}
              onClick={() => choose(i)}
              disabled={answered}
              className={clsx(
                'btn-pop flex w-full items-start gap-3 rounded-3xl border-2 p-3.5 text-left transition-colors',
                state === 'idle' && 'border-ink/5 bg-white',
                state === 'right' && 'border-mint-500 bg-mint-50',
                state === 'wrong' && 'border-coral-500 bg-coral-50',
                state === 'dim' && 'border-ink/5 bg-white opacity-50',
              )}
            >
              <span
                className={clsx(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black',
                  state === 'right'
                    ? 'bg-mint-500 text-white'
                    : state === 'wrong'
                      ? 'bg-coral-500 text-white'
                      : 'bg-ink/5 text-ink-soft',
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="pt-0.5 text-sm font-semibold leading-snug text-ink">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* 解析 */}
      {answered && (
        <Card
          className={clsx('mt-3', isRight ? 'border-l-4 border-mint-500' : 'border-l-4 border-coral-500')}
        >
          <div className="mb-1.5 flex items-center gap-2">
            {isRight ? <Chip tone="mint">答对了</Chip> : <Chip tone="coral">已记入错题本</Chip>}
          </div>
          <p className="flex gap-2 text-sm leading-relaxed text-ink-soft">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-sun-500" strokeWidth={2.6} />
            <span>{cur.q.explain ?? '记住这个题型的解题套路，下一题会更顺。'}</span>
          </p>
        </Card>
      )}

      {/* 底部操作 */}
      <div className="mt-4">
        {answered ? (
          <Button variant="primary" block size="lg" onClick={next}>
            {idx + 1 >= total ? '看结果' : '下一题'}
            <ChevronRight size={18} strokeWidth={3} />
          </Button>
        ) : (
          <p className="text-center text-xs text-ink-faint">选一个你觉得对的答案</p>
        )}
      </div>

      <div className="h-6" />
    </Shell>
  );
}

/* ============================================================
 *  主观题：翻译 / 写作
 * ============================================================ */

function WritingPlay({ mode, title }: { mode: 'translation' | 'writing'; title: string }) {
  const nav = useNavigate();
  const ai = useSettingsStore((s) => s.ai);
  const addXp = useProfileStore((s) => s.addXp);
  const markToday = useProfileStore((s) => s.markToday);
  const record = useCet4Store((s) => s.record);

  const [list] = useState<Cet4Writing[]>(() => buildWritingSession(mode, 1));
  const item = list[0];
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const grantedRef = useRef(false);

  const isTranslation = mode === 'translation';
  const wordCount = useMemo(() => answer.trim().split(/\s+/).filter(Boolean).length, [answer]);

  if (!item) {
    return (
      <Shell title={title} onBack={() => nav('/cet4')}>
        <p className="py-16 text-center text-sm text-ink-faint">暂时还没有题目。</p>
      </Shell>
    );
  }

  const grant = () => {
    if (grantedRef.current) return;
    grantedRef.current = true;
    addXp(30);
    markToday();
    record(mode, 1, 1, 2);
  };

  const askAi = async () => {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      setFeedback(
        await reviewWriting(ai, isTranslation ? 'translation' : 'writing', item.prompt, answer, item.sample),
      );
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'AI 批改失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={title} onBack={() => nav('/cet4')}>
      <Card className="mb-3">
        <Chip tone={isTranslation ? 'sun' : 'grape'} className="mb-2">
          {isTranslation ? '汉译英 · 约 140-160 字中文' : '短文写作 · 120-180 词'}
        </Chip>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{item.prompt}</p>
        {item.promptZh && <p className="mt-2 text-xs text-ink-faint">{item.promptZh}</p>}
      </Card>

      <Card className="mb-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={7}
          placeholder={isTranslation ? '在这里写出你的英文译文…' : 'Write your essay here…'}
          className="w-full resize-y rounded-2xl bg-ink/[0.03] p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-ink-faint">
          <span>{isTranslation ? '先拆长句，再逐句译，最后查时态' : '三段式：观点 → 理由 → 结论'}</span>
          <span>{wordCount} 词</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setRevealed(true);
            grant();
          }}
        >
          看参考范文
        </Button>
        <Button
          variant="grape"
          disabled={busy || !answer.trim()}
          icon={busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} strokeWidth={3} />}
          onClick={askAi}
        >
          {busy ? '批改中…' : 'AI 批改'}
        </Button>
      </div>

      {feedback && (
        <Card className="mt-3 border-l-4 border-grape-500">
          <p className="mb-1 text-sm font-black text-ink">AI 批改意见</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{feedback}</p>
        </Card>
      )}

      {revealed && (
        <>
          <Card className="mt-3 border-l-4 border-mint-500">
            <p className="mb-1.5 text-sm font-black text-ink">{isTranslation ? '参考译文' : '参考范文'}</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{item.sample}</p>
          </Card>

          <Card className="mt-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-black text-ink">
              <Lightbulb size={16} className="text-sun-500" strokeWidth={2.6} /> 评分要点
            </p>
            <ul className="space-y-1.5">
              {item.points.map((p) => (
                <li key={p} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                  <span className="text-brand-500">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            {item.phrases && item.phrases.length > 0 && (
              <div className="mt-3 border-t border-ink/5 pt-3">
                <p className="mb-2 text-xs font-black text-ink">高分表达</p>
                <div className="flex flex-wrap gap-2">
                  {item.phrases.map((p) => (
                    <span
                      key={p.en}
                      className="rounded-2xl bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink"
                    >
                      {p.en}
                      <span className="ml-1 font-normal text-ink-faint">{p.zh}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <Button
        variant="ghost"
        size="sm"
        block
        className="mt-4"
        icon={<RotateCcw size={15} strokeWidth={3} />}
        onClick={() => nav('/cet4')}
      >
        返回四级
      </Button>
      <div className="h-6" />
    </Shell>
  );
}

/* ============================================================
 *  通用外壳（沉浸式：自带返回栏）
 * ============================================================ */

function Shell({
  title,
  onBack,
  right,
  children,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-full max-w-lg bg-cream px-4 pb-4">
      <header className="safe-top sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-2 bg-cream/95 px-4 py-2 backdrop-blur">
        <button
          onClick={onBack}
          aria-label="返回"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          <ArrowLeft size={18} strokeWidth={2.8} />
        </button>
        <h1 className="flex-1 truncate text-base font-black text-ink">{title}</h1>
        {right}
      </header>
      {children}
    </div>
  );
}

/** 错题本重做时会用到：把错题按题型归类展示 */
export function groupByKind(items: Cet4Question[]): Record<string, Cet4Question[]> {
  return items.reduce<Record<string, Cet4Question[]>>((acc, q) => {
    (acc[q.kind] ??= []).push(q);
    return acc;
  }, {});
}
