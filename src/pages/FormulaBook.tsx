import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  Check,
  Copy,
  Lightbulb,
  Sigma,
  Trash2,
} from 'lucide-react';
import { SectionTitle } from '../components/ui';
import {
  SUBJECT_LABEL,
  chapterLabel,
  sortBySyllabus,
  useFormulaBookStore,
  type FormulaEntry,
  type FormulaSubject,
} from '../store/useFormulaBookStore';

type Filter = 'all' | FormulaSubject;

export default function FormulaBook() {
  const nav = useNavigate();
  const entries = useFormulaBookStore((s) => s.entries);
  const remove = useFormulaBookStore((s) => s.remove);
  const clear = useFormulaBookStore((s) => s.clear);
  const [filter, setFilter] = useState<Filter>('all');
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const formulaCount = entries.filter((e) => e.kind === 'formula').length;
  const tipCount = entries.filter((e) => e.kind === 'tip').length;

  /** 过滤 + 按考纲顺序排 + 按章节分组 */
  const groups = useMemo(() => {
    const list = filter === 'all' ? entries : entries.filter((e) => e.subject === filter);
    const sorted = sortBySyllabus(list);
    const out: { label: string; subject: FormulaSubject; items: FormulaEntry[] }[] = [];
    for (const e of sorted) {
      const label = chapterLabel(e);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(e);
      else out.push({ label, subject: e.subject, items: [e] });
    }
    return out;
  }, [entries, filter]);

  /** 复制成纯文本，方便贴到别处复习 */
  const copyAll = async () => {
    const lines: string[] = ['漫记 · 公式与技巧速查', ''];
    for (const g of groups) {
      lines.push(`【${g.label}】`);
      for (const e of g.items) {
        lines.push(`${e.kind === 'formula' ? '公式' : '技巧'}：${e.text}`);
        if (e.note) lines.push(`  说明：${e.note}`);
      }
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };

  const filters: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: '全部', n: entries.length },
    { key: 'math', label: '数学', n: entries.filter((e) => e.subject === 'math').length },
    { key: 'cs', label: '计算机', n: entries.filter((e) => e.subject === 'cs').length },
  ];

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-ink/5 bg-cream/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => nav(-1)} className="btn-pop rounded-xl p-1.5 text-ink-soft">
            <ArrowLeft size={20} strokeWidth={2.8} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink">公式本 · 技巧本</p>
            <p className="text-[11px] text-ink-faint">
              {formulaCount} 条公式 · {tipCount} 条技巧 · 按考纲顺序
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={copyAll}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-black text-brand-600"
            >
              {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={13} strokeWidth={2.8} />}
              {copied ? '已复制' : '复制全部'}
            </button>
          )}
        </div>

        {/* 筛选 */}
        {entries.length > 0 && (
          <div className="flex gap-2 px-4 pb-3">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-black transition-colors ${
                  filter === f.key ? 'bg-brand-500 text-white' : 'bg-ink/6 text-ink-soft'
                }`}
              >
                {f.label}
                <span className="ml-1 opacity-70">{f.n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-lg px-4 pb-10 pt-4">
        {entries.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-500">
              <BookMarked size={28} strokeWidth={2.2} />
            </span>
            <p className="text-sm font-black text-ink">公式本还是空的</p>
            <p className="max-w-[16rem] text-[12px] leading-relaxed text-ink-faint">
              上传一份试卷让 AI 解析，或者在做题时点「让 AI 讲讲」，
              核心公式和解题技巧会自动收集到这里，同一条不会重复记。
            </p>
            <button
              onClick={() => nav('/paper/math')}
              className="mt-1 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-black text-white shadow-pop btn-pop"
            >
              上传试卷
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g, gi) => (
              <section key={`${g.label}-${gi}`} className="space-y-2">
                <SectionTitle
                  action={
                    <span className="text-[10px] font-black text-ink-faint">
                      {SUBJECT_LABEL[g.subject]} · {g.items.length} 条
                    </span>
                  }
                >
                  {g.label}
                </SectionTitle>

                <div className="space-y-2">
                  {g.items.map((e) => (
                    <div key={e.id} className="card group relative p-3.5 pr-10">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        {e.kind === 'formula' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black text-brand-700">
                            <Sigma size={10} strokeWidth={3} />
                            公式
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-black text-sun-700">
                            <Lightbulb size={10} strokeWidth={3} />
                            技巧
                          </span>
                        )}
                        {e.from && (
                          <span className="truncate text-[10px] text-ink-faint">来自 {e.from}</span>
                        )}
                      </div>

                      <p
                        className={`whitespace-pre-wrap text-[13px] font-bold leading-relaxed text-ink ${
                          e.kind === 'formula' ? 'font-mono' : ''
                        }`}
                      >
                        {e.text}
                      </p>
                      {e.note && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                          {e.note}
                        </p>
                      )}

                      <button
                        onClick={() => remove(e.id)}
                        aria-label="删除这条"
                        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-ink-faint active:bg-coral-50 active:text-coral-500"
                      >
                        <Trash2 size={15} strokeWidth={2.4} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* 危险操作 */}
            <section className="pt-2">
              {confirmClear ? (
                <div className="card space-y-3 p-4">
                  <p className="text-sm font-black text-coral-600">
                    确定清空{filter === 'all' ? '全部' : SUBJECT_LABEL[filter]}记录？
                  </p>
                  <p className="text-xs text-ink-soft">清掉后无法恢复。</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="rounded-xl bg-ink/6 px-3 py-1.5 text-xs font-black text-ink-soft"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        clear(filter === 'all' ? undefined : filter);
                        setConfirmClear(false);
                      }}
                      className="rounded-xl bg-coral-500 px-3 py-1.5 text-xs font-black text-white"
                    >
                      确认清空
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full rounded-2xl bg-white py-3 text-sm font-black text-coral-600 shadow-pop-sm btn-pop"
                >
                  清空{filter === 'all' ? '全部' : SUBJECT_LABEL[filter]}记录
                </button>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
