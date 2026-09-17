import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QuizRunner } from '../components/QuizRunner';
import { CS_CHAPTERS, CS_COURSES, csQuestionsOfChapter, csQuestionsOfCourse } from '../data/cs';
import { fromCs, pickItems, starsForQuiz, type QuizItem, type QuizItemMode } from '../lib/quiz';
import { useSubjectStore } from '../store/useSubjectStore';
import { useProfileStore } from '../store/useProfileStore';
import type { CsChapter, CsCourse } from '../types';

type RouteMode =
  | { type: 'course'; course: CsCourse }
  | { type: 'chapter'; chapter: CsChapter }
  | { type: 'kind'; kind: 'single' | 'memory' };

const CHAPTER_COUNT = 10;

export default function CsPlay() {
  const nav = useNavigate();
  const params = useParams<{ mode?: string; value?: string }>();
  const subject = useSubjectStore();
  const clearLevel = useProfileStore((s) => s.clearLevel);
  const markToday = useProfileStore((s) => s.markToday);

  const route: RouteMode = useMemo(() => {
    if (params.mode === 'chapter' && params.value) {
      return { type: 'chapter', chapter: params.value as CsChapter };
    }
    if (params.mode === 'course' && (params.value === 'A' || params.value === 'B')) {
      return { type: 'course', course: params.value };
    }
    if (params.mode === 'kind' && (params.value === 'single' || params.value === 'memory')) {
      return { type: 'kind', kind: params.value };
    }
    return { type: 'course', course: 'A' };
  }, [params.mode, params.value]);

  const [items, setItems] = useState<QuizItem[]>([]);
  const [meta, setMeta] = useState({ title: '', subtitle: '' });

  useEffect(() => {
    const all = CS_CHAPTERS.flatMap((c) => csQuestionsOfChapter(c.key)).map(fromCs);

    if (route.type === 'chapter') {
      const ch = CS_CHAPTERS.find((c) => c.key === route.chapter);
      const courseMeta = CS_COURSES.find((c) => c.key === ch?.course);
      const pool = csQuestionsOfChapter(route.chapter).map(fromCs);
      setItems(pickItems(pool, { count: CHAPTER_COUNT }));
      setMeta({
        title: ch?.name ?? '章节练习',
        subtitle: `${courseMeta?.short ?? ''} · 共 ${pool.length} 题`,
      });
      return;
    }

    if (route.type === 'kind') {
      if (route.kind === 'single') {
        const pool = all.filter((it) => it.mode === 'single');
        setItems(pickItems(pool, { count: 20, modes: ['single'] }));
        setMeta({ title: '单选专项', subtitle: `全课程 A+B · 共 ${pool.length} 题` });
      } else {
        const modes: QuizItemMode[] = ['judge', 'multi', 'fill'];
        const pool = all.filter((it) => modes.includes(it.mode));
        setItems(pickItems(pool, { count: 20, modes }));
        setMeta({ title: '判断 / 多选 / 填空专项', subtitle: `全课程 · 共 ${pool.length} 题` });
      }
      return;
    }

    // 按课程抽题：按真题配比（判断10 单选50 多选10 填空10，这里等比缩小到 20 题）
    const cq = csQuestionsOfCourse(route.course).map(fromCs);
    const plan: { mode: QuizItemMode; n: number }[] = [
      { mode: 'judge', n: 4 },
      { mode: 'single', n: 10 },
      { mode: 'multi', n: 3 },
      { mode: 'fill', n: 3 },
    ];
    const picked: QuizItem[] = [];
    for (const p of plan) {
      picked.push(...pickItems(cq, { count: p.n, modes: [p.mode] }));
    }
    const courseMeta = CS_COURSES.find((c) => c.key === route.course)!;
    setItems(picked);
    setMeta({
      title: `${courseMeta.name} 练习`,
      subtitle: `${courseMeta.short} · ${picked.length} 题 · ${courseMeta.score} 分`,
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
    route.type === 'chapter' ? `cs-${route.chapter}`
    : route.type === 'course' ? `cs-course-${route.course}`
    : `cs-kind-${route.kind}`;

  return (
    <QuizRunner
      title={meta.title}
      subtitle={meta.subtitle}
      items={items}
      onExit={() => nav(-1)}
      onFinish={({ correct, total }) => {
        const acc = correct / total;
        subject.setStars(key, starsForQuiz(acc));
        clearLevel(key, starsForQuiz(acc), acc * 100, false);
        markToday();
        nav('/cs', { replace: true });
      }}
    />
  );
}
