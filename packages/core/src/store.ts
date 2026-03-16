import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Lightweight global state store for game UI (inspired by Zustand).
 *
 * Usage:
 *   const store = createStore({ player: { hp: 100 }, bag: { items: [] } });
 *   // In component:
 *   const hp = useGameState(store, s => s.player.hp);
 *   // Mutate:
 *   store.set(s => ({ ...s, player: { ...s.player, hp: 80 } }));
 *   // Or dispatch action:
 *   store.dispatch({ type: 'DAMAGE', payload: 20 });
 */

export type Listener<T> = (state: T, prev: T) => void;
export type Selector<T, R> = (state: T) => R;
export type Reducer<T> = (state: T, action: GameAction) => T;
export type SetFn<T> = (updater: T | ((prev: T) => T)) => void;

export interface GameAction {
  type: string;
  payload?: any;
}

export interface GameStore<T extends object> {
  /** Get current snapshot */
  get(): T;

  /** Immutable update */
  set: SetFn<T>;

  /** Deep path set: store.setPath('player.hp', 80) */
  setPath(path: string, value: any): void;

  /** Dispatch an action through the reducer */
  dispatch(action: GameAction): void;

  /** Subscribe to all state changes */
  subscribe(listener: Listener<T>): () => void;

  /** Batch multiple set() calls into a single notification */
  batch(fn: () => void): void;

  /** Serialize current state to JSON */
  toJSON(): string;

  /** Restore state from JSON */
  fromJSON(json: string): void;

  /** Reset to initial state */
  reset(): void;

  /** Register a reducer for dispatch() */
  setReducer(reducer: Reducer<T>): void;
}

export function createStore<T extends object>(initialState: T, reducer?: Reducer<T>): GameStore<T> {
  let state = structuredCloneShim(initialState);
  const frozenInitial = structuredCloneShim(initialState);
  let currentReducer = reducer;
  const listeners = new Set<Listener<T>>();

  let batchDepth = 0;
  let batchedPrev: T | null = null;

  function notify(prev: T) {
    if (batchDepth > 0) {
      if (batchedPrev === null) batchedPrev = prev;
      return;
    }
    for (const fn of listeners) {
      try { fn(state, prev); } catch { /* listener error should not break others */ }
    }
  }

  const store: GameStore<T> = {
    get() {
      return state;
    },

    set(updater) {
      const prev = state;
      state = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      notify(prev);
    },

    setPath(path: string, value: any) {
      const prev = state;
      state = setDeep(structuredCloneShim(state), path, value);
      notify(prev);
    },

    dispatch(action: GameAction) {
      if (!currentReducer) {
        throw new Error(`[Store] No reducer registered. Call store.setReducer() first.`);
      }
      const prev = state;
      state = currentReducer(prev, action);
      notify(prev);
    },

    subscribe(listener: Listener<T>) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    batch(fn: () => void) {
      batchDepth++;
      const prevBeforeBatch = state;
      try {
        fn();
      } finally {
        batchDepth--;
        if (batchDepth === 0 && batchedPrev !== null) {
          const prev = batchedPrev;
          batchedPrev = null;
          for (const l of listeners) {
            try { l(state, prev); } catch { /* noop */ }
          }
        }
      }
    },

    toJSON() {
      return JSON.stringify(state);
    },

    fromJSON(json: string) {
      if (!json) return;
      let parsed: any;
      try { parsed = JSON.parse(json); }
      catch (e) {
        if (typeof console !== 'undefined') console.warn('[Store] fromJSON parse error:', e);
        return;
      }
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        if (typeof console !== 'undefined') console.error('[Store] fromJSON expects a plain object, got:', typeof parsed);
        return;
      }
      const prev = state;
      state = parsed as T;
      notify(prev);
    },

    reset() {
      const prev = state;
      state = structuredCloneShim(frozenInitial);
      notify(prev);
    },

    setReducer(r: Reducer<T>) {
      currentReducer = r;
    },
  };

  return store;
}

/**
 * React hook — subscribes to a slice of the store.
 * Only re-renders when the selected value changes (shallow compare).
 */
export function useGameState<T extends object, R>(store: GameStore<T>, selector: Selector<T, R>): R {
  const [, forceRender] = useState(0);
  const selectorRef = useRef(selector);
  const valueRef = useRef<R>(selector(store.get()));
  selectorRef.current = selector;

  useEffect(() => {
    const unsub = store.subscribe((newState) => {
      const newVal = selectorRef.current(newState);
      if (!shallowEqual(valueRef.current, newVal)) {
        valueRef.current = newVal;
        forceRender(c => c + 1);
      }
    });
    return unsub;
  }, [store]);

  return selectorRef.current(store.get());
}

/**
 * React hook — returns a dispatch function bound to the store.
 */
export function useDispatch<T extends object>(store: GameStore<T>) {
  return useCallback((action: GameAction) => store.dispatch(action), [store]);
}

/**
 * React hook — returns the store's batch function.
 */
export function useBatch<T extends object>(store: GameStore<T>) {
  return useCallback((fn: () => void) => store.batch(fn), [store]);
}

// ── Utilities ────────────────────────────────────────────

function shallowEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

function setDeep(obj: any, path: string, value: any): any {
  if (!path) return obj;
  if (obj == null || typeof obj !== 'object') return obj;
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const nextKey = keys[i + 1];
    const needsArray = /^\d+$/.test(nextKey);
    if (current[k] === undefined || current[k] === null) {
      current[k] = needsArray ? [] : {};
    } else if (Array.isArray(current[k])) {
      current[k] = [...current[k]];
    } else if (typeof current[k] === 'object') {
      current[k] = { ...current[k] };
    }
    current = current[k];
  }
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
  return obj;
}

function structuredCloneShim<T>(obj: T): T {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  if (obj === undefined || obj === null) return obj;
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return obj; }
}
