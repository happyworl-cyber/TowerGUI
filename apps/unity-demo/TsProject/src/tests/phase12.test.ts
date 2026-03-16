/**
 * Phase 12 — E2E Integration Tests
 * Verifies all systems work together on real Unity objects.
 */

import { FocusManager, Filters, TransitionPresets, profiler } from '@tower-ui/core';
import { createStore } from '@tower-ui/core';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;
const UIBridge = CS.TowerUI.UIBridge;
const GameObject = CS.UnityEngine.GameObject;

interface TestResult { name: string; passed: boolean; detail: string; }
const results: TestResult[] = [];
function assert(name: string, condition: boolean, detail: string = '') {
  results.push({ name, passed: condition, detail: condition ? 'OK' : detail || 'FAILED' });
}

function testE2E_CreateAndDestroyNodes() {
  const nodes: any[] = [];
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    nodes.push(UIBridge.CreateWithImage(`e2e-node-${i}`, null));
  }
  const createMs = Date.now() - start;
  assert('Create 100 nodes < 200ms', createMs < 200, `took ${createMs}ms`);

  for (const go of nodes) {
    GameObject.Destroy(go);
  }
  assert('All nodes destroyed without error', true);
}

function testE2E_TextRendering() {
  const go = UIBridge.CreateWithText('e2e-text', null);
  try {
    UIBridge.SetText(go, 'Hello TowerUI');
    UIBridge.SetFontSize(go, 24);
    UIBridge.SetTextColor(go, 1, 0.5, 0, 1);
    UIBridge.SetTextStyle(go, true, false);
    assert('Text set without crash', true);

    // Verify null safety
    UIBridge.SetText(null, 'should not crash');
    UIBridge.SetFontSize(null, 12);
    assert('Text null safety', true);
  } finally {
    GameObject.Destroy(go);
  }
}

function testE2E_ButtonCreation() {
  const btn = UIBridge.CreateButton('e2e-btn', null);
  try {
    const button = btn.GetComponent('Button');
    assert('Button component exists', button != null);

    // Find label child
    const labelTf = btn.transform.Find('Label');
    assert('Button has label child', labelTf != null);
    if (labelTf) {
      UIBridge.SetText(labelTf.gameObject, 'Click Me');
      assert('Button label text set', true);
    }
  } finally {
    GameObject.Destroy(btn);
  }
}

function testE2E_ScrollViewStructure() {
  const scroll = UIBridge.CreateScrollView('e2e-scroll', null);
  try {
    const sr = scroll.GetComponent('ScrollRect');
    assert('ScrollRect component exists', sr != null);
    if (sr) {
      assert('ScrollRect has content', sr.content != null);
      assert('ScrollRect has viewport', sr.viewport != null);
      assert('ScrollRect vertical', sr.vertical === true);
    }
  } finally {
    GameObject.Destroy(scroll);
  }
}

function testE2E_StoreWithDataBridge() {
  const store = createStore({ hp: 100, gold: 0 });

  // Set path
  store.setPath('hp', 80);
  assert('setPath works', store.get().hp === 80, `got ${store.get().hp}`);

  // Batch
  let notifyCount = 0;
  store.subscribe(() => notifyCount++);
  store.batch(() => {
    store.set(s => ({ ...s, hp: 50 }));
    store.set(s => ({ ...s, gold: 100 }));
  });
  assert('Batch: single notification', notifyCount === 1, `got ${notifyCount}`);
  assert('Batch: hp=50', store.get().hp === 50);
  assert('Batch: gold=100', store.get().gold === 100);

  // toJSON / fromJSON
  const json = store.toJSON();
  store.set({ hp: 0, gold: 0 });
  store.fromJSON(json);
  assert('JSON roundtrip', store.get().hp === 50 && store.get().gold === 100);

  // fromJSON with bad input
  store.fromJSON('invalid json');
  assert('Bad JSON does not crash', store.get().hp === 50);

  // Reset
  store.reset();
  assert('Reset to initial', store.get().hp === 100 && store.get().gold === 0);
}

function testE2E_AllBridgesAccessible() {
  const bridges = [
    'UIBridge', 'AssetManager', 'SoundBridge', 'DataBridge',
    'InputBridge', 'FilterBridge', 'HotReloadClient',
  ];
  for (const name of bridges) {
    const exists = CS.TowerUI[name] != null;
    assert(`C# ${name} accessible`, exists);
  }
}

function testE2E_NullSafetyAcrossAllBridges() {
  let crashes = 0;
  try { UIBridge.SetPosition(null, 0, 0); } catch { crashes++; }
  try { UIBridge.SetSize(null, 0, 0); } catch { crashes++; }
  try { UIBridge.SetActive(null, true); } catch { crashes++; }
  try { UIBridge.SetText(null, 'x'); } catch { crashes++; }
  try { UIBridge.SetColor(null, 0, 0, 0, 1); } catch { crashes++; }
  try { UIBridge.SetImageSprite(null, null); } catch { crashes++; }
  try { UIBridge.EnsureCanvasGroup(null); } catch { crashes++; }
  try { UIBridge.EnsureEventReceiver(null); } catch { crashes++; }
  try { CS.TowerUI.FilterBridge.SetBlur(null, 5); } catch { crashes++; }
  try { CS.TowerUI.FilterBridge.SetGrayscale(null, 1); } catch { crashes++; }
  assert('All bridges null-safe', crashes === 0, `${crashes} crashes`);
}

export function runPhase12Tests(): string {
  results.length = 0;

  testE2E_CreateAndDestroyNodes();
  testE2E_TextRendering();
  testE2E_ButtonCreation();
  testE2E_ScrollViewStructure();
  testE2E_StoreWithDataBridge();
  testE2E_AllBridgesAccessible();
  testE2E_NullSafetyAcrossAllBridges();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const lines = [`\n=== Phase 12 E2E Tests: ${passed}/${total} passed ===\n`];
  for (const r of results) {
    lines.push(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}${r.passed ? '' : ' — ' + r.detail}`);
  }
  lines.push(passed === total ? '\nALL PASSED\n' : `\n${total - passed} FAILED\n`);
  const report = lines.join('\n');
  Debug.Log(report);
  return report;
}
