# TowerUI

**基于 React TSX 的 Unity 游戏 UI 框架**，由 [Puerts](https://github.com/nicenlove/puerts) + UGUI 驱动。

用 TypeScript/TSX + React 组件模型编写游戏 UI，原生渲染到 Unity UGUI。专为 AI 辅助（Vibe Coding）游戏 UI 开发设计。

## 特性

- **React TSX** — 声明式 UI，组件化、Hooks、状态管理
- **Unity UGUI 原生渲染** — 渲染为真实 UGUI 元素，非 WebView
- **Flexbox 布局** — 纯 JS Flexbox 引擎（无 WebAssembly 依赖）
- **游戏语义组件** — `BagGrid`（背包格子）、`SkillBar`（技能栏）、`ChatPanel`（聊天面板）、`HpBar`（血条）、`BuffIcon`、`DamageNumber`（伤害飘字）、`TabBar` 等
- **动画系统** — Tween 引擎、缓动函数、`useFadeIn`、`useSlideIn`、`useBounceIn`、`useShake`
- **手势识别** — `useLongPress`（长按）、`useSwipe`（滑动）、`usePinch`（捏合缩放）、`useRotation`（旋转）
- **拖放** — `DragDropProvider`、`useDrag`、`useDrop`
- **全局状态** — `createStore`、`useGameState` + C# `DataBridge` 游戏数据推送
- **滤镜效果** — 模糊、灰度、阴影、描边、亮度（自定义 Shader）
- **国际化** — `I18nProvider`、`useI18n`，支持参数插值和回退语言
- **窗口管理** — 模态/弹窗层叠、`GameWindow` 组件
- **Web 预览** — 浏览器实时预览 + HMR 热重载，无需 Unity 即可快速迭代
- **Unity 热重载** — WebSocket HMR，编辑器内实时刷新
- **类型安全** — 全量 TypeScript strict 模式，编译时错误检测
- **AI 优先** — JSON Schema + CLI 工具链，支持 AI 生成 UI

## 快速开始

### 环境要求

- Node.js 18+，pnpm 8+
- Unity 2021.3+
- [Puerts](https://github.com/nicenlove/puerts) v3.0+（从 [GitHub Releases](https://github.com/nicenlove/puerts/releases) 下载）
- TextMeshPro（Unity 内置，首次使用需导入资源）

### 1. 克隆并安装

```bash
git clone https://github.com/user/TowerGUI.git
cd TowerGUI
pnpm install
```

### 2. 创建新游戏工程

```bash
# 本地 monorepo 中使用
pnpm tower-ui create my-game

# 发布到 npm 后（外部用户使用）
# npx @tower-ui/cli create my-game
```

自动生成：
- `apps/my-game/TsProject/` — TypeScript 工程（含构建配置、入口文件）
- `apps/my-game/Assets/Scripts/TowerUISetup.cs` — Unity 场景自动搭建脚本

### 3. 配置 Unity 项目

1. 用 Unity Hub 在 `apps/my-game/` 下创建项目（或打开已有项目）
2. 安装 Puerts 插件（导入 `com.tencent.puerts.core` + `com.tencent.puerts.v8`）
3. 在 `Packages/manifest.json` 中添加 TowerUI 运行时：
   ```json
   "com.towerui.runtime": "file:../../packages/unity-runtime"
   ```
4. 生成 Puerts 类型声明：`Unity 菜单 → PuerTS → Generate`
5. 将生成的 typings 复制到 `TsProject/typings/`

### 4. 构建并运行

```bash
cd apps/my-game/TsProject
pnpm install
node build.mjs
```

回到 Unity，点击 Play 即可看到 UI。

### 5. 开发

编辑 `TsProject/src/main.tsx`，重新构建即可看到变化：

```tsx
function GameHUD() {
  const hp = useGameState(store, s => s.player.hp);
  return (
    <ui-view width={1920} height={1080} flexDirection="column">
      <HpBar current={hp} max={100} width={300} height={30} />
      <SkillBar skills={skills} width={600} height={80} />
      <ChatPanel channels={channels} width={400} height={300} />
    </ui-view>
  );
}
```

使用 `node build.mjs --watch` 可在保存时自动重新构建。

## 项目结构

```
TowerGUI/
├── packages/
│   ├── core/               # 核心框架（Reconciler、布局引擎、组件、Hooks）
│   ├── unity-adapter/      # Unity UGUI 适配器
│   ├── unity-runtime/      # Unity C# 包（Bridge 类 + Shader）
│   ├── web-adapter/        # 浏览器 DOM 适配器（用于预览）
│   ├── schema/             # UI JSON Schema + 校验器 + 代码生成
│   ├── cli/                # CLI 工具（create、preview、validate、generate）
│   ├── preview/            # Web 预览开发服务器
│   ├── animate/            # 动画扩展
│   └── components/         # 扩展组件库
├── apps/
│   └── unity-demo/         # 示例应用（HUD、背包、技能栏、聊天）
├── docs/                   # 架构设计文档
└── README.md
```

## 架构

```
  TSX 组件 (React)
        │
   React Reconciler（协调器）
        │
   ┌────┴────┐
   │ Adapter │  ← IEngineAdapter 接口
   └────┬────┘
        │
  ┌─────┴──────┐
  │UnityAdapter│  → C# UIBridge → UGUI GameObjects
  │ WebAdapter │  → DOM Elements（浏览器预览）
  └────────────┘
```

- **Core**（`@tower-ui/core`）：React Reconciler、Flexbox 布局引擎、组件库、动画、手势、状态管理
- **Adapter**（适配器）：可插拔的渲染后端。`UnityAdapter` 通过 C# Bridge 创建真实 UGUI 元素；`WebAdapter` 创建 DOM 元素用于浏览器预览
- **Unity Runtime**（`com.towerui.runtime`）：C# 静态类，负责创建/操作 UGUI、转发事件、加载资源、推送游戏数据

## 可用组件

### 基础布局
`ui-view`、`ui-text`、`ui-image`、`ui-button`、`ui-input`、`ui-toggle`、`ui-slider`、`ui-progress`、`ui-scroll`

### 游戏语义组件
`BagGrid`（背包格子）、`SkillBar`（技能栏）、`ChatPanel`（聊天面板）、`HpBar`（血条）、`BuffIcon`（Buff 图标）、`DamageNumber`（伤害飘字）、`GameTooltip`（提示框）、`TabBar`（标签栏）

### 高级组件
`PopupMenu`（弹出菜单）、`ComboBox`（下拉框）、`TreeView`（树形视图）、`VirtualList`（虚拟列表）、`GameWindow`（游戏窗口）

## Hooks

| Hook | 用途 |
|------|------|
| `useGameState(store, selector)` | 订阅全局游戏状态 |
| `useTween(config)` | 动画补间 |
| `useFadeIn()` / `useSlideIn()` | 预设动画效果 |
| `useLongPress(config)` | 长按手势 |
| `useSwipe(config)` | 滑动手势 |
| `useDrag(config)` | 拖拽源 |
| `useDrop(config)` | 放置目标 |
| `useController(pages)` | 多页/标签状态管理 |
| `useWindowManager()` | 窗口开关管理 |
| `useI18n()` | 国际化 |
| `useMovieClip(config)` | 帧动画 |
| `useScreenTransition()` | 转场效果 |
| `useSafeArea()` | 移动端安全区域 |
| `useScale(config)` | 自适应缩放 |

## CLI 命令

```bash
# monorepo 内使用：pnpm tower-ui <命令>
# 发布到 npm 后：  npx @tower-ui/cli <命令>

pnpm tower-ui create <项目名>              # 创建新工程
pnpm tower-ui dev [entry.tsx]              # 启动 Web 预览服务器
pnpm tower-ui validate <schema.json>       # 校验 UI JSON
pnpm tower-ui generate <描述> -o <文件>     # 从自然语言生成 TSX
pnpm tower-ui schema                       # 打印组件 Schema
```

## 类型检查

所有包均使用 TypeScript strict 模式，运行类型检查：

```bash
pnpm type-check    # 通过 turbo 检查所有包
```

## 开发流程

```
编写 TSX → node build.mjs → Unity Play 查看
   ↑                              |
   └──── 发现问题，修改代码 ←──────┘
```

或使用 `node build.mjs --watch` + `HotReloadClient` 实现保存即刷新。

## License

MIT
