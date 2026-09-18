import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { asrSupported, speechDiagnostics, testSpeak, ttsSupported } from '../lib/speech';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import { useFormulaBookStore, SUBJECT_LABEL, type FormulaSubject } from '../store/useFormulaBookStore';
import { markGranted, requestPermission } from '../lib/permissionGate';
import { Button, Chip, SectionTitle } from '../components/ui';

/**
 * 设置页。
 *
 * 【重要】这里**没有**任何 AI 接口 / API Key / 模型配置入口。
 * AI 由服务端统一提供（多家免费服务商自动故障转移），用户开箱即用。
 * 唯一的 AI 相关开关（「刷题时显示 AI 讲解」）放在「我的」页里。
 */
export default function Settings() {
  const settings = useSettingsStore();
  const dailyGoal = useProfileStore((s) => s.dailyGoal);
  const setDailyGoal = useProfileStore((s) => s.setDailyGoal);

  const entries = useFormulaBookStore((s) => s.entries);
  const clearFormulas = useFormulaBookStore((s) => s.clear);

  /** 二次确认的状态：null 表示没在确认中 */
  const [clearing, setClearing] = useState<FormulaSubject | 'all' | null>(null);

  const [micMsg, setMicMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speakMsg, setSpeakMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** 语音能力自检结果：区分原生 / 浏览器，排查「没声音」时最关键的信息 */
  const diag = useMemo(() => speechDiagnostics(), []);

  const formulaN = entries.filter((e) => e.kind === 'formula').length;
  const tipN = entries.filter((e) => e.kind === 'tip').length;

  return (
    <div className="space-y-6 pt-1">
      {/* 语音 */}
      <section>
        <SectionTitle>语音与反馈</SectionTitle>
        <div className="card space-y-4 p-4">
          <div>
            <div className="mb-1 flex justify-between text-sm font-black text-ink">
              <span>朗读语速</span>
              <span className="text-brand-600">{settings.ttsRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.6}
              max={1.3}
              step={0.02}
              value={settings.ttsRate}
              onChange={(e) => settings.set('ttsRate', Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
          <Toggle
            label="自动朗读对方的话"
            desc="NPC 说完立刻播放发音，关掉可以省流量。"
            checked={settings.autoSpeak}
            onChange={(v) => settings.set('autoSpeak', v)}
          />
          <Toggle
            label="跟读前先听示范"
            desc="进入每一句时自动播放标准发音。"
            checked={settings.playModelFirst}
            onChange={(v) => settings.set('playModelFirst', v)}
          />
          <Toggle
            label="音效"
            desc="得分、连击、升级时的提示音。"
            checked={settings.sfxEnabled}
            onChange={(v) => settings.set('sfxEnabled', v)}
          />
        </div>
      </section>

      {/* 学习 */}
      <section>
        <SectionTitle>学习习惯</SectionTitle>
        <div className="card space-y-4 p-4">
          <Toggle
            label="显示中文释义"
            desc="想练纯英文思维时可以关掉。"
            checked={settings.showZh}
            onChange={(v) => settings.set('showZh', v)}
          />
          <div>
            <div className="mb-1 flex justify-between text-sm font-black text-ink">
              <span>每日目标</span>
              <span className="text-brand-600">{dailyGoal} XP</span>
            </div>
            <input
              type="range"
              min={30}
              max={200}
              step={10}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
        </div>
      </section>

      {/* 设备能力 */}
      <section>
        <SectionTitle>当前设备</SectionTitle>
        <div className="card space-y-2 p-4 text-xs text-ink-soft">
          {/* 运行环境：用来区分「原生 App」和「浏览器」，
              两者的语音实现完全不同，排查问题时这一行最关键 */}
          <div className="flex items-center justify-between">
            <span>运行环境</span>
            <Chip tone={diag.platform === '原生 App' ? 'grape' : 'gray'}>
              {diag.platform}
            </Chip>
          </div>

          <div className="flex items-center justify-between">
            <span>语音朗读（示范）</span>
            {ttsSupported() ? (
              <Chip tone="mint">
                <CheckCircle2 size={12} strokeWidth={3} /> {diag.tts}
              </Chip>
            ) : (
              <Chip tone="sun">不可用</Chip>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span>语音识别（打分）</span>
            {asrSupported() ? (
              <Chip tone="mint">
                <CheckCircle2 size={12} strokeWidth={3} /> {diag.asr}
              </Chip>
            ) : (
              <Chip tone="sun">不可用 · 走打字模式</Chip>
            )}
          </div>

          {/* 朗读实测：点了能出声才算真可用。
              系统没装 TTS 引擎或没装英文语音包时会失败，这里会如实报出来。 */}
          <div className="border-t border-ink/8 pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black text-ink">朗读实测</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                  点一下听示范句。没声音就说明系统缺语音引擎或英文语音包。
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={speaking}
                onClick={async () => {
                  setSpeakMsg(null);
                  setSpeaking(true);
                  const r = await testSpeak();
                  setSpeaking(false);
                  setSpeakMsg(r);
                }}
              >
                {speaking ? '播放中…' : '试听'}
              </Button>
            </div>
            {speakMsg && (
              <p
                className={`mt-1.5 text-[11px] leading-relaxed font-bold ${
                  speakMsg.ok ? 'text-mint-600' : 'text-coral-600'
                }`}
              >
                {speakMsg.ok ? '✅ ' : '❌ '}
                {speakMsg.text}
              </p>
            )}
          </div>

          {/* 主动申请麦克风权限：平时用语音时会自动弹，这里手动再给一个入口 */}
          {asrSupported() && (
            <div className="border-t border-ink/8 pt-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-ink">麦克风权限</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                    用语音时会自动提醒。被拒绝过的话，需要到
                    系统设置 → 应用 → 漫记 → 权限 里手动打开。
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setMicMsg(null);
                    const ok = await requestPermission('microphone');
                    if (ok) markGranted('microphone');
                    setMicMsg(
                      ok
                        ? { ok: true, text: '麦克风已可用' }
                        : { ok: false, text: '还没拿到权限，可到系统设置里打开' },
                    );
                  }}
                >
                  申请
                </Button>
              </div>
              {micMsg && (
                <p
                  className={`mt-1.5 text-[11px] font-bold ${
                    micMsg.ok ? 'text-mint-600' : 'text-sun-600'
                  }`}
                >
                  {micMsg.ok ? '✅ ' : '⚠️ '}
                  {micMsg.text}
                </p>
              )}
            </div>
          )}

          <p className="pt-1 text-[11px] leading-relaxed text-ink-faint">
            语音识别依赖系统服务。国内 Android 若不可用，App 会自动切换到打字模式，
            输入你想说的句子一样能打分、拿经验。
          </p>
        </div>
      </section>

      {/* 数据管理 */}
      <section>
        <SectionTitle>数据管理</SectionTitle>
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">公式本 · 技巧本</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                已收录 {formulaN} 条公式、{tipN} 条技巧。清空后无法恢复。
              </p>
            </div>
          </div>

          {/* 清空是危险操作，二次确认放在这里而不是公式本页面上 ——
              做题时手滑点到的概率，比专门进设置里点高得多 */}
          {clearing === null ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setClearing('math')}
                disabled={!entries.some((e) => e.subject === 'math')}
                className="flex items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-[12px] font-black text-coral-600 disabled:opacity-40"
              >
                <Trash2 size={13} strokeWidth={2.6} />
                清空数学
              </button>
              <button
                onClick={() => setClearing('cs')}
                disabled={!entries.some((e) => e.subject === 'cs')}
                className="flex items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-[12px] font-black text-coral-600 disabled:opacity-40"
              >
                <Trash2 size={13} strokeWidth={2.6} />
                清空计算机
              </button>
              <button
                onClick={() => setClearing('all')}
                disabled={entries.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-coral-50 px-3 py-2 text-[12px] font-black text-coral-600 disabled:opacity-40"
              >
                <Trash2 size={13} strokeWidth={2.6} />
                清空全部
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-coral-300 bg-coral-50 p-3">
              <p className="flex items-center gap-1.5 text-[13px] font-black text-coral-700">
                <AlertTriangle size={15} strokeWidth={2.8} />
                确定清空{clearing === 'all' ? '全部记录' : `${SUBJECT_LABEL[clearing]}的记录`}？
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-coral-600">
                这会删掉
                {clearing === 'all'
                  ? `全部 ${entries.length} 条`
                  : `${entries.filter((e) => e.subject === clearing).length} 条`}
                记录，且**无法恢复**。试卷里已经提取过的内容不会自动补回来。
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => setClearing(null)}
                  className="rounded-xl bg-white px-3 py-1.5 text-[12px] font-black text-ink-soft"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    clearFormulas(clearing === 'all' ? undefined : clearing);
                    setClearing(null);
                  }}
                  className="rounded-xl bg-coral-500 px-3 py-1.5 text-[12px] font-black text-white"
                >
                  确认清空
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-ink-faint">
            练习进度、错题本与公式本都存在本机。登录账号后会自动云同步。
          </p>
        </div>
      </section>

      {/* 关于 */}
      <section className="pb-4">
        <SectionTitle>关于</SectionTitle>
        <div className="card space-y-2 p-4 text-xs leading-relaxed text-ink-soft">
          <p className="text-sm font-black text-ink">漫记 · 专转本刷题</p>
          <p>高等数学 / 计算机基础 / 英语（四级）三科题库，按江苏专转本官方考纲编排。</p>
          <p>试卷上传与 AI 解析由服务端提供，无需任何配置，开箱即用。</p>
          <p>练习进度默认存在本机；登录账号后自动云同步，并在排行榜与其他玩家比拼。</p>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCcw size={13} strokeWidth={3} />}
              onClick={() => settings.resetSettings()}
            >
              恢复默认设置
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-ink">{label}</p>
        <p className="text-[11px] leading-relaxed text-ink-faint">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-mint-500' : 'bg-ink/15'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
