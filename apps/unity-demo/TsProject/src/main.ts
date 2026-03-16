import CS from 'csharp';

const Debug = CS.UnityEngine.Debug;
const GameObject = CS.UnityEngine.GameObject;
const UIBridge = CS.TowerUI.UIBridge;
const UnityObject = CS.UnityEngine.Object;

function findCanvas(): CS.UnityEngine.Transform {
  const canvasObj = GameObject.Find("Canvas");
  if (!canvasObj) throw new Error("Canvas not found in scene");
  return canvasObj.transform;
}

// ============================================================
// Benchmark 0.2.1: Node Creation (500 nodes)
// ============================================================
function benchmarkNodeCreation(canvasTransform: CS.UnityEngine.Transform): CS.UnityEngine.GameObject[] {
  const NODE_COUNT = 500;
  const nodes: CS.UnityEngine.GameObject[] = [];

  Debug.Log(`\n========== Benchmark 0.2.1: Node Creation ==========`);
  Debug.Log(`Creating ${NODE_COUNT} UI nodes (via UIBridge)...`);

  const t0 = UIBridge.GetTimeMs();
  for (let i = 0; i < NODE_COUNT; i++) {
    const go = UIBridge.CreateWithImage(`Node_${i}`, canvasTransform);
    const rt = go.transform as CS.UnityEngine.RectTransform;
    UIBridge.SetSize(rt, 50, 50);
    UIBridge.SetPosition(rt, (i % 25) * 55, -Math.floor(i / 25) * 55);
    nodes.push(go);
  }
  const t1 = UIBridge.GetTimeMs();
  const elapsed = t1 - t0;

  Debug.Log(`[Result] ${elapsed.toFixed(2)}ms for ${NODE_COUNT} nodes`);
  Debug.Log(`[Per Node] ${(elapsed / NODE_COUNT).toFixed(3)}ms`);
  Debug.Log(`[Threshold] < 150ms: ${elapsed < 150 ? 'PASS ✓' : 'FAIL ✗'} (${elapsed.toFixed(1)}ms)`);

  return nodes;
}

// ============================================================
// Benchmark 0.2.2: Property Update (50 nodes/frame)
// ============================================================
function benchmarkPropertyUpdate(nodes: CS.UnityEngine.GameObject[]) {
  const UPDATE_COUNT = 50;
  const ITERATIONS = 100;

  Debug.Log(`\n========== Benchmark 0.2.2: Property Update ==========`);
  Debug.Log(`Updating ${UPDATE_COUNT} nodes x ${ITERATIONS} iterations...`);

  let totalMs = 0;
  let maxMs = 0;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const t0 = UIBridge.GetTimeMs();
    for (let i = 0; i < UPDATE_COUNT; i++) {
      const idx = (iter * 7 + i * 3) % nodes.length;
      const go = nodes[idx];
      const rt = go.transform as CS.UnityEngine.RectTransform;

      UIBridge.SetPosition(rt, Math.random() * 1000, -Math.random() * 500);
      UIBridge.SetSize(rt, 30 + Math.random() * 40, 30 + Math.random() * 40);
    }
    const t1 = UIBridge.GetTimeMs();
    const frame = t1 - t0;
    totalMs += frame;
    if (frame > maxMs) maxMs = frame;
  }

  const avg = totalMs / ITERATIONS;
  Debug.Log(`[Result] avg: ${avg.toFixed(3)}ms | max: ${maxMs.toFixed(3)}ms per frame`);
  Debug.Log(`[Calls/frame] ${UPDATE_COUNT * 2} UIBridge calls (SetPosition + SetSize)`);
  Debug.Log(`[Threshold] avg < 3ms: ${avg < 3 ? 'PASS ✓' : 'FAIL ✗'} (${avg.toFixed(3)}ms)`);
}

