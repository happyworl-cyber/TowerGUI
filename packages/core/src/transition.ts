import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Screen transition effects for page/window switching.
 *
 * Usage:
 *   const { transitioning, progress, style, start } = useScreenTransition('fadeIn', 300);
 *   <ui-view opacity={style.opacity}> ... </ui-view>
 */

export type TransitionType =
  | 'fadeIn' | 'fadeOut'
  | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'
  | 'scaleIn' | 'scaleOut'
  | 'none';

export interface TransitionStyle {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

export interface ScreenTransitionReturn {
  transitioning: boolean;
  progress: number;
  style: TransitionStyle;
  start: () => void;
  reset: () => void;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getStyleAtProgress(type: TransitionType, progress: number, screenWidth = 1920, screenHeight = 1080): TransitionStyle {
  const t = easeInOutCubic(progress);
  const base: TransitionStyle = { opacity: 1, translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 };

  switch (type) {
    case 'fadeIn':
      return { ...base, opacity: t };
    case 'fadeOut':
      return { ...base, opacity: 1 - t };
    case 'slideLeft':
      return { ...base, translateX: lerp(screenWidth, 0, t) };
    case 'slideRight':
      return { ...base, translateX: lerp(-screenWidth, 0, t) };
    case 'slideUp':
      return { ...base, translateY: lerp(screenHeight, 0, t) };
    case 'slideDown':
      return { ...base, translateY: lerp(-screenHeight, 0, t) };
    case 'scaleIn':
      return { ...base, scaleX: t, scaleY: t, opacity: t };
    case 'scaleOut':
      return { ...base, scaleX: 1 - t, scaleY: 1 - t, opacity: 1 - t };
    case 'none':
    default:
      return base;
  }
}

export function useScreenTransition(
  type: TransitionType,
  durationMs: number = 300,
  autoStart: boolean = false,
): ScreenTransitionReturn {
  const [progress, setProgress] = useState(autoStart ? 0 : 1);
  const [transitioning, setTransitioning] = useState(autoStart);
  const startTimeRef = useRef(0);
  const rafRef = useRef<any>(null);

  const safeDuration = Math.max(1, durationMs);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const p = Math.min(1, elapsed / safeDuration);
    setProgress(p);

    if (p < 1) {
      rafRef.current = setTimeout(animate, 16);
    } else {
      setTransitioning(false);
    }
  }, [safeDuration]);

  const start = useCallback(() => {
    setProgress(0);
    setTransitioning(true);
    startTimeRef.current = Date.now();
    rafRef.current = setTimeout(animate, 16);
  }, [animate]);

  const reset = useCallback(() => {
    if (rafRef.current) clearTimeout(rafRef.current);
    setProgress(type.includes('Out') ? 0 : 1);
    setTransitioning(false);
  }, [type]);

  useEffect(() => {
    if (autoStart) start();
    return () => { if (rafRef.current) clearTimeout(rafRef.current); };
  }, []);

  const style = getStyleAtProgress(type, progress);

  return { transitioning, progress, style, start, reset };
}

/**
 * Pre-built transition pairs for common patterns.
 */
export const TransitionPresets = {
  pagePush: { enter: 'slideLeft' as TransitionType, exit: 'fadeOut' as TransitionType, duration: 350 },
  pagePop: { enter: 'slideRight' as TransitionType, exit: 'fadeOut' as TransitionType, duration: 350 },
  modalOpen: { enter: 'scaleIn' as TransitionType, exit: 'none' as TransitionType, duration: 250 },
  modalClose: { enter: 'none' as TransitionType, exit: 'scaleOut' as TransitionType, duration: 200 },
  fade: { enter: 'fadeIn' as TransitionType, exit: 'fadeOut' as TransitionType, duration: 300 },
};
