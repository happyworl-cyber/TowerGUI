import type { GameStore } from './store';

declare const CS: any;

const DataBridge = typeof CS !== 'undefined' ? CS?.TowerUI?.DataBridge : null;

interface Patch {
  p: string;
  v: any;
}

/**
 * Connect a GameStore to the C# DataBridge.
 * After calling this, any DataBridge.Push() from C# will update the store.
 *
 * Returns a disconnect function.
 */
export function connectStore<T extends object>(store: GameStore<T>): () => void {
  if (!DataBridge) {
    return () => {};
  }

  DataBridge.onDataPush = (path: string, jsonValue: string) => {
    try {
      const value = JSON.parse(jsonValue);

      if (path === '__snapshot__') {
        store.set(value as T);
      } else {
        store.setPath(path, value);
      }
    } catch (e: any) {
      if (typeof CS !== 'undefined') {
        CS.UnityEngine.Debug.LogError(`[DataReceiver] Parse error for "${path}": ${e.message}`);
      }
    }
  };

  DataBridge.onBatchPush = (jsonPatches: string) => {
    try {
      const patches: Patch[] = JSON.parse(jsonPatches);
      store.batch(() => {
        for (const { p, v } of patches) {
          if (p === '__snapshot__') {
            store.set(v as T);
          } else {
            store.setPath(p, v);
          }
        }
      });
    } catch (e: any) {
      if (typeof CS !== 'undefined') {
        CS.UnityEngine.Debug.LogError(`[DataReceiver] Batch parse error: ${e.message}`);
      }
    }
  };

  return () => {
    DataBridge.ClearReceivers();
  };
}
