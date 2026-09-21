import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthExpiredHandler, setAuthRefreshedHandler } from './api';

export interface ClientUser {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  avatar_url: string | null;
  total_xp: number;
  streak: number;
}

interface Methods {
  email: boolean;
  wechat: boolean;
  sms: boolean;
  /** 服务端是否配好了 SMTP（配好才显示「获取邮箱验证码」） */
  mail?: boolean;
}

/**
 * 从 JWT 里读出 exp（秒级时间戳），读不出返回 null。
 *
 * 用途：**离线也能判断 refresh 是否过期**。
 * 不依赖服务端、不依赖网络 —— refresh token 本身是 JWT，
 * 载荷里就写着到期时间，本地解一下即可。
 *
 * 注意这里**只解码不验签**：我们只用它做「要不要提前清掉本地登录态」的
 * 本地判断，真正的授权始终由服务端验签决定，所以不验签是安全的。
 */
export function jwtExp(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const payload = JSON.parse(atob(b64 + pad)) as { exp?: unknown };
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  refresh: string | null;
  /**
   * refresh token 的到期时间（秒）。**要持久化**：
   * 断网时也能据此判断登录态是否已经过期，而不是一直以为自己还登着。
   */
  refreshExp: number | null;
  user: ClientUser | null;
  methods: Methods;
  /** 启动校验是否完成。**不持久化** —— 见文件末尾 partialize 的说明 */
  ready: boolean;
  init: () => Promise<void>;
  /** 重新校验登录态（App 回到前台 / 路由切换时调用，内部有节流） */
  revalidate: () => Promise<void>;
  loadMethods: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    /** 邮箱验证码 —— 图形验证码已于 2026-09-18 移除，这是唯一校验方式 */
    emailCode?: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, refresh: string) => Promise<void>;
  logout: () => void;
  doRefresh: () => Promise<boolean>;
}

