/**
 * 公式本 / 技巧本。
 *
 * 【本轮改动重点】
 *   · 公式卡片**直接渲染公式本体**（不是把公式当普通文字排），
 *     辅以名称、适用场景、所属章节、来源题目
 *   · 技法卡片显示技巧结论 + 具体操作方法，辅以适用题型、来源题目
 *   · 按章节分组，组内再区分公式与技巧
 *   · 顶部 Tab：全部 / 仅公式 / 仅技巧（叠加原有的学科筛选）
 *   · 右上角「复制全部」→「导出全部」，支持文本与 PDF
 *   · 「清空记录」移到设置页（危险操作不该在常用页面上一键可达）
 *   · 点击卡片跳回对应的原题解析页
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  Check,
  ChevronRight,
  FileDown,
  Lightbulb,
  Sigma,
  Trash2,
  X,
} from 'lucide-react';
import { SectionTitle } from '../components/ui';
import { MathBlock, MathText, looksLikeFormula } from '../components/MathText';
import {
  SUBJECT_LABEL,
  chapterLabel,
  sortBySyllabus,
  useFormulaBookStore,
  type FormulaEntry,
  type FormulaKind,
  type FormulaSubject,
} from '../store/useFormulaBookStore';

type SubjectFilter = 'all' | FormulaSubject;
type KindFilter = 'all' | FormulaKind;

export default function FormulaBook() {
  const nav = useNavigate();
  const entries = useFormulaBookStore((s) => s.entries);
  const remove = useFormulaBookStore((s) => s.remove);

  const [subject, setSubject] = useState<SubjectFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');

  const [exportOpen, setExportOpen] = useState(false);
  const [exported, setExported] = useState('');
  /** 确认删除单条的状态 */
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  const formulaCount = entries.filter((e) => e.kind === 'formula').length;
  const tipCount = entries.filter((e) => e.kind === 'tip').length;

  /** 当前筛选命中的条目 */
  const filtered = useMemo(() => {
    let list = entries;
    if (subject !== 'all') list = list.filter((e) => e.subject === subject);
    if (kind !== 'all') list = list.filter((e) => e.kind === kind);
    return sortBySyllabus(list);
  }, [entries, subject, kind]);

  /** 过滤 + 按考纲顺序排 + 按章节分组；组内公式在前、技巧在后 */
  const groups = useMemo(() => {
    const out: {
      label: string;
      subject: FormulaSubject;
      formulas: FormulaEntry[];
      tips: FormulaEntry[];
    }[] = [];
    for (const e of filtered) {
      const label = chapterLabel(e);
      const last = out[out.length - 1];
      const bucket = last && last.label === label ? last : (() => {
        const fresh = { label, subject: e.subject, formulas: [], tips: [] };
        out.push(fresh);
        return fresh;
      })();
      if (e.kind === 'formula') bucket.formulas.push(e);
      else bucket.tips.push(e);
    }
    return out;
  }, [filtered]);

  /* ─────────── 导出 ─────────── */

  /** 拼导出用的纯文本 */
  const buildExportText = (): string => {
    const lines: string[] = [
      '漫记 · 公式与技巧速查',
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `共 ${filtered.length} 条${subject === 'all' ? '' : ` · ${SUBJECT_LABEL[subject]}`}${
        kind === 'all' ? '' : kind === 'formula' ? ' · 仅公式' : ' · 仅技巧'
      }`,
      '',
    ];
    for (const g of groups) {
      lines.push(`【${SUBJECT_LABEL[g.subject]} · ${g.label}】`);
      if (g.formulas.length) {
        lines.push('· 公式');
        for (const e of g.formulas) {
          lines.push(`  ${e.text}`);
          if (e.note) lines.push(`    适用：${e.note}`);
          if (e.from) lines.push(`    来源：${e.from}${e.fromNo ? ` 第 ${e.fromNo} 题` : ''}`);
        }
      }
      if (g.tips.length) {
        lines.push('· 技巧');
        for (const e of g.tips) {
          lines.push(`  ${e.text}`);
          if (e.note) lines.push(`    适用：${e.note}`);
          if (e.from) lines.push(`    来源：${e.from}${e.fromNo ? ` 第 ${e.fromNo} 题` : ''}`);
        }
      }
      lines.push('');
    }
    return lines.join('\n');
  };

  /** 导出成文本：复制到剪贴板 + 顺便下载一份 .txt */
  const exportText = async () => {
    const text = buildExportText();
    try {
      await navigator.clipboard.writeText(text);
      setExported('已复制到剪贴板，同时下载了一份 txt');
    } catch {
      setExported('已下载 txt 文件');
    }
    downloadFile(`漫记-公式技巧-${stamp()}.txt`, text, 'text/plain;charset=utf-8');
    setTimeout(() => setExported(''), 2600);
  };

  /**
   * 导出成 PDF。
   *
   * 【为什么用「打开打印视图」而不是引一个 PDF 库】
   * 引 jsPDF 之类又要几十上百 KB，而且中文还得嵌字体（更重）。
   * 浏览器 / WebView 自带的打印功能就能「另存为 PDF」，
   * 排版还比手搓的库好看。这里开一个新窗口放排版好的 HTML，
   * 自动唤起打印对话框。
   */
  const exportPdf = () => {
    const w = window.open('', '_blank');
    if (!w) {
      setExported('浏览器拦了新窗口，请改用「导出文本」');
      setTimeout(() => setExported(''), 2600);
      return;
    }
    w.document.write(buildPrintHtml(groups, filtered.length));
    w.document.close();
  };

  const filters: { key: SubjectFilter; label: string; n: number }[] = [
    { key: 'all', label: '全部', n: entries.length },
    { key: 'math', label: '数学', n: entries.filter((e) => e.subject === 'math').length },
    { key: 'cs', label: '计算机', n: entries.filter((e) => e.subject === 'cs').length },
  ];

  const kindFilters: { key: KindFilter; label: string; n: number }[] = [
    { key: 'all', label: '全部', n: entries.length },
    { key: 'formula', label: '仅公式', n: formulaCount },
    { key: 'tip', label: '仅技巧', n: tipCount },
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
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-black text-brand-600"
            >
              <FileDown size={13} strokeWidth={2.8} />
              导出全部
            </button>
          )}
        </div>

        {entries.length > 0 && (
          <div className="space-y-2 px-4 pb-3">
            {/* 学科筛选 */}
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSubject(f.key)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-black transition-colors ${
                    subject === f.key ? 'bg-brand-500 text-white' : 'bg-ink/6 text-ink-soft'
                  }`}
                >
                  {f.label}
                  <span className="ml-1 opacity-70">{f.n}</span>
                </button>
              ))}
            </div>
            {/* 类型筛选：全部 / 仅公式 / 仅技巧 */}
            <div className="flex gap-2">
              {kindFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setKind(f.key)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black transition-colors ${
                    kind === f.key
                      ? f.key === 'tip'
                        ? 'bg-sun-500 text-white'
                        : f.key === 'formula'
                          ? 'bg-grape-500 text-white'
                          : 'bg-ink text-white'
                      : 'bg-ink/5 text-ink-faint'
                  }`}
                >
                  {f.key === 'formula' && <Sigma size={10} strokeWidth={3} />}
                  {f.key === 'tip' && <Lightbulb size={10} strokeWidth={3} />}
                  {f.label}
                  <span className="opacity-70">{f.n}</span>
                </button>
              ))}
            </div>
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
        ) : filtered.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="text-sm font-black text-ink">这个筛选下没有内容</p>
            <p className="mt-1 text-[12px] text-ink-faint">
              试着把类型切回「全部」，或者换个学科看看。
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g, gi) => (
              <section key={`${g.label}-${gi}`} className="space-y-2">
                <SectionTitle
                  action={
                    <span className="text-[10px] font-black text-ink-faint">
                      {SUBJECT_LABEL[g.subject]} · {g.formulas.length + g.tips.length} 条
                    </span>
                  }
                >
                  {g.label}
                </SectionTitle>

                <div className="space-y-2">
                  {g.formulas.map((e) => (
                    <FormulaCard
                      key={e.id}
                      entry={e}
                      onRemove={() => setPendingRemove(e.id)}
                      onOpen={() => nav(`/paper/${e.subject}`)}
                    />
                  ))}
                  {g.tips.map((e) => (
                    <TipCard
                      key={e.id}
                      entry={e}
                      onRemove={() => setPendingRemove(e.id)}
                      onOpen={() => nav(`/paper/${e.subject}`)}
                    />
                  ))}
                </div>
              </section>
            ))}

            <p className="pt-2 text-center text-[11px] leading-relaxed text-ink-faint">
              清空记录已移到「我的 → 设置 → 数据管理」
            </p>
          </div>
        )}
      </div>

      {/* ── 导出弹层 ── */}
      {exportOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-4 pb-6 backdrop-blur-sm"
          onClick={() => setExportOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-card"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <p className="text-base font-black text-ink">导出全部</p>
              <button
                onClick={() => setExportOpen(false)}
                className="rounded-lg p-1 text-ink-faint"
              >
                <X size={18} strokeWidth={2.8} />
              </button>
            </div>
            <p className="text-[12px] leading-relaxed text-ink-faint">
              导出当前筛选下的 {filtered.length} 条内容（
              {subject === 'all' ? '全部学科' : SUBJECT_LABEL[subject]} ·{' '}
              {kind === 'all' ? '公式与技巧' : kind === 'formula' ? '仅公式' : '仅技巧'}）。
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={exportText}
                className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 p-3.5 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
                  <FileDown size={17} strokeWidth={2.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-black text-ink">导出文本</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">
                    复制到剪贴板并下载 txt，方便贴到别处复习
                  </span>
                </span>
              </button>

              <button
                onClick={exportPdf}
                className="flex w-full items-center gap-3 rounded-2xl bg-grape-50 p-3.5 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-grape-500 text-white">
                  <BookMarked size={17} strokeWidth={2.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-black text-ink">导出 PDF</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">
                    打开打印视图，选「另存为 PDF」即可，排版适合打印
                  </span>
                </span>
              </button>
            </div>

            {exported && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-mint-50 px-3 py-2 text-[12px] font-bold text-mint-700">
                <Check size={14} strokeWidth={3} />
                {exported}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 删除确认 ── */}
      {pendingRemove && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-6 backdrop-blur-sm"
          onClick={() => setPendingRemove(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-card"
            onClick={(ev) => ev.stopPropagation()}
          >
            <p className="text-sm font-black text-ink">删掉这一条？</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">
              只是从公式本里移除，不会影响原题解析。以后重新解析同一条会再收录进来。
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPendingRemove(null)}
                className="flex-1 rounded-xl bg-ink/5 py-2.5 text-[13px] font-black text-ink-soft"
              >
                取消
              </button>
              <button
                onClick={() => {
                  remove(pendingRemove);
                  setPendingRemove(null);
                }}
                className="flex-1 rounded-xl bg-coral-500 py-2.5 text-[13px] font-black text-white"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════ 卡片 ═══════════════ */

/**
 * 公式卡片。
 *
 * 【关键】公式本体用 MathBlock 排，**单独占行、居中、完整尺寸** ——
 * 公式本的主角就是公式本身，不该缩在正文里当一行小字。
 * 名称、适用场景、章节、来源都作为辅助信息排在公式下方。
 */
function FormulaCard({
  entry,
  onRemove,
  onOpen,
}: {
  entry: FormulaEntry;
  onRemove: () => void;
  onOpen: () => void;
}) {
  // 长公式不居中排（会溢出），退回行内
  const asBlock = looksLikeFormula(entry.text) && entry.text.length <= 60;

  return (
    <div className="card group relative overflow-hidden p-0">
      <button onClick={onOpen} className="block w-full px-3.5 py-3 pr-10 text-left">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-grape-100 px-2 py-0.5 text-[10px] font-black text-grape-700">
            <Sigma size={10} strokeWidth={3} />
            公式
          </span>
          {entry.from && (
            <span className="truncate text-[10px] text-ink-faint">
              来自 {entry.from}
              {entry.fromNo ? ` · 第 ${entry.fromNo} 题` : ''}
            </span>
          )}
          <ChevronRight size={12} strokeWidth={3} className="ml-auto shrink-0 text-ink-faint" />
        </div>

        {/* ★ 公式本体 */}
        {asBlock ? (
          <MathBlock className="my-1.5 text-[16px]">{entry.text}</MathBlock>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] font-bold leading-relaxed text-ink">
            <MathText>{entry.text}</MathText>
          </p>
        )}

        {/* 适用场景 */}
        {entry.note && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
            <span className="font-black text-ink-faint">适用：</span>
            <MathText>{entry.note}</MathText>
          </p>
        )}
      </button>

      <button
        onClick={onRemove}
        aria-label="删除这条"
        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-ink-faint active:bg-coral-50 active:text-coral-500"
      >
        <Trash2 size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

/**
 * 技巧卡片。
 * 结构：技巧结论（主）+ 具体操作方法（note）+ 适用题型 + 来源。
 */
function TipCard({
  entry,
  onRemove,
  onOpen,
}: {
  entry: FormulaEntry;
  onRemove: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="card group relative overflow-hidden border-l-4 border-sun-400 p-0">
      <button onClick={onOpen} className="block w-full px-3.5 py-3 pr-10 text-left">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-black text-sun-700">
            <Lightbulb size={10} strokeWidth={3} />
            技巧
          </span>
          {entry.from && (
            <span className="truncate text-[10px] text-ink-faint">
              来自 {entry.from}
              {entry.fromNo ? ` · 第 ${entry.fromNo} 题` : ''}
            </span>
          )}
          <ChevronRight size={12} strokeWidth={3} className="ml-auto shrink-0 text-ink-faint" />
        </div>

        {/* 技巧结论 */}
        <p className="whitespace-pre-wrap text-[14px] font-bold leading-relaxed text-ink">
          <MathText>{entry.text}</MathText>
        </p>

        {/* 具体操作方法 / 适用题型 */}
        {entry.note && (
          <p className="mt-2 rounded-xl bg-sun-50 px-2.5 py-2 text-[11.5px] leading-relaxed text-sun-700">
            <MathText>{entry.note}</MathText>
          </p>
        )}
      </button>

      <button
        onClick={onRemove}
        aria-label="删除这条"
        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-ink-faint active:bg-coral-50 active:text-coral-500"
      >
        <Trash2 size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

/* ═══════════════ 导出辅助 ═══════════════ */

/** 文件名用的时间戳：20260918-1530 */
function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 触发一个本地下载 */
function downloadFile(name: string, content: string, mime: string) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch {
    /* 下载失败不影响复制那条路径 */
  }
}

/**
 * 生成打印视图的 HTML。
 *
 * 刻意用最朴素的排版：黑字白底、衬线字体、分节标题 ——
 * 打印出来要像一份资料，而不是一个网页。
 */
function buildPrintHtml(
  groups: { label: string; subject: FormulaSubject; formulas: FormulaEntry[]; tips: FormulaEntry[] }[],
  total: number,
): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const body = groups
    .map((g) => {
      const rows: string[] = [];
      if (g.formulas.length) {
        rows.push('<h3 class="sec">公式</h3>');
        for (const e of g.formulas) {
          rows.push(
            `<div class="item"><div class="main">${esc(e.text)}</div>` +
              (e.note ? `<div class="note">适用：${esc(e.note)}</div>` : '') +
              (e.from ? `<div class="src">来源：${esc(e.from)}${e.fromNo ? ` 第 ${e.fromNo} 题` : ''}</div>` : '') +
              '</div>',
          );
        }
      }
      if (g.tips.length) {
        rows.push('<h3 class="sec">技巧</h3>');
        for (const e of g.tips) {
          rows.push(
            `<div class="item"><div class="main">${esc(e.text)}</div>` +
              (e.note ? `<div class="note">${esc(e.note)}</div>` : '') +
              (e.from ? `<div class="src">来源：${esc(e.from)}${e.fromNo ? ` 第 ${e.fromNo} 题` : ''}</div>` : '') +
              '</div>',
          );
        }
      }
      return `<section><h2>${esc(SUBJECT_LABEL[g.subject])} · ${esc(g.label)}</h2>${rows.join('')}</section>`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<title>漫记 · 公式与技巧</title>
<style>
  @page { margin: 18mm 15mm; }
  body { font-family: "Songti SC","SimSun",Georgia,serif; color:#1a1a1a; line-height:1.7; font-size:13px; }
  h1 { font-size:20px; margin:0 0 4px; letter-spacing:1px; }
  .meta { color:#888; font-size:12px; margin-bottom:18px; border-bottom:1px solid #ddd; padding-bottom:10px; }
  h2 { font-size:15px; margin:22px 0 8px; padding-left:8px; border-left:4px solid #3b66f6; page-break-after:avoid; }
  h3.sec { font-size:12px; color:#888; font-weight:normal; margin:12px 0 6px; letter-spacing:1px; }
  .item { margin:0 0 12px; padding-left:10px; page-break-inside:avoid; }
  .main { font-size:14px; font-weight:bold; white-space:pre-wrap; }
  .note { font-size:12px; color:#555; margin-top:3px; }
  .src { font-size:11px; color:#aaa; margin-top:2px; }
  @media print { .tip { display:none; } }
</style></head><body>
<h1>漫记 · 公式与技巧速查</h1>
<div class="meta">共 ${total} 条 · 导出时间 ${new Date().toLocaleString('zh-CN')}</div>
${body}
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body></html>`;
}
