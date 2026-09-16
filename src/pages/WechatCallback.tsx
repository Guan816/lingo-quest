import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/auth';
import { useProfileStore } from '../store/useProfileStore';
import { Loader2 } from 'lucide-react';

export default function WechatCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  useEffect(() => {
    const token = params.get('token');
    const refresh = params.get('refresh');
    (async () => {
      if (token && refresh) {
        try {
          await loginWithToken(token, refresh);
          await useProfileStore.getState().syncFromCloud();
        } catch {
          /* 忽略，跳回首页 */
        }
      }
      nav('/', { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-full place-items-center text-ink-soft">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-brand-500" />
        <p className="text-sm font-bold">微信登录中…</p>
      </div>
    </div>
  );
}
