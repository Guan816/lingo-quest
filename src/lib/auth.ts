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

interface AuthState {
  token: string | null;
  refresh: string | null;
  user: ClientUser | null;
  methods: Methods;
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
      user: null,
      methods: { email: true, wechat: false, sms: false, mail: false },
      ready: false,

      init: async () => {
        await get().loadMethods();
        const t = get().token;
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
        set({ token: r.token, refresh: r.refresh, user: r.user });
      },
      login: async (email, password) => {
        const r = await api.login(email, password);
        set({ token: r.token, refresh: r.refresh, user: r.user });
      },
      loginWithToken: async (token, refresh) => {
        const me = await api.getMe();
        set({ token, refresh, user: me.user });
      },
      logout: () => {
        const rf = get().refresh;
        // 尽力通知服务端吊销 refresh token（失败也不影响本地登出）
        if (rf) void api.logout(rf).catch(() => undefined);
        set({ token: null, refresh: null, user: null });
      },
      doRefresh: async () => {
        const rf = get().refresh;
        if (!rf) return false;
        try {
          const r = await api.refresh(rf);
          set({ token: r.token, refresh: r.refresh, user: r.user });
          return true;
        } catch {
          return false;
        }
      },
    }),
    { name: 'maneji-auth' },
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
  useAuthStore.setState({ token, refresh });
});
