/**
 * Phase 6 Automated Tests — NodePool / AsyncRender / CanvasOptimizer / StressTest / LeakDetector
 */

import {
  NodePool, useAsyncRender,
  UpdateCoalescer, SubCanvasManager,
  measure, LeakDetector, runStressReport, type StressTestResult,
  FlexNode,
} from '@tower-ui/core';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail: string = '') {
  results.push({ name, passed: condition, detail: condition ? 'OK' : detail || 'FAILED' });
}

// ── NodePool Tests ────────────────────────────────────────

function testNodePoolBasic() {
  // Mock adapter
  let createCount = 0;
  const mockAdapter: any = {
    createElement: (type: string) => { createCount++; return { type, id: createCount }; },
    removeChild: () => {},
    applyProps: () => {},
  };

  const pool = new NodePool(mockAdapter, 10);

  const n1 = pool.acquire('ui-view');
  assert('Pool acquire creates node', !!n1 && createCount === 1);

  pool.recycle('ui-view', n1);
  assert('Pool recycle stores node', pool.stats.totalPooled === 1);

  const n2 = pool.acquire('ui-view');
  assert('Pool reuses recycled node', createCount === 1, `createCount: ${createCount}`);
  assert('Pool hit rate > 0', pool.stats.hitRate !== '0%', `hitRate: ${pool.stats.hitRate}`);
}

function testNodePoolPrewarm() {
  let createCount = 0;
  const mockAdapter: any = {
    createElement: () => { createCount++; return { id: createCount }; },
    removeChild: () => {},
    applyProps: () => {},
  };

  const pool = new NodePool(mockAdapter, 20);
  pool.prewarm('ui-view', 10);
  assert('Prewarm creates 10 nodes', createCount === 10, `created: ${createCount}`);
  assert('Prewarm pools 10 nodes', pool.stats.totalPooled === 10);

  // Acquire all 10 — should not create new ones
  const prevCount = createCount;
  for (let i = 0; i < 10; i++) pool.acquire('ui-view');
  assert('Acquire from prewarmed pool (no new creates)', createCount === prevCount, `created: ${createCount}`);
}

function testNodePoolOverflow() {
  let createCount = 0;
  let destroyCount = 0;
  const mockAdapter: any = {
    createElement: () => { createCount++; return { id: createCount }; },
    removeChild: () => { destroyCount++; },
    applyProps: () => {},
  };

  const pool = new NodePool(mockAdapter, 3);
  const nodes = [];
  for (let i = 0; i < 5; i++) nodes.push(pool.acquire('ui-view'));
  for (const n of nodes) pool.recycle('ui-view', n);

  assert('Pool overflow destroys excess', pool.stats.totalPooled <= 3,
    `pooled: ${pool.stats.totalPooled}`);
}

// ── UpdateCoalescer Tests ─────────────────────────────────

function testUpdateCoalescer() {
  const coalescer = new UpdateCoalescer();
  const fakeNode = { id: 1 } as any;

  coalescer.enqueue(fakeNode, 'width', 100);
  coalescer.enqueue(fakeNode, 'height', 200);
  coalescer.enqueue(fakeNode, 'width', 150); // overwrite

  assert('Coalescer has pending', coalescer.hasPending);

  let appliedProps: Record<string, any> = {};
  let appliedKeys: string[] = [];
  coalescer.flush((node, props, keys) => {
    appliedProps = props;
    appliedKeys = keys;
  });

  assert('Coalescer merges props', appliedProps.width === 150, `width: ${appliedProps.width}`);
  assert('Coalescer includes all keys', appliedKeys.includes('width') && appliedKeys.includes('height'));
  assert('Coalescer clears after flush', !coalescer.hasPending);
}

// ── SubCanvasManager Tests ────────────────────────────────

