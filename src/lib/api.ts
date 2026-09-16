// 漫记前端 API 客户端。base 默认走 vite 代理的 /api（开发）或 VITE_API_BASE（生产）。
const BASE: string = (import.meta as any).env?.VITE_API_BASE || '/api';

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
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
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
