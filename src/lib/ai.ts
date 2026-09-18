import { api } from './api';
import { formatHits, needsSearch, webSearch } from './search';

/**
 * AI 客户端 —— 前端**唯一**的 AI 入口。
 *
 * 【架构：Key 全在服务端，前端不持有任何密钥】
 * 早先版本让用户自己填 BaseURL / API Key / 模型名 —— 对普通用户太重了：
 * 要注册平台、实名认证、建 Key、抄地址和模型名，任何一步错了就是「AI 用不了」。
 * 现在服务端统一持有 Key（多家免费服务商自动故障转移），前端只发消息。
 *
 * 因此界面上**不存在**任何 AI 配置入口：
 * 用户点「AI 讲解」「AI 解析」「AI 出题」，直接就能用。
 *
 * 服务端侧见 server/src/routes/ai.ts 与 server/src/services/ai.ts。
 */

/** 多模态消息内容：给视觉模型看图片时用 */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/** 取出消息里的纯文本部分（数组形式时把 text 片段拼起来） */
export function textOf(content: string | ContentPart[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}

/**
 * 本地 AI 偏好。
 *
 * 只保留两个「用户自己的开关」，其余全部由服务端管理：
 *   webSearch      —— 是否让模型联网查实时信息
 *   searchBaseUrl  —— 自建搜索实例（留空即用默认）
 *
 * 注意：这里**没有** baseUrl / apiKey / model，也**不该**再长回来。
 */
export const DEFAULT_AI_PREFS = {
  /** 联网搜索：问到实时信息时先查一遍再回答 */
  webSearch: false,
  /** 搜索服务地址，留空用默认的自建 SearXNG */
  searchBaseUrl: '',
};

export interface AIPrefs {
  webSearch?: boolean;
  searchBaseUrl?: string;
}

export class AIError extends Error {}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** 需要模型读图（试卷解析）时置 true，会走视觉接口 */
  vision?: boolean;
}

/**
 * 调一次模型。统统走服务端代理。
 *
 * 好处不只是省配置：服务端能按用户算配额、能在多家免费服务商之间
 * 自动故障转移，这些在前端做不了。
 */
export async function chatComplete(
  _prefs: AIPrefs | undefined,
  turns: ChatTurn[],
  opts: ChatOptions = {},
): Promise<string> {
  const payload = {
    messages: turns,
    ...(opts.maxTokens ? { maxTokens: opts.maxTokens } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
  };

  try {
    const r = opts.vision
      ? await api.aiVision(payload.messages, payload)
      : await api.aiChat(payload.messages, payload);
    const text: string | undefined = r?.text;
    if (!text) throw new AIError('模型返回为空');
    return text.trim();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof AIError) throw e;
    throw new AIError(msg);
  }
}

/**
 * 带联网搜索的对话。
 *
 * 流程：先判断这句话是否需要实时信息 → 需要就搜一次 → 把结果拼进 system prompt
 * → 再交给模型组织语言。搜索失败不影响对话，只是退化成纯模型回答。
 */
export async function chatCompleteWithSearch(
  prefs: AIPrefs | undefined,
  turns: ChatTurn[],
  opts: ChatOptions & {
    /** 强制搜索（用户手动点「联网查」时用） */
    forceSearch?: boolean;
    /** 搜索完成回调，便于界面展示「正在查资料」 */
    onSearch?: (hits: number) => void;
  } = {},
): Promise<string> {
  const lastTurn = [...turns].reverse().find((t) => t.role === 'user');
  const lastUser = lastTurn ? textOf(lastTurn.content) : '';

  if (!prefs?.webSearch) {
    return chatComplete(prefs, turns, opts);
  }

  const shouldSearch = opts.forceSearch || needsSearch(lastUser);
  let searchBlock = '';

  if (shouldSearch) {
    const r = await webSearch(lastUser, { baseUrl: prefs.searchBaseUrl, limit: 4 });
    opts.onSearch?.(r.hits.length);
    if (r.ok && r.hits.length) {
      searchBlock = formatHits(r.hits);
    }
  }

  if (!searchBlock) {
    // 没搜到就正常回答，额外告诉模型「别硬编实时信息」
    return chatComplete(prefs, turns, opts);
  }

  const sys: ChatTurn = {
    role: 'system',
    content:
      '你能看到下面这些刚搜到的网页片段。请优先依据它们回答，' +
      '并用自然口语作答；如果片段里没有相关信息，就直说不知道，不要编造。\n\n' +
      '【联网搜索结果】\n' +
      searchBlock,
  };

  // 插在最前面，避免影响原有的角色设定（如果有的话）
  return chatComplete(prefs, [sys, ...turns], opts);
}

/** 服务端 AI 是否可用（不再需要用户配置，这里只用于展示状态） */
export async function testConnection(
  _prefs?: AIPrefs,
): Promise<{ ok: boolean; message: string; provider?: string }> {
  try {
    const r = await api.aiChat(
      [
        { role: 'system', content: 'Reply with exactly one short English sentence.' },
        { role: 'user', content: 'Say hi in one sentence.' },
      ],
      { maxTokens: 40, temperature: 0.3 },
    );
    return {
      ok: true,
      message: (r?.text || '').slice(0, 80) || '服务正常',
      provider: r?.provider,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '未知错误' };
  }
}
