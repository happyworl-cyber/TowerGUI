import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

/**
 * Focus management system for keyboard/gamepad UI navigation.
 *
 * Tracks focusable elements, supports Tab order and spatial (directional) navigation.
 */

export interface FocusableEntry {
  id: string;
  /** Tab order index (lower = earlier). -1 means not tabbable. */
  tabIndex: number;
  /** Bounding rect for spatial navigation */
  rect: { x: number; y: number; width: number; height: number };
  /** Callback when this entry receives focus */
  onFocus?: () => void;
  /** Callback when this entry loses focus */
  onBlur?: () => void;
  /** Custom data attached to this focusable */
  data?: any;
}

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

export interface FocusManagerAPI {
  /** Currently focused element ID */
  focusedId: string | null;

  /** Register a focusable element */
  register(entry: FocusableEntry): void;

  /** Unregister by ID */
  unregister(id: string): void;

  /** Focus a specific element */
  focus(id: string): void;

  /** Clear focus */
  blur(): void;

  /** Move focus to next in tab order */
  focusNext(): void;

  /** Move focus to previous in tab order */
  focusPrev(): void;

  /** Spatial navigation — move focus in a direction */
  navigate(direction: NavigationDirection): void;

  /** Get all registered focusable IDs */
  getFocusableIds(): string[];

  /** Check if an element is focused */
  isFocused(id: string): boolean;
}

export class FocusManager implements FocusManagerAPI {
  private entries = new Map<string, FocusableEntry>();
  private _focusedId: string | null = null;
  private listeners = new Set<(id: string | null) => void>();

  get focusedId(): string | null {
    return this._focusedId;
  }

  register(entry: FocusableEntry): void {
    this.entries.set(entry.id, entry);
  }

  unregister(id: string): void {
    this.entries.delete(id);
    if (this._focusedId === id) {
      this._focusedId = null;
      this.notify();
    }
  }

  focus(id: string): void {
    if (this._focusedId === id) return;
    const prev = this._focusedId;
    if (prev) this.entries.get(prev)?.onBlur?.();
    this._focusedId = id;
    this.entries.get(id)?.onFocus?.();
    this.notify();
  }

  blur(): void {
    if (this._focusedId) {
      this.entries.get(this._focusedId)?.onBlur?.();
      this._focusedId = null;
      this.notify();
    }
  }

  focusNext(): void {
    const sorted = this.getSortedTabbable();
    if (sorted.length === 0) return;

    const idx = sorted.findIndex(e => e.id === this._focusedId);
    const next = sorted[(idx + 1) % sorted.length];
    this.focus(next.id);
  }

  focusPrev(): void {
    const sorted = this.getSortedTabbable();
    if (sorted.length === 0) return;

    const idx = sorted.findIndex(e => e.id === this._focusedId);
    const prev = sorted[(idx - 1 + sorted.length) % sorted.length];
    this.focus(prev.id);
  }

  navigate(direction: NavigationDirection): void {
    if (!this._focusedId) {
      const first = this.getSortedTabbable()[0];
      if (first) this.focus(first.id);
      return;
    }

    const current = this.entries.get(this._focusedId);
    if (!current) return;

    const candidates = Array.from(this.entries.values()).filter(e =>
      e.id !== this._focusedId && e.tabIndex >= 0
    );

    const best = findNearestInDirection(current.rect, candidates, direction);
    if (best) this.focus(best.id);
  }

  getFocusableIds(): string[] {
    return Array.from(this.entries.keys());
  }

  isFocused(id: string): boolean {
    return this._focusedId === id;
  }

  subscribe(listener: (id: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(this._focusedId); } catch { /* noop */ }
    }
  }

  private getSortedTabbable(): FocusableEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.tabIndex >= 0)
      .sort((a, b) => a.tabIndex - b.tabIndex);
  }
}

// ── Spatial Navigation ───────────────────────────────────

interface Rect { x: number; y: number; width: number; height: number; }

function center(r: Rect): { cx: number; cy: number } {
  return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
}

function findNearestInDirection(
  fromRect: Rect,
  candidates: FocusableEntry[],
  direction: NavigationDirection,
): FocusableEntry | null {
  const from = center(fromRect);
  let best: FocusableEntry | null = null;
  let bestDist = Infinity;

  for (const candidate of candidates) {
    const to = center(candidate.rect);
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;

    let inDirection = false;
    switch (direction) {
      case 'up':    inDirection = dy < -5; break;
      case 'down':  inDirection = dy > 5; break;
      case 'left':  inDirection = dx < -5; break;
      case 'right': inDirection = dx > 5; break;
    }

    if (!inDirection) continue;

    // Distance with directional bias (primary axis weighted more)
    let dist: number;
    switch (direction) {
      case 'up':
      case 'down':
        dist = Math.abs(dy) + Math.abs(dx) * 3;
        break;
      case 'left':
      case 'right':
        dist = Math.abs(dx) + Math.abs(dy) * 3;
        break;
    }

    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }

  return best;
}

// ── React Context + Hooks ────────────────────────────────

const FocusContext = createContext<FocusManager | null>(null);

export const FocusProvider = FocusContext.Provider;

export function useFocusManager(): FocusManager {
  const mgr = useContext(FocusContext);
  if (!mgr) throw new Error('useFocusManager must be inside <FocusProvider>');
  return mgr;
}

/**
 * Register a focusable element and get focus state.
 */
export function useFocusable(config: {
  id: string;
  tabIndex?: number;
  rect?: Rect;
  onFocus?: () => void;
  onBlur?: () => void;
}): { focused: boolean; focus: () => void } {
  const mgr = useFocusManager();
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    mgr.register({
      id: config.id,
      tabIndex: config.tabIndex ?? 0,
      rect: config.rect ?? { x: 0, y: 0, width: 100, height: 40 },
      onFocus: () => { setFocused(true); config.onFocus?.(); },
      onBlur: () => { setFocused(false); config.onBlur?.(); },
    });

    return () => mgr.unregister(config.id);
  }, [config.id, config.tabIndex, config.rect?.x, config.rect?.y]);

  const focus = useCallback(() => mgr.focus(config.id), [mgr, config.id]);

  return { focused, focus };
}

/**
 * Hook to track which element is focused globally.
 */
export function useFocusedId(): string | null {
  const mgr = useFocusManager();
  const [id, setId] = useState<string | null>(mgr.focusedId);

  useEffect(() => {
    return mgr.subscribe(setId);
  }, [mgr]);

  return id;
}
