/**
 * 题库后台 · 题库列表与人工复核。
 *
 * ── 三个页签 ──
 *   待审（pending）   刚入库还没校验的
 *   存疑（doubtful）  校验发现问题，需要人看一眼
 *   已上线（live）    用户能刷到的
 *
 * ── 为什么要「批量放行」 ──
 * AI 出的题只有走过「人看一眼」才上线，但一条条点会很慢。
 * 给一个全选 + 一键放行，让复核不成为瓶颈。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { Button, Card, Chip } from '../../components/ui';
import { MathBlock, MathText } from '../../components/MathText';
import { VerdictBadge, verdictStyle } from '../../components/admin/AdminKit';
import { api } from '../../lib/api';
import { useQuestionBankStore } from '../../store/useQuestionBankStore';
import { chapterFullNameOf, kindNameOf } from '../../lib/bankMeta';
import type { BankQuestion, QuestionStatus } from '../../types';

type Tab = 'pending' | 'doubtful' | 'live';

const TABS: { key: Tab; label: string; icon: typeof CheckCircle2 }[] = [
  { key: 'pending', label: '待审', icon: RefreshCw },
  { key: 'doubtful', label: '存疑', icon: AlertTriangle },
  { key: 'live', label: '已上线', icon: CheckCircle2 },
];

const SUBJECTS = [
  { key: '', label: '全部' },
  { key: 'math', label: '数学' },
  { key: 'cs', label: '计算机' },
  { key: 'cet4', label: '英语' },
];

export default function BankList() {
  const nav = useNavigate();
  const bankRefresh = useQuestionBankStore((s) => s.refresh);

  const [tab, setTab] = useState<Tab>('pending');
  const [subject, setSubject] = useState('');
  const [rows, setRows] = useState<BankQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = (await api.bankList({ subject: subject || undefined, status: tab, limit: 100 })) as {
        total: number;
        questions: BankQuestion[];
      };
      setRows(res.questions ?? []);
      setTotal(res.total ?? 0);
      setSelected(new Set());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [subject, tab]);

  const loadStats = useCallback(async () => {
    try {
      const r = (await api.bankStats()) as { byStatus: Record<string, Record<string, number>> };
      setStats(r.byStatus ?? {});
    } catch {
      /* 概览拉不到不影响主流程 */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const review = async (status: QuestionStatus) => {
    if (!selected.size) return;
    setBusy(true);
    try {
      const r = (await api.bankReview([...selected], status)) as { updated: number };
      setToast(`已把 ${r.updated} 题置为「${labelOf(status)}」`);
      await load();
      await loadStats();
      // 放行后要让用户端能立刻拿到新题
      if (status === 'live') await bankRefresh({ force: true });
    } catch (e) {
      setToast(`操作失败：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected.size) return;
    const go = window.confirm(`确定删除选中的 ${selected.size} 题？此操作不可撤销。`);
    if (!go) return;
    setBusy(true);
    try {
      const r = (await api.bankDelete([...selected])) as { deleted: number };
      setToast(`已删除 ${r.deleted} 题`);
      await load();
      await loadStats();
    } catch (e) {
      setToast(`删除失败：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const liveTotal = Object.values(stats).reduce((s, m) => s + (m.live ?? 0), 0);
  const pendingTotal = Object.values(stats).reduce((s, m) => s + (m.pending ?? 0), 0);
  const doubtfulTotal = Object.values(stats).reduce((s, m) => s + (m.doubtful ?? 0), 0);

  return (
    <div className="min-h-screen bg-ink/2 pb-24">
      {/* 顶栏 */}
      <div className="sticky top-0 z-20 border-b border-ink/6 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <button
            onClick={() => nav('/stats')}
            className="rounded-xl p-1.5 active:bg-ink/5"
            aria-label="返回"
          >
            <ArrowLeft size={20} strokeWidth={2.6} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black text-ink">题库管理</p>
            <p className="text-[11px] text-ink-faint">
              线上 {liveTotal + pendingTotal + doubtfulTotal} 题 · 已上线 {liveTotal}
            </p>
          </div>
          <Link
            to="/admin/bank"
            className="inline-flex items-center gap-1 rounded-xl bg-brand-500 px-3 py-2 text-[12px] font-black text-white active:bg-brand-600"
          >
            <Plus size={14} strokeWidth={3} />
            出题
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-4 pt-4">
        {/* 概览 */}
        <Card>
          <div className="flex gap-3">
            {[
              { label: '待审', value: pendingTotal, tone: 'text-ink' },
              { label: '存疑', value: doubtfulTotal, tone: 'text-sun-600' },
              { label: '已上线', value: liveTotal, tone: 'text-mint-600' },
            ].map((x) => (
              <div key={x.label} className="flex-1 text-center">
                <p className={clsx('text-xl font-black', x.tone)}>{x.value}</p>
                <p className="mt-0.5 text-[10px] font-bold text-ink-faint">{x.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 页签 */}
        <div className="flex gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.key;
            const n =
              t.key === 'pending' ? pendingTotal : t.key === 'doubtful' ? doubtfulTotal : liveTotal;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 py-2.5 text-[13px] font-black transition-colors',
                  on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink/8 bg-white text-ink-soft',
                )}
              >
                <Icon size={14} strokeWidth={2.8} />
                {t.label}
                {n > 0 && <span className="text-[11px] opacity-60">{n}</span>}
              </button>
            );
          })}
        </div>

        {/* 科目筛选 */}
        <div className="flex gap-1.5">
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSubject(s.key)}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-[12px] font-black transition-colors',
                subject === s.key ? 'bg-ink text-white' : 'bg-ink/6 text-ink-soft',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 批量操作条 */}
        <Card className="!p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setSelected(
                  selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
                )
              }
              className="text-[12px] font-black text-brand-600"
            >
              {selected.size === rows.length && rows.length ? '全不选' : '全选'}
            </button>
            <span className="text-[12px] font-bold text-ink-faint">
              已选 {selected.size} / {rows.length}
            </span>
            <div className="flex-1" />
            <button
              onClick={load}
              className="rounded-xl p-1.5 active:bg-ink/5"
              aria-label="刷新"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin text-ink-faint" />
              ) : (
                <RefreshCw size={16} className="text-ink-faint" strokeWidth={2.8} />
              )}
            </button>
          </div>

          {selected.size > 0 && (
            <div className="mt-2.5 flex gap-2">
              {tab !== 'live' && (
                <Button
                  size="sm"
                  variant="mint"
                  block
                  icon={<CheckCircle2 size={15} strokeWidth={2.8} />}
                  onClick={() => review('live')}
                  disabled={busy}
                >
                  放行上线
                </Button>
              )}
              <Button
                size="sm"
                variant="sun"
                block
                icon={<AlertTriangle size={15} strokeWidth={2.8} />}
                onClick={() => review('doubtful')}
                disabled={busy || tab === 'doubtful'}
              >
                标记存疑
              </Button>
              <Button
                size="sm"
                variant="coral"
                block
                icon={<Trash2 size={15} strokeWidth={2.8} />}
                onClick={remove}
                disabled={busy}
              >
                删除
              </Button>
            </div>
          )}
        </Card>

        {err && (
          <Card className="!bg-coral-50">
            <p className="text-[12px] font-bold text-coral-600">{err}</p>
          </Card>
        )}

        {/* 列表 */}
        {rows.length === 0 && !loading ? (
          <Card className="text-center">
            <p className="text-[13px] font-black text-ink">
              这个页签下还没有题目
            </p>
            <p className="mt-1 text-[11px] text-ink-faint">
              {tab === 'pending'
                ? '去「出题」页生成一批，或导入题库。'
                : tab === 'doubtful'
                  ? '校验有疑问的题会出现在这里。'
                  : '放行通过的题后，它们会出现在这里并对用户可见。'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((q) => (
              <QCard key={q.id} q={q} checked={selected.has(q.id)} onToggle={() => toggle(q.id)} />
            ))}
          </div>
        )}

        {total > rows.length && (
          <p className="py-2 text-center text-[11px] text-ink-faint">
            共 {total} 题，当前显示前 {rows.length} 题
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-30 mx-auto max-w-lg px-4">
          <div className="pop-in flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 shadow-pop">
            <span className="min-w-0 flex-1 text-[12px] font-bold leading-relaxed text-white">
              {toast}
            </span>
            <button
              onClick={() => setToast('')}
              className="shrink-0 text-[12px] font-black text-white/70"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ 单题卡片 ═══════════════ */

function QCard({
  q,
  checked,
  onToggle,
}: {
  q: BankQuestion;
  checked: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const verdict = q.status === 'live' || q.status === 'passed'
    ? 'passed'
    : q.status === 'doubtful'
      ? 'doubtful'
      : 'rejected';
  const s = verdictStyle(verdict);

  return (
    <div
      className={clsx(
        'rounded-2xl border-2 p-3',
        checked ? 'border-brand-400 bg-brand-50/40' : 'border-ink/8 bg-white',
      )}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <VerdictBadge verdict={verdict} />
            <Chip tone="gray">
              {q.subject === 'math' ? '数学' : q.subject === 'cs' ? '计算机' : '英语'}
            </Chip>
            <Chip tone="brand">{kindNameOf(q.subject, q.kind)}</Chip>
            <Chip tone="gray">{chapterFullNameOf(q.subject, q.chapter)}</Chip>
          </div>

          <button onClick={() => setOpen((v) => !v)} className="mt-2 flex w-full items-start gap-1 text-left">
            <span className="min-w-0 flex-1 text-[13px] font-bold leading-relaxed text-ink">
              <MathText>{q.stem}</MathText>
            </span>
            <ChevronDown
              size={15}
              strokeWidth={2.8}
              className={clsx('mt-0.5 shrink-0 text-ink-faint transition-transform', open && 'rotate-180')}
            />
          </button>

          {q.reviewNote && (
            <p className={clsx('mt-1.5 text-[11px] leading-relaxed', s.text)}>{q.reviewNote}</p>
          )}

          {open && <Expanded q={q} />}
        </div>
      </div>
    </div>
  );
}

function Expanded({ q }: { q: BankQuestion }) {
  return (
    <div className="mt-3 space-y-2.5 rounded-2xl bg-ink/3 p-3">
      {q.material && (
        <div>
          <p className="text-[10px] font-black text-ink-faint">材料</p>
          <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-ink-soft">
            {q.material}
          </p>
        </div>
      )}

      {q.options?.length ? (
        <div>
          <p className="text-[10px] font-black text-ink-faint">选项</p>
          <ul className="mt-1 space-y-0.5">
            {q.options.map((o, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-ink-soft">
                <span className="font-black">{String.fromCharCode(65 + i)}.</span>{' '}
                <MathText>{o}</MathText>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-[10px] font-black text-ink-faint">标准答案</p>
        <p className="mt-0.5 text-[12px] font-black text-mint-700">
          <MathText>{q.answerText}</MathText>
        </p>
      </div>

      {q.steps.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-ink-faint">解析</p>
          <ol className="mt-1 space-y-1.5">
            {q.steps.map((st, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-ink-soft">
                <span className="font-black">{i + 1}.</span> <MathText>{st.text}</MathText>
                {st.math && <MathBlock>{st.math}</MathBlock>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(q.tip || q.pitfall) && (
        <div className="space-y-0.5">
          {q.tip && <p className="text-[11px] leading-relaxed text-grape-600">技巧：{q.tip}</p>}
          {q.pitfall && (
            <p className="text-[11px] leading-relaxed text-coral-600">易错：{q.pitfall}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-ink/8 pt-2">
        <Chip tone="gray">来源 {q.source}</Chip>
        <Chip tone="gray">{q.difficulty === 'easy' ? '较易' : q.difficulty === 'hard' ? '较难' : '中等'}</Chip>
        {q.point && <Chip tone="mint">{q.point}</Chip>}
        <Chip tone="gray">{q.id}</Chip>
      </div>
    </div>
  );
}

function labelOf(s: QuestionStatus): string {
  return { pending: '待审', passed: '通过', doubtful: '存疑', rejected: '驳回', live: '已上线' }[s];
}
