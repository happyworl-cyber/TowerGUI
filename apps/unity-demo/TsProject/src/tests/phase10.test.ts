/**
 * Phase 10 — FocusManager / InputAdapter / SafeArea / Scale
 * Real functional tests, not existence checks.
 */

import {
  FocusManager,
  getSafeArea, getScreenInfo, calculateScale,
} from '@tower-ui/core';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;

interface TestResult { name: string; passed: boolean; detail: string; }
const results: TestResult[] = [];
function assert(name: string, condition: boolean, detail: string = '') {
  results.push({ name, passed: condition, detail: condition ? 'OK' : detail || 'FAILED' });
}

function testFocusManagerCoreWorkflow() {
  const fm = new FocusManager();

  fm.register({ id: 'btn1', tabIndex: 0, rect: { x: 0, y: 0, width: 100, height: 40 } });
  fm.register({ id: 'btn2', tabIndex: 1, rect: { x: 0, y: 50, width: 100, height: 40 } });
  fm.register({ id: 'btn3', tabIndex: 2, rect: { x: 0, y: 100, width: 100, height: 40 } });
  assert('Register 3 focusables', fm.getFocusableIds().length === 3);

  // Focus and callbacks
  let focusedId = '';
  let blurredId = '';
  fm.unregister('btn1');
  fm.register({
    id: 'btn1', tabIndex: 0, rect: { x: 0, y: 0, width: 100, height: 40 },
    onFocus: () => { focusedId = 'btn1'; },
    onBlur: () => { blurredId = 'btn1'; },
  });

  fm.focus('btn1');
  assert('Focus sets ID', fm.focusedId === 'btn1');
  assert('onFocus callback fired', focusedId === 'btn1');
  assert('isFocused works', fm.isFocused('btn1') && !fm.isFocused('btn2'));

  fm.focus('btn2');
  assert('onBlur callback fired', blurredId === 'btn1');
  assert('Focus changes', fm.focusedId === 'btn2');

  fm.blur();
  assert('Blur clears focus', fm.focusedId === null);
}

function testTabNavigation() {
  const fm = new FocusManager();
  fm.register({ id: 'a', tabIndex: 0, rect: { x: 0, y: 0, width: 100, height: 40 } });
  fm.register({ id: 'b', tabIndex: 1, rect: { x: 0, y: 50, width: 100, height: 40 } });
  fm.register({ id: 'c', tabIndex: 2, rect: { x: 0, y: 100, width: 100, height: 40 } });

  fm.focus('a');
  fm.focusNext(); assert('Tab a→b', fm.focusedId === 'b');
  fm.focusNext(); assert('Tab b→c', fm.focusedId === 'c');
  fm.focusNext(); assert('Tab c→a (wrap)', fm.focusedId === 'a');
  fm.focusPrev(); assert('ShiftTab a→c', fm.focusedId === 'c');
}

function testSpatialNavigation() {
  const fm = new FocusManager();
  fm.register({ id: 'tl', tabIndex: 0, rect: { x: 0, y: 0, width: 80, height: 40 } });
  fm.register({ id: 'tr', tabIndex: 1, rect: { x: 200, y: 0, width: 80, height: 40 } });
  fm.register({ id: 'bl', tabIndex: 2, rect: { x: 0, y: 200, width: 80, height: 40 } });
  fm.register({ id: 'br', tabIndex: 3, rect: { x: 200, y: 200, width: 80, height: 40 } });

  fm.focus('tl');
  fm.navigate('right'); assert('Spatial tl→tr', fm.focusedId === 'tr', `got: ${fm.focusedId}`);
  fm.navigate('down');  assert('Spatial tr→br', fm.focusedId === 'br', `got: ${fm.focusedId}`);
  fm.navigate('left');  assert('Spatial br→bl', fm.focusedId === 'bl', `got: ${fm.focusedId}`);
  fm.navigate('up');    assert('Spatial bl→tl', fm.focusedId === 'tl', `got: ${fm.focusedId}`);
}

function testSubscribeAndUnregister() {
  const fm = new FocusManager();
  fm.register({ id: 'a', tabIndex: 0, rect: { x: 0, y: 0, width: 100, height: 40 } });
  fm.register({ id: 'b', tabIndex: 1, rect: { x: 0, y: 50, width: 100, height: 40 } });

  let lastNotified: string | null = 'init';
  const unsub = fm.subscribe(id => { lastNotified = id; });

  fm.focus('a');
  assert('Subscribe notified on focus', lastNotified === 'a');
  fm.blur();
  assert('Subscribe notified on blur', lastNotified === null);
  unsub();
  fm.focus('b');
  assert('Unsubscribe stops notifications', lastNotified === null);

  fm.focus('a');
  fm.unregister('a');
  assert('Unregister clears focus if focused', fm.focusedId === null);
  assert('Unregister removes entry', fm.getFocusableIds().length === 1);
}

function testSafeAreaReturnsValid() {
  const sa = getSafeArea();
  assert('SafeArea has valid insets',
    typeof sa.top === 'number' && typeof sa.bottom === 'number' &&
    typeof sa.left === 'number' && typeof sa.right === 'number' &&
    sa.top >= 0 && sa.bottom >= 0 && sa.left >= 0 && sa.right >= 0,
    `${JSON.stringify(sa)}`);
}

function testScreenInfoReturnsPositive() {
  const info = getScreenInfo();
  assert('Screen has positive dimensions',
    info.width > 0 && info.height > 0 && info.dpi > 0,
    `${info.width}x${info.height} dpi:${info.dpi}`);
}

function testScaleCalculation() {
  const s1 = calculateScale({ designWidth: 1920, designHeight: 1080, mode: 'fitWidth' });
  const s2 = calculateScale({ designWidth: 1920, designHeight: 1080, mode: 'fitHeight' });
  const s3 = calculateScale({ designWidth: 1920, designHeight: 1080, mode: 'fitBoth' });
  const s4 = calculateScale({ designWidth: 1920, designHeight: 1080, mode: 'fixed' });

  assert('fitWidth > 0', s1 > 0, `${s1}`);
  assert('fitHeight > 0', s2 > 0, `${s2}`);
  assert('fitBoth <= max(w,h)', s3 > 0 && s3 <= Math.max(s1, s2), `${s3}`);
  assert('fixed = 1', s4 === 1);
}

export function runPhase10Tests(): string {
  results.length = 0;

  testFocusManagerCoreWorkflow();
  testTabNavigation();
  testSpatialNavigation();
  testSubscribeAndUnregister();
  testSafeAreaReturnsValid();
  testScreenInfoReturnsPositive();
  testScaleCalculation();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const lines = [`\n=== Phase 10 Tests: ${passed}/${total} passed ===\n`];
  for (const r of results) {
    lines.push(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}${r.passed ? '' : ' — ' + r.detail}`);
  }
  lines.push(passed === total ? '\nALL PASSED\n' : `\n${total - passed} FAILED\n`);
  const report = lines.join('\n');
  Debug.Log(report);
  return report;
}
