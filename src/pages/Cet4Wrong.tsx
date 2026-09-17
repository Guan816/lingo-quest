import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Eraser,
  Lightbulb,
  Play,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button, Card, Chip, SectionTitle } from '../components/ui';
import { kindMeta } from '../data/cet4';
import { useCet4Store, pendingWrongCount, type Cet4WrongEntry } from '../store/useCet4Store';

type Filter = 'pending' | 'fixed' | 'all';

export default function Cet4Wrong() {
  const nav = useNavigate();
  const wrong = useCet4Store((s) => s.wrong);
  const removeWrong = useCet4Store((s) => s.removeWrong);
  const markFixed = useCet4Store((s) => s.markFixed);
  const clearWrong = useCet4Store((s) => s.clearWrong);

  const [filter, setFilter] = useState<Filter>('pending');

  const pending = wrong.filter((w) => !w.fixed);
  const fixed = wrong.filter((w) => w.fixed);

  const list: Cet4WrongEntry[] = useMemo(() => {
    if (filter === 'pending') return pending;
    if (filter === 'fixed') return fixed;
    return wrong;
  }, [filter, pending, fixed, wrong]);

  return (
    <div className="space-y-5 pt-1">
      {/* 头部 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => nav('/cet4')}
          aria-label="返回四级"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-ink-soft shadow-pop-sm btn-pop"
        >
          <ArrowLeft size={18} strokeWidth={2.8} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-ink">错题本</h1>
          <p className="text-xs text-ink-faint">
            答错的题会自动收进来，重做答对即自动订正
          </p>
        </div>
      </div>

      {/* 概览 */}
      <Card className="border-l-4 border-coral-500">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coral-100 text-2xl">
            📕
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-ink">
              待订正 <b className="text-coral-600">{pending.length}</b> 道
            </p>
            <p className="text-xs text-ink-faint">已订正 {fixed.length} 道 · 共 {wrong.length} 道</p>
          </div>
        </div>
        <Button
          variant="coral"
          size="sm"
          block
          className="mt-3"
          disabled={pending.length === 0}
          icon={<Play size={15} strokeWidth={3} fill="currentColor" />}
          onClick={() => nav('/cet4/play/wrong')}
        >
          开始刷错题
        </Button>
      </Card>

      {/* 筛选 */}
      <div className="flex gap-2">
        <FilterChip active={filter === 'pending'} onClick={() => setFilter('pending')}>
          未订正 {pending.length}
        </FilterChip>
        <FilterChip active={filter === 'fixed'} onClick={() => setFilter('fixed')}>
          已订正 {fixed.length}
        </FilterChip>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          全部 {wrong.length}
        </FilterChip>
      </div>

      {/* 列表 */}
      {list.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-ink-faint">
            {wrong.length === 0
              ? '错题本还是空的——去刷几道题吧，答错的会自动进来 👀'
              : filter === 'pending'
                ? '没有待订正的错题了，漂亮！'
                : '这里还没有记录'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((w) => (
            <WrongCard
              key={w.q.id}
              entry={w}
              onRemove={() => removeWrong(w.q.id)}
              onToggleFixed={() => markFixed(w.q.id)}
            />
          ))}
        </div>
      )}

      {wrong.length > 0 && (
        <section>
          <SectionTitle>清理</SectionTitle>
          <Button
            variant="ghost"
            size="sm"
            block
            icon={<Eraser size={15} strokeWidth={3} />}
            onClick={() => {
              if (window.confirm('确定清空整个错题本吗？此操作不可撤销。')) clearWrong();
            }}
          >
            清空错题本
          </Button>
        </section>
      )}

      <div className="h-4" />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-black text-white'
          : 'rounded-full bg-ink/5 px-3.5 py-1.5 text-xs font-black text-ink-soft'
      }
    >
      {children}
    </button>
  );
}

function WrongCard({
  entry,
  onRemove,
  onToggleFixed,
}: {
  entry: Cet4WrongEntry;
  onRemove: () => void;
  onToggleFixed: () => void;
}) {
  const meta = kindMeta(entry.q.kind);
  const correct = entry.q.options[entry.q.answer];

  return (
    <Card className={entry.fixed ? 'border-l-4 border-mint-500' : 'border-l-4 border-coral-500'}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Chip tone="brand">
          {meta.emoji} {meta.name}
        </Chip>
        {entry.fixed ? (
          <Chip tone="mint">
            <Check size={12} strokeWidth={3} /> 已订正
          </Chip>
        ) : (
          <Chip tone="coral">待订正</Chip>
        )}
        {entry.q.tag && <span className="text-[11px] text-ink-faint">{entry.q.tag}</span>}
      </div>

      {entry.q.material && (
        <p className="mb-2 line-clamp-3 whitespace-pre-line rounded-2xl bg-ink/[0.03] p-2.5 text-xs leading-relaxed text-ink-faint">
          {entry.q.material}
        </p>
      )}

      <p className="mb-2.5 text-sm font-black leading-relaxed text-ink">{entry.q.stem}</p>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2 rounded-2xl bg-coral-50 px-3 py-2">
          <span className="mt-0.5 shrink-0 text-[11px] font-black text-coral-600">你选了</span>
          <span className="text-xs font-semibold leading-relaxed text-coral-600 line-through">
            {entry.chosenText}
          </span>
        </div>
        <div className="flex items-start gap-2 rounded-2xl bg-mint-50 px-3 py-2">
          <span className="mt-0.5 shrink-0 text-[11px] font-black text-mint-600">正确答案</span>
          <span className="text-xs font-semibold leading-relaxed text-mint-600">{correct}</span>
        </div>
      </div>

      {entry.q.explain && (
        <p className="mt-2.5 flex gap-2 text-xs leading-relaxed text-ink-soft">
          <Lightbulb size={14} className="mt-0.5 shrink-0 text-sun-500" strokeWidth={2.6} />
          <span>{entry.q.explain}</span>
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={onToggleFixed}
          disabled={entry.fixed}
          className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-mint-100 py-2 text-[11px] font-black text-mint-600 disabled:opacity-40"
        >
          {entry.fixed ? <Undo2 size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
          {entry.fixed ? '已订正' : '标记已订正'}
        </button>
        <button
          onClick={onRemove}
          className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-ink/5 py-2 text-[11px] font-black text-ink-soft"
        >
          <Trash2 size={12} strokeWidth={3} /> 移出
        </button>
      </div>
    </Card>
  );
}

/** 供其它页面显示"待订正数"用 */
export function usePendingWrongCount(): number {
  return useCet4Store((s) => pendingWrongCount(s.wrong));
}
