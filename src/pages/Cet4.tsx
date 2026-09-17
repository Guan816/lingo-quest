import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Dices,
  GraduationCap,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import { Button, Card, Chip, SectionTitle, StarRow } from '../components/ui';
import { CET4_HOT_WORDS, CET4_KINDS, type Cet4KindMeta } from '../data/cet4';
import { useProfileStore } from '../store/useProfileStore';
import { useCet4Store, pendingWrongCount } from '../store/useCet4Store';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Cet4Kind } from '../types';

const GROUPS: { key: Cet4KindMeta['group']; title: string; hint: string }[] = [
  { key: '听力', title: '听力理解 · 35%', hint: '只播一遍，边听边选。这里会用语音朗读材料，可反复听。' },
  { key: '阅读', title: '阅读理解 · 35%', hint: '分值最高的是仔细阅读，时间紧就先做它。' },
  { key: '基础', title: '基础打底', hint: '四级大纲约 4500 词，先把高频词的搭配吃透。' },
  { key: '输出', title: '写作与翻译 · 各 15%', hint: '先保证结构完整、信息准确，再追求高级表达。' },
];

export default function Cet4() {
  const nav = useNavigate();
  const progress = useProfileStore((s) => s.progress);
  const cet4 = useCet4Store();
  const ai = useSettingsStore((s) => s.ai);
  const [wordsOpen, setWordsOpen] = useState(false);

  const accuracy = cet4.answered > 0 ? Math.round((cet4.correct / cet4.answered) * 100) : 0;
  const pendingWrong = pendingWrongCount(cet4.wrong);
  const starsOf = (kind: Cet4Kind): number =>
    progress[`cet4-${kind}`]?.stars ?? cet4.bestStars[kind] ?? 0;

  const totalStars = CET4_KINDS.reduce((n, k) => n + starsOf(k.kind), 0);
  const maxStars = CET4_KINDS.length * 3;

  return (
    <div className="space-y-6 pt-1">
      {/* 顶部：目标与总览 */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-grape-500 via-brand-500 to-brand-600 p-5 text-white shadow-card">
        <div className="relative z-10">
          <Chip tone="gray" className="mb-3 bg-white/25 text-white">
            <GraduationCap size={13} strokeWidth={3} /> 大学英语四级
          </Chip>
          <h1 className="text-balance text-2xl font-black leading-tight">
            0 基础，也能一步步冲着 425 去
          </h1>
          <p className="mt-1 text-sm text-white/85">
            听力 35% + 阅读 35% 决定下限，写作翻译各 15% 决定上限。先啃分值高的。
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="累计答题" value={cet4.answered} />
            <MiniStat label="正确率" value={cet4.answered ? `${accuracy}%` : '—'} />
            <MiniStat label="星数" value={`${totalStars}/${maxStars}`} />
          </div>
        </div>
        <Target className="absolute -right-5 -top-5 h-28 w-28 text-white/15" strokeWidth={1.5} />
      </section>

      {/* 分值分布小提示 */}
      <Card className="border-l-4 border-sun-500">
        <div className="flex items-start gap-3">
          <Brain size={20} className="mt-0.5 shrink-0 text-sun-600" strokeWidth={2.6} />
          <div className="text-xs leading-relaxed text-ink-soft">
            <p className="mb-1 text-sm font-black text-ink">为什么先练听力和阅读？</p>
            两者合计占 <b className="text-ink">70%</b>。听力 25 题、阅读 30 题，
            而<b className="text-ink">仔细阅读</b>和<b className="text-ink">听力篇章</b>单题分值最高——
            一道等于四道选词填空。时间不够时，先把这两个拿稳。
          </div>
        </div>
      </Card>

      {/* 刷题工具：考官模式 + 错题本 */}
      <section>
        <SectionTitle>刷题工具</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => nav('/cet4/play/mix')}
            className="btn-pop overflow-hidden rounded-3xl bg-white text-left shadow-card"
          >
            <div className="grid h-16 place-items-center bg-gradient-to-br from-brand-500 to-grape-600 text-3xl">
              🎲
            </div>
            <div className="p-3">
              <p className="flex items-center gap-1 text-sm font-black text-ink">
                <Dices size={14} strokeWidth={3} className="text-brand-500" /> 考官随机抽题
              </p>
              <p className="text-xs text-ink-faint">全题型混排，10 题一组</p>
            </div>
          </button>

          <button
            onClick={() => nav('/cet4/wrong')}
            className="btn-pop relative overflow-hidden rounded-3xl bg-white text-left shadow-card"
          >
            <div className="grid h-16 place-items-center bg-gradient-to-br from-coral-400 to-coral-600 text-3xl">
              📕
            </div>
            <div className="p-3">
              <p className="flex items-center gap-1 text-sm font-black text-ink">
                <ClipboardList size={14} strokeWidth={3} className="text-coral-500" /> 错题本
              </p>
              <p className="text-xs text-ink-faint">
                {pendingWrong > 0 ? `${pendingWrong} 道待订正` : '答错的题自动收进来'}
              </p>
            </div>
            {pendingWrong > 0 && (
              <span className="absolute right-2.5 top-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-coral-500 px-1.5 text-[11px] font-black text-white">
                {pendingWrong}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* 题型入口 */}
      {GROUPS.map((g) => {
        const items = CET4_KINDS.filter((k) => k.group === g.key);
        return (
          <section key={g.key}>
            <SectionTitle>
              {g.title}
            </SectionTitle>
            <p className="-mt-2 mb-3 px-1 text-xs text-ink-faint">{g.hint}</p>
            <div className="space-y-2.5">
              {items.map((k) => (
                <button
                  key={k.kind}
                  onClick={() => nav(`/cet4/play/${k.kind}`)}
                  className="btn-pop flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-card"
                >
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${k.tone} text-2xl`}
                  >
                    {k.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-black text-ink">{k.name}</span>
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                        {k.weight}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-faint">{k.desc}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <StarRow count={starsOf(k.kind)} size={13} />
                    <ChevronRight size={16} strokeWidth={3} className="text-ink-faint" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {/* AI 出题 */}
      <section>
        <SectionTitle>AI 出更多题</SectionTitle>
        <Card>
          <div className="flex items-start gap-3">
            <Wand2 size={20} className="mt-0.5 shrink-0 text-grape-500" strokeWidth={2.6} />
            <div className="flex-1 text-xs leading-relaxed text-ink-soft">
              <p className="mb-1 text-sm font-black text-ink">
                题库会打乱顺序反复练，但总有用完的一天
              </p>
              进入任意题型后，点右上角
              <b className="text-ink">「AI 出题」</b>
              ，就能让已配置的大模型按四级真题的题型与难度
              <b className="text-ink">现场生成新题</b>，无限刷。
              {!ai.enabled && (
                <span className="mt-2 block rounded-2xl bg-sun-50 px-3 py-2 text-sun-700">
                  还没配置 AI 接口？去设置页填一个 OpenAI 兼容接口（DeepSeek / 通义 / Moonshot 都行）即可。
                </span>
              )}
            </div>
          </div>
          <Button
            variant="grape"
            size="sm"
            block
            className="mt-3"
            icon={<Sparkles size={16} strokeWidth={3} />}
            onClick={() => nav(ai.enabled ? '/cet4/play/careful' : '/settings')}
          >
            {ai.enabled ? '去练仔细阅读（可 AI 加题）' : '去配置 AI 接口'}
          </Button>
        </Card>
      </section>

      {/* 高频词 */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => setWordsOpen((v) => !v)}
              className="flex items-center gap-0.5 text-xs font-black text-brand-600"
            >
              {wordsOpen ? '收起' : `展开全部 ${CET4_HOT_WORDS.length}`}
              <ChevronDown
                size={14}
                strokeWidth={3}
                className={wordsOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              />
            </button>
          }
        >
          四级高频搭配
        </SectionTitle>
        <div className="card flex flex-wrap gap-2 p-4">
          {(wordsOpen ? CET4_HOT_WORDS : CET4_HOT_WORDS.slice(0, 10)).map((w) => (
            <span
              key={w.en}
              className="rounded-2xl bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink"
            >
              {w.en}
              <span className="ml-1.5 font-normal text-ink-faint">{w.zh}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="h-2" />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/20 py-2">
      <p className="text-lg font-black leading-tight">{value}</p>
      <p className="mt-0.5 text-[11px] font-bold text-white/80">{label}</p>
    </div>
  );
}
