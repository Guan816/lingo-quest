import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { TopBar } from './components/TopBar';
import { RewardToast } from './components/RewardToast';
import { setSfxEnabled } from './lib/sfx';
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
import Cet4Wrong from './pages/Cet4Wrong';
import { useAuthStore } from './lib/auth';
import { useProfileStore } from './store/useProfileStore';

/** 全屏沉浸式的玩法页面不显示顶部/底部栏 */
const IMMERSIVE = [
  /^\/play\//,
  /^\/games\/(listen|build|shadow|talk)/,
  /^\/cet4\/play\//,
  /^\/login$/,
  /^\/leaderboard$/,
  /^\/auth\/wechat\/callback$/,
];

function Shell() {
  const location = useLocation();
  const immersive = IMMERSIVE.some((re) => re.test(location.pathname));
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

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

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col bg-cream">
      {!immersive && <TopBar />}
      <main className={immersive ? 'flex-1' : 'flex-1 px-4 pb-4'}>
        <Routes>
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
          <Route path="/login" element={<Login />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/auth/wechat/callback" element={<WechatCallback />} />
          <Route path="/cet4" element={<Cet4 />} />
          <Route path="/cet4/play/:kind" element={<Cet4Play />} />
          <Route path="/cet4/wrong" element={<Cet4Wrong />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!immersive && <TabBar />}
      <RewardToast />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
