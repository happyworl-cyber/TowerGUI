import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────

export interface DragData {
  type: string;
  payload: any;
  sourceId: string;
}

export interface DropResult {
  accepted: boolean;
  targetId: string;
}

interface DragDropState {
  isDragging: boolean;
  dragData: DragData | null;
  dragPosition: { x: number; y: number };
  hoveredDropId: string | null;
}

interface DragDropContextValue {
  state: DragDropState;
  beginDrag: (data: DragData, pos: { x: number; y: number }) => void;
  updateDrag: (pos: { x: number; y: number }) => void;
  endDrag: () => DropResult | null;
  registerDrop: (id: string, accept: string[], onDrop: (data: DragData) => boolean) => void;
  unregisterDrop: (id: string) => void;
  setHovered: (id: string | null) => void;
}

// ── Context ───────────────────────────────────────────────

const DragDropCtx = createContext<DragDropContextValue | null>(null);

interface DropTarget {
  id: string;
  accept: string[];
  onDrop: (data: DragData) => boolean;
}

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    dragData: null,
    dragPosition: { x: 0, y: 0 },
    hoveredDropId: null,
  });

  const dropTargets = useRef(new Map<string, DropTarget>());

  const beginDrag = useCallback((data: DragData, pos: { x: number; y: number }) => {
    setState({ isDragging: true, dragData: data, dragPosition: pos, hoveredDropId: null });
  }, []);

  const updateDrag = useCallback((pos: { x: number; y: number }) => {
    setState(prev => ({ ...prev, dragPosition: pos }));
  }, []);

  const endDrag = useCallback((): DropResult | null => {
    const current = state;
    let result: DropResult | null = null;

    if (current.hoveredDropId && current.dragData) {
      const target = dropTargets.current.get(current.hoveredDropId);
      if (target && target.accept.includes(current.dragData.type)) {
        const accepted = target.onDrop(current.dragData);
        result = { accepted, targetId: current.hoveredDropId };
      }
    }

    setState({ isDragging: false, dragData: null, dragPosition: { x: 0, y: 0 }, hoveredDropId: null });
    return result;
  }, [state]);

  const registerDrop = useCallback((id: string, accept: string[], onDrop: (data: DragData) => boolean) => {
    dropTargets.current.set(id, { id, accept, onDrop });
  }, []);

  const unregisterDrop = useCallback((id: string) => {
    dropTargets.current.delete(id);
  }, []);

  const setHovered = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, hoveredDropId: id }));
  }, []);

  const value: DragDropContextValue = {
    state, beginDrag, updateDrag, endDrag, registerDrop, unregisterDrop, setHovered,
  };

  return React.createElement(DragDropCtx.Provider, { value }, children);
}

// ── useDrag ───────────────────────────────────────────────

export interface UseDragConfig {
  type: string;
  payload: any;
  id: string;
  onDragStart?: () => void;
  onDragEnd?: (result: DropResult | null) => void;
}

export interface UseDragReturn {
  isDragging: boolean;
  dragHandlers: {
    onPointerDown: (e: any) => void;
  };
}

export function useDrag(config: UseDragConfig): UseDragReturn {
  const ctx = useContext(DragDropCtx);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((e: any) => {
    if (!ctx) return;
    draggingRef.current = true;
    const pos = { x: e.position?.x ?? 0, y: e.position?.y ?? 0 };
    ctx.beginDrag({ type: config.type, payload: config.payload, sourceId: config.id }, pos);
    config.onDragStart?.();
  }, [ctx, config.type, config.payload, config.id]);

  const isDragging = ctx?.state.isDragging && ctx.state.dragData?.sourceId === config.id;

  return {
    isDragging: !!isDragging,
    dragHandlers: { onPointerDown },
  };
}

// ── useDrop ───────────────────────────────────────────────

export interface UseDropConfig {
  id: string;
  accept: string[];
  onDrop: (data: DragData) => boolean;
  onHover?: (data: DragData) => void;
}

export interface UseDropReturn {
  isOver: boolean;
  canDrop: boolean;
  dropHandlers: {
    onPointerEnter: () => void;
    onPointerExit: () => void;
    onPointerUp: () => void;
  };
}

export function useDrop(config: UseDropConfig): UseDropReturn {
  const ctx = useContext(DragDropCtx);
  const registeredRef = useRef(false);

  if (ctx && !registeredRef.current) {
    ctx.registerDrop(config.id, config.accept, config.onDrop);
    registeredRef.current = true;
  }

  const isOver = ctx?.state.hoveredDropId === config.id;
  const canDrop = !!(isOver && ctx?.state.dragData && config.accept.includes(ctx.state.dragData.type));

  const onPointerEnter = useCallback(() => {
    if (!ctx?.state.isDragging) return;
    ctx.setHovered(config.id);
    if (ctx.state.dragData) config.onHover?.(ctx.state.dragData);
  }, [ctx, config.id]);

  const onPointerExit = useCallback(() => {
    if (ctx?.state.hoveredDropId === config.id) ctx.setHovered(null);
  }, [ctx, config.id]);

  const onPointerUp = useCallback(() => {
    ctx?.endDrag();
  }, [ctx]);

  return {
    isOver: !!isOver,
    canDrop,
    dropHandlers: { onPointerEnter, onPointerExit, onPointerUp },
  };
}

// ── useDragDrop (convenience) ─────────────────────────────

export function useDragDropState() {
  const ctx = useContext(DragDropCtx);
  return ctx?.state ?? { isDragging: false, dragData: null, dragPosition: { x: 0, y: 0 }, hoveredDropId: null };
}
