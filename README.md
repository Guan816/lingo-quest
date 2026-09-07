<div align="center">

# 🎮 LingoQuest · 玩着学的 AI 口语陪练

**闯关地图 · 发音逐词打分 · AI 角色对话 · 离线也能玩**

一套代码 → 网页 + Android APK + iOS，零后端、零成本部署。

</div>

---

## ✨ 这是什么

LingoQuest 把口语练习做成一场 RPG：开口说一句英语 = 打一次怪，得分换经验、经验升等级、连击有加成、通关掉星星。它不是一个「录音机 + 教材」，而是一个你会想每天打开的小游戏。

| 能力 | 说明 |
| --- | --- |
| 🗺️ 闯关地图 | 5 个世界 × 25 关：跟读句 → 剧本角色扮演 → BOSS 自由对话，线性解锁 |
| 🎯 发音打分 | 本地逐词比对算法：哪读对了、哪漏了、哪读错，当场标红，无需上传录音 |
| 💬 AI 陪练 | 填入任意 OpenAI 兼容 Key（DeepSeek / 通义 / Kimi / Ollama…）即接入真 LLM 自由对话 |
| 🔌 离线兜底 | 没 Key、没网也能玩：内置 8 个剧本状态机 + 关键词对话引擎，进度照常记录 |
| 🎧 四种小游戏 | 听音选词 / 拼句挑战 / 影子跟读 / 自由对话，每个 2 分钟 |
| 🏆 游戏化系统 | XP、等级、连击、星星、14 枚成就徽章、每日目标、打卡日历 |
| 📱 全平台 | Web（GitHub Pages / PWA）+ Android APK + iOS，同一份代码 |
| 🔒 隐私 | 练习数据全存本地 localStorage；API Key 只存本机，不出设备 |

## 🚀 快速开始

```bash
# 开发
npm install
npm run dev            # http://localhost:5173

# 构建（产物在 dist/，可直接静态托管）
npm run build
npm run preview
```

## 📱 打包成手机 App（Capacitor）

### 方式一：让 GitHub Actions 替你出包（推荐）

1. Fork / 推送本仓库到 GitHub
2. 打开 **Actions → Build Android APK**，手动触发或 push 即可
3. 构建完成后在 Artifacts 下载 `LingoQuest-APK`，传到手机直接安装
4. 打 tag（如 `v1.0.0`）时 APK 会自动挂到 GitHub Release

### 方式二：本机打包

```bash
npm install
npm run build
npx cap add android        # 首次
npx cap sync android
npx cap open android       # 用 Android Studio 打开后 Run / Build APK
```

> 原生 `android/`、`ios/` 目录不入库（已被 .gitignore），由 `cap add` 按需生成。
> iOS 需要 macOS + Xcode：`npx cap add ios && npx cap open ios`。
> 自定义 App 名称/图标可用 [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) 一键生成。

### 网页版部署（GitHub Pages）

仓库自带 `deploy-pages.yml`：push 到 `main` 即自动部署到 Pages，手机浏览器打开后「添加到主屏幕」就是一个 PWA。

## 🤖 接入 AI（可选，1 分钟）

设置 → AI 对话 → 打开开关，选一个预设或手填：

| 服务商 | Base URL | 模型示例 | 备注 |
| --- | --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | 海外 |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 国内直连 |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` | Kimi |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | 阿里 |
| 本地 Ollama | `http://localhost:11434/v1` | `qwen2.5:3b` | 无需 Key |

任何 OpenAI `/chat/completions` 兼容接口都能用。**不配置也完全可以玩**：BOSS 战会退回内置的离线对话引擎。

## 🗂️ 目录结构

```
src/
├── data/            # 内容层：词库 / 剧本 / 课程关卡 / 成就
├── lib/             # 能力层
│   ├── speech.ts        # Web Speech 封装（TTS 朗读 + ASR 识别）
│   ├── scoring.ts       # 逐词发音评分（缩写归一 + LCS 对齐 + 编辑距离）
│   ├── offlineEngine.ts # 剧本状态机 + 关键词离线对话
│   ├── ai.ts            # OpenAI 兼容客户端（5 家预设）
│   ├── gamification.ts  # XP / 等级 / 连击公式
│   └── sfx.ts           # Web Audio 现场合成音效（零资源文件）
├── store/           # zustand + localStorage 持久化
├── components/      # MicOrb、SpeakPanel、ScoreRing、结算/奖励组件…
└── pages/           # 首页 / 地图 / 关卡 / 4 个小游戏 / 数据 / 设置
```

## 🧠 技术要点

- **打分完全本地**：识别文本与目标句做缩写展开（`don't → do not`）后，词级 LCS 对齐 + 近似匹配（编辑距离 ≤1）+ 字符相似度加权，输出逐词染色结果
- **语音识别**：浏览器 Web Speech API；不支持时自动切换「打字模式」，打字照样打分拿经验，保证任何设备都能完整通关
- **音效零资源**：所有提示音用 Web Audio 振荡器现场合成，安装包更小
- **双引擎对话**：`ai.enabled` 且有 Key 时走 LLM，任何失败（超时/断网/限流）无缝退回离线引擎，BOSS 战永不中断
- **状态持久化**：zustand + persist，升级时按 version 迁移

## 🗺️ 路线图

- [ ] 多语言包（日语 / 西语）
- [ ] 每日一句挑战 + 好友排行
- [ ] Whisper 级本地 ASR（可选插件）
- [ ] 发音音素级评测

## 📄 License

[MIT](./LICENSE) — 随便用，记得回来点个 Star ⭐
