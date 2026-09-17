import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

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
}

interface AuthState {
  token: string | null;
  refresh: string | null;
  user: ClientUser | null;
  methods: Methods;
  ready: boolean;
  init: () => Promise<void>;
  loadMethods: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    captchaId: string,
    captchaCode: string,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, refresh: string) => Promise<void>;
  logout: () => void;
  doRefresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refresh: null,
      user: null,
      methods: { email: true, wechat: false, sms: false },
      ready: false,

      init: async () => {
        await get().loadMethods();
        const t = get().token;
        if (t) {
          try {
            const me = await api.getMe();
            set({ user: me.user });
          } catch {
            const ok = await get().doRefresh();
            if (!ok) set({ token: null, refresh: null, user: null });
          }
        }
        set({ ready: true });
      },

      loadMethods: async () => {
        try {
          const m = await api.getMethods();
          set({ methods: { email: !!m.email, wechat: !!m.wechat, sms: !!m.sms } });
        } catch {
          /* 离线时保持默认 */
        }
      },

      register: async (email, password, name, captchaId, captchaCode) => {
        const r = await api.register(email, password, name, captchaId, captchaCode);
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
      logout: () => set({ token: null, refresh: null, user: null }),
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
