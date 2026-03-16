/**
 * Phase 11 — Filters / MovieClip / Transitions
 * Real functional tests.
 */

import { Filters, TransitionPresets, Profiler } from '@tower-ui/core';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;
const GameObject = CS.UnityEngine.GameObject;
const UIBridge = CS.TowerUI.UIBridge;
const FilterBridge = CS.TowerUI.FilterBridge;

interface TestResult { name: string; passed: boolean; detail: string; }
const results: TestResult[] = [];
function assert(name: string, condition: boolean, detail: string = '') {
  results.push({ name, passed: condition, detail: condition ? 'OK' : detail || 'FAILED' });
}

function testFilterShadowOnRealNode() {
  const go = UIBridge.CreateWithImage('TestFilterNode', null);
  try {
    // Apply shadow
    FilterBridge.SetShadow(go, 2, 2, 0, 0, 0, 0, 0.5);
    const shadow = go.GetComponent('Shadow');
    assert('Shadow component added', shadow != null);
    if (shadow) {
      const dist = shadow.effectDistance;
      assert('Shadow offsetX = 2', Math.abs(dist.x - 2) < 0.01, `got: ${dist.x}`);
      assert('Shadow offsetY = -2', Math.abs(dist.y - (-2)) < 0.01, `got: ${dist.y}`);
    }

    // Apply outline
    FilterBridge.SetOutline(go, 3, 1, 0, 0, 1);
    const outline = go.GetComponent('Outline');
    assert('Outline component added', outline != null);
    if (outline) {
      assert('Outline color.a = 1', Math.abs(outline.effectColor.a - 1) < 0.01);
    }

    // Remove shadow
    FilterBridge.SetShadow(go, 0, 0, 0, 0, 0, 0, 0);
    // Note: Shadow may be destroyed, but needs a frame to process
  } finally {
    GameObject.Destroy(go);
  }
}

function testFilterGrayscaleShader() {
  const go = UIBridge.CreateWithImage('TestGray', null);
  try {
    FilterBridge.SetGrayscale(go, 0.8);
    const img = go.GetComponent('Image') as any;
    if (img && img.material) {
      const hasGray = img.material.HasProperty('_GrayAmount');
      assert('Grayscale material has _GrayAmount', hasGray);
      if (hasGray) {
        const val = img.material.GetFloat('_GrayAmount');
        assert('Grayscale amount = 0.8', Math.abs(val - 0.8) < 0.01, `got: ${val}`);
      }
    } else {
      assert('Grayscale material applied', img != null && img.material != null,
        'Shader TowerUI/UIGrayscale may not be found. Check Assets/Shaders/UIGrayscale.shader');
    }

    // Clear
    FilterBridge.SetGrayscale(go, 0);
    if (img) {
      assert('Grayscale removed', img.material == null || img.material == CS.UnityEngine.Canvas.GetDefaultCanvasMaterial());
    }
  } finally {
    GameObject.Destroy(go);
  }
}

function testFilterBlurShader() {
  const go = UIBridge.CreateWithImage('TestBlur', null);
  try {
    FilterBridge.SetBlur(go, 5);
    const img = go.GetComponent('Image') as any;
    if (img && img.material) {
      const hasBlur = img.material.HasProperty('_BlurRadius');
      assert('Blur material has _BlurRadius', hasBlur);
      if (hasBlur) {
        const val = img.material.GetFloat('_BlurRadius');
        assert('Blur radius = 5', Math.abs(val - 5) < 0.01, `got: ${val}`);
      }
    } else {
      assert('Blur material applied', img != null && img.material != null,
        'Shader TowerUI/UIBlur may not be found. Check Assets/Shaders/UIBlur.shader');
    }
  } finally {
    GameObject.Destroy(go);
  }
}

function testFilterNullSafety() {
  let threw = false;
  try {
    FilterBridge.SetBlur(null, 5);
    FilterBridge.SetShadow(null, 1, 1, 0, 0, 0, 0, 1);
    FilterBridge.SetOutline(null, 2, 1, 0, 0, 1);
    FilterBridge.SetGrayscale(null, 0.5);
    FilterBridge.SetBrightness(null, 1);
    FilterBridge.SetColorTint(null, 1, 1, 1, 1);
  } catch {
    threw = true;
  }
  assert('Filters null-safe (no crash)', !threw);
}

function testTransitionPresets() {
  assert('pagePush.enter=slideLeft', TransitionPresets.pagePush.enter === 'slideLeft');
  assert('modalOpen.enter=scaleIn', TransitionPresets.modalOpen.enter === 'scaleIn');
  assert('fade.duration=300', TransitionPresets.fade.duration === 300);
}

function testProfilerFunctional() {
  const p = new Profiler();
  p.start();
  assert('Profiler active after start', p.active === true);

  p.countBridgeCall();
  p.countBridgeCall();
  p.countBridgeCall();
  p.setNodeCount(42);
  p.recordFrame({ frameTimeMs: 16.6 });

  const history = p.getHistory(1);
  assert('Profiler records frame', history.length === 1);
  assert('Bridge calls = 3', history[0].bridgeCalls === 3, `got ${history[0].bridgeCalls}`);
  assert('Node count = 42', history[0].nodeCount === 42, `got ${history[0].nodeCount}`);

  p.recordFrame({ frameTimeMs: 33.2 });
  const stats = p.getAverageStats(2);
  assert('Avg frame time correct', Math.abs(stats.avgFrameTime - 24.9) < 1, `got ${stats.avgFrameTime}`);
  assert('Max frame time = 33.2', Math.abs(stats.maxFrameTime - 33.2) < 0.5, `got ${stats.maxFrameTime}`);

  const report = p.report();
  assert('Report non-empty', report.length > 50);

  p.reset();
  assert('Reset clears', p.getHistory().length === 0);
  p.stop();
  assert('Profiler inactive after stop', p.active === false);
}

export function runPhase11Tests(): string {
  results.length = 0;

  testFilterNullSafety();
  testFilterShadowOnRealNode();
  testFilterGrayscaleShader();
  testFilterBlurShader();
  testTransitionPresets();
  testProfilerFunctional();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const lines = [`\n=== Phase 11 Tests: ${passed}/${total} passed ===\n`];
  for (const r of results) {
    lines.push(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}${r.passed ? '' : ' — ' + r.detail}`);
  }
  lines.push(passed === total ? '\nALL PASSED\n' : `\n${total - passed} FAILED\n`);
  const report = lines.join('\n');
  Debug.Log(report);
  return report;
}
