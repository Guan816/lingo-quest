import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Dices,
  GraduationCap,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button, Card, SectionTitle, StarRow } from '../components/ui';
import { StructureCard, SubjectHero } from '../components/SubjectKit';
import { CET4_HOT_WORDS, CET4_KINDS, type Cet4KindMeta } from '../data/cet4';
import { allCet4Questions } from '../lib/bankMeta';
import { useProfileStore } from '../store/useProfileStore';
import { useCet4Store, pendingWrongCount } from '../store/useCet4Store';
import { useQuestionBankStore } from '../store/useQuestionBankStore';
import type { Cet4Kind } from '../types';

const GROUPS: { key: Cet4KindMeta['group']; title: string; hint: string }[] = [
  { key: '听力', title: '听力理解 · 35%', hint: '只播一遍，边听边选。这里会用语音朗读材料，可反复听。' },
  { key: '阅读', title: '阅读理解 · 35%', hint: '分值最高的是仔细阅读，时间紧就先做它。' },
  { key: '基础', title: '基础打底', hint: '四级大纲约 4500 词，先把高频词的搭配吃透。' },
  { key: '输出', title: '写作与翻译 · 各 15%', hint: '先保证结构完整、信息准确，再追求高级表达。' },
];

/** 四级卷面结构（听力/阅读/写作/翻译四块，与官方比例一致） */
const CET4_STRUCTURE = [
  { name: '听力', count: '25 题', score: '35%' },
  { name: '阅读', count: '30 题', score: '35%' },
  { name: '写作', count: '1 篇', score: '15%' },
  { name: '翻译', count: '1 段', score: '15%' },
];

export default function Cet4() {
  const nav = useNavigate();
  const progress = useProfileStore((s) => s.progress);
  const cet4 = useCet4Store();
  const [wordsOpen, setWordsOpen] = useState(false);

  /** 订阅线上题量，静态题库变化不用管 */
  const bankCount = useQuestionBankStore((s) => s.cet4.length);
  const totalQuestions = useMemo(() => allCet4Questions().length, [bankCount]);

  const accuracy = cet4.answered > 0 ? Math.round((cet4.correct / cet4.answered) * 100) : 0;
  const pendingWrong = pendingWrongCount(cet4.wrong);
  const starsOf = (kind: Cet4Kind): number =>
    progress[`cet4-${kind}`]?.stars ?? cet4.bestStars[kind] ?? 0;

  /** 已做 / 总题数：四级题库没记逐题记录，用累计答题数对题库总量 */
  const doneTotal = cet4.answered;

  return (
    <div className="space-y-5 pt-1">
      <SubjectHero
        tag="江苏专转本 · 英语（四级折算）"
        tagIcon={<GraduationCap size={13} strokeWidth={3} />}
        title="听力 35% + 阅读 35%"
        desc="专转本英语按四级成绩折算，练四级就是备考。先啃分值高的听力和阅读。"
        bg="bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600"
        deco={<GraduationCap className="h-28 w-28" strokeWidth={1.2} />}
        stats={[
          { label: '累计答题', value: cet4.answered },
          { label: '正确率', value: cet4.answered ? `${accuracy}%` : '—' },
          { label: '已做 / 总题数', value: `${doneTotal}/${totalQuestions}` },
        ]}
      />

      {/* 试卷结构 & 分值 */}
      <StructureCard
        icon={<Target size={20} strokeWidth={2.6} />}
        accent="border-brand-500"
        iconClass="text-brand-600"
        rows={CET4_STRUCTURE}
        tip="仔细阅读与听力篇章单题分值最高，一道等于四道选词填空。时间不够就先拿稳这两块。"
      />

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
              <p className="truncate text-xs text-ink-faint">全题型混排，10 题一组</p>
            </div>
          </button>

          {/* 英语错题已并入统一错题本 /wrong */}
          <button
            onClick={() => nav('/wrong/cet4')}
            className="btn-pop relative overflow-hidden rounded-3xl bg-white text-left shadow-card"
          >
            <div className="grid h-16 place-items-center bg-gradient-to-br from-coral-400 to-coral-600 text-3xl">
              📕
            </div>
            <div className="p-3">
              <p className="flex items-center gap-1 text-sm font-black text-ink">
                <ClipboardList size={14} strokeWidth={3} className="text-coral-500" /> 错题本
              </p>
              <p className="truncate text-xs text-ink-faint">
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
            <SectionTitle>{g.title}</SectionTitle>
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

      {/* AI 出题：只留一个按钮，不再有任何配置说明 */}
      <section>
        <SectionTitle>AI 智能出题</SectionTitle>
        <Card>
          <p className="text-xs leading-relaxed text-ink-soft">
            题库会打乱顺序反复练，但总有用完的一天。进入任意题型后点右上角
            <b className="text-ink">「AI 出题」</b>
            ，就能按四级真题的题型与难度现场生成新题，无限刷。
          </p>
          <Button
            variant="grape"
            size="sm"
            block
            className="mt-3"
            icon={<Sparkles size={16} strokeWidth={3} />}
            onClick={() => nav('/cet4/play/careful')}
          >
            AI 智能出题
          </Button>
        </Card>
      </section>

      {/* 高频词：默认折叠，只露前 6 个 */}
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
          {(wordsOpen ? CET4_HOT_WORDS : CET4_HOT_WORDS.slice(0, 6)).map((w) => (
            <span
              key={w.en}
              className="rounded-2xl bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink"
            >
              {w.en}
              <span className="ml-1.5 font-normal text-ink-faint">{w.zh}</span>
            </span>
          ))}
          {!wordsOpen && (
            <button
              onClick={() => setWordsOpen(true)}
              className="rounded-2xl bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-600"
            >
              还有 {CET4_HOT_WORDS.length - 6} 个…
            </button>
          )}
        </div>
      </section>

      <div className="h-2" />
    </div>
  );
}
