/**
 * Phase 9 Automated Tests — Store / useGameState / DataReceiver
 */

import { createStore, type GameStore, type GameAction } from '@tower-ui/core';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;
const DataBridge = CS.TowerUI.DataBridge;

interface TestResult { name: string; passed: boolean; detail: string; }
const results: TestResult[] = [];
function assert(name: string, condition: boolean, detail: string = '') {
  results.push({ name, passed: condition, detail: condition ? 'OK' : detail || 'FAILED' });
}

// ── createStore basics ───────────────────────────────────

function testStoreCreate() {
  const store = createStore({ count: 0, name: 'test' });
  assert('Store created', store != null);
  assert('Store.get() returns initial state', store.get().count === 0 && store.get().name === 'test');
}

function testStoreSet() {
  const store = createStore({ x: 1, y: 2 });
  store.set(s => ({ ...s, x: 10 }));
  assert('Store.set() updates state', store.get().x === 10, `x: ${store.get().x}`);
  assert('Store.set() preserves other keys', store.get().y === 2);
}

function testStoreSetPath() {
  const store = createStore({ player: { hp: 100, mp: 50 }, gold: 500 });
  store.setPath('player.hp', 80);
  assert('setPath updates nested value', store.get().player.hp === 80, `hp: ${store.get().player.hp}`);
  assert('setPath preserves siblings', store.get().player.mp === 50);
  assert('setPath preserves root siblings', store.get().gold === 500);
}

function testStoreSubscribe() {
  const store = createStore({ val: 0 });
  let notified = 0;
  let lastPrev = -1;
  const unsub = store.subscribe((state, prev) => {
    notified++;
    lastPrev = prev.val;
  });

  store.set(s => ({ ...s, val: 5 }));
  assert('Subscribe fires on set()', notified === 1, `notified: ${notified}`);
  assert('Subscribe receives prev state', lastPrev === 0, `prev: ${lastPrev}`);

  store.set(s => ({ ...s, val: 10 }));
  assert('Subscribe fires again', notified === 2);

  unsub();
  store.set(s => ({ ...s, val: 99 }));
  assert('Unsubscribe stops notifications', notified === 2, `notified: ${notified}`);
}

// ── Batch ────────────────────────────────────────────────

function testStoreBatch() {
  const store = createStore({ a: 1, b: 2 });
  let notifyCount = 0;
  store.subscribe(() => notifyCount++);

  store.batch(() => {
    store.set(s => ({ ...s, a: 10 }));
    store.set(s => ({ ...s, b: 20 }));
    store.set(s => ({ ...s, a: 30 }));
  });

  assert('Batch: only 1 notification', notifyCount === 1, `count: ${notifyCount}`);
  assert('Batch: final state correct', store.get().a === 30 && store.get().b === 20,
    `a: ${store.get().a}, b: ${store.get().b}`);
}

// ── Reducer / Dispatch ───────────────────────────────────

function testStoreDispatch() {
  interface State { hp: number; maxHp: number; }
  const store = createStore<State>({ hp: 100, maxHp: 100 });

  store.setReducer((state: State, action: GameAction): State => {
    switch (action.type) {
      case 'DAMAGE':
        return { ...state, hp: Math.max(0, state.hp - (action.payload ?? 0)) };
      case 'HEAL':
        return { ...state, hp: Math.min(state.maxHp, state.hp + (action.payload ?? 0)) };
      default:
        return state;
    }
  });

  store.dispatch({ type: 'DAMAGE', payload: 30 });
  assert('Dispatch DAMAGE', store.get().hp === 70, `hp: ${store.get().hp}`);

  store.dispatch({ type: 'HEAL', payload: 10 });
  assert('Dispatch HEAL', store.get().hp === 80, `hp: ${store.get().hp}`);

  store.dispatch({ type: 'DAMAGE', payload: 200 });
  assert('Dispatch clamps to 0', store.get().hp === 0, `hp: ${store.get().hp}`);
}

