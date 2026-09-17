// 漫记前端 API 客户端。base 默认走 vite 代理的 /api（开发）或 VITE_API_BASE（生产）。
const BASE: string = (import.meta as any).env?.VITE_API_BASE || '/api';

/**
 * 混合内容拦截检测。
 *
 * 安全上下文（https 页面 / Capacitor 的 https://localhost）里，浏览器会
 * 直接拦掉发往 http:// 的 fetch —— 请求根本不出网，控制台只留一行
 * Mixed Content 报错，用户侧表现为「点了没反应」。这里主动探测一次，
 * 让上层能弹出可读的提示，而不是静默失败。
 */
let mixedContentWarned = false;
export function isMixedContentBlocked(): boolean {
  if (typeof window === 'undefined') return false;
  if (mixedContentWarned) return true;
  try {
    const secure = window.isSecureContext === true;
    const blocked = secure && /^http:\/\//i.test(BASE);
    if (blocked) mixedContentWarned = true;
    return blocked;
  } catch {
    return false;
  }
}

/** 给低层错误补一句人话，避免用户只看到 "Failed to fetch" */
function friendly(e: unknown, path: string): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (isMixedContentBlocked()) {
    return new Error('当前页面是加密访问，而服务器只支持 http，请求被浏览器拦截。请改用 http 地址打开。');
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return new Error(`连不上服务器（${path}），请检查网络后重试`);
  }
  return e instanceof Error ? e : new Error(msg);
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('maneji-auth');
    if (!raw) return null;
    const j = JSON.parse(raw);
    return j?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request(path: string, opts: RequestInit = {}): Promise<any> {
  if (isMixedContentBlocked()) {
    throw new Error('当前页面是加密访问，而服务器只支持 http，请求被浏览器拦截。请改用 http 地址打开。');
  }
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(BASE + path, { ...opts, headers });
  } catch (e) {
    throw friendly(e, path);
  }
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* 忽略非 JSON 响应 */
  }
  if (!res.ok) throw new Error(data?.error || `请求失败 (${res.status})`);
  return data;
}

export const api = {
  getMethods: () => request('/auth/methods'),
  register: (email: string, password: string, display_name: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name }),
    }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  refresh: (refresh: string) =>
    request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh }) }),
  getMe: () => request('/auth/me'),
  wechatUrl: (state: string) =>
    request('/auth/wechat/url?state=' + encodeURIComponent(state)),
  smsSend: (phone: string) =>
    request('/auth/sms/send', { method: 'POST', body: JSON.stringify({ phone }) }),
  smsVerify: (phone: string, code: string) =>
    request('/auth/sms/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  syncPull: (since: string) => request('/sync/pull?since=' + encodeURIComponent(since)),
  syncPush: (payload: unknown) =>
    request('/sync/push', { method: 'POST', body: JSON.stringify(payload) }),
  leaderboard: (limit = 100) => request('/leaderboard?limit=' + limit),
  leaderboardMe: () => request('/leaderboard/me'),
};
