# 漫记 · 玩着学的 AI 口语陪练

> Game-like AI speaking coach. Learn English by **playing** — 闯关地图、发音打分、AI 角色对话。一套代码同时跑网页、Android 与 iOS。

- 🎮 四种玩法：听音选词 / 拼句挑战 / 影子跟读 / Boss 对话
- 🗺️ 游戏化：XP、等级、连击、成就、每日任务、关卡地图
- 🤖 双引擎：内置离线剧本引擎（**零配置、零网络即可玩**）+ 设置页填 OpenAI 兼容 API 走真实 LLM
- 🔊 Web Speech 朗读与识别 + 本地发音评分（设备不支持识别时自动降级为打字模式）
- 👤 支持账号登录、跨设备进度同步、多人排行榜（云同步/排行榜需自备后端服务，未配置时不影响离线游玩）

**技术栈**：React + TypeScript + Vite + Tailwind，用 Capacitor 打包为 Android / iOS 应用。

> 💡 **不登录也能玩**：进度存在本机 `localStorage`，无需任何服务端。

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

浏览器打开终端提示的地址（默认 http://localhost:5173）即可。

> ⚠️ **不要双击 `index.html`** —— 这是 Vite + React 项目，必须通过开发服务器访问。
> 直接双击会走 `file://` 协议，浏览器会拦掉模块脚本，页面一片空白。

### 构建生产版本
```bash
npm run build     # 类型检查 + 打包，产物在 dist/
npm run preview   # 本地预览构建结果
```

---

## 开发命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 类型检查 + 打包生产版本 |
| `npm run preview` | 预览打包结果 |
| `npm run typecheck` | 只做 TypeScript 类型检查 |
| `npm run cap:sync` | 构建并同步到 Capacitor 原生工程 |
| `npm run cap:android` | 打开 Android Studio 出包 |

---

## 打包到手机

### 网页版（最快）
部署到任意静态托管（GitHub Pages / Cloudflare Pages / Vercel）后，
手机浏览器打开 →「添加到主屏幕」，即可当 App 使用。

仓库附带 `.github/workflows/deploy-pages.yml`：推送到 `main` 后自动部署。

### Android APK
```bash
npm run cap:sync      # 构建网页并同步到 android/ 工程
npm run cap:android   # 在 Android Studio 里 Build → APK
```

仓库同样附带 `.github/workflows/build-android.yml`：推送到 `main` 会自动构建 APK，
在 Actions 运行记录的 Artifacts 中下载安装。打 `v1.0.0` tag 会把 APK 挂到 Release 页面。

> 本地打包需要已安装 JDK 17 + Android SDK；仅想体验的话用上面的网页版即可。

### iOS
需要 macOS + Xcode：
```bash
npm run cap:sync
npx cap open ios
```

---

## 玩法与设计

**一次完整开口回合**：听示范朗读（TTS）→ 点麦克风开口 → 实时识别 → 即时打分 → 进入下一句。

**发音评分**：本地算法，综合「词序匹配 + 编辑距离 + 长度」，不依赖云端，离线可用。

**AI 对话**：
- 设置页填入任意 **OpenAI 兼容**接口（BaseURL / Key / 模型，支持 DeepSeek、通义、Moonshot 等），走真实大模型自由对话；
- 不填也能玩：内置离线剧本引擎按剧情树推进，零成本、零配置。

---

## 目录结构

```
.
├─ src/
│  ├─ lib/          # api / auth / speech / scoring / ai / offlineEngine / sfx
│  ├─ store/        # zustand 状态：进度、设置、登录态
│  ├─ pages/        # 首页 / 关卡地图 / 闯关 / 游戏中心 / 统计 / 设置 / 登录 / 排行榜
│  ├─ components/   # UI 组件（顶栏、麦克风、奖励弹层…）
│  ├─ data/         # 词库 / 剧本 / 关卡地图 / 成就
│  └─ hooks/
├─ public/              # 图标与 PWA manifest
├─ .github/workflows/   # APK 构建 + Pages 部署
└─ tools/gen-icons.mjs  # PWA 图标生成脚本
```

---

## 扩展语言包 / 关卡

关卡与剧本数据集中在 `src/data/`：

- `curriculum.ts` —— 关卡地图（世界 → 关卡 → 句子）
- `scenarios.ts` —— 离线对话剧本树
- `vocabulary.ts` —— 词库（听音选词用）
- `achievements.ts` —— 成就规则

往这些文件里加内容即可扩展语言包与玩法，无需改动 UI 逻辑。

---

## License

MIT
