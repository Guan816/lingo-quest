import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TabBar } from './components/TabBar';
import { TopBar } from './components/TopBar';
import { RewardToast } from './components/RewardToast';
import { PermissionGate } from './components/PermissionGate';
import { HttpFallbackBanner } from './components/HttpFallbackBanner';
import { setSfxEnabled } from './lib/sfx';
import { primeTts } from './lib/speech';
import { useSettingsStore } from './store/useSettingsStore';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import LevelPlay from './pages/LevelPlay';
import GamesHub from './pages/GamesHub';
import ListenPick from './pages/games/ListenPick';
import SentenceBuilder from './pages/games/SentenceBuilder';
import Shadowing from './pages/games/Shadowing';
import FreeTalk from './pages/games/FreeTalk';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Leaderboard from './pages/Leaderboard';
import WechatCallback from './pages/WechatCallback';
import Cet4 from './pages/Cet4';
import Cet4Play from './pages/Cet4Play';
import MathPage from './pages/MathPage';
import MathPlay from './pages/MathPlay';
import CsPage from './pages/CsPage';
import CsPlay from './pages/CsPlay';
import UploadPaper from './pages/UploadPaper';
import FormulaBook from './pages/FormulaBook';
import UploadBook from './pages/UploadBook';
import WrongBook from './pages/WrongBook';
import SubjectStats from './pages/SubjectStats';
import BankGen from './pages/admin/BankGen';
import BankList from './pages/admin/BankList';
import { useAuthStore } from './lib/auth';
import { useProfileStore } from './store/useProfileStore';
import { useQuestionBankStore } from './store/useQuestionBankStore';

/** 全屏沉浸式的玩法页面不显示顶部/底部栏 */
const IMMERSIVE = [
  /^\/play\//,
  /^\/games\/(listen|build|shadow|talk)/,
  /^\/cet4\/play\//,
  /^\/math\/play\//,
  /^\/cs\/play\//,
  /^\/login$/,
  /^\/leaderboard$/,
  /^\/auth\/wechat\/callback$/,
  /^\/paper\//,
  /^\/formulas$/,
  // 题库后台是纯操作页，不需要顶栏底栏（底栏还会盖住底部按钮）
  /^\/admin\//,
];

/**
 * 页面自己声明「我现在要沉浸式」。
 *
 * ── 为什么需要这个 ──
 * 上面那份 IMMERSIVE 是**按路由**判定的，但有些页面会在**同一个路由内**
 * 切成答题界面：最典型的是错题本 —— `/wrong` 平时是列表（该有导航栏），
 * 点「重做」后变成 QuizRunner（不该有导航栏）。
 *
 * 光靠路由判断不出来，于是留一个运行时开关：页面进入答题态时调
 * `setImmersive(true)`，退出时复位。
 *
 * ── 踩过的坑 ──
 * 错题重做没走这条路，结果 TabBar（top 767）**整个盖在提交按钮
 * （top 786, bottom 836）上面**，用户点「提交答案」实际点到了底部导航，
 * 题目永远交不上去、错题本永远清不掉。见 App.tsx 的 immersive 计算。
 */
let immersiveOverride = false;
const immersiveListeners = new Set<(v: boolean) => void>();

export function setImmersive(v: boolean) {
  if (immersiveOverride === v) return;
  immersiveOverride = v;
  immersiveListeners.forEach((fn) => fn(v));
}

