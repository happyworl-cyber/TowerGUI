# TowerUI Runtime (Unity Package)

Unity C# runtime for TowerUI framework. Provides all Bridge classes that connect JavaScript/TypeScript UI code (via Puerts) to Unity UGUI.

## Installation

In your Unity project's `Packages/manifest.json`, add:

```json
{
  "dependencies": {
    "com.towerui.runtime": "file:../../packages/unity-runtime"
  }
}
```

Or via git URL (after publishing):

```json
{
  "dependencies": {
    "com.towerui.runtime": "https://github.com/user/TowerGUI.git?path=packages/unity-runtime"
  }
}
```

## Prerequisites (must install BEFORE this package)

1. **[Puerts](https://github.com/nicenlove/puerts) v3.0+** — JS/TS runtime for Unity
   - Download from [Releases](https://github.com/nicenlove/puerts/releases)
   - Import `com.tencent.puerts.core` + a backend (`com.tencent.puerts.v8` or `quickjs`)
   - Puerts is NOT on Unity Package Registry; install via local file or git URL
2. **TextMeshPro** — `Window → TextMeshPro → Import TMP Essential Resources`
3. **Unity 2021.3+**

## Contents

| Script | Purpose |
|--------|---------|
| `UIBridge.cs` | Create/manipulate UGUI elements (Image, Text, Button, Input, etc.) |
| `UIEventReceiver.cs` | Forward UGUI events to JavaScript |
| `TowerUIBoot.cs` | Initialize Puerts JsEnv and tick JS update loop |
| `AssetManager.cs` | Load Sprites, AudioClips, SpriteAtlases from Resources |
| `SoundBridge.cs` | Pooled AudioSource management for UI sounds |
| `DataBridge.cs` | Push game state from C# to JS Store |
| `InputBridge.cs` | Keyboard/gamepad navigation + safe area/screen info |
| `FilterBridge.cs` | UI filters (blur, grayscale, shadow, outline, brightness) |
| `HotReloadClient.cs` | WebSocket HMR client for development |

### Shaders

| Shader | Purpose |
|--------|---------|
| `TowerUI/UIBlur` | 9-tap Gaussian blur for UI elements |
| `TowerUI/UIGrayscale` | Adjustable grayscale effect |
