/**
 * 上传本 —— 用户自己上传的题目。
 *
 * 与公式本的关系：上传的**题目**在这里，从题目里提炼出的**公式/技巧**在公式本。
 * 入口放在「我的 → 学习工具」里公式本的下方。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import clsx from 'clsx';
import { MathText, MathBlock } from '../components/MathText';
import { Card, SectionTitle } from '../components/ui';
import { useUploadBookStore, UPLOAD_SUBJECT_LABEL, type UploadQuestion } from '../store/useUploadBookStore';
import { useFormulaBookStore } from '../store/useFormulaBookStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { deriveFormulas, DERIVE_MAX_PER_UPLOAD } from '../lib/derive';
import { chapterFullNameOf } from '../lib/bankMeta';

type SubjectFilter = 'all' | 'math' | 'cs' | 'cet4';

const SUBJECT_TABS: { key: SubjectFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'math', label: '数学' },
  { key: 'cs', label: '计算机' },
  { key: 'cet4', label: '英语' },
];

export default function UploadBook() {
  const nav = useNavigate();
  const items = useUploadBookStore((s) => s.items);
  const remove = useUploadBookStore((s) => s.remove);
  const ai = useSettingsStore((s) => s.ai);
  const addFormulas = useFormulaBookStore((s) => s.addMany);

  const [subject, setSubject] = useState<SubjectFilter>('all');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const shown = useMemo(
    () => (subject === 'all' ? items : items.filter((e) => e.subject === subject)),
    [items, subject],
  );

  /** 按科目+章节分组，组内按上传时间倒序 */
  const groups = useMemo(() => {
    const m = new Map<string, UploadQuestion[]>();
    for (const it of shown) {
      const k = `${it.subject}::${it.chapter}`;
      const arr = m.get(k);
      if (arr) arr.push(it);
      else m.set(k, [it]);
    }
    return [...m.entries()].map(([k, list]) => {
      const [sub, ch] = k.split('::');
      return { subject: sub as UploadQuestion['subject'], chapter: ch, list };
    });
  }, [shown]);

  /** 手动为上传本里的题补生成技巧公式（自动生成只覆盖前 N 题） */
  const genFormulas = async () => {
    const pool = shown.slice(0, DERIVE_MAX_PER_UPLOAD);
    if (!pool.length) {
      setToast('上传本里还没有题目');
      return;
    }
    setBusy(true);
    setToast(`正在为 ${pool.length} 道题提炼公式与技巧…`);
    try {
      const list = await deriveFormulas(
        ai,
        pool.map((q) => ({
          subject: q.subject,
          chapter: q.chapter,
          stem: q.stem,
          answerText: q.answerText,
          steps: q.steps,
          tip: q.tip,
          from: q.sourceName,
          fromNo: q.no,
        })),
        { maxItems: DERIVE_MAX_PER_UPLOAD },
      );
      const n = addFormulas(list);
      setToast(n > 0 ? `已收录 ${n} 条公式/技巧到公式本` : '没有提炼出新的公式或技巧');
    } catch (e) {
      setToast(`生成失败：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {/* 顶栏 */}
      <div className="flex items-center gap-2">
        <button onClick={() => nav('/stats')} className="rounded-xl p-1.5 active:bg-ink/5" aria-label="返回">
          <ArrowLeft size={20} strokeWidth={2.6} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black text-ink">上传本</p>
          <p className="text-[11px] text-ink-faint">
            你上传的题目 · {items.length} 题
          </p>
        </div>
        <button
          onClick={genFormulas}
          disabled={busy || !shown.length}
          className={clsx(
            'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-black',
            busy ? 'bg-ink/5 text-ink-faint' : 'bg-brand-500 text-white active:opacity-90',
          )}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={2.8} />}
          提炼公式
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2">
        {SUBJECT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubject(t.key)}
            className={clsx(
              'rounded-xl px-3 py-1.5 text-[12px] font-black transition-colors',
              subject === t.key ? 'bg-brand-500 text-white' : 'bg-ink/5 text-ink-soft',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {toast && (
        <p className="rounded-2xl bg-brand-50 px-3.5 py-2.5 text-[12px] font-bold text-brand-700">{toast}</p>
      )}

      {shown.length === 0 ? (
        <Card className="text-center">
          <Upload size={28} className="mx-auto text-ink-faint" strokeWidth={2} />
          <p className="mt-2 text-[13px] font-black text-ink">上传本还是空的</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
            去「上传试卷 · AI 解析」传一份卷子，解析出来的题会自动收进这里，
            并顺带提炼出公式与技巧存进公式本。
          </p>
          <button
            onClick={() => nav('/paper/math')}
            className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-brand-500 px-4 py-2.5 text-[12px] font-black text-white"
          >
            <Upload size={14} strokeWidth={2.8} /> 去上传试卷
          </button>
        </Card>
      ) : (
        groups.map((g) => (
          <section key={`${g.subject}-${g.chapter}`}>
            <SectionTitle
              action={
                <span className="text-xs font-black text-ink-faint">
                  {UPLOAD_SUBJECT_LABEL[g.subject]} · {g.list.length} 题
                </span>
              }
            >
              {chapterFullNameOf(g.subject, g.chapter)}
            </SectionTitle>
            <div className="space-y-2">
              {g.list.map((q) => (
                <UploadCard key={q.id} q={q} onRemove={() => remove(q.id)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function UploadCard({ q, onRemove }: { q: UploadQuestion; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-pop-sm">
      <div className="flex items-start gap-2">
        <BookOpenCheck size={15} className="mt-0.5 shrink-0 text-brand-500" strokeWidth={2.6} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {q.no && (
              <span className="rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] font-black text-ink-faint">
                {q.no}
              </span>
            )}
            <span className="truncate text-[10px] text-ink-faint">{q.sourceName}</span>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="mt-1.5 block w-full text-left">
            <span className={clsx('text-[13px] font-bold leading-relaxed text-ink', !open && 'line-clamp-3')}>
              <MathText>{q.stem}</MathText>
            </span>
          </button>

          {open && (
            <div className="mt-2 space-y-2 rounded-xl bg-ink/3 p-3">
              {q.options?.length ? (
                <ul className="space-y-0.5">
                  {q.options.map((o, i) => (
                    <li key={i} className="text-[12px] leading-relaxed text-ink-soft">
                      <span className="font-black">{String.fromCharCode(65 + i)}.</span> <MathText>{o}</MathText>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div>
                <p className="text-[10px] font-black text-ink-faint">答案</p>
                <p className="mt-0.5 text-[12px] font-black text-mint-700">
                  <MathText>{q.answerText || '（未解析出答案）'}</MathText>
                </p>
              </div>
              {q.steps.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-ink-faint">解析</p>
                  <ol className="mt-1 space-y-1">
                    {q.steps.map((s, i) => (
                      <li key={i} className="text-[12px] leading-relaxed text-ink-soft">
                        <span className="font-black">{i + 1}.</span> <MathText>{s.text}</MathText>
                        {s.math && <MathBlock>{s.math}</MathBlock>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onRemove} aria-label="移除" className="shrink-0 rounded-lg p-1.5 text-ink-faint active:bg-ink/5">
          <Trash2 size={15} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
