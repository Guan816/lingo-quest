import { createRoot } from 'react-dom/client';
import { migrateLegacyStorage } from './lib/storageMigration';
import './index.css';

// 关键：迁移必须在任何 store 模块被加载之前执行。
// store 的 persist 中间件在模块求值时就会读 localStorage，
// 若先 import App，store 会先在旧 key 上初始化，迁移就白做了。
// 因此这里用动态 import 延迟加载 App。
migrateLegacyStorage();

const el = document.getElementById('root');
if (!el) throw new Error('#root not found');

void import('./App').then(({ default: App }) => {
  createRoot(el).render(<App />);
});
