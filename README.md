# TowerUI

[中文文档](./README.zh-CN.md)

**React TSX game UI framework for Unity**, powered by [Puerts](https://github.com/nicenlove/puerts) + UGUI.

Write game UI in TypeScript/TSX with React's component model, render natively on Unity UGUI. Designed for AI-assisted (Vibe Coding) game UI development.

## Features

- **React TSX** — Declarative UI with components, hooks, state management
- **Unity UGUI Native** — Renders to real UGUI elements, not WebView
- **Flexbox Layout** — Pure JS Flexbox engine (no WebAssembly dependency)
- **Game Components** — `BagGrid`, `SkillBar`, `ChatPanel`, `HpBar`, `BuffIcon`, `DamageNumber`, `TabBar`, etc.
- **Animation** — Tween engine, easing functions, `useFadeIn`, `useSlideIn`, `useBounceIn`, `useShake`
- **Gestures** — `useLongPress`, `useSwipe`, `usePinch`, `useRotation`
- **Drag & Drop** — `DragDropProvider`, `useDrag`, `useDrop`
- **Global State** — `createStore`, `useGameState` + C# `DataBridge` for game data
- **Filters** — Blur, grayscale, shadow, outline, brightness (custom shaders)
- **i18n** — `I18nProvider`, `useI18n` with parameter interpolation
- **Window Manager** — Modal/popup stacking, `GameWindow` component
- **Web Preview** — Browser-based preview with HMR, no Unity needed for iteration
- **Hot Reload** — WebSocket HMR in Unity Editor
- **Type Safe** — Full TypeScript strict mode, compile-time error detection
- **AI-First** — JSON Schema + CLI for AI-assisted UI generation

## Quick Start

### Prerequisites

- Node.js 18+, pnpm 8+
- Unity 2021.3+ with [Puerts](https://github.com/nicenlove/puerts) v3.0+
- TextMeshPro (included in Unity)

### 1. Clone and Install

```bash
git clone https://github.com/user/TowerGUI.git
cd TowerGUI
pnpm install
```

### 2. Create a New Game Project

```bash
# Local (monorepo)
pnpm tower-ui create my-game

# After publishing to npm (for external users)
# npx @tower-ui/cli create my-game
```

This scaffolds:
- `apps/my-game/TsProject/` — TypeScript project with build config
- `apps/my-game/Assets/Scripts/TowerUISetup.cs` — Unity scene auto-setup

### 3. Set Up Unity

1. Create a Unity project at `apps/my-game/` (or open an existing one)
2. Install the Puerts Unity plugin
3. Add TowerUI runtime package to `Packages/manifest.json`:
   ```json
   "com.towerui.runtime": "file:../../packages/unity-runtime"
   ```
4. Generate Puerts typings: `Unity → PuerTS → Generate`
5. Copy typings to `TsProject/typings/`

### 4. Build and Run

```bash
cd apps/my-game/TsProject
pnpm install
node build.mjs
```

Open Unity, press Play.

### 5. Develop

Edit `TsProject/src/main.tsx`, rebuild, see changes:

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

Use `node build.mjs --watch` for auto-rebuild on save.

## Project Structure

```
TowerGUI/
├── packages/
│   ├── core/               # Core framework (reconciler, layout, components, hooks)
│   ├── unity-adapter/      # Unity UGUI adapter
│   ├── unity-runtime/      # Unity C# package (Bridge classes + Shaders)
│   ├── web-adapter/        # Browser DOM adapter (for preview)
│   ├── schema/             # UI JSON schema + validator + codegen
│   ├── cli/                # CLI tool (create, preview, validate, generate)
│   ├── preview/            # Web preview dev server
│   ├── animate/            # Animation extensions
│   └── components/         # Additional components
├── apps/
│   └── unity-demo/         # Demo app (HUD, bag, skills, chat)
├── docs/                   # Architecture design documents
└── README.md
```

## Architecture

```
  TSX Components (React)
        │
   React Reconciler
        │
   ┌────┴────┐
   │ Adapter │  ← IEngineAdapter interface
   └────┬────┘
        │
  ┌─────┴──────┐
  │UnityAdapter│  → C# UIBridge → UGUI GameObjects
  │ WebAdapter │  → DOM Elements (preview)
  └────────────┘
```

- **Core** (`@tower-ui/core`): React reconciler, Flexbox layout engine, component library, animation, gestures, state management
- **Adapter**: Pluggable rendering backend. `UnityAdapter` creates real UGUI elements via C# Bridge; `WebAdapter` creates DOM elements for browser preview
- **Unity Runtime** (`com.towerui.runtime`): C# static classes that create/manipulate UGUI, forward events, load assets, push game data

## Available Components

### Layout & Basic
`ui-view`, `ui-text`, `ui-image`, `ui-button`, `ui-input`, `ui-toggle`, `ui-slider`, `ui-progress`, `ui-scroll`

### Game Semantic
`BagGrid`, `SkillBar`, `ChatPanel`, `HpBar`, `BuffIcon`, `DamageNumber`, `GameTooltip`, `TabBar`

### Advanced
`PopupMenu`, `ComboBox`, `TreeView`, `VirtualList`, `GameWindow`

## Hooks

| Hook | Purpose |
|------|---------|
| `useGameState(store, selector)` | Subscribe to global game state |
| `useTween(config)` | Animate any value |
| `useFadeIn()` / `useSlideIn()` | Preset animations |
| `useLongPress(config)` | Long press gesture |
| `useSwipe(config)` | Swipe gesture |
| `useDrag(config)` | Drag source |
| `useDrop(config)` | Drop target |
| `useController(pages)` | Multi-page/tab state |
| `useWindowManager()` | Open/close windows |
| `useI18n()` | Internationalization |
| `useMovieClip(config)` | Frame animation |
| `useScreenTransition()` | Screen transition effects |
| `useSafeArea()` | Mobile safe area insets |
| `useScale(config)` | Responsive scaling |

## CLI Commands

```bash
# In the monorepo, use:  pnpm tower-ui <command>
# After npm publish:     npx @tower-ui/cli <command>

pnpm tower-ui create <name>              # Scaffold new project
pnpm tower-ui dev [entry.tsx]            # Start web preview server
pnpm tower-ui validate <schema.json>     # Validate UI JSON
pnpm tower-ui generate <desc> -o <file>  # Generate TSX from description
pnpm tower-ui schema                     # Print component schema
```

## Type Checking

All packages use TypeScript strict mode. Run type checks:

```bash
pnpm type-check    # Check all packages via turbo
```

## License

MIT
