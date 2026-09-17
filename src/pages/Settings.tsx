import type { ReactNode } from 'react';
import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { AI_PRESETS, testConnection } from '../lib/ai';
import { webSearch } from '../lib/search';
import { asrSupported, ttsSupported } from '../lib/speech';
import { useSettingsStore } from '../store/useSettingsStore';
import { useProfileStore } from '../store/useProfileStore';
import { markGranted, requestPermission } from '../lib/permissionGate';
import { Button, Chip, SectionTitle } from '../components/ui';

export default function Settings() {
  const ai = useSettingsStore((s) => s.ai);
  const setAi = useSettingsStore((s) => s.setAi);
  const settings = useSettingsStore();
  const dailyGoal = useProfileStore((s) => s.dailyGoal);
  const setDailyGoal = useProfileStore((s) => s.setDailyGoal);

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [searchTesting, setSearchTesting] = useState(false);
  const [searchMsg, setSearchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [micMsg, setMicMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setTestMsg(null);
    const r = await testConnection(ai);
    setTestMsg({ ok: r.ok, text: r.message });
    setTesting(false);
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
              <div>
                <p className="mb-2 text-xs font-black text-ink-faint">快速填入服务商</p>
                <div className="flex flex-wrap gap-2">
                  {AI_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAi({ baseUrl: p.baseUrl, model: p.model })}
                      className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-black text-ink-soft btn-pop"
                      title={p.hint}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Base URL">
                <input
                  value={ai.baseUrl}
                  onChange={(e) => setAi({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-2xl border-2 border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400"
                />
              </Field>

              <Field label="API Key">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={ai.apiKey}
                    onChange={(e) => setAi({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full rounded-2xl border-2 border-ink/10 bg-white px-3 py-2.5 pr-10 text-sm text-ink outline-none focus:border-brand-400"
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    aria-label="显示/隐藏密钥"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Field label="模型名称">
                <input
                  value={ai.model}
                  onChange={(e) => setAi({ model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded-2xl border-2 border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand-400"
                />
              </Field>

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

              <div className="flex items-center gap-2">
                <Button size="sm" variant="mint" onClick={runTest} disabled={testing}>
                  {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                  测试连接
                </Button>
                {testMsg && (
                  <span
                    className={`flex-1 truncate text-xs font-bold ${
                      testMsg.ok ? 'text-mint-600' : 'text-coral-600'
                    }`}
                  >
                    {testMsg.ok ? '✅ ' : '❌ '}
                    {testMsg.text}
                  </span>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-2xl bg-brand-50 p-3">
                <ShieldCheck size={16} strokeWidth={2.6} className="mt-0.5 shrink-0 text-brand-600" />
                <p className="text-[11px] leading-relaxed text-brand-700">
                  Key 只保存在你这台设备的本地存储里，不会上传到任何第三方服务器，
                  也不会被提交到 GitHub。请求由你的 App 直接发给你填的服务商。
                </p>
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
          <div className="flex items-center justify-between">
            <span>语音识别（打分）</span>
            {asrSupported() ? (
              <Chip tone="mint">
                <CheckCircle2 size={12} strokeWidth={3} /> 可用
              </Chip>
            ) : (
              <Chip tone="sun">不可用 · 走打字模式</Chip>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>语音朗读（示范）</span>
            {ttsSupported() ? (
              <Chip tone="mint">
                <CheckCircle2 size={12} strokeWidth={3} /> 可用
              </Chip>
            ) : (
              <Chip tone="sun">不可用</Chip>
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
