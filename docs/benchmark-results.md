# TowerGUI Week 0 性能基准测试结果

> 测试日期：2026-03-13  
> 测试环境：Unity 6000.3.10f1 Editor, Puerts v3.0.1 (V8), Windows 10  
> 测试机器：开发机（Editor 模式，非目标设备）

---

## 测试结果汇总

| 测试项 | 目标 | 实测 | 结果 | 余量 |
|--------|------|------|------|------|
| 节点创建 (500 个 UGUI GameObject + Image) | < 150ms | **44.29ms** | PASS | 3.4x |
| 属性更新 (50 节点/帧, SetPosition + SetSize) | < 3ms/帧 | **0.149ms** | PASS | 20x |
| 颜色更新 (50 节点/帧, GetComponent + SetColor) | < 3ms/帧 | **0.949ms** | PASS | 3.2x |
| GC 压力 (100 JS 对象/帧 x 500 帧) | max < 2ms | **0.403ms** | PASS | 5x |

---

## 详细数据

### 节点创建 (Benchmark 0.2.1)

- 创建方式：`UIBridge.CreateWithImage()` + `SetSize()` + `SetPosition()`
- 每节点 3 次 JS→C# 调用
- 500 节点总计 ~1500 次跨边界调用
- **总耗时：44.29ms**
- **单节点：0.089ms**
- 推算 1000 节点：~89ms（仍在 150ms 目标内）

### 属性更新 (Benchmark 0.2.2)

- 每帧更新 50 个节点的 position + size
- 100 次 UIBridge 调用/帧
- **平均：0.149ms/帧**
- **最大：1.247ms/帧**
- 60fps 帧预算 16.67ms，属性更新仅占 0.9%

### 颜色更新

- 每帧更新 50 个节点的颜色
- 包含 `GetComponent("Image")` 查找
- **平均：0.949ms/帧**
- 相比纯 position 更新慢 6.4x → **必须缓存 Component 引用**

### GC 压力

- 每帧创建 100 个包含嵌套子对象的 JS 对象
- **平均：0.015ms** | **P95：0.037ms** | **P99：0.086ms** | **最大：0.403ms**
- V8 GC 对短命小对象的处理非常高效
- React/Preact 的 VDOM diff 产生的临时对象不会成为瓶颈

---

## 关键结论

1. **JS→C# 桥接性能极好**：单次 UIBridge 调用约 0.003ms（3μs），远优于之前估算的 25μs
2. **GetComponent 是性能杀手**：必须在创建时缓存所有 Component 引用，运行时不再调用
3. **GC 压力可忽略**：V8 分代 GC 对短命对象极其高效，max 0.4ms
4. **500 节点打开界面 44ms**：用户基本无感，且还有优化空间（批量命令缓冲区）

## Go/No-Go 决策

### ✅ GO — 全力推进 Phase 1

所有指标均以 3-20 倍余量通过。即使考虑到：
- Editor vs 真机的性能差异（真机通常更快，IL2CPP 优化后）
- Yoga 布局的额外开销
- UGUI Canvas Rebuild 的开销

总体帧预算仍然充裕。

## 设计决策确认

| 决策 | 验证结果 |
|------|---------|
| UIBridge 避免 JS 创建 Vector2 | ✅ 有效，性能极好 |
| 必须缓存 Component 引用 | ✅ 验证 GetComponent 慢 6x |
| Preact 替代 React | ⚠️ GC 压力已经很小，React 也可接受，但 Preact 仍推荐（体积小） |
| Yoga WASM 先用 | ✅ 先跑通，性能余量大，不急切 Native |
| 批量命令缓冲区 | ⚠️ 当前逐条调用已够快，可延后到需要时再做 |

---

*下一步：进入 Phase 1 — 核心运行时开发*
