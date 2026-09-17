/**
 * 联网搜索：给 AI 对话补充实时信息。
 *
 * 为什么需要它：大模型的知识有截止日期，问「最近有什么新闻」「某个新出的东西」
 * 会答不上来或者编。这里先搜一遍网页，把结果塞进 system prompt 再让模型组织语言。
 *
 * 搜索后端用 SearXNG（开源自建、无 API Key、聚合多引擎结果）。
 * 填自建实例地址即可；不填则用默认实例。
 */

export interface SearchHit {
  title: string;
  url: string;
  content: string;
}

export interface SearchResult {
  ok: boolean;
  hits: SearchHit[];
  /** 失败原因，用于在界面上给用户提示 */
  error?: string;
}

/** 默认搜索实例（用户可在设置里改成自己的自建实例） */
export const DEFAULT_SEARCH_BASE = 'https://searx.be';

/** 单次搜索超时。搜索是「锦上添花」，不能拖垮对话 */
const SEARCH_TIMEOUT_MS = 8000;

function endpoint(base: string): string {
  const b = (base || DEFAULT_SEARCH_BASE).trim().replace(/\/+$/, '');
  return `${b}/search`;
}

/**
 * 搜一次。失败不抛异常 —— 搜索挂了也必须让对话继续跑，
 * 只是退化成「没有实时信息」而已。
 */
export async function webSearch(
  query: string,
  opts: { baseUrl?: string; limit?: number; signal?: AbortSignal } = {},
): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { ok: true, hits: [] };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
  // 外部取消也要能中断
  opts.signal?.addEventListener('abort', () => ctrl.abort(), { once: true });

  try {
    const url = new URL(endpoint(opts.baseUrl ?? DEFAULT_SEARCH_BASE));
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('language', 'zh-CN');
    url.searchParams.set('safesearch', '1');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });

    if (!res.ok) {
      return { ok: false, hits: [], error: `搜索服务返回 ${res.status}` };
    }

    const data = (await res.json()) as { results?: SearchHit[] };
    const hits = (data.results ?? []).slice(0, opts.limit ?? 4).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      content: (r.content ?? '').slice(0, 400),
    }));
    return { ok: true, hits };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      hits: [],
      error: aborted ? '搜索超时' : '搜索服务不可用',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** 判断一句话是否值得联网查：问时间敏感的事才搜，闲聊不搜 */
const TIME_SENSITIVE = [
  /\b(news|latest|recent|today|tonight|now|current|2025|2026)\b/i,
  /\b(who won|score|price|weather|stock|release[ds]?|update[ds]?)\b/i,
  /最新|最近|现在|今天|昨天|本周|本月|新闻|新闻里|多少钱|价格|比分|谁赢|什么时候|发布了|出了吗/,
];

export function needsSearch(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  // 纯学习类问题（翻译、语法）不需要联网，省一次请求
  if (/^(翻译|translate|怎么读|what does .* mean|这句话)/i.test(t)) return false;
  return TIME_SENSITIVE.some((re) => re.test(t));
}

/** 把搜索结果压成一段可塞进 prompt 的上下文 */
export function formatHits(hits: SearchHit[], maxChars = 1200): string {
  if (!hits.length) return '';
  const lines = hits.map((h, i) => `[${i + 1}] ${h.title}\n${h.content}\n来源：${h.url}`);
  const text = lines.join('\n\n');
  return text.length > maxChars ? text.slice(0, maxChars) + '…' : text;
}