function testSubCanvasManager() {
  const mgr = new SubCanvasManager(5);
  const node1 = { id: 'fast' } as any;
  const node2 = { id: 'slow' } as any;

  for (let i = 0; i < 10; i++) mgr.recordUpdate(node1);
  for (let i = 0; i < 2; i++) mgr.recordUpdate(node2);

  const toPromote = mgr.evaluate();
  assert('SubCanvas promotes high-freq node', toPromote.length === 1, `promoted: ${toPromote.length}`);
  assert('SubCanvas skips low-freq node', !toPromote.includes(node2));
  assert('SubCanvas promoted count', mgr.promotedCount === 1);

  // Second evaluate: already promoted, nothing new
  for (let i = 0; i < 10; i++) mgr.recordUpdate(node1);
  const toPromote2 = mgr.evaluate();
  assert('SubCanvas does not re-promote', toPromote2.length === 0);
}

// ── LeakDetector Tests ────────────────────────────────────

function testLeakDetectorStable() {
  const detector = new LeakDetector();
  detector.recordSnapshot(100);
  detector.recordSnapshot(100);
  detector.recordSnapshot(101);
  detector.recordSnapshot(100);
  const result = detector.analyze();
  assert('LeakDetector stable scenario', result.stable, `trend: ${result.trend}`);
}

function testLeakDetectorLeak() {
  const detector = new LeakDetector();
  for (let i = 0; i < 10; i++) detector.recordSnapshot(100 + i * 5);
  const result = detector.analyze();
  assert('LeakDetector detects leak', !result.stable, `trend: ${result.trend}, delta: ${result.delta}`);
}

// ── measure() Test ────────────────────────────────────────

function testMeasure() {
  const elapsed = measure(() => {
    let sum = 0;
    for (let i = 0; i < 100000; i++) sum += i;
  });
  assert('measure() returns positive time', elapsed >= 0, `elapsed: ${elapsed}ms`);
}

// ── FlexLayout Stress Test ────────────────────────────────

function testFlexLayoutStress() {
  const root = new FlexNode();
  root.setStyle({ width: 1920, height: 1080, flexDirection: 'column' });

  const nodeCount = 500;
  for (let i = 0; i < nodeCount; i++) {
    const child = new FlexNode();
    child.setStyle({ width: 200, height: 40, flexGrow: 1 });
    root.addChild(child);
  }

  const elapsed = measure(() => {
    root.calculateLayout(1920, 1080);
  });

  assert(`FlexLayout 500 nodes < 50ms`, elapsed < 50, `elapsed: ${elapsed.toFixed(1)}ms`);
  assert('FlexLayout root has children', root.children.length === nodeCount);
  assert('FlexLayout children have layout', root.children[0].layout.width > 0);
}

// ── Stress Report Generation ──────────────────────────────

function testStressReport() {
  const testResults: StressTestResult[] = [
    {
      testName: 'Mock Test', nodeCount: 100,
      createTimeMs: 10, updateTimeMs: 2, layoutTimeMs: 3,
      totalTimeMs: 15, fps: 60, passed: true,
    },
  ];
  const report = runStressReport(testResults);
  assert('Stress report generates', report.includes('PASS') && report.includes('Mock Test'));
}

// ── Run All ───────────────────────────────────────────────

export function runPhase6Tests(): string {
  results.length = 0;

  testNodePoolBasic();
  testNodePoolPrewarm();
  testNodePoolOverflow();
  testUpdateCoalescer();
  testSubCanvasManager();
  testLeakDetectorStable();
  testLeakDetectorLeak();
  testMeasure();
  testFlexLayoutStress();
  testStressReport();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const lines: string[] = [
    `\n=== Phase 6 Tests: ${passed}/${total} passed ===\n`,
  ];

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    lines.push(`  [${icon}] ${r.name}${r.passed ? '' : ' — ' + r.detail}`);
  }

  lines.push(`\n${passed === total ? 'ALL PASSED' : `${total - passed} FAILED`}\n`);

  const report = lines.join('\n');
  Debug.Log(report);
  return report;
}
