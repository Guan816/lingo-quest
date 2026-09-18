/**
 * 通用答题器：数学 / 计算机共用。
 *
 * 支持的交互：
 *  - 单选 / 多选 / 判断：点选项，立即判分
 *  - 填空 / 计算 / 证明 / 综合：输入框作答，对照参考答案自评
 *  - AI 解析：开关打开时，可让模型分步讲解（本地有解析时优先展示本地的）
 *
 * 【解析的排版】
 * 统一走 lib/explain.ts 定的「标准试卷答案排版规范」四模块：
 * ① 答案（加粗标亮）② 考点 ③ 解（分步推导）④ 解题技巧・总结。
 * 解析**默认完整展示**，没有折叠按钮 —— 考完试看答案不该还要再点一下。
 * 模块之间靠标题字重区分层级，不用分隔线。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from './ui';
import { MathBlock, MathText } from './MathText';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import {
  explainOf,
  explainWithAI,
  gradeObjective,
  hintSubjective,
  type GradeResult,
  type QuizItem,
} from '../lib/quiz';
import type { Explain } from '../lib/explain';

interface QuizRunnerProps {
  title: string;
  subtitle?: string;
  items: QuizItem[];
  /**
   * 全部答完后回调。
   *
   * `answered` 是「题目 id → 是否答对」的明细 —— 调用方靠它写错题本。
   * 早先只传 correct/total 两个汇总数字，导致错题本永远收不到题目，
   * 表现成「错题本一直是空的」。改这里务必保留逐题明细。
   */
  onFinish: (r: {
    correct: number;
    total: number;
    answered: Record<string, boolean>;
    /** 每题最后一次的作答内容，用于错题本展示 */
    userAnswers?: Record<string, string>;
  }) => void;
  onExit: () => void;
}

