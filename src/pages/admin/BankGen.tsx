/**
 * 题库后台 · AI 批量出题台。
 *
 * ═══════════════════════════════════════════════════════════════
 *  四段式布局
 * ═══════════════════════════════════════════════════════════════
 *   ① 生成维度选择（科目 → 章节 → 考点 → 题型 → 难度 → 数量）
 *   ② 逐题流式进度（可中止）
 *   ③ 结果预览与校验状态（通过 / 存疑 / 驳回）
 *   ④ 一键入库
 *
 * ── 两个必须有的提示 ──
 *   · 「预计消耗额度」：一题一调用意味着生成 50 题就吃掉 50 次调用，
 *     而日配额默认只有 200。不提示用户会点完才发现额度没了。
 *   · 「校验状态图例」：✅⚠️❌ 没有图例用户看不懂。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Bot,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { Button, Card, Chip, ProgressBar, SectionTitle } from '../../components/ui';
import { MathBlock, MathText } from '../../components/MathText';
import {
  ChipMulti,
  ChipRow,
  NumberField,
  SelectField,
  StatSegments,
  VerdictBadge,
  verdictStyle,
  type Option,
} from '../../components/admin/AdminKit';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useQuestionBankStore } from '../../store/useQuestionBankStore';
import { api } from '../../lib/api';
import { generateBatch, estimateCalls, type GenProgress, type GenResult, type GenSpec } from '../../lib/gen';
import { chaptersOf, kindsOf, kindNameOf, chapterFullNameOf, MODE_TO_KIND } from '../../lib/bankMeta';
import type { BankQuestion, Difficulty } from '../../types';

type Subject = 'math' | 'cs' | 'cet4';
type DiffChoice = Difficulty | 'mix';

const SUBJECT_OPTIONS: Option<Subject>[] = [
  { value: 'math', label: '数学', desc: '高数 + 线代' },
  { value: 'cs', label: '计算机', desc: '课程 A + B' },
  { value: 'cet4', label: '英语', desc: '四级' },
];

const DIFF_OPTIONS: Option<DiffChoice>[] = [
  { value: 'easy', label: '较易', desc: '30% 档' },
  { value: 'mid', label: '中等', desc: '50% 档' },
  { value: 'hard', label: '较难', desc: '20% 档' },
  { value: 'mix', label: '混合', desc: '按考纲比例' },
];

const COUNT_PRESETS = [5, 10, 20, 50];

export default function BankGen() {
  const nav = useNavigate();
  const ai = useSettingsStore((s) => s.ai);
  const bankRefresh = useQuestionBankStore((s) => s.refresh);

  /* ── 维度 ── */
  const [subject, setSubject] = useState<Subject>('math');
  const [chapter, setChapter] = useState<string>('limit');
  const [kinds, setKinds] = useState<string[]>(['calc']);
  const [difficulty, setDifficulty] = useState<DiffChoice>('mix');
  const [count, setCount] = useState(10);
  const [verifyAI, setVerifyAI] = useState(true);

  /* ── 运行态 ── */
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, message: '' });
  const [results, setResults] = useState<GenResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ingesting, setIngesting] = useState(false);
  const [toast, setToast] = useState('');

  const cancelRef = useRef(false);

  /* ── 科目切换时，章节与题型要跟着重置 ── */
  useEffect(() => {
    const chs = chaptersOf(subject);
    if (!chs.includes(chapter)) setChapter(chs[0]);
    const ks = kindsOf(subject);
    const validKinds = ks.length ? ks : Object.values(MODE_TO_KIND[subject]).flat();
    setKinds((cur) => {
      const keep = cur.filter((k) => validKinds.includes(k));
      return keep.length ? keep : [validKinds[0]];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  const chapterOptions = useMemo(
    () => chaptersOf(subject).map((k) => ({ value: k, label: chapterFullNameOf(subject, k) })),
    [subject],
  );

  const kindOptions = useMemo<Option<string>[]>(() => {
    const ks = kindsOf(subject);
    if (ks.length) return ks.map((k) => ({ value: k, label: kindNameOf(subject, k) }));
    // 四级没有独立题型维度，用「客观 / 主观」两组表达
    return [
      { value: 'careful', label: '客观题' },
      { value: 'writing', label: '翻译 / 写作' },
    ];
  }, [subject]);

  /* 每个题型要出多少题：总数按选中的题型均分 */
  const specs = useMemo<GenSpec[]>(() => {
    if (!kinds.length) return [];
    const each = Math.max(1, Math.floor(count / kinds.length));
    const list = kinds.map((k) => ({
      subject,
      chapter,
      kind: k,
      difficulty: difficulty as Difficulty | 'mix',
      count: each,
    }));
    // 余数补给第一个题型，保证总量对得上
    const used = each * kinds.length;
    if (used < count && list.length) list[0].count += count - used;
    return list;
  }, [subject, chapter, kinds, difficulty, count]);

  const estimated = useMemo(
    () => specs.reduce((sum, s) => sum + estimateCalls(s, verifyAI), 0),
    [specs, verifyAI],
  );

  const [quotaLeft, setQuotaLeft] = useState<number | null>(null);
  useEffect(() => {
    api
      .aiStatus()
      .then((r: { quotaLeft?: number }) => setQuotaLeft(r?.quotaLeft ?? null))
      .catch(() => setQuotaLeft(null));
  }, []);

  /* ── 统计 ── */
  const stats = useMemo(() => {
    let ok = 0;
    let doubtful = 0;
    let rejected = 0;
    for (const r of results) {
      if (r.verdict === 'passed') ok += 1;
      else if (r.verdict === 'doubtful') doubtful += 1;
      else rejected += 1;
    }
    return { ok, doubtful, rejected, total: results.length };
  }, [results]);

  /* ── 开始生成 ── */
  const start = async () => {
    if (running || !specs.length) return;

    if (estimated > (quotaLeft ?? 0)) {
      const go = window.confirm(
        `本次预计消耗约 ${estimated} 次 AI 调用，但今日剩余额度只有 ${quotaLeft ?? 0} 次。\n` +
          '额度会在中途耗尽，后面的题会失败。是否继续？',
      );
      if (!go) return;
    }

    cancelRef.current = false;
    setRunning(true);
    setResults([]);
    setErrors([]);
    setSelected(new Set());
    setToast('');

    const total = specs.reduce((s, x) => s + x.count, 0);
    setProgress({ done: 0, total, message: '准备中…' });

    // 去重候选：拉一次已有题库（静态 + 线上已在 store 里）
    const existing = collectExisting(subject);

    const all: GenResult[] = [];
    const allErrors: string[] = [];
    let doneSoFar = 0;

    for (const spec of specs) {
      if (cancelRef.current) break;

      const outcome = await generateBatch(ai, spec, {
        existing,
        verifyWithAI: verifyAI,
        shouldCancel: () => cancelRef.current,
        onProgress: (p: GenProgress) => {
          if (p.item) {
            all.push(p.item);
            existing.push({ id: p.item.question.id, stem: p.item.question.stem });
            setResults([...all]);
          }
          setProgress({
            done: doneSoFar + p.done,
            total,
            message: `${kindNameOf(subject, spec.kind)} · ${p.message}`,
          });
        },
      });

      doneSoFar += spec.count;
      allErrors.push(...outcome.errors);
      setErrors([...allErrors]);
    }

    setRunning(false);
    setProgress((p) => ({ ...p, message: '生成结束' }));

    // 默认勾选所有「通过」的题，方便一键入库
    setSelected(new Set(all.filter((r) => r.verdict === 'passed').map((r) => r.question.id)));
  };

  /* ── 中止 ── */
  const stop = () => {
    cancelRef.current = true;
    setProgress((p) => ({ ...p, message: '正在中止…' }));
  };

  /* ── 入库 ── */
  const ingest = async (mode: 'selected' | 'passed') => {
    const pool =
      mode === 'passed'
        ? results.filter((r) => r.verdict === 'passed')
        : results.filter((r) => selected.has(r.question.id));

    if (!pool.length) {
      setToast('没有可入库的题目');
      return;
    }

    setIngesting(true);
    try {
      const payload = pool.map((r) => ({
        ...r.question,
        status: r.verdict === 'passed' ? 'live' : r.verdict,
        reviewNote: r.reasons.join('；') || undefined,
      }));

      const res = (await api.bankIngest(payload, {
        subject,
        chapter,
        kinds,
        difficulties: [difficulty],
        target: pool.length,
      })) as { inserted: number; skipped: number; failed: unknown[] };

      setToast(
        `入库 ${res.inserted} 题` +
          (res.skipped ? `，跳过重复 ${res.skipped} 题` : '') +
          (res.failed?.length ? `，失败 ${res.failed.length} 题` : ''),
      );
      await bankRefresh({ force: true });
    } catch (e) {
      setToast(`入库失败：${(e as Error).message}`);
    } finally {
      setIngesting(false);
    }
  };

  /* ── 丢弃 ── */
  const discardRejected = () => {
    const kept = results.filter((r) => r.verdict !== 'rejected');
    setResults(kept);
    setSelected((s) => {
      const next = new Set(s);
      for (const r of results) if (r.verdict === 'rejected') next.delete(r.question.id);
      return next;
    });
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
            <p className="text-[15px] font-black text-ink">AI 批量出题</p>
            <p className="text-[11px] text-ink-faint">
              今日剩余额度 {quotaLeft == null ? '—' : quotaLeft} 次
            </p>
          </div>
          <Link
            to="/admin/bank/list"
            className="inline-flex items-center gap-1 rounded-xl bg-ink/5 px-3 py-2 text-[12px] font-black text-ink-soft active:bg-ink/10"
          >
            <ClipboardList size={14} strokeWidth={2.8} />
            题库
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* ═══ ① 生成维度 ═══ */}
        <Card>
          <SectionTitle
            action={<Settings2 size={15} className="text-ink-faint" strokeWidth={2.8} />}
          >
            生成维度
          </SectionTitle>

          <div className="mt-3 space-y-4">
            <Field label="科目">
              <ChipRow options={SUBJECT_OPTIONS} value={subject} onChange={setSubject} />
            </Field>

            <Field label="章节">
              <SelectField value={chapter} onChange={setChapter} options={chapterOptions} />
            </Field>

            <Field label="题型" hint="可多选，总量均分到每个题型">
              <ChipMulti
                options={kindOptions}
                value={kinds}
                onChange={(v) => setKinds(v.length ? v : kinds)}
              />
            </Field>

            <Field label="难度">
              <ChipRow options={DIFF_OPTIONS} value={difficulty} onChange={setDifficulty} />
            </Field>

            <Field label="数量">
              <div className="flex flex-wrap items-center gap-2">
                {COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={clsx(
                      'rounded-xl px-3.5 py-2 text-[13px] font-black transition-colors',
                      count === n ? 'bg-brand-500 text-white' : 'bg-ink/6 text-ink-soft',
                    )}
                  >
                    {n}
                  </button>
                ))}
                <NumberField value={count} onChange={setCount} min={1} max={300} suffix="题" />
              </div>
            </Field>

            <label className="flex items-center gap-2.5 rounded-2xl bg-ink/3 px-3.5 py-3">
              <input
                type="checkbox"
                checked={verifyAI}
                onChange={(e) => setVerifyAI(e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-black text-ink">AI 独立复算校验</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-ink-faint">
                  让模型不带答案重做一遍，不一致的标为「存疑」。会让调用次数翻倍。
                </span>
              </span>
            </label>

            {/* 额度预估 —— 必须显示，否则用户点完才发现额度没了 */}
            <div className="rounded-2xl bg-sun-50 px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black text-sun-600">预计消耗 AI 额度</span>
                <span className="text-[13px] font-black text-sun-600">约 {estimated} 次</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-sun-600/80">
                {count} 题会被拆成 {specs.length} 个题型 × 每批 1~5 题串行生成
                {verifyAI ? '，客观题还要各复算一次' : ''}。
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {running ? (
              <Button variant="coral" block icon={<Ban size={18} strokeWidth={2.8} />} onClick={stop}>
                中止生成
              </Button>
            ) : (
              <Button
                variant="primary"
                block
                icon={<Sparkles size={18} strokeWidth={2.8} />}
                onClick={start}
                disabled={!specs.length}
              >
                开始生成
              </Button>
            )}
          </div>
        </Card>

        {/* ═══ ② 生成进度 ═══ */}
        {(running || progress.total > 0) && (
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black text-ink">
                {running ? '生成中…' : '生成结束'}
                <span className="ml-2 text-ink-faint">
                  {Math.min(progress.done, progress.total)} / {progress.total}
                </span>
              </span>
              {running && <Loader2 size={16} className="animate-spin text-brand-500" />}
            </div>

            <ProgressBar
              className="mt-2.5"
              value={progress.total ? progress.done / progress.total : 0}
              barClass="bg-brand-500"
            />

            <p className="mt-2 text-[11px] font-bold text-ink-faint">{progress.message}</p>

            {(errors.length > 0 || stats.total > 0) && (
              <div className="mt-3 rounded-2xl bg-ink/3 p-3">
                <StatSegments
                  items={[
                    { label: '通过', value: stats.ok, tone: 'text-mint-600' },
                    { label: '存疑', value: stats.doubtful, tone: 'text-sun-600' },
                    { label: '驳回', value: stats.rejected, tone: 'text-coral-600' },
                    { label: '失败批次', value: errors.length, tone: 'text-ink-faint' },
                  ]}
                />
              </div>
            )}

            {errors.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[12px] font-black text-coral-600">
                  失败明细（{errors.length}）
                </summary>
                <ul className="mt-2 space-y-1">
                  {errors.map((e, i) => (
                    <li key={i} className="text-[11px] leading-relaxed text-ink-soft">
                      · {e}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        )}

        {/* ═══ ③ 结果预览 ═══ */}
        {results.length > 0 && (
          <Card>
            <SectionTitle
              action={
                <button
                  onClick={discardRejected}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-coral-600"
                  disabled={!stats.rejected}
                >
                  <Trash2 size={13} strokeWidth={2.8} />
                  清掉被驳回的
                </button>
              }
            >
              生成结果
            </SectionTitle>

            {/* 图例 —— 没有它用户看不懂 ✅⚠️❌ */}
            <div className="mt-2.5 flex flex-wrap gap-2">
              <VerdictBadge verdict="passed" />
              <VerdictBadge verdict="doubtful" />
              <VerdictBadge verdict="rejected" />
              <span className="inline-flex items-center rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-ink-faint">
                点题干展开解析
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {results.map((r) => (
                <ResultCard
                  key={r.question.id}
                  r={r}
                  checked={selected.has(r.question.id)}
                  onToggle={() => toggle(r.question.id)}
                />
              ))}
            </div>
          </Card>
        )}

        {/* ═══ ④ 入库 ═══ */}
        {results.length > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black text-ink">
                已勾选 {selected.size} / {results.length}
              </span>
              <button
                onClick={() =>
                  setSelected(
                    selected.size === results.length
                      ? new Set()
                      : new Set(results.map((r) => r.question.id)),
                  )
                }
                className="text-[12px] font-black text-brand-600"
              >
                {selected.size === results.length ? '全不选' : '全选'}
              </button>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
              入库后「通过」的题直接对用户可见；「存疑」的进复核队列，需要你在题库页确认。
            </p>

            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                block
                icon={<Package size={17} strokeWidth={2.8} />}
                onClick={() => ingest('selected')}
                disabled={ingesting || !selected.size}
              >
                入库勾选的
              </Button>
              <Button
                variant="mint"
                block
                icon={
                  ingesting ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={17} strokeWidth={2.8} />
                  )
                }
                onClick={() => ingest('passed')}
                disabled={ingesting || !stats.ok}
              >
                只入通过的
              </Button>
            </div>
          </Card>
        )}

        {results.length === 0 && !running && (
          <Card className="text-center">
            <Bot size={30} className="mx-auto text-ink-faint" strokeWidth={2} />
            <p className="mt-2 text-[13px] font-black text-ink">还没有生成结果</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              选好维度后点「开始生成」。每道题都会自动生成标准答案与分步解析，
              并做去重、结构校验、答案自洽校验（可选 AI 复算）。
            </p>
          </Card>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-30 mx-auto max-w-lg px-4">
          <div className="pop-in flex items-center gap-2 rounded-2xl bg-ink px-4 py-3 shadow-pop">
            <RefreshCw size={15} className="shrink-0 text-white" strokeWidth={2.8} />
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

/* ═══════════════ 子组件 ═══════════════ */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[12px] font-black text-ink">{label}</span>
        {hint && <span className="text-[10px] text-ink-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ResultCard({
  r,
  checked,
  onToggle,
}: {
  r: GenResult;
  checked: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const s = verdictStyle(r.verdict);
  const q = r.question;

  return (
    <div className={clsx('rounded-2xl border-2 p-3', checked ? 'border-brand-400 bg-brand-50/40' : 'border-ink/8 bg-white')}>
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <VerdictBadge verdict={r.verdict} />
            <Chip tone="gray">{q.difficulty === 'easy' ? '较易' : q.difficulty === 'hard' ? '较难' : '中等'}</Chip>
            {q.point && <Chip tone="brand">{q.point}</Chip>}
            {typeof r.sim === 'number' && r.sim > 0.5 && (
              <Chip tone="sun">相似 {r.sim.toFixed(2)}</Chip>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 block w-full text-left"
          >
            <span className="line-clamp-3 text-[13px] font-bold leading-relaxed text-ink">
              {q.stem}
            </span>
          </button>

          {/* 驳回 / 存疑的原因要写清楚，不然用户不知道该改什么 */}
          {r.reasons.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {r.reasons.map((x, i) => (
                <li key={i} className={clsx('text-[11px] leading-relaxed', s.text)}>
                  · {x}
                </li>
              ))}
            </ul>
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
                {/* 公式单独占行居中 —— 与正式答题页的排版规范一致 */}
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
    </div>
  );
}

/* ═══════════════ 去重候选收集 ═══════════════ */

/**
 * 收集同科目同章节的已有题，作为去重候选。
 *
 * 范围刻意收窄：只取**同科目**的题，因为跨科目的题干永远不同
 * （数学题不会和计算机题重复），放开只会增加无谓的计算量。
 * 章节也不收窄 —— AI 经常把题归错章，只比同章会漏掉重复。
 */
function collectExisting(subject: Subject): { id: string; stem: string }[] {
  const s = useQuestionBankStore.getState();
  const out: { id: string; stem: string }[] = [];

  if (subject === 'math') {
    for (const q of s.math) out.push({ id: q.id, stem: q.stem });
  } else if (subject === 'cs') {
    for (const q of s.cs) out.push({ id: q.id, stem: q.stem });
  } else {
    for (const q of s.cet4) out.push({ id: q.id, stem: q.stem });
  }

  return out;
}
