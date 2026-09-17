import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { testConnection } from '../lib/ai';
import { api } from '../lib/api';
import { webSearch } from '../lib/search';
import { asrSupported, speechDiagnostics, testSpeak, ttsSupported } from '../lib/speech';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import { markGranted, requestPermission } from '../lib/permissionGate';
import { Button, Chip, SectionTitle } from '../components/ui';
import clsx from 'clsx';

export default function Settings() {
  const ai = useSettingsStore((s) => s.ai);
  const setAi = useSettingsStore((s) => s.setAi);
  const settings = useSettingsStore();
  const dailyGoal = useProfileStore((s) => s.dailyGoal);
  const setDailyGoal = useProfileStore((s) => s.setDailyGoal);

  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** 服务端 AI 状态摘要（有哪些服务商、还剩多少额度） */
  const [aiStatus, setAiStatus] = useState<string>('');
  const [searchTesting, setSearchTesting] = useState(false);
  const [searchMsg, setSearchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [micMsg, setMicMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speakMsg, setSpeakMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** 语音能力自检结果：区分原生 / 浏览器，排查「没声音」时最关键的信息 */
  const diag = useMemo(() => speechDiagnostics(), []);

  /** 拉取服务端的 AI 服务商与剩余额度，展示给用户看 */
  const loadAiStatus = async () => {
    try {
      const r = await api.aiStatus();
      if (!r?.enabled) {
        setAiStatus('⚠️ 服务端还没有配置 AI 服务');
        return;
      }
      const names: string[] = (r.providers || []).map(
        (p: { name: string }) => p.name,
      );
      setAiStatus(`可用服务：${names.join(' / ')} · 今日剩余额度 ${r.quotaLeft ?? '-'} 次`);
    } catch {
      setAiStatus('暂时取不到服务状态（不影响使用）');
    }
  };

  useEffect(() => {
    void loadAiStatus();
  }, []);

  const runAiTest = async () => {
    setTesting(true);
    setTestMsg(null);
    const r = await testConnection(ai);
    setTestMsg({
      ok: r.ok,
      text: r.provider ? `${r.message}（${r.provider}）` : r.message,
    });
    setTesting(false);
    void loadAiStatus();
  };

  const runSearchTest = async () => {
    setSearchTesting(true);
    setSearchMsg(null);
    const r = await webSearch('今天的新闻', { baseUrl: ai.searchBaseUrl, limit: 3 });
    if (r.ok) {
      setSearchMsg({
        ok: r.hits.length > 0,
        text: r.hits.length ? `搜到 ${r.hits.length} 条：${r.hits[0].title.slice(0, 30)}` : '连通，但没返回结果',
      });
    } else {
      setSearchMsg({ ok: false, text: r.error ?? '搜索失败' });
    }
    setSearchTesting(false);
  };

  return (
    <div className="space-y-6 pt-1">
      {/* AI 配置 */}
      <section>
        <SectionTitle
          action={
            <span className="text-xs font-black text-ink-faint">
              {ai.enabled ? '已启用' : '离线模式'}
            </span>
          }
        >
          AI 对话
        </SectionTitle>
        <div className="card space-y-4 p-4">
          <Toggle
            label="启用 AI 自由对话"
            desc="开启后 BOSS 战和自由对话由大模型接手；关闭也能玩，走内置离线引擎。"
            checked={ai.enabled}
            onChange={(v) => setAi({ enabled: v })}
          />

          {ai.enabled && (
            <>
              {/*
                AI 由服务端统一提供：Key 在服务器上，模型也由服务器挑。
                所以这里**不再有** BaseURL / API Key / 模型名这些输入框 ——
                普通用户不需要（也不应该）碰这些东西。
              */}
              <div className="rounded-2xl bg-mint-50 px-3.5 py-3">
                <p className="text-[12px] font-black text-mint-700">AI 已开箱可用，不用填任何配置</p>
                <p className="mt-1 text-[11px] leading-relaxed text-mint-700/85">
                  服务端已经接好了模型（优先用有免费额度的），
                  BOSS 战、自由对话、试卷解析都能直接用，不需要你自己申请 Key。
                </p>
                {aiStatus && (
                  <p className="mt-1.5 text-[11px] font-bold text-mint-700/80">{aiStatus}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={runAiTest} disabled={testing}>
                  {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                  测试 AI
                </Button>
                {testMsg && (
                  <span
                    className={clsx(
                      "flex-1 text-xs font-bold",
                      testMsg.ok ? "text-mint-600" : "text-coral-600",
                    )}
                  >
                    {testMsg.ok ? "✅ " : "❌ "}
                    {testMsg.text}
                  </span>
                )}
              </div>


              {/* 联网搜索：让模型能查实时信息 */}
              <div className="space-y-3 rounded-2xl bg-ink/[0.03] p-3">
                <Toggle
                  label="接入联网搜索"
                  desc="问到新闻、比分、价格这类实时信息时先联网查一遍，再让 AI 组织回答。"
                  checked={!!ai.webSearch}
                  onChange={(v) => setAi({ webSearch: v })}
                />

                {ai.webSearch && (
                  <>
                    <Field label="搜索服务地址（选填）">
                      <input
                        value={ai.searchBaseUrl ?? ''}
                        onChange={(e) => setAi({ searchBaseUrl: e.target.value })}
                        placeholder="留空用默认 SearXNG 实例"
                        className="w-full rounded-2xl border-2 border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400"
                      />
                    </Field>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={runSearchTest} disabled={searchTesting}>
                        {searchTesting ? <Loader2 size={14} className="animate-spin" /> : null}
                        测试搜索
                      </Button>
                      {searchMsg && (
                        <span
                          className={`flex-1 truncate text-xs font-bold ${
                            searchMsg.ok ? 'text-mint-600' : 'text-coral-600'
                          }`}
                        >
                          {searchMsg.ok ? '✅ ' : '❌ '}
                          {searchMsg.text}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] leading-relaxed text-ink-faint">
                      搜索走的是 <span className="font-black">SearXNG</span>（开源元搜索引擎，无需 API Key）。
                      默认已指向本项目自建的服务，留空即可用。想换成自己的实例就把地址填进来
                      （带不带 <span className="font-mono">/search</span> 都行）。
                    </p>
                  </>
                )}
              </div>

                          </>
          )}
        </div>
      </section>

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

      {/* 关于 */}
      <section className="pb-4">
        <SectionTitle>关于</SectionTitle>
        <div className="card space-y-2 p-4 text-xs leading-relaxed text-ink-soft">
          <p className="text-sm font-black text-ink">漫记 · 玩着学口语</p>
          <p>React + TypeScript + Vite + Capacitor，一套代码同时跑网页、Android 与 iOS。</p>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-black text-ink-faint">{label}</p>
      {children}
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
