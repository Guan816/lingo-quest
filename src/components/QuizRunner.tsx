/**
 * 通用答题器：数学 / 计算机共用。
 *
 * 支持的交互：
 *  - 单选 / 多选 / 判断：点选项，立即判分
 *  - 填空 / 计算 / 证明 / 综合：输入框作答，对照参考答案自评
 *  - AI 解析：开关打开时，可让模型分步讲解（本地有解析时优先展示本地的）
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from './ui';
import { MathText } from './MathText';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  explainWithAI,
  gradeObjective,
  hintSubjective,
  type GradeResult,
  type QuizItem,
} from '../lib/quiz';

interface QuizRunnerProps {
  title: string;
  subtitle?: string;
  items: QuizItem[];
  /** 全部答完后回调 */
  onFinish: (r: { correct: number; total: number; answered: Record<string, boolean> }) => void;
  onExit: () => void;
}

export function QuizRunner({ title, subtitle, items, onFinish, onExit }: QuizRunnerProps) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [graded, setGraded] = useState<GradeResult | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [showLocal, setShowLocal] = useState(false);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [correctCount, setCorrectCount] = useState(0);

  const ai = useSettingsStore((s) => s.ai);
  const aiExplainOn = useSettingsStore((s) => s.aiExplain);
  const item = items[idx];

  const isObjective = useMemo(
    () => item && (item.mode === 'single' || item.mode === 'multi' || item.mode === 'judge'),
    [item],
  );

  // 换题时清空作答状态
  useEffect(() => {
    setPicked([]);
    setTextAnswer('');
    setGraded(null);
    setAiText('');
    setAiErr('');
    setShowLocal(false);
  }, [idx]);

  if (!item) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-sm font-bold text-ink-soft">这一组没有题目</p>
        <Button className="mt-4" onClick={onExit}>返回</Button>
      </div>
    );
  }

  const progress = ((idx + (graded ? 1 : 0)) / items.length) * 100;

  const submitObjective = () => {
    if (picked.length === 0 || graded) return;
    const g = gradeObjective(item, picked);
    setGraded(g);
    setAnswered((a) => ({ ...a, [item.id]: g.correct }));
    if (g.correct) setCorrectCount((n) => n + 1);
  };

  const submitSubjective = () => {
    if (!textAnswer.trim() || graded) return;
    const g = hintSubjective(item, textAnswer);
    setGraded(g);
    setAnswered((a) => ({ ...a, [item.id]: g.correct }));
    if (g.correct) setCorrectCount((n) => n + 1);
  };

  /** 让用户手动纠正自评结果（主观题的判分只能算辅助） */
  const override = (ok: boolean) => {
    if (!graded) return;
    const delta = ok === graded.correct ? 0 : ok ? 1 : -1;
    setCorrectCount((n) => n + delta);
    setAnswered((a) => ({ ...a, [item.id]: ok }));
    setGraded({ ...graded, correct: ok, feedback: ok ? '已标记为答对' : '已标记为答错' });
  };

  const runAI = async () => {
    setAiBusy(true);
    setAiErr('');
    setAiText('');
    try {
      const text = await explainWithAI(ai, item, {
        userAnswer: isObjective
          ? picked.map((i) => item.options[i]).join('、')
          : textAnswer,
      });
      setAiText(text);
    } catch (e: any) {
      setAiErr(e?.message || 'AI 解析失败');
    } finally {
      setAiBusy(false);
    }
  };

  const next = () => {
    if (idx + 1 >= items.length) {
      onFinish({ correct: correctCount, total: items.length, answered });
    } else {
      setIdx((n) => n + 1);
    }
  };

  const togglePick = (i: number) => {
    if (graded) return;
    if (item.mode === 'multi') {
      setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    } else {
      setPicked([i]);
    }
  };

  const diffLabel = { easy: '较易', mid: '中等', hard: '较难' }[item.difficulty];

  return (
    <>
      {/* 顶栏 */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={onExit} className="btn-pop rounded-xl p-1.5 text-ink-soft">
            <ArrowLeft size={20} strokeWidth={2.8} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-ink">{title}</p>
            {subtitle && <p className="truncate text-[11px] text-ink-faint">{subtitle}</p>}
          </div>
          <span className="shrink-0 text-xs font-black text-ink-soft">
            {idx + 1}/{items.length}
          </span>
          {aiExplainOn && (
            <span className="shrink-0 rounded-full bg-grape-100 px-2 py-0.5 text-[10px] font-black text-grape-600">
              AI 解析
            </span>
          )}
        </div>
        <div className="h-1.5 w-full bg-ink/5">
          <div
            className="h-full rounded-r-full bg-brand-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-4">
        {/* 题目 */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black text-brand-600">
              {item.mode === 'single' ? '单选' :
               item.mode === 'multi' ? '多选' :
               item.mode === 'judge' ? '判断' :
               item.mode === 'fill' ? '填空' :
               item.mode === 'calc' ? '计算' :
               item.mode === 'proof' ? '证明' : '综合'}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              item.difficulty === 'hard' ? 'bg-coral-100 text-coral-600'
              : item.difficulty === 'mid' ? 'bg-sun-100 text-sun-600'
              : 'bg-mint-100 text-mint-600'
            }`}>
              {diffLabel}
            </span>
            {item.mode === 'multi' && (
              <span className="text-[10px] font-bold text-ink-faint">多选、少选均不得分</span>
            )}
          </div>

          <p className="whitespace-pre-wrap text-[15px] font-bold leading-relaxed text-ink">
            <MathText>{item.stem}</MathText>
          </p>
        </div>

        {/* 选项 / 输入 */}
        {isObjective ? (
          <div className="space-y-2">
            {item.options.map((opt, i) => {
              const chosen = picked.includes(i);
              const isRight = item.answerIdx.includes(i);
              let cls = 'border-ink/10 bg-white';
              if (graded) {
                if (isRight) cls = 'border-mint-500 bg-mint-50';
                else if (chosen) cls = 'border-coral-400 bg-coral-50';
              } else if (chosen) {
                cls = 'border-brand-400 bg-brand-50';
              }
              return (
                <button
                  key={i}
                  onClick={() => togglePick(i)}
                  disabled={!!graded}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${cls}`}
                >
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-black ${
                    graded && isRight ? 'bg-mint-500 text-white'
                    : graded && chosen ? 'bg-coral-500 text-white'
                    : chosen ? 'bg-brand-500 text-white' : 'bg-ink/8 text-ink-soft'
                  }`}>
                    {graded && isRight ? <Check size={12} strokeWidth={3.5} />
                     : graded && chosen ? <X size={12} strokeWidth={3.5} />
                     : String.fromCharCode(65 + i)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
                    <MathText>{opt}</MathText>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card space-y-3 p-4">
            <p className="text-xs font-black text-ink-faint">
              写下你的答案与关键步骤（判分后会与参考答案对照）
            </p>
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={!!graded}
              rows={item.mode === 'calc' || item.mode === 'synthetic' ? 6 : 3}
              placeholder={item.mode === 'fill' ? '直接填答案' : '写出解题过程，例如：\n第一步 …\n第二步 …'}
              className="w-full resize-none rounded-2xl border-2 border-ink/10 bg-white px-3.5 py-3 text-sm text-ink outline-none focus:border-brand-400 disabled:bg-ink/3"
            />
          </div>
        )}

        {/* 判分结果 */}
        {graded && (
          <div className={`rounded-2xl border-2 p-4 ${
            graded.correct ? 'border-mint-400 bg-mint-50' : 'border-coral-300 bg-coral-50'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${
                graded.correct ? 'bg-mint-500' : 'bg-coral-500'
              } text-white`}>
                {graded.correct ? <Check size={14} strokeWidth={3.5} /> : <X size={14} strokeWidth={3.5} />}
              </span>
              <p className={`text-sm font-black ${graded.correct ? 'text-mint-700' : 'text-coral-700'}`}>
                {graded.feedback}
              </p>
            </div>

            {/* 主观题允许用户纠正自评 */}
            {!isObjective && (
              <div className="mt-3 flex items-center gap-2 border-t border-ink/8 pt-3">
                <span className="text-[11px] font-bold text-ink-soft">我的作答是否正确？</span>
                <button
                  onClick={() => override(true)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                    graded.correct ? 'bg-mint-500 text-white' : 'bg-white text-ink-soft'
                  }`}
                >
                  答对了
                </button>
                <button
                  onClick={() => override(false)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                    !graded.correct ? 'bg-coral-500 text-white' : 'bg-white text-ink-soft'
                  }`}
                >
                  答错了
                </button>
              </div>
            )}
          </div>
        )}

        {/* 解析区 */}
        {graded && (
          <div className="card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-black text-ink">
                <Lightbulb size={16} className="text-sun-500" strokeWidth={2.8} />
                参考答案与解析
              </p>
              <button
                onClick={() => setShowLocal((v) => !v)}
                className="text-[11px] font-bold text-brand-600"
              >
                {showLocal ? '收起' : '展开'}
              </button>
            </div>

            <div className="rounded-xl bg-ink/3 p-3">
              <p className="mb-1 text-[10px] font-black text-ink-faint">参考答案</p>
              <p className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-ink">
                <MathText>{item.refAnswer}</MathText>
              </p>
            </div>

            {showLocal && item.steps.length > 0 && (
              <ol className="space-y-2">
                {item.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-black text-brand-600">
                      {i + 1}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                      <MathText>{s}</MathText>
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {item.point && (
              <p className="rounded-xl bg-sun-50 px-3 py-2 text-[12px] font-bold leading-relaxed text-sun-700">
                考点：{item.point}
              </p>
            )}
            {item.formula && (
              <p className="rounded-xl bg-grape-50 px-3 py-2 font-mono text-[12px] leading-relaxed text-grape-700">
                {item.formula}
              </p>
            )}

            {/* AI 解析：Key 在服务端，前端只看用户自己的开关 */}
            {aiExplainOn && (
              <div className="border-t border-ink/8 pt-3">
                {!aiText && !aiBusy && (
                  <button
                    onClick={runAI}
                    disabled={!ai.enabled}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-black ${
                      ai.enabled
                        ? 'bg-gradient-to-r from-grape-500 to-brand-500 text-white btn-pop'
                        : 'bg-ink/8 text-ink-faint'
                    }`}
                  >
                    <Sparkles size={15} strokeWidth={2.8} />
                    {ai.enabled ? '让 AI 讲讲这道题' : '需先在「我的」里打开 AI 开关'}
                  </button>
                )}
                {aiBusy && (
                  <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-ink-faint">
                    <Loader2 size={16} className="animate-spin" />
                    AI 正在分析…
                  </div>
                )}
                {aiErr && (
                  <p className="rounded-xl bg-coral-50 px-3 py-2 text-[12px] font-bold text-coral-600">
                    {aiErr}
                  </p>
                )}
                {aiText && (
                  <div className="rounded-2xl bg-gradient-to-br from-grape-50 to-brand-50 p-3.5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-grape-700">
                      <Bot size={14} strokeWidth={2.8} /> AI 讲解
                    </p>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                      {aiText}
                    </p>
                    <button
                      onClick={runAI}
                      className="mt-2 flex items-center gap-1 text-[11px] font-bold text-grape-600"
                    >
                      <RotateCcw size={11} strokeWidth={3} /> 换个说法再讲一遍
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-ink/5 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2">
          {!graded ? (
            <Button
              block
              onClick={isObjective ? submitObjective : submitSubjective}
              disabled={isObjective ? picked.length === 0 : !textAnswer.trim()}
            >
              提交答案
            </Button>
          ) : (
            <Button block onClick={next}>
              {idx + 1 >= items.length ? '查看结果' : '下一题'}
              <ChevronRight size={16} strokeWidth={3} />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
