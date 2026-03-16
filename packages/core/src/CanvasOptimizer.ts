import type { EngineNode } from './types';

/**
 * Canvas optimization utilities for reducing UGUI rebuild overhead.
 */

export interface UpdateStats {
  frameUpdates: number;
  coalescedUpdates: number;
  subCanvasCount: number;
}

/**
 * UpdateCoalescer — batches multiple property changes in a single frame
 * into one applyProps call, reducing Canvas.BuildBatch invocations.
 */
export class UpdateCoalescer {
  private pending = new Map<EngineNode, Map<string, any>>();
  private _frameUpdates = 0;
  private _coalescedUpdates = 0;

  enqueue(node: EngineNode, key: string, value: any): void {
    let props = this.pending.get(node);
    if (!props) {
      props = new Map();
      this.pending.set(node, props);
    }
    props.set(key, value);
    this._frameUpdates++;
  }

  flush(applyFn: (node: EngineNode, props: Record<string, any>, keys: string[]) => void): void {
    for (const [node, propsMap] of this.pending) {
      const props: Record<string, any> = {};
      const keys: string[] = [];
      for (const [k, v] of propsMap) {
        props[k] = v;
        keys.push(k);
      }
      applyFn(node, props, keys);
      this._coalescedUpdates++;
    }
    this.pending.clear();
  }

  get hasPending(): boolean {
    return this.pending.size > 0;
  }

  get stats(): UpdateStats {
    return {
      frameUpdates: this._frameUpdates,
      coalescedUpdates: this._coalescedUpdates,
      subCanvasCount: 0,
    };
  }

  resetStats(): void {
    this._frameUpdates = 0;
    this._coalescedUpdates = 0;
  }
}

/**
 * SubCanvasManager — tracks which nodes are updated frequently
 * and suggests promoting them to separate sub-canvases.
 *
 * In Unity, each Canvas triggers a full rebuild when any child changes.
 * Moving high-frequency nodes to sub-canvases isolates the rebuild scope.
 */
export class SubCanvasManager {
  private updateCounts = new Map<EngineNode, number>();
  private threshold: number;
  private promoted = new Set<EngineNode>();

  constructor(threshold: number = 10) {
    this.threshold = threshold;
  }

  recordUpdate(node: EngineNode): void {
    const count = (this.updateCounts.get(node) ?? 0) + 1;
    this.updateCounts.set(node, count);
  }

  /**
   * Call once per second (or every N frames) to evaluate which nodes
   * should be promoted to sub-canvases.
   */
  evaluate(): EngineNode[] {
    const toPromote: EngineNode[] = [];
    for (const [node, count] of this.updateCounts) {
      if (count >= this.threshold && !this.promoted.has(node)) {
        toPromote.push(node);
        this.promoted.add(node);
      }
    }
    this.updateCounts.clear();
    return toPromote;
  }

  get promotedCount(): number {
    return this.promoted.size;
  }
}

/**
 * DrawCallOptimizer — sorts sibling nodes by material/texture
 * to maximize UGUI batching opportunities.
 */
export interface BatchHint {
  materialId: number;
  textureId: number;
}

export function sortForBatching(nodes: EngineNode[], getHint: (node: EngineNode) => BatchHint): EngineNode[] {
  return [...nodes].sort((a, b) => {
    const ha = getHint(a);
    const hb = getHint(b);
    if (ha.materialId !== hb.materialId) return ha.materialId - hb.materialId;
    return ha.textureId - hb.textureId;
  });
}
