import { useRef, useCallback } from 'react';

// ── useLongPress ──────────────────────────────────────────

export interface LongPressConfig {
  duration?: number;
  onLongPress: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
}

export interface LongPressHandlers {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerExit: () => void;
}

export function useLongPress(config: LongPressConfig): LongPressHandlers {
  const timerRef = useRef<any>(null);
  const firedRef = useRef(false);
  const dur = config.duration ?? 500;

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    firedRef.current = false;
    config.onPressStart?.();
    clear();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      config.onLongPress();
    }, dur);
  }, [dur]);

  const onPointerUp = useCallback(() => {
    clear();
    config.onPressEnd?.();
  }, []);

  return { onPointerDown, onPointerUp, onPointerExit: onPointerUp };
}

// ── useSwipe ──────────────────────────────────────────────

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeConfig {
  threshold?: number;
  onSwipe: (dir: SwipeDirection) => void;
}

export interface SwipeHandlers {
  onPointerDown: (e: any) => void;
  onPointerUp: (e: any) => void;
}

export function useSwipe(config: SwipeConfig): SwipeHandlers {
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const threshold = config.threshold ?? 50;

  const onPointerDown = useCallback((e: any) => {
    startRef.current = {
      x: e.position?.x ?? 0,
      y: e.position?.y ?? 0,
      time: Date.now(),
    };
  }, []);

  const onPointerUp = useCallback((e: any) => {
    if (!startRef.current) return;
    const dx = (e.position?.x ?? 0) - startRef.current.x;
    const dy = (e.position?.y ?? 0) - startRef.current.y;
    const elapsed = Date.now() - startRef.current.time;
    startRef.current = null;

    if (elapsed > 1000) return; // too slow

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy && absDx > threshold) {
      config.onSwipe(dx > 0 ? 'right' : 'left');
    } else if (absDy > absDx && absDy > threshold) {
      config.onSwipe(dy > 0 ? 'down' : 'up');
    }
  }, [threshold]);

  return { onPointerDown, onPointerUp };
}

// ── usePinch ──────────────────────────────────────────────

export interface PinchConfig {
  onPinch: (scale: number) => void;
  onPinchEnd?: () => void;
}

export interface PinchState {
  scale: number;
  handleTouch: (touches: Array<{ x: number; y: number }>) => void;
  handleTouchEnd: () => void;
}

export function usePinch(config: PinchConfig): PinchState {
  const initialDistRef = useRef<number | null>(null);
  const scaleRef = useRef(1);

  const handleTouch = useCallback((touches: Array<{ x: number; y: number }>) => {
    if (touches.length < 2) return;
    const dx = touches[1].x - touches[0].x;
    const dy = touches[1].y - touches[0].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (initialDistRef.current === null) {
      initialDistRef.current = dist;
    } else if (initialDistRef.current > 0) {
      scaleRef.current = dist / initialDistRef.current;
      config.onPinch(scaleRef.current);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    initialDistRef.current = null;
    config.onPinchEnd?.();
  }, []);

  return { scale: scaleRef.current, handleTouch, handleTouchEnd };
}

// ── useRotation ───────────────────────────────────────────

export interface RotationConfig {
  onRotate: (angle: number) => void;
  onRotateEnd?: () => void;
}

export interface RotationState {
  angle: number;
  handleTouch: (touches: Array<{ x: number; y: number }>) => void;
  handleTouchEnd: () => void;
}

export function useRotation(config: RotationConfig): RotationState {
  const initialAngleRef = useRef<number | null>(null);
  const angleRef = useRef(0);

  const getAngle = (touches: Array<{ x: number; y: number }>): number => {
    const dx = touches[1].x - touches[0].x;
    const dy = touches[1].y - touches[0].y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const handleTouch = useCallback((touches: Array<{ x: number; y: number }>) => {
    if (touches.length < 2) return;
    const angle = getAngle(touches);

    if (initialAngleRef.current === null) {
      initialAngleRef.current = angle;
    } else {
      angleRef.current = angle - initialAngleRef.current;
      config.onRotate(angleRef.current);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    initialAngleRef.current = null;
    config.onRotateEnd?.();
  }, []);

  return { angle: angleRef.current, handleTouch, handleTouchEnd };
}
