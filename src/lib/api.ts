// 漫记前端 API 客户端。base 默认走 vite 代理的 /api（开发）或 VITE_API_BASE（生产）。
const BASE: string = (import.meta as any).env?.VITE_API_BASE || '/api';

/* ─────────────── 混合内容诊断 ─────────────── */

/**
 * 判断当前是否处于「页面加密、接口明文」的处境。
 *
 * 踩过的坑：早先这里是**预检** —— 只要安全上下文 + BASE 是 http 就提前抛错，
 * 结果把能走通的路堵死了。因为 Capacitor 的 WebView origin 是
 * `https://localhost`，isSecureContext 为 true，但 capacitor.config.ts 里
 * 开了 `allowMixedContent`，请求其实是能正常发出的。
 * 于是 APK 里一点注册就报错，而浏览器里却没事。
 *
 * 所以现在只做**事后诊断**：请求真的失败了，再用它判断原因。
 */
function isSecureContextHttpApi(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.isSecureContext === true && /^http:\/\//i.test(BASE);
  } catch {
    return false;
  }
}

/** 接口地址的 host（用于判断能否做 http 回退） */
function apiHost(): string | null {
  try {
    return new URL(BASE).host || null;
  } catch {
    return null;
  }
}

/**
 * 浏览器场景的补救：能否把页面从 https 切回 http。
 *
 * 现在的手机浏览器默认「优先 HTTPS」，会把 http://106.14.70.32 悄悄升级成
 * https。服务器没开 443，于是页面可能勉强打开、但所有接口都被拦。
 * 只要接口和页面是同一个 host，就允许切回去。
 */
export function canFallbackToHttp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'https:') return false;
  const h = apiHost();
  return !!h && h === window.location.host;
}

/** 执行 http 回退（由用户点按钮触发，不自动跳，避免来回重定向） */
export function fallbackToHttp(): void {
  if (typeof window === 'undefined') return;
  const h = apiHost();
  if (!h) return;
  const { pathname, search, hash } = window.location;
  window.location.replace(`http://${h}${pathname}${search}${hash}`);
}

/** 给低层错误补一句人话，避免用户只看到 "Failed to fetch" */
function friendly(e: unknown, path: string): Error {
  const msg = e instanceof Error ? e.message : String(e);

  // 请求已经失败了，这时才判断是不是混合内容的问题
  if (isSecureContextHttpApi()) {
    return new Error(
      canFallbackToHttp()
        ? '接口被拦截了：页面是 https，而服务器只有 http。点下面的按钮切回 http 就能用。'
        : '请求被拦截了。如果是在浏览器里，请改用 http:// 地址打开（服务器暂未支持 https）。',
    );
  }
  if (/failed to fetch|networkerror|load failed|err_failed|err_connection/i.test(msg)) {
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
  // 注意：这里**不做**任何前置拦截。先老老实实发请求，
  // 能不能通由浏览器/WebView 决定，失败了再看 friendly() 怎么解释。
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
  /**
   * 把验证码发到邮箱。
   *
   * ── 2026-09-18 图形验证码已移除 ──
   * 原来这里要先带 captchaId / captchaCode（防刷）。现在防刷由服务端
   * 「同邮箱 + 同 IP 限流」承担，前端不再传任何验证凭据。
   */
  emailSend: (email: string) =>
    request('/auth/email/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  /** 注册。邮箱验证码是唯一校验方式（图形验证码已移除） */
  register: (
    email: string,
    password: string,
    display_name: string,
    emailCode?: string,
  ) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        display_name,
        emailCode: emailCode || '',
      }),
    }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  refresh: (refresh: string) =>
    request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh }) }),
  logout: (refresh: string) =>
    request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh }) }),
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

  /* ── AI：全部走服务端代理，前端不持有任何密钥 ── */
  aiStatus: () => request('/ai/status'),
  aiChat: (messages: unknown[], opts: Record<string, unknown> = {}) =>
    request('/ai/chat', { method: 'POST', body: JSON.stringify({ messages, ...opts }) }),
  aiVision: (messages: unknown[], opts: Record<string, unknown> = {}) =>
    request('/ai/vision', { method: 'POST', body: JSON.stringify({ messages, ...opts }) }),

  /* ── 题库：拉取线上增量、入库、复核 ── */
  /** 拉取线上题库（只返回 status='live' 的题） */
  bankQuestions: (subject?: string, since?: string) => {
    const qs = new URLSearchParams();
    if (subject) qs.set('subject', subject);
    if (since) qs.set('since', since);
    const q = qs.toString();
    return request('/bank/questions' + (q ? `?${q}` : ''));
  },
  /** 题库概览：各科目各状态的题量 */
  bankStats: () => request('/bank/stats'),
  /** 后台：按状态列出题目（含 pending / doubtful / rejected） */
  bankList: (params: { subject?: string; status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params.subject) qs.set('subject', params.subject);
    if (params.status) qs.set('status', params.status);
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    return request('/bank/list?' + qs.toString());
  },
  /** 后台：批量入库（AI 出题 / 导入的结果落库） */
  bankIngest: (questions: unknown[], meta: Record<string, unknown> = {}) =>
    request('/bank/ingest', { method: 'POST', body: JSON.stringify({ questions, ...meta }) }),
  /** 后台：批量改状态（复核放行 / 驳回） */
  bankReview: (ids: string[], status: string, note?: string) =>
    request('/bank/review', { method: 'POST', body: JSON.stringify({ ids, status, note }) }),
  /** 后台：批量删除 */
  bankDelete: (ids: string[]) =>
    request('/bank/delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  /** 后台：生成/导入记录 */
  bankLogs: (limit = 50) => request('/bank/logs?limit=' + limit),
  /** 当前用户是不是管理员 */
  adminMe: () => request('/bank/admin/me'),
};
