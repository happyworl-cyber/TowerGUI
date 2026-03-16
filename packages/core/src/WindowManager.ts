import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

export interface WindowConfig {
  id: string;
  title: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  modal?: boolean;
  closable?: boolean;
  draggable?: boolean;
  exclusive?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

export interface WindowState {
  id: string;
  config: WindowConfig;
  zIndex: number;
  visible: boolean;
}

export interface WindowManagerAPI {
  windows: WindowState[];
  open(config: WindowConfig): void;
  close(id: string): void;
  bringToTop(id: string): void;
  closeAll(): void;
  isOpen(id: string): boolean;
  getTopWindow(): WindowState | null;
  hasModal(): boolean;
}

interface WindowManagerState {
  windows: WindowState[];
  nextZ: number;
}

const WindowManagerCtx = createContext<WindowManagerAPI | null>(null);

export function useWindowManager(): WindowManagerAPI {
  const ctx = useContext(WindowManagerCtx);
  if (!ctx) throw new Error('useWindowManager must be used within WindowManagerProvider');
  return ctx;
}

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WindowManagerState>({ windows: [], nextZ: 100 });

  const open = useCallback((config: WindowConfig) => {
    setState(prev => {
      const existing = prev.windows.find(w => w.id === config.id);
      if (existing) {
        return {
          ...prev,
          windows: prev.windows.map(w =>
            w.id === config.id ? { ...w, visible: true, zIndex: prev.nextZ, config: { ...w.config, ...config } } : w
          ),
          nextZ: prev.nextZ + 1,
        };
      }

      let windows = [...prev.windows];
      if (config.exclusive) {
        windows = windows.map(w => ({ ...w, visible: false }));
      }

      const win: WindowState = {
        id: config.id,
        config,
        zIndex: prev.nextZ,
        visible: true,
      };
      windows.push(win);
      config.onOpen?.();
      return { windows, nextZ: prev.nextZ + 1 };
    });
  }, []);

  const close = useCallback((id: string) => {
    setState(prev => {
      const win = prev.windows.find(w => w.id === id);
      win?.config.onClose?.();
      return {
        ...prev,
        windows: prev.windows.filter(w => w.id !== id),
      };
    });
  }, []);

  const bringToTop = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      windows: prev.windows.map(w =>
        w.id === id ? { ...w, zIndex: prev.nextZ } : w
      ),
      nextZ: prev.nextZ + 1,
    }));
  }, []);

  const closeAll = useCallback(() => {
    setState(prev => {
      for (const w of prev.windows) w.config.onClose?.();
      return { windows: [], nextZ: prev.nextZ };
    });
  }, []);

  const isOpen = useCallback((id: string) => {
    return state.windows.some(w => w.id === id && w.visible);
  }, [state.windows]);

  const getTopWindow = useCallback((): WindowState | null => {
    const visible = state.windows.filter(w => w.visible);
    if (visible.length === 0) return null;
    return visible.reduce((top, w) => w.zIndex > top.zIndex ? w : top);
  }, [state.windows]);

  const hasModal = useCallback(() => {
    return state.windows.some(w => w.visible && w.config.modal);
  }, [state.windows]);

  const api: WindowManagerAPI = useMemo(() => ({
    windows: state.windows.filter(w => w.visible).sort((a, b) => a.zIndex - b.zIndex),
    open, close, bringToTop, closeAll, isOpen, getTopWindow, hasModal,
  }), [state.windows, open, close, bringToTop, closeAll, isOpen, getTopWindow, hasModal]);

  return React.createElement(WindowManagerCtx.Provider, { value: api }, children);
}
