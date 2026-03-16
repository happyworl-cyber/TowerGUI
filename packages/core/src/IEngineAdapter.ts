import type { EngineNode } from './types';

/**
 * Interface that each engine adapter must implement.
 * The Reconciler drives the UI tree through these methods.
 */
export interface IEngineAdapter {
  createElement(type: string): EngineNode;
  createText(text: string): EngineNode;

  appendChild(parent: EngineNode, child: EngineNode): void;
  insertBefore(parent: EngineNode, child: EngineNode, before: EngineNode): void;
  removeChild(parent: EngineNode, child: EngineNode): void;
  clearChildren(container: EngineNode): void;

  applyProps(node: EngineNode, oldProps: Record<string, any>, newProps: Record<string, any>, diff?: string[]): void;
  updateText(node: EngineNode, text: string): void;

  getRootContainer(): EngineNode;

  applyLayout?(node: EngineNode, layout: { left: number; top: number; width: number; height: number }): void;

  /** Scroll a ScrollRect node to a given pixel offset */
  scrollTo?(node: EngineNode, x: number, y: number): void;
  /** Get content size of a ScrollRect */
  getScrollContentSize?(node: EngineNode): { width: number; height: number };
}