function Shell() {
  const location = useLocation();
  const [override, setOverride] = useState(immersiveOverride);

  useEffect(() => {
    immersiveListeners.add(setOverride);
    return () => {
      immersiveListeners.delete(setOverride);
    };
  }, []);

  const immersive = override || IMMERSIVE.some((re) => re.test(location.pathname));
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  // Android WebView 要求音频由用户手势解锁，否则后续 TTS 会被静默丢弃。
  // 这里挂一次性的首次交互监听，用户第一次点屏幕就把 TTS 通道打开。
  useEffect(() => {
    const unlock = () => {
      primeTts();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    (async () => {
      await initAuth();
      if (useAuthStore.getState().user) {
        try {
          await useProfileStore.getState().syncFromCloud();
        } catch {
          /* 同步失败不影响启动 */
        }
      }
    })();
  }, [initAuth]);

  /*
   * 启动时拉一次线上题库。
   *
   * 有意放在这里而不是各科目页里：拉一次全局共用，
   * 且失败不影响任何功能（静态题库照常能用）。
   * store 内部有 6 小时的过期判断，不会每次切页都请求。
   */
  useEffect(() => {
    void useQuestionBankStore.getState().refresh();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // App 从后台切回前台时再校验一次登录态（token 可能在后台过期）
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void useAuthStore.getState().revalidate();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col bg-cream">
      {!immersive && <TopBar />}
      <HttpFallbackBanner />
      <main className={immersive ? 'flex-1' : 'flex-1 px-4 pb-4'}>
        <Routes>
          {/* 公开路由：登录页 + 微信回调（回调本身属于登录流程） */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/wechat/callback" element={<WechatCallback />} />

          {/*
            其余**全部业务页面都要求登录**。
            没登录 / token 失效 → RequireAuth 送回 /login；
            首页、数学、计算机、英语、我的，以及刷题、错题本、公式本等
            任何功能页都在这个组里，未登录一律进不去。
          */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/play/:levelId" element={<LevelPlay />} />
            <Route path="/games" element={<GamesHub />} />
            <Route path="/games/listen" element={<ListenPick />} />
            <Route path="/games/build" element={<SentenceBuilder />} />
            <Route path="/games/shadow" element={<Shadowing />} />
            <Route path="/games/talk" element={<FreeTalk />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/cet4" element={<Cet4 />} />
            <Route path="/cet4/play/:kind" element={<Cet4Play />} />
            {/* 英语错题已并入统一错题本，老入口保留跳转，避免旧链接失效 */}
            <Route path="/cet4/wrong" element={<Navigate to="/wrong" replace />} />
            <Route path="/math" element={<MathPage />} />
            <Route path="/math/play/:mode" element={<MathPlay />} />
            <Route path="/math/play/:mode/:value" element={<MathPlay />} />
            <Route path="/cs" element={<CsPage />} />
            <Route path="/cs/play/:mode" element={<CsPlay />} />
            <Route path="/cs/play/:mode/:value" element={<CsPlay />} />
            <Route path="/wrong" element={<WrongBook />} />
            <Route path="/wrong/:mode" element={<WrongBook />} />
            <Route path="/stats/:subject" element={<SubjectStats />} />
            <Route path="/paper/:subject" element={<UploadPaper />} />
            <Route path="/formulas" element={<FormulaBook />} />
            <Route path="/upload-book" element={<UploadBook />} />
            <Route path="/admin/bank" element={<BankGen />} />
            <Route path="/admin/bank/list" element={<BankList />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </main>
      {!immersive && <TabBar />}
      <RewardToast />
      {/* 全局权限申请弹窗：任何地方请求麦克风等权限时都会用它 */}
      <PermissionGate />
    </div>
  );
}

/** 正在确认登录态时的占位（不能直接跳登录页，否则刷新瞬间会误跳） */
function Splash() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink-faint">
        <Loader2 size={26} className="animate-spin" />
        <span className="text-xs font-bold">正在确认登录状态…</span>
      </div>
    </div>
  );
}

/**
 * 登录守卫：包住「所有需要登录的业务页面」。
 *
 * 判定顺序很重要：
 *   ① `ready` 还没好 → 先显示占位，**不能**立刻跳登录页
 *      （zustand persist 的水合发生在首帧之后，否则每次刷新都会闪一下登录页）
 *   ② 已就绪但没 user → 记下想去的位置，replace 到 /login
 *   ③ 通过 → 渲染 <Outlet />（真正的页面）
 */
function RequireAuth() {
  const location = useLocation();
  const ready = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);

  // 每次进入受保护页面都重新校验一次 token 是否还有效
  // （store 内部有 20 秒节流，不会每次切页都打接口）
  useEffect(() => {
    if (ready) void useAuthStore.getState().revalidate();
  }, [ready, location.pathname]);

  if (!ready) return <Splash />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }
  return <Outlet />;
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
