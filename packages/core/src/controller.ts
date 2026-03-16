import { useState, useCallback, useMemo } from 'react';

// ── useController ─────────────────────────────────────────

export interface ControllerState {
  index: number;
  page: string;
  pages: string[];
  setPage: (nameOrIndex: string | number) => void;
  nextPage: () => void;
  prevPage: () => void;
  isPage: (name: string) => boolean;
}

export function useController(name: string, pages: string[], initialIndex: number = 0): ControllerState {
  const [index, setIndex] = useState(initialIndex);

  const setPage = useCallback((nameOrIndex: string | number) => {
    if (typeof nameOrIndex === 'number') {
      setIndex(Math.max(0, Math.min(pages.length - 1, nameOrIndex)));
    } else {
      const idx = pages.indexOf(nameOrIndex);
      if (idx >= 0) setIndex(idx);
    }
  }, [pages]);

  const nextPage = useCallback(() => {
    if (pages.length === 0) return;
    setIndex(prev => (prev + 1) % pages.length);
  }, [pages.length]);

  const prevPage = useCallback(() => {
    if (pages.length === 0) return;
    setIndex(prev => (prev - 1 + pages.length) % pages.length);
  }, [pages.length]);

  const isPage = useCallback((n: string) => pages[index] === n, [pages, index]);

  return {
    index,
    page: pages[index] ?? '',
    pages,
    setPage,
    nextPage,
    prevPage,
    isPage,
  };
}

// ── useGear ───────────────────────────────────────────────

export type GearValues<T> = T[];

export interface UseGearConfig<T> {
  controller: ControllerState;
  values: GearValues<T>;
  interpolate?: (from: T, to: T, progress: number) => T;
}

export function useGear<T>(config: UseGearConfig<T>): T {
  const { controller, values } = config;
  return values[controller.index] ?? values[0];
}

export interface GearStyle {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  tint?: string;
}

export function useGearStyle(controller: ControllerState, styles: GearStyle[]): GearStyle {
  return useMemo(() => {
    return styles[controller.index] ?? styles[0] ?? {};
  }, [controller.index, styles]);
}

// ── HitTest Utilities ─────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

export interface Point {
  x: number;
  y: number;
}

export function hitTestRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function hitTestCircle(point: Point, circle: Circle): boolean {
  const dx = point.x - circle.cx;
  const dy = point.y - circle.cy;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

export function hitTestPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const denom = yj - yi;
    if (
      denom !== 0 &&
      ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / denom + xi)
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function rectIntersects(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}