export function QuizRunner({ title, subtitle, items, onFinish, onExit }: QuizRunnerProps) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [graded, setGraded] = useState<GradeResult | null>(null);
  /** AI 补充讲解。本地已有解析时它只是「再讲一遍」，不是必需品 */
  const [aiExplain, setAiExplain] = useState<Explain | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  /** 每题的最后一次作答内容（客观题存选项原文，主观题存输入文本）——
      错题本要用它展示「你当时写的是什么」 */
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [correctCount, setCorrectCount] = useState(0);

  const ai = useSettingsStore((s) => s.ai);
  const aiExplainOn = useSettingsStore((s) => s.aiExplain);
  const recordAnswer = useProfileStore((s) => s.recordAnswer);
  const item = items[idx];

  const isObjective = useMemo(
    () => item && (item.mode === 'single' || item.mode === 'multi' || item.mode === 'judge'),
    [item],
  );

  /** 本地解析（老题库现场转成四模块），AI 讲完之前先用它 */
  const localExplain = useMemo(() => (item ? explainOf(item) : null), [item]);
  /** 优先展示 AI 那份；没有就用本地的 */
  const explain = aiExplain ?? localExplain;

  // 换题时清空作答状态
  useEffect(() => {
    setPicked([]);
    setTextAnswer('');
    setGraded(null);
    setAiExplain(null);
    setAiErr('');
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

  /** 客观题的作答内容：存选项**原文**，不存字母（选项是打乱的，字母会指错） */
  const pickedText = () => picked.map((i) => item.options[i]).filter(Boolean).join('、');

  const submitObjective = () => {
    if (picked.length === 0 || graded) return;
    const g = gradeObjective(item, picked);
    setGraded(g);
    setAnswered((a) => ({ ...a, [item.id]: g.correct }));
    setUserAnswers((a) => ({ ...a, [item.id]: pickedText() }));
    if (g.correct) setCorrectCount((n) => n + 1);
    recordAnswer(g.correct);
  };

  const submitSubjective = () => {
    if (!textAnswer.trim() || graded) return;
    const g = hintSubjective(item, textAnswer);
    setGraded(g);
    setAnswered((a) => ({ ...a, [item.id]: g.correct }));
    setUserAnswers((a) => ({ ...a, [item.id]: textAnswer.trim() }));
    if (g.correct) setCorrectCount((n) => n + 1);
    recordAnswer(g.correct);
  };

  /** 让用户手动纠正自评结果（主观题的判分只能算辅助） */
  const override = (ok: boolean) => {
    if (!graded) return;
    const delta = ok === graded.correct ? 0 : ok ? 1 : -1;
    setCorrectCount((n) => n + delta);
    setAnswered((a) => ({ ...a, [item.id]: ok }));
    setUserAnswers((a) => ({ ...a, [item.id]: isObjective ? pickedText() : textAnswer.trim() }));
    setGraded({ ...graded, correct: ok, feedback: ok ? '已标记为答对' : '已标记为答错' });
    // 自评纠正也要跟着改统计，否则错题数与实际对不上
    recordAnswer(ok);
  };

  const runAI = async () => {
    setAiBusy(true);
    setAiErr('');
    setAiExplain(null);
    try {
      const ex = await explainWithAI(ai, item, {
        userAnswer: isObjective
          ? picked.map((i) => item.options[i]).join('、')
          : textAnswer,
      });
      setAiExplain(ex);
    } catch (e: any) {
      setAiErr(e?.message || 'AI 解析失败');
    } finally {
      setAiBusy(false);
    }
  };

  const next = () => {
    if (idx + 1 >= items.length) {
      onFinish({ correct: correctCount, total: items.length, answered, userAnswers });
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
              <div className="mt-3 flex items-center gap-2">
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

        {/* 解析区 —— 标准试卷答案排版，默认完整展开 */}
        {graded && explain && (
          <div className="card space-y-4 p-4">
            {/* ① 答案 */}
            <div>
              <ModuleTitle>答案</ModuleTitle>
              <div className="rounded-xl bg-mint-50 px-3.5 py-3">
                {explain.answerOption && (
                  <span className="mr-1.5 text-[15px] font-black text-mint-700">
                    {explain.answerOption}.
                  </span>
                )}
                <span className="text-[15px] font-black leading-relaxed text-ink">
                  <MathText>{explain.answer}</MathText>
                </span>
              </div>
            </div>

            {/* ② 考点 */}
            {explain.points.length > 0 && (
              <div>
                <ModuleTitle>考点</ModuleTitle>
                <div className="space-y-1">
                  {explain.points.map((p, i) => (
                    <p
                      key={i}
                      className="rounded-xl bg-sun-50 px-3 py-2 text-[12.5px] font-bold leading-relaxed text-sun-700"
                    >
                      <MathText>{p}</MathText>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* ③ 解 —— 解析主体，分步推导 */}
            {explain.steps.length > 0 && (
              <div>
                <ModuleTitle>解</ModuleTitle>
                <ol className="space-y-3.5">
                  {explain.steps.map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-black text-brand-600">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        {/* 先写文字说明 */}
                        {s.text && (
                          <p className="whitespace-pre-wrap text-[13.5px] leading-[1.75] text-ink">
                            <MathText>{s.text}</MathText>
                          </p>
                        )}
                        {/* 再给公式，单独占行、水平居中 */}
                        {s.math && <MathBlock>{s.math}</MathBlock>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ④ 解题技巧・总结 */}
            {explain.tip && (
              <div>
                <ModuleTitle>解题技巧</ModuleTitle>
                <p className="rounded-xl bg-grape-50 px-3 py-2.5 text-[12.5px] font-bold leading-relaxed text-grape-700">
                  <MathText>{explain.tip}</MathText>
                </p>
              </div>
            )}

            {/* 易错提醒 */}
            {explain.pitfall && (
              <p className="flex items-start gap-2 rounded-xl bg-coral-50 px-3 py-2.5 text-[12.5px] font-bold leading-relaxed text-coral-700">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" strokeWidth={2.8} />
                <span>
                  <MathText>{explain.pitfall}</MathText>
                </span>
              </p>
            )}

            {/* AI 解析：Key 全在服务端，前端只需要一个按钮，没有任何配置入口 */}
            {aiExplainOn && (
              <div>
                {!aiBusy && (
                  <button
                    onClick={runAI}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-grape-500 to-brand-500 py-2.5 text-sm font-black text-white btn-pop"
                  >
                    <Sparkles size={15} strokeWidth={2.8} />
                    {aiExplain ? '换个说法再讲一遍' : '让 AI 再讲讲这道题'}
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
                {aiExplain && (
                  <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] font-black text-grape-600">
                    <Bot size={13} strokeWidth={2.8} /> 以上为 AI 讲解
                    <button onClick={runAI} className="ml-1 underline">
                      <RotateCcw size={11} strokeWidth={3} className="inline" /> 重讲
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/*
        底部操作栏。
        z-40 故意高于 TabBar 的 z-30 —— 万一哪天某个容器的 immersive
        判定漏了，TabBar 也不会把「提交答案」盖住（那个 bug 真发生过，
        见 pages/WrongBook.tsx 里 setImmersive 的注释）。
        另外用 safe-bottom-record 而不是 safe-bottom，给底部多留一点，
        避开 TabBar 的位置。
      */}
      <div className="safe-bottom-record fixed bottom-0 left-0 right-0 z-40 border-t border-ink/5 bg-white/95 px-4 py-3 backdrop-blur">
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

/**
 * 模块标题。
 *
 * 四模块（答案 / 考点 / 解 / 解题技巧）之间**不用分隔线**，
 * 靠标题的字重与字号拉开层级 —— 线多了页面碎，读起来累。
 */
function ModuleTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[12px] font-black tracking-wide text-ink-soft">
      <span className="h-3 w-[3px] rounded-full bg-brand-500" />
      {children}
    </p>
  );
}