// ============================================================
// Benchmark: Color Update (tests SetColor bridge)
// ============================================================
function benchmarkColorUpdate(nodes: CS.UnityEngine.GameObject[]) {
  const UPDATE_COUNT = 50;
  const ITERATIONS = 100;

  Debug.Log(`\n========== Benchmark: Color Update ==========`);
  Debug.Log(`Updating color of ${UPDATE_COUNT} nodes x ${ITERATIONS} iterations...`);

  let totalMs = 0;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const t0 = UIBridge.GetTimeMs();
    for (let i = 0; i < UPDATE_COUNT; i++) {
      const idx = (iter * 5 + i * 2) % nodes.length;
      const go = nodes[idx];
      const img = go.GetComponent("Image") as CS.UnityEngine.UI.Image;
      if (img) {
        UIBridge.SetColor(img, Math.random(), Math.random(), Math.random(), 1);
      }
    }
    const t1 = UIBridge.GetTimeMs();
    totalMs += (t1 - t0);
  }

  const avg = totalMs / ITERATIONS;
  Debug.Log(`[Result] avg: ${avg.toFixed(3)}ms per frame`);
  Debug.Log(`[Note] Includes GetComponent("Image") lookup per node`);
  Debug.Log(`[Threshold] avg < 3ms: ${avg < 3 ? 'PASS ✓' : 'FAIL ✗'} (${avg.toFixed(3)}ms)`);
}

// ============================================================
// Benchmark: GC Pressure (JS object churn)
// ============================================================
function benchmarkGCPressure() {
  const FRAMES = 500;
  const OBJECTS_PER_FRAME = 100;

  Debug.Log(`\n========== Benchmark: GC Pressure ==========`);
  Debug.Log(`Creating ${OBJECTS_PER_FRAME} temp JS objects x ${FRAMES} frames...`);

  const frameTimes: number[] = [];

  for (let f = 0; f < FRAMES; f++) {
    const t0 = UIBridge.GetTimeMs();
    const temp: any[] = [];
    for (let i = 0; i < OBJECTS_PER_FRAME; i++) {
      temp.push({
        type: 'ui-view',
        props: { width: i * 10, height: i * 5, flex: 1, opacity: 0.8 },
        children: [
          { type: 'ui-text', props: { text: `item ${i}`, fontSize: 14 } },
          { type: 'ui-image', props: { src: `icon_${i}.png` } },
        ],
      });
    }
    const t1 = UIBridge.GetTimeMs();
    frameTimes.push(t1 - t0);
  }

  frameTimes.sort((a, b) => a - b);
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const max = frameTimes[frameTimes.length - 1];
  const p99 = frameTimes[Math.floor(frameTimes.length * 0.99)];
  const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];

  Debug.Log(`[Result] avg: ${avg.toFixed(3)}ms | p95: ${p95.toFixed(3)}ms | p99: ${p99.toFixed(3)}ms | max: ${max.toFixed(3)}ms`);
  Debug.Log(`[Threshold] max < 2ms: ${max < 2 ? 'PASS ✓' : 'WARN ⚠'} (${max.toFixed(3)}ms)`);
}

// ============================================================
// Main
// ============================================================
function main() {
  Debug.Log("\n==========================================");
  Debug.Log("   TowerGUI Performance Benchmark v0.1   ");
  Debug.Log("==========================================\n");

  try {
    const canvasTransform = findCanvas();
    Debug.Log("[Setup] Canvas found, starting benchmarks...\n");

    const nodes = benchmarkNodeCreation(canvasTransform);
    benchmarkPropertyUpdate(nodes);
    benchmarkColorUpdate(nodes);
    benchmarkGCPressure();

    for (const go of nodes) UnityObject.Destroy(go);

    Debug.Log("\n============= Summary =============");
    Debug.Log("Node Creation  (500):    target < 150ms");
    Debug.Log("Property Update(50/f):   target < 3ms");
    Debug.Log("Color Update   (50/f):   target < 3ms");
    Debug.Log("GC Max Pause:            target < 2ms");
    Debug.Log("===================================\n");
  } catch (e: any) {
    Debug.LogError(`Benchmark failed: ${e?.message || e}`);
    if (e?.stack) Debug.LogError(e.stack);
  }
}

main();
