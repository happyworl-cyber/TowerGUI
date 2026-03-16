import { useState, useEffect } from 'react';
import type { FocusManager, NavigationDirection } from './FocusManager';

declare const CS: any;

const InputBridge = typeof CS !== 'undefined' ? CS?.TowerUI?.InputBridge : null;

/**
 * Connect a FocusManager to the C# InputBridge.
 * Keyboard/gamepad events → FocusManager navigation.
 *
 * @param onSubmit - Called when Enter/gamepad A is pressed on a focused element
 * @param onCancel - Called when Escape/gamepad B is pressed
 * @returns disconnect function
 */
export function connectInput(
  focusManager: FocusManager,
  onSubmit?: (focusedId: string | null) => void,
  onCancel?: () => void,
): () => void {
  if (!InputBridge) return () => {};

  InputBridge.onNavigate = (dir: string) => {
    focusManager.navigate(dir as NavigationDirection);
  };

  InputBridge.onTabNext = () => {
    focusManager.focusNext();
  };

  InputBridge.onTabPrev = () => {
    focusManager.focusPrev();
  };

  InputBridge.onSubmit = () => {
    onSubmit?.(focusManager.focusedId);
  };

  InputBridge.onCancel = () => {
    onCancel?.();
  };

  return () => {
    InputBridge.ClearCallbacks();
  };
}

// ── Safe Area ────────────────────────────────────────────

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Get safe area insets (pixel values).
 */
export function getSafeArea(): SafeAreaInsets {
  if (!InputBridge) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  try {
    const sw = Math.max(1, InputBridge.GetScreenWidth());
    const sh = Math.max(1, InputBridge.GetScreenHeight());
    const saX = InputBridge.GetSafeAreaX();
    const saY = InputBridge.GetSafeAreaY();
    const saW = InputBridge.GetSafeAreaW();
    const saH = InputBridge.GetSafeAreaH();

    return {
      left: saX * sw,
      bottom: saY * sh,
      right: sw - (saX + saW) * sw,
      top: sh - (saY + saH) * sh,
    };
  } catch {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

/**
 * React hook — returns safe area insets and updates on screen resize.
 */
export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>(getSafeArea);

  useEffect(() => {
    const check = () => {
      const next = getSafeArea();
      setInsets(prev => {
        if (prev.top === next.top && prev.bottom === next.bottom &&
            prev.left === next.left && prev.right === next.right) return prev;
        return next;
      });
    };

    // Poll every 2 seconds (screen rotation, etc.)
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  return insets;
}

// ── Screen / Resolution ──────────────────────────────────

export interface ScreenInfo {
  width: number;
  height: number;
  dpi: number;
}

export function getScreenInfo(): ScreenInfo {
  if (!InputBridge) {
    return { width: 1920, height: 1080, dpi: 96 };
  }
  try {
    const w = InputBridge.GetScreenWidth();
    const h = InputBridge.GetScreenHeight();
    const d = InputBridge.GetScreenDpi();
    return { width: w || 1920, height: h || 1080, dpi: d > 0 ? d : 96 };
  } catch {
    return { width: 1920, height: 1080, dpi: 96 };
  }
}

export type ScaleMode = 'fitWidth' | 'fitHeight' | 'fitBoth' | 'fixed';

export interface ScaleConfig {
  designWidth: number;
  designHeight: number;
  mode: ScaleMode;
}

/**
 * Calculate scale factor for a given design resolution → actual screen.
 */
export function calculateScale(config: ScaleConfig): number {
  const screen = getScreenInfo();
  const dw = config.designWidth > 0 ? config.designWidth : 1920;
  const dh = config.designHeight > 0 ? config.designHeight : 1080;

  switch (config.mode) {
    case 'fitWidth':
      return screen.width / dw;
    case 'fitHeight':
      return screen.height / dh;
    case 'fitBoth':
      return Math.min(screen.width / dw, screen.height / dh);
    case 'fixed':
      return 1;
  }
}

/**
 * React hook — returns current scale factor, recalculated on resize.
 */
export function useScale(config: ScaleConfig): number {
  const [scale, setScale] = useState(() => calculateScale(config));

  useEffect(() => {
    const check = () => {
      const next = calculateScale(config);
      setScale(prev => Math.abs(prev - next) < 0.001 ? prev : next);
    };
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [config.designWidth, config.designHeight, config.mode]);

  return scale;
}