function testStoreDispatchNoReducer() {
  const store = createStore({ x: 1 });
  let threw = false;
  try {
    store.dispatch({ type: 'NOOP' });
  } catch {
    threw = true;
  }
  assert('Dispatch without reducer throws', threw);
}

// ── Serialization ────────────────────────────────────────

function testStoreSerialization() {
  const store = createStore({ items: [1, 2, 3], name: 'bag' });
  const json = store.toJSON();
  assert('toJSON produces string', typeof json === 'string' && json.includes('bag'));

  store.set({ items: [], name: '' });
  assert('State cleared', store.get().items.length === 0);

  store.fromJSON(json);
  assert('fromJSON restores state', store.get().items.length === 3 && store.get().name === 'bag',
    `items: ${store.get().items.length}`);
}

function testStoreReset() {
  const store = createStore({ count: 0 });
  store.set(s => ({ ...s, count: 999 }));
  store.reset();
  assert('Reset restores initial state', store.get().count === 0, `count: ${store.get().count}`);
}

// ── DataBridge C# → JS ──────────────────────────────────

function testDataBridgeExists() {
  assert('DataBridge class exists', DataBridge != null);
  assert('DataBridge.Push exists', typeof DataBridge.Push === 'function');
  assert('DataBridge.PushRaw exists', typeof DataBridge.PushRaw === 'function');
  assert('DataBridge.BeginBatch exists', typeof DataBridge.BeginBatch === 'function');
  assert('DataBridge.EndBatch exists', typeof DataBridge.EndBatch === 'function');
  assert('DataBridge.Batch exists', typeof DataBridge.Batch === 'function');
  assert('DataBridge.PushSnapshot exists', typeof DataBridge.PushSnapshot === 'function');
}

function testDataBridgePush() {
  const store = createStore({ player: { hp: 100 }, gold: 0 });

  // Wire up manually (like connectStore does)
  DataBridge.onDataPush = (path: string, jsonValue: string) => {
    const value = JSON.parse(jsonValue);
    if (path === '__snapshot__') {
      store.set(value);
    } else {
      store.setPath(path, value);
    }
  };

  DataBridge.PushRaw('player.hp', '75');
  assert('PushRaw updates store', store.get().player.hp === 75, `hp: ${store.get().player.hp}`);

  DataBridge.Push('gold', 500);
  assert('Push(int) updates store', store.get().gold === 500, `gold: ${store.get().gold}`);

  DataBridge.ClearReceivers();
}

function testDataBridgeBatch() {
  const store = createStore({ a: 0, b: 0 });
  let notifyCount = 0;

  DataBridge.onBatchPush = (jsonPatches: string) => {
    const patches = JSON.parse(jsonPatches);
    store.batch(() => {
      for (const p of patches) {
        store.setPath(p.p, p.v);
      }
    });
  };

  // Fallback for non-batch
  DataBridge.onDataPush = (path: string, jsonValue: string) => {
    store.setPath(path, JSON.parse(jsonValue));
  };

  store.subscribe(() => notifyCount++);

  DataBridge.BeginBatch();
  DataBridge.PushRaw('a', '10');
  DataBridge.PushRaw('b', '20');
  DataBridge.EndBatch();

  assert('Batch push: a = 10', store.get().a === 10, `a: ${store.get().a}`);
  assert('Batch push: b = 20', store.get().b === 20, `b: ${store.get().b}`);
  assert('Batch push: 1 notification', notifyCount === 1, `count: ${notifyCount}`);

  DataBridge.ClearReceivers();
}

// ── Run All ──────────────────────────────────────────────

export function runPhase9Tests(): string {
  results.length = 0;

  testStoreCreate();
  testStoreSet();
  testStoreSetPath();
  testStoreSubscribe();
  testStoreBatch();
  testStoreDispatch();
  testStoreDispatchNoReducer();
  testStoreSerialization();
  testStoreReset();
  testDataBridgeExists();
  testDataBridgePush();
  testDataBridgeBatch();

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const lines: string[] = [
    `\n=== Phase 9 Tests: ${passed}/${total} passed ===\n`,
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