/** revalidate 的节流间隔：20 秒内重复进页面不重复校验 */
const REVALIDATE_GAP_MS = 20000;
let lastRevalidate = 0;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refresh: null,
      refreshExp: null,
      user: null,
      methods: { email: true, wechat: false, sms: false, mail: false },
      ready: false,

      init: async () => {
        await get().loadMethods();

        /*
         * ① 先做**离线过期判定**（不联网）。
         *    refresh token 都过期了，就没必要再打接口 ——
         *    直接清掉本地登录态，让守卫把用户送到登录页。
         *    这一步同时也是「长期没打开 App，回来发现登录已失效」的正解：
         *    以前只能等某个接口 401 才知道，现在启动就知道。
         */
        const exp = get().refreshExp;
        if (exp && Date.now() / 1000 > exp) {
          set({ token: null, refresh: null, refreshExp: null, user: null });
          set({ ready: true });
          return;
        }

        const t = get().token;
        if (!t) {
          // 没有 token 就是没有登录态 —— 顺手把可能残留的 user 清掉，
          // 避免「凭一份缓存的 user 就进了受保护页面」
          if (get().user) set({ user: null });
          set({ ready: true });
          return;
        }
        if (t) {
          try {
            // 进 App 先校验一次 token：401 会被 api 层静默刷新并重放，
            // 刷新也失败时 api 层会回调 onExpired 清空登录态。
            const me = await api.getMe();
            // 只有确实拿到 user 才覆盖，避免异常/残缺响应把本地缓存抹掉
            if (me?.user) set({ user: me.user });
          } catch {
            // 网络错误时保留本地缓存的登录态（离线也能进）；
            // 真正的失效由 api 层的 401 处理负责清空。
          }
        }
        set({ ready: true });
      },

      revalidate: async () => {
        const t = get().token;
        if (!t) return;
        // 节流：短期内多次进页面 / 切前后台不重复打接口
        const now = Date.now();
        if (now - lastRevalidate < REVALIDATE_GAP_MS) return;
        lastRevalidate = now;
        try {
          const me = await api.getMe();
          if (me?.user) set({ user: me.user });
        } catch {
          /* 401 由 api 层清空登录态；网络错误忽略 */
        }
      },

      loadMethods: async () => {
        try {
          const m = await api.getMethods();
          set({
            methods: { email: !!m.email, wechat: !!m.wechat, sms: !!m.sms, mail: !!m.mail },
          });
        } catch {
          /* 离线时保持默认 */
        }
      },

      register: async (email, password, name, emailCode) => {
        const r = await api.register(email, password, name, emailCode);
        set({ token: r.token, refresh: r.refresh, refreshExp: jwtExp(r.refresh), user: r.user });
      },
      login: async (email, password) => {
        const r = await api.login(email, password);
        set({ token: r.token, refresh: r.refresh, refreshExp: jwtExp(r.refresh), user: r.user });
      },
      loginWithToken: async (token, refresh) => {
        const me = await api.getMe();
        set({ token, refresh, refreshExp: jwtExp(refresh), user: me.user });
      },
      /**
       * 退出登录：**本地记忆 + 服务端凭据一起清**。
       *
       * 顺序很重要 —— 先发吊销请求（此时 token/refresh 还在，请求才带得上凭据），
       * 再清本地。吊销是「尽力而为」：网络不通也必须能登出，
       * 否则用户会卡在「点了退出还留着登录态」。
       *
       * 注意这里**只清登录态**，不动练习进度 / 公式本 / 错题本 ——
       * 那些是用户自己的学习数据，换个账号登录也该还在。
       */
      logout: () => {
        const rf = get().refresh;
        if (rf) void api.logout(rf).catch(() => undefined);
        set({ token: null, refresh: null, refreshExp: null, user: null });
      },
      doRefresh: async () => {
        const rf = get().refresh;
        if (!rf) return false;
        try {
          const r = await api.refresh(rf);
          set({ token: r.token, refresh: r.refresh, refreshExp: jwtExp(r.refresh), user: r.user });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'maneji-auth',
      /*
       * 只持久化「跨启动需要保留」的字段。
       *
       * ★ `ready` 必须排除 —— 它的含义是「**本次启动**的校验做完了没」。
       *   一旦被持久化成 true，冷启动时 RequireAuth 会以为已经就绪，
       *   跳过 Splash 直接渲染受保护页面，等 init() 校验完才把用户弹回登录页，
       *   于是用户看到一瞬间的已登录界面 —— 这正是加 Splash 要避免的闪烁。
       */
      partialize: (s) => ({
        token: s.token,
        refresh: s.refresh,
        refreshExp: s.refreshExp,
        user: s.user,
        methods: s.methods,
      }),

      /*
       * ★ merge 也要兜住 `ready`。
       *
       * partialize 只决定「往 localStorage 里**写**什么」，
       * 读回来时走的是 merge。老版本存档里已经写进了 `ready: true`，
       * 只加 partialize 的话这些老存档仍会把 ready 合并成 true，
       * 闪烁问题对**存量用户**依然存在。所以这里强制从 false 起步 ——
       * ready 的含义就是「本次启动校验完了没」，不允许被存档影响。
       */
      merge: (persisted, current) => ({
        ...current,
        ...((persisted ?? {}) as Partial<AuthState>),
        ready: false,
      }),
    },
  ),
);

/*
 * 把 api 层的登录事件同步回 store。
 *
 * api.ts 不能 import auth store（会循环依赖），所以用回调解耦：
 *   · token 静默刷新成功 → 同步内存里的 token
 *     （否则 store 里的旧 token 会在下次 persist 时把新 token 覆盖掉）
 *   · 登录彻底失效       → 清空 store，全局路由守卫随即把用户送回登录页
 */
setAuthExpiredHandler(() => {
  useAuthStore.setState({ token: null, refresh: null, user: null });
});
setAuthRefreshedHandler((token, refresh) => {
  // refreshExp 也要跟着更新，否则离线过期判定会拿旧到期时间误判
  useAuthStore.setState({ token, refresh, refreshExp: jwtExp(refresh) });
});

/*
 * 迁移：老存档里没有 refreshExp（是 2026-09-21 才加的字段），
 * 首次启动时从已存的 refresh token 补算一次，避免老用户被当成「无到期时间」
 * 而跳过离线过期判定。
 */
(() => {
  const s = useAuthStore.getState();
  if (!s.refreshExp && s.refresh) {
    useAuthStore.setState({ refreshExp: jwtExp(s.refresh) });
  }
})();
