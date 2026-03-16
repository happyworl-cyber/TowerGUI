import { useState, useEffect, useRef } from 'react';

/**
 * useAsyncRender — renders large lists in chunks across frames to avoid frame drops.
 *
 * Usage:
 *   const { visibleCount, isComplete } = useAsyncRender({ total: 500, chunkSize: 50, intervalMs: 16 });
 *   // Render only items 0..visibleCount-1 in the first pass
 */
export interface AsyncRenderConfig {
  total: number;
  chunkSize?: number;
  intervalMs?: number;
  enabled?: boolean;
}

export interface AsyncRenderState {
  visibleCount: number;
  isComplete: boolean;
  progress: number;
  reset: () => void;
}

export function useAsyncRender(config: AsyncRenderConfig): AsyncRenderState {
  const { total, chunkSize = 50, intervalMs = 16, enabled = true } = config;
  const [visibleCount, setVisibleCount] = useState(enabled ? Math.min(chunkSize, total) : total);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || total <= chunkSize) {
      setVisibleCount(total);
      return;
    }

    setVisibleCount(Math.min(chunkSize, total));

    timerRef.current = setInterval(() => {
      setVisibleCount(prev => {
        const next = Math.min(prev + chunkSize, total);
        if (next >= total && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [total, chunkSize, intervalMs, enabled]);

  const reset = () => {
    setVisibleCount(enabled ? Math.min(chunkSize, total) : total);
  };

  return {
    visibleCount: Math.min(visibleCount, total),
    isComplete: visibleCount >= total,
    progress: total > 0 ? visibleCount / total : 1,
    reset,
  };
}

/**
 * useBatchUpdate — coalesces multiple state updates into a single frame.
 * Useful for reducing UGUI canvas rebuild frequency.
 */
export function useBatchUpdate<T>(initialValue: T): [T, (updater: (prev: T) => T) => void, () => void] {
  const [value, setValue] = useState(initialValue);
  const pendingRef = useRef<Array<(prev: T) => T>>([]);
  const rafRef = useRef<any>(null);

  const enqueue = (updater: (prev: T) => T) => {
    pendingRef.current.push(updater);
    if (rafRef.current === null) {
      rafRef.current = setTimeout(() => {
        rafRef.current = null;
        const updates = pendingRef.current;
        pendingRef.current = [];
        setValue(prev => {
          let result = prev;
          for (const fn of updates) result = fn(result);
          return result;
        });
      }, 0);
    }
  };

  const flush = () => {
    if (rafRef.current !== null) {
      clearTimeout(rafRef.current);
      rafRef.current = null;
    }
    const updates = pendingRef.current;
    pendingRef.current = [];
    if (updates.length > 0) {
      setValue(prev => {
        let result = prev;
        for (const fn of updates) result = fn(result);
        return result;
      });
    }
  };

  return [value, enqueue, flush];
}
