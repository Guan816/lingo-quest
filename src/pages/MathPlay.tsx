import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuizRunner } from '../components/QuizRunner';
import { MATH_CHAPTERS } from '../data/math';
import { allMathQuestions, mathQuestionsOfChapter } from '../lib/bankMeta';
import { fromMath, pickItems, starsForQuiz, type QuizItem, type QuizItemMode } from '../lib/quiz';
import { useSubjectStore } from '../store/useSubjectStore';
import { useProfileStore } from '../store/useProfileStore';
import type { MathChapter } from '../types';

type RouteMode =
  | { type: 'mix' }
  | { type: 'chapter'; chapter: MathChapter }
  | { type: 'kind'; kind: 'choice' | 'calc' };

/** 各路线取多少题 */
const MIX_COUNT = 15;
const CHAPTER_COUNT = 10;

export default function MathPlay() {
  const nav = useNavigate();
  const params = useParams<{ mode?: string; value?: string }>();
  const subject = useSubjectStore();
  const clearLevel = useProfileStore((s) => s.clearLevel);
  const markToday = useProfileStore((s) => s.markToday);

  /** 解析路由参数成统一的模式 */
  const route: RouteMode = useMemo(() => {
    if (params.mode === 'chapter' && params.value) {
      return { type: 'chapter', chapter: params.value as MathChapter };
    }
    if (params.mode === 'kind' && (params.value === 'choice' || params.value === 'calc')) {
      return { type: 'kind', kind: params.value };
    }
    return { type: 'mix' };
  }, [params.mode, params.value]);

  /** 组卷：只组一次，避免重渲染换题 */
  const [items, setItems] = useState<QuizItem[]>([]);
  const [meta, setMeta] = useState({ title: '', subtitle: '' });

  useEffect(() => {
    const all = allMathQuestions().map(fromMath);

    if (route.type === 'chapter') {
      const ch = MATH_CHAPTERS.find((c) => c.key === route.chapter);
      const pool = mathQuestionsOfChapter(route.chapter).map(fromMath);
      setItems(pickItems(pool, { count: CHAPTER_COUNT }));
      setMeta({
        title: ch?.name ?? '章节练习',
        subtitle: `${ch?.linear ? '线性代数' : '微积分'} · 共 ${pool.length} 题`,
      });
      return;
    }

    if (route.type === 'kind') {
      const modes: QuizItemMode[] =
        route.kind === 'choice' ? ['single', 'fill'] : ['calc', 'proof', 'synthetic'];
      const pool = all.filter((it) => modes.includes(it.mode));
      const names = route.kind === 'choice' ? '选择 + 填空' : '计算 + 证明 + 综合';
      setItems(pickItems(pool, { count: MIX_COUNT, modes }));
      setMeta({ title: names, subtitle: `题型专项 · 共 ${pool.length} 题` });
      return;
    }

    // 整套模拟卷：按真题配比抽题（单选8 填空6 计算8 证明1 综合2 = 25 题）
    const plan: { mode: QuizItemMode; n: number }[] = [
      { mode: 'single', n: 8 },
      { mode: 'fill', n: 6 },
      { mode: 'calc', n: 8 },
      { mode: 'proof', n: 1 },
      { mode: 'synthetic', n: 2 },
    ];
    const picked: QuizItem[] = [];
    for (const p of plan) {
      picked.push(...pickItems(all, { count: p.n, modes: [p.mode] }));
    }
    setItems(picked);
    setMeta({
      title: '高等数学模拟卷',
      subtitle: `25 题 · 满分 150 分 · 120 分钟`,
    });
  }, [route]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-sm font-bold text-ink-soft">正在组卷…</p>
      </div>
    );
  }

  const key =
    route.type === 'chapter' ? `math-${route.chapter}`
    : route.type === 'kind' ? `math-kind-${route.kind}`
    : 'math-mix';

  return (
    <QuizRunner
      title={meta.title}
      subtitle={meta.subtitle}
      items={items}
      onExit={() => nav(-1)}
      onFinish={({ correct, total, answered, userAnswers }) => {
        const acc = correct / total;
        const stars = starsForQuiz(acc);
        // 章节练习记录星数；模拟卷与专项也记，方便「我的」页展示
        subject.setStars(key, stars);
        clearLevel(key, stars, acc * 100, false);
        markToday();

        // ── 逐题写入统计与错题本 ──
        // 【曾经的 bug】这里以前只调 setStars / clearLevel，
        // 从没调用过 subject.record，导致「做题数」有数（走 profile 的另一条路）
        // 但**错题本永远是空的** —— 逻辑写好了却没人接。
        // 章节取题目自身的 chapter 字段（比从 id 猜测可靠）。
        for (const it of items) {
          const ok = answered[it.id];
          if (ok === undefined) continue; // 跳过没作答的
          subject.record('math', it.chapter, {
            correct: ok,
            qid: it.id,
            userAnswer: userAnswers?.[it.id],
          });
        }

        nav('/math', { replace: true });
      }}
    />
  );
}
