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
  /**
   * 邮箱验证码。
   *
   * ── 2026-09-18 移除图形验证码 ──
   * 原来图形码承担两个职责：① 注册时证明是真人 ② 发邮件前防刷。
   * 现在只留邮箱验证码：它既能证明邮箱真实，也天然挡住脚本
   * （脚本得先能收到邮件）。
   *
   * 注意这个副作用：**图形码没了之后，发邮件这道口子要靠服务端限流守**，
   * 不能只靠前端倒计时 —— 见 server/src/routes/auth.ts 的 sendMailCode 限流。
   */
  const [emailCode, setEmailCode] = useState('');
  const [mailBusy, setMailBusy] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  /** 服务端配了 SMTP 才能发邮箱验证码 */
  const useMailCode = !!methods.mail;

  // 重发倒计时
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  /**
   * 发邮箱验证码。
   *
   * 图形验证码已移除（2026-09-18），防刷改由服务端「同邮箱 + 同 IP 限流」承担。
   * 前端这里只做邮箱格式校验和 60 秒倒计时（倒计时只是体验优化，不是安全边界）。
   */
  const sendMailCode = async () => {
    setErr('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr('先填一个正确的邮箱地址');
      return;
    }
    setMailBusy(true);
    try {
      await api.emailSend(email);
      setMailSent(true);
      setCooldown(60);
    } catch (e: any) {
      const msg = e?.message || '邮件发送失败';
      setErr(msg);
      if (/已注册/.test(msg)) setMailSent(false);
    } finally {
      setMailBusy(false);
    }
  };

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
          useMailCode ? emailCode : undefined,
        );
      } else {
        await login(email, password);
      }
      await after();
    } catch (e: any) {
      const msg = e?.message || '操作失败';
      setErr(msg);
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

          {/* 注册验证：只保留邮箱验证码（图形验证码已于 2026-09-18 移除） */}
          {mode === 'register' && (
            <div className="space-y-2">
              {useMailCode ? (
                <>
                  <div className="flex items-stretch gap-2">
                    <input
                      value={emailCode}
                      onChange={(e) =>
                        setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="邮箱验证码"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="flex-1 rounded-xl border-2 border-ink/10 bg-white px-3 py-3 text-center text-base font-black tracking-[0.35em] text-ink outline-none focus:border-brand-400"
                    />
                    <Button
                      variant="outline"
                      onClick={sendMailCode}
                      disabled={mailBusy || cooldown > 0}
                    >
                      {mailBusy ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : cooldown > 0 ? (
                        `${cooldown}s`
                      ) : (
                        '获取'
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-ink-faint">
                    {mailSent
                      ? '验证码已发出，10 分钟内有效。没收到就看下垃圾邮件箱。'
                      : '点「获取」会把 6 位验证码发到上面的邮箱，用来确认邮箱是你本人的。'}
                  </p>
                </>
              ) : (
                <p className="rounded-xl bg-cream px-3 py-2.5 text-[11px] leading-relaxed text-ink-soft">
                  服务器还没开通邮件服务，注册暂时不可用。可以先用「微信登录」。
                </p>
              )}
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
