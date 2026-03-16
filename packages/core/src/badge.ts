import { useState, useEffect, useCallback, useRef } from 'react';

type BadgeListener = (key: string, count: number) => void;

class BadgeStore {
  private badges = new Map<string, number>();
  private listeners = new Set<BadgeListener>();

  set(key: string, count: number): void {
    const clamped = Math.max(0, Math.floor(count));
    if (this.badges.get(key) === clamped) return;
    if (clamped === 0) this.badges.delete(key);
    else this.badges.set(key, clamped);
    this.notify(key, clamped);
  }

  increment(key: string, delta = 1): void {
    this.set(key, this.get(key) + delta);
  }

  clear(key: string): void {
    this.set(key, 0);
  }

  clearAll(): void {
    const keys = [...this.badges.keys()];
    this.badges.clear();
    for (const k of keys) this.notify(k, 0);
  }

  get(key: string): number {
    return this.badges.get(key) ?? 0;
  }

  /** Check if key OR any child key (dot-separated) has a badge */
  has(prefix: string): boolean {
    if (this.badges.has(prefix)) return true;
    const p = prefix + '.';
    for (const k of this.badges.keys()) {
      if (k.startsWith(p)) return true;
    }
    return false;
  }

  /** Sum all badges under a prefix */
  sum(prefix: string): number {
    let total = this.badges.get(prefix) ?? 0;
    const p = prefix + '.';
    for (const [k, v] of this.badges) {
      if (k.startsWith(p)) total += v;
    }
    return total;
  }

  subscribe(listener: BadgeListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(key: string, count: number): void {
    for (const fn of this.listeners) {
      try { fn(key, count); } catch { /* safe */ }
    }
  }
}

/** Global badge store instance */
export const badgeStore = new BadgeStore();

/**
 * React hook — subscribe to a badge key (supports hierarchical dot-path).
 * Returns the badge count for this key.
 * Also returns `hasChild` which is true if any sub-key has badges.
 */
export function useBadge(key: string): { count: number; hasChild: boolean } {
  const [count, setCount] = useState(() => badgeStore.get(key));
  const [hasChild, setHasChild] = useState(() => badgeStore.has(key));
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    setCount(badgeStore.get(key));
    setHasChild(badgeStore.has(key));

    return badgeStore.subscribe((changedKey) => {
      const k = keyRef.current;
      if (changedKey === k || changedKey.startsWith(k + '.')) {
        setCount(badgeStore.get(k));
        setHasChild(badgeStore.has(k));
      }
    });
  }, [key]);

  return { count, hasChild };
}

/**
 * React hook — returns badge manipulation functions.
 */
export function useBadgeActions() {
  return {
    set: useCallback((key: string, count: number) => badgeStore.set(key, count), []),
    increment: useCallback((key: string, delta?: number) => badgeStore.increment(key, delta), []),
    clear: useCallback((key: string) => badgeStore.clear(key), []),
    clearAll: useCallback(() => badgeStore.clearAll(), []),
    sum: useCallback((prefix: string) => badgeStore.sum(prefix), []),
  };
}
