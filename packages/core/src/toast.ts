import { useState, useEffect, useCallback, useRef } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let nextId = 1;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners = new Set<ToastListener>();
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  maxToasts = 20;

  show(message: string, options?: ToastOptions): number {
    const id = nextId++;
    const item: ToastItem = {
      id,
      message,
      type: options?.type ?? 'info',
      duration: options?.duration ?? 3000,
      createdAt: Date.now(),
    };

    this.toasts = [...this.toasts, item];

    while (this.toasts.length > this.maxToasts) {
      const oldest = this.toasts[0];
      this.toasts = this.toasts.slice(1);
      const t = this.timers.get(oldest.id);
      if (t) { clearTimeout(t); this.timers.delete(oldest.id); }
    }

    this.notify();

    if (item.duration > 0) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), item.duration));
    }

    return id;
  }

  info(message: string, duration?: number): number {
    return this.show(message, { type: 'info', duration });
  }

  success(message: string, duration?: number): number {
    return this.show(message, { type: 'success', duration });
  }

  warning(message: string, duration?: number): number {
    return this.show(message, { type: 'warning', duration });
  }

  error(message: string, duration?: number): number {
    return this.show(message, { type: 'error', duration });
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  dismissAll(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.toasts = [];
    this.notify();
  }

  getAll(): ToastItem[] {
    return this.toasts;
  }

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    const snapshot = this.toasts;
    for (const fn of this.listeners) {
      try { fn(snapshot); } catch { /* safe */ }
    }
  }
}

/** Global toast manager */
export const toastManager = new ToastManager();

/**
 * React hook — subscribe to toast notifications.
 * Returns current toasts array + action methods.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(() => toastManager.getAll());

  useEffect(() => {
    setToasts(toastManager.getAll());
    return toastManager.subscribe(setToasts);
  }, []);

  return {
    toasts,
    show: useCallback((msg: string, opts?: ToastOptions) => toastManager.show(msg, opts), []),
    info: useCallback((msg: string, dur?: number) => toastManager.info(msg, dur), []),
    success: useCallback((msg: string, dur?: number) => toastManager.success(msg, dur), []),
    warning: useCallback((msg: string, dur?: number) => toastManager.warning(msg, dur), []),
    error: useCallback((msg: string, dur?: number) => toastManager.error(msg, dur), []),
    dismiss: useCallback((id: number) => toastManager.dismiss(id), []),
    dismissAll: useCallback(() => toastManager.dismissAll(), []),
  };
}
