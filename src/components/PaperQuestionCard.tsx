/**
 * 逐题解析卡片。
 *
 * 试卷解析结果页的主体，也是「标准试卷答案排版」的落点。
 * 和答题页的解析区用同一套四模块规范（见 lib/explain.ts），
 * 保证学生看到的解析在哪儿都长一个样。
 *
 * 每题包含：
 *   · 题号 + 题型徽章 + 考点
 *   · 题干原文（含选项）
 *   · ① 答案（标亮）② 考点 ③ 解（分步）④ 技巧
 *   · 底部操作：加入错题本 / 收藏本题 / 提取公式 / 提取技巧
 */
import { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ClipboardList,
  Lightbulb,
  Sigma,
} from 'lucide-react';
import { MathBlock, MathText } from './MathText';
import type { PaperQuestion } from '../lib/paper';
import type { ExplainStep } from '../lib/explain';

const MODE_LABEL: Record<string, string> = {
  single: '单选',
  multi: '多选',
  judge: '判断',
  fill: '填空',
  calc: '计算',
  proof: '证明',
  synthetic: '综合',
};

export interface PaperQuestionCardProps {
  q: PaperQuestion;
  /** 题号（AI 没给就按序号兜底） */
  index: number;
  /** 是否默认展开解析 */
  defaultOpen?: boolean;
  /** 已收藏 */
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  /** 加入错题本 */
  onAddWrong?: () => void;
  /** 提取到公式本 / 技巧本 */
  onExtract?: (kind: 'formula' | 'tip', text: string, note?: string) => void;
  /** 该题的公式/技巧是否已收录 */
  extracted?: { formula?: string; tip?: string };
}

export function PaperQuestionCard({
  q,
  index,
  defaultOpen = true,
  bookmarked,
  onToggleBookmark,
  onAddWrong,
  onExtract,
  extracted,
}: PaperQuestionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const no = q.no || String(index + 1);
  const steps: ExplainStep[] = q.steps ?? [];
  const points = q.points ?? [];

  return (
    <article className="card overflow-hidden">
      {/* ── 题头 ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2.5 p-4 pb-3 text-left"
      >
        <span className="mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded-lg bg-brand-500 px-1.5 text-[11px] font-black text-white">
          {no}
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-[14px] font-bold leading-relaxed text-ink">
            <MathText>{q.stem}</MathText>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[10px] font-black text-ink-soft">
              {MODE_LABEL[q.mode] ?? q.mode}
            </span>
            {points.slice(0, 2).map((p, i) => (
              <span
                key={i}
                className="rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-black text-sun-700"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={3}
          className={`mt-1 shrink-0 text-ink-faint transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          {/* 选项 */}
          {q.options && q.options.length > 0 && (
            <ul className="space-y-1.5">
              {q.options.map((o, i) => {
                const isRight = q.answer === o;
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-2 rounded-xl px-2.5 py-1.5 text-[13px] leading-relaxed ${
                      isRight
                        ? 'bg-mint-50 font-bold text-ink'
                        : 'bg-ink/3 text-ink-soft'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded text-[10px] font-black ${
                        isRight ? 'bg-mint-500 text-white' : 'bg-ink/10 text-ink-soft'
                      }`}
                      style={{ height: 18, width: 18 }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <MathText>{o}</MathText>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ① 答案 */}
          {q.answer && (
            <div>
              <ModuleTitle>答案</ModuleTitle>
              <p className="rounded-xl bg-mint-50 px-3 py-2.5 text-[14px] font-black leading-relaxed text-ink">
                <MathText>{q.answer}</MathText>
              </p>
            </div>
          )}

          {/* ② 考点（题头已显示时这里不重复） */}
          {points.length > 2 && (
            <div>
              <ModuleTitle>考点</ModuleTitle>
              <div className="space-y-1">
                {points.map((p, i) => (
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

          {/* ③ 解 */}
          {steps.length > 0 && (
            <div>
              <ModuleTitle>解</ModuleTitle>
              <ol className="space-y-3.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-black text-brand-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      {s.text && (
                        <p className="whitespace-pre-wrap text-[13.5px] leading-[1.75] text-ink">
                          <MathText>{s.text}</MathText>
                        </p>
                      )}
                      {/* 核心公式单独占行、居中 */}
                      {s.math && <MathBlock>{s.math}</MathBlock>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ④ 解题技巧 */}
          {q.tip && (
            <div>
              <ModuleTitle>解题技巧</ModuleTitle>
              <p className="rounded-xl bg-grape-50 px-3 py-2.5 text-[12.5px] font-bold leading-relaxed text-grape-700">
                <MathText>{q.tip}</MathText>
              </p>
            </div>
          )}

          {/* 易错 */}
          {q.pitfall && (
            <p className="rounded-xl bg-coral-50 px-3 py-2.5 text-[12.5px] font-bold leading-relaxed text-coral-700">
              易错：<MathText>{q.pitfall}</MathText>
            </p>
          )}

          {/* ── 底部操作 ── */}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {onAddWrong && (
              <ActBtn onClick={onAddWrong} active={extracted?.formula === '__wrong__'}>
                <ClipboardList size={13} strokeWidth={2.8} />
                加入错题本
              </ActBtn>
            )}
            {onToggleBookmark && (
              <ActBtn onClick={onToggleBookmark} active={bookmarked}>
                {bookmarked ? (
                  <BookmarkCheck size={13} strokeWidth={2.8} />
                ) : (
                  <Bookmark size={13} strokeWidth={2.8} />
                )}
                {bookmarked ? '已收藏' : '收藏本题'}
              </ActBtn>
            )}
            {onExtract && q.tip && (
              <ActBtn onClick={() => onExtract('tip', q.tip!)} active={Boolean(extracted?.tip)}>
                <Lightbulb size={13} strokeWidth={2.8} />
                {extracted?.tip ? '技巧已收录' : '提取技巧'}
              </ActBtn>
            )}
            {onExtract && q.answer && (
              <ActBtn
                onClick={() => onExtract('formula', q.answer!)}
                active={Boolean(extracted?.formula)}
              >
                <Sigma size={13} strokeWidth={2.8} />
                {extracted?.formula ? '结论已收录' : '提取结论'}
              </ActBtn>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function ModuleTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[12px] font-black tracking-wide text-ink-soft">
      <span className="h-3 w-[3px] rounded-full bg-brand-500" />
      {children}
    </p>
  );
}

function ActBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition-colors ${
        active
          ? 'bg-mint-100 text-mint-700'
          : 'bg-ink/5 text-ink-soft active:bg-ink/10'
      }`}
    >
      {active && <Check size={12} strokeWidth={3} />}
      {children}
    </button>
  );
}
