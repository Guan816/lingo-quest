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

/** 全屏沉浸式的玩法页面不显示顶部/底部栏 */
const IMMERSIVE = [/^\/play\//, /^\/games\/(listen|build|shadow|talk)/];

function Shell() {
  const location = useLocation();
  const immersive = IMMERSIVE.some((re) => re.test(location.pathname));
  const sfxEnabled = useSettingsStore((s) => s.sfxEnabled);

  useEffect(() => {
    setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

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
