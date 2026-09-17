import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, MessageCircle, Smartphone, UserPlus, X } from 'lucide-react';
import { useAuthStore } from '../lib/auth';
import { api } from '../lib/api';
import { useProfileStore } from '../store/useProfileStore';
import { Button } from '../components/ui';

export default function Login() {
  const nav = useNavigate();
  const methods = useAuthStore((s) => s.methods);
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  /** 图形验证码：注册必填，用来挡批量注册脚本 */
  const [captcha, setCaptcha] = useState<{ id: string; svg: string } | null>(null);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  /** 取一张新的验证码（注册失败 / 看不清时刷新） */
  const loadCaptcha = async () => {
    setCaptchaBusy(true);
    try {
      const c = await api.captcha();
      setCaptcha({ id: c.id, svg: c.svg });
      setCaptchaCode('');
    } catch {
      setCaptcha(null);
    } finally {
      setCaptchaBusy(false);
    }
  };

  // 切到注册页就自动取一张；验证码是「一次性」的，
  // 服务端校验完就作废，所以失败后要重新取
  useEffect(() => {
    if (mode === 'register') void loadCaptcha();
  }, [mode]);

  const after = async () => {
    setErr('');
    try {
      await useProfileStore.getState().syncFromCloud();
    } catch {
      /* 同步失败不影响登录 */
    }
    nav('/', { replace: true });
  };

  const submitEmail = async () => {
    setErr('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await register(
          email,
          password,
          name || email.split('@')[0],
          captcha?.id ?? '',
          captchaCode,
        );
      } else {
        await login(email, password);
      }
      await after();
    } catch (e: any) {
      const msg = e?.message || '操作失败';
      setErr(msg);
      // 验证码失败/已过期 → 自动换一张，别让用户卡在旧码上
      if (/验证码/.test(msg)) void loadCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const wechatLogin = async () => {
    setErr('');
    try {
      const r = await api.wechatUrl('login');
      window.location.href = r.url;
    } catch (e: any) {
      setErr(e?.message || '微信登录启动失败');
    }
  };

  const sendSms = async () => {
    setErr('');
    setDevCode(null);
    try {
      const r = await api.smsSend(phone);
      setDevCode(r.dev_code ?? null);
    } catch (e: any) {
      setErr(e?.message || '短信发送失败');
    }
  };

  const submitSms = async () => {
    setErr('');
    setBusy(true);
    try {
      await api.smsVerify(phone, code);
      await after();
    } catch (e: any) {
      setErr(e?.message || '登录失败');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full rounded-2xl border-2 border-ink/10 bg-white px-3.5 py-3 text-sm text-ink outline-none focus:border-brand-400';

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pb-10 pt-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-brand-500 text-3xl shadow-pop">
          漫
        </div>
        <h1 className="text-2xl font-black tracking-tight text-ink">漫记</h1>
        <p className="mt-1 text-sm text-ink-soft">登录后进度云同步 · 和好友比拼排行榜</p>
      </div>

      {err && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-coral-100 px-3 py-2.5 text-sm font-bold text-coral-600">
          <X size={15} strokeWidth={3} />
          {err}
        </div>
      )}

      {/* 邮箱 / 密码 */}
      {methods.email && (
        <div className="card space-y-3 p-5">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-black ${
                mode === 'login' ? 'bg-brand-500 text-white' : 'bg-ink/5 text-ink-soft'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-black ${
                mode === 'register' ? 'bg-brand-500 text-white' : 'bg-ink/5 text-ink-soft'
              }`}
            >
              注册
            </button>
          </div>

          {mode === 'register' && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-ink/10 px-3">
              <UserPlus size={16} className="text-ink-faint" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="昵称（选填）"
                className="w-full bg-transparent py-3 text-sm text-ink outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl border-2 border-ink/10 px-3">
            <Mail size={16} className="text-ink-faint" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              type="email"
              autoCapitalize="none"
              className="w-full bg-transparent py-3 text-sm text-ink outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border-2 border-ink/10 px-3">
            <Lock size={16} className="text-ink-faint" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少 6 位）"
              type="password"
              className="w-full bg-transparent py-3 text-sm text-ink outline-none"
            />
          </div>

          {/* 图形验证码：注册必填。自绘 SVG，点一下换一张 */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={loadCaptcha}
                  title="看不清？点一下换一张"
                  className="grid w-[130px] shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-ink/10 bg-cream active:border-brand-300"
                >
                  {captchaBusy ? (
                    <Loader2 size={18} className="animate-spin text-ink-faint" />
                  ) : captcha?.svg ? (
                    <span
                      className="block h-[52px] w-full [&>svg]:h-full [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: captcha.svg }}
                    />
                  ) : (
                    <span className="text-[11px] text-ink-faint">获取验证码</span>
                  )}
                </button>
                <input
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4))}
                  placeholder="验证码"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="flex-1 rounded-xl border-2 border-ink/10 bg-white px-3 py-3 text-center text-base font-black tracking-[0.35em] text-ink outline-none focus:border-brand-400"
                />
              </div>
              <p className="text-[11px] text-ink-faint">
                输入图中的 4 个字符（不分大小写）。看不清就点图片换一张。
              </p>
            </div>
          )}

          <Button block disabled={busy} onClick={submitEmail}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === 'register' ? '注册并登录' : '登录'}
          </Button>
        </div>
      )}

      {/* 微信 */}
      {methods.wechat && (
        <button
          onClick={wechatLogin}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#07c160] py-3.5 text-sm font-black text-white shadow-pop btn-pop"
        >
          <MessageCircle size={18} strokeWidth={2.6} />
          微信登录
        </button>
      )}

      {/* 手机号 */}
      {methods.sms && (
        <div className="card mt-3 space-y-3 p-5">
          <div className="flex items-center gap-2 rounded-xl border-2 border-ink/10 px-3">
            <Smartphone size={16} className="text-ink-faint" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="手机号"
              inputMode="numeric"
              className="w-full bg-transparent py-3 text-sm text-ink outline-none"
            />
          </div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="验证码"
              inputMode="numeric"
              className={`${inputCls} flex-1`}
            />
            <Button variant="outline" onClick={sendSms} disabled={busy}>
              获取
            </Button>
          </div>
          {devCode && (
            <p className="rounded-xl bg-sun-100 px-3 py-2 text-xs font-bold text-sun-600">
              开发模式验证码：{devCode}（生产环境会真实下发短信）
            </p>
          )}
          <Button variant="mint" block disabled={busy} onClick={submitSms}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            验证码登录
          </Button>
        </div>
      )}

      <button
        onClick={() => nav('/')}
        className="mx-auto mt-6 text-sm font-bold text-ink-faint btn-pop"
      >
        先随便逛逛 →
      </button>
    </div>
  );
}
