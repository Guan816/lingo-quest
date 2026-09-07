import type { AIConfig } from '../types';

/**
 * OpenAI 兼容聊天接口客户端。
 * 只依赖 fetch，因此 DeepSeek / 通义 / Moonshot / Groq / 本地 Ollama / OpenAI
 * 只要是对话补全协议都能直接填 BaseURL 使用。
 */

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

/** 各家常见配置，设置页一键填入 */
export const AI_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: '海外可用，效果好',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hint: '国内直连，价格低',
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    hint: ' Kimi，中文友好',
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    hint: '阿里，国内稳定',
  },
  {
    id: 'ollama',
    name: '本地 Ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:3b',
    hint: '需本机运行，无需 Key',
  },
] as const;

function endpoint(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, '');
  if (b.endsWith('/chat/completions')) return b;
  return `${b}/chat/completions`;
}

export class AIError extends Error {}

export async function chatComplete(
  cfg: AIConfig,
  turns: ChatTurn[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<string> {
  if (!cfg.apiKey && !cfg.baseUrl.includes('localhost') && !cfg.baseUrl.includes('127.0.0.1')) {
    throw new AIError('还没有配置 API Key');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25000);

  try {
    const res = await fetch(endpoint(cfg.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: turns,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? 90,
        stream: false,
      }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AIError(
        res.status === 401
          ? 'API Key 无效或已过期'
          : res.status === 429
            ? '请求太频繁，稍后再试'
            : `服务返回 ${res.status}${detail ? `：${detail.slice(0, 120)}` : ''}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new AIError('模型返回为空');
    return text;
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof Error && err.name === 'AbortError') throw new AIError('请求超时，请检查网络');
    throw new AIError('无法连接 AI 服务，请检查网络与 BaseURL');
  } finally {
    clearTimeout(timer);
  }
}

/** 设置页的「测试连接」 */
export async function testConnection(cfg: AIConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const reply = await chatComplete(
      cfg,
      [
        { role: 'system', content: 'Reply with exactly one short English sentence.' },
        { role: 'user', content: 'Say hi in one sentence.' },
      ],
      { maxTokens: 30, timeoutMs: 15000 },
    );
    return { ok: true, message: reply.slice(0, 80) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : '未知错误' };
  }
}
