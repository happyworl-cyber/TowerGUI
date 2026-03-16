import type { IEngineAdapter } from './IEngineAdapter';
import type { EngineNode } from './types';

/**
 * Object pool for engine nodes. Recycles GameObjects instead of Destroy/Instantiate.
 * Dramatically reduces GC pressure for scrolling lists and frequently toggled UI.
 */
export class NodePool {
  private pools = new Map<string, EngineNode[]>();
  private adapter: IEngineAdapter;
  private maxPerType: number;
  private _acquireCount = 0;
  private _recycleCount = 0;
  private _missCount = 0;

  constructor(adapter: IEngineAdapter, maxPerType: number = 50) {
    this.adapter = adapter;
    this.maxPerType = maxPerType;
  }

  acquire(type: string): EngineNode {
    this._acquireCount++;
    const pool = this.pools.get(type);
    if (pool && pool.length > 0) {
      const node = pool.pop()!;
      // Re-activate recycled node
      if (this.adapter.applyProps) {
        this.adapter.applyProps(node, {}, { visible: true }, ['visible']);
      }
      return node;
    }

    this._missCount++;
    return this.adapter.createElement(type);
  }

  recycle(type: string, node: EngineNode): void {
    this._recycleCount++;
    let pool = this.pools.get(type);
    if (!pool) {
      pool = [];
      this.pools.set(type, pool);
    }

    if (pool.length >= this.maxPerType) {
      try {
        const root = this.adapter.getRootContainer();
        this.adapter.removeChild(root, node);
      } catch { /* node already detached */ }
      return;
    }

    // Deactivate and detach
    if (this.adapter.applyProps) {
      this.adapter.applyProps(node, {}, { visible: false }, ['visible']);
    }
    pool.push(node);
  }

  /**
   * Pre-warm the pool by creating nodes ahead of time.
   */
  prewarm(type: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const node = this.adapter.createElement(type);
      this.recycle(type, node);
    }
  }

  clear(): void {
    this.pools.clear();
  }

  get stats() {
    let totalPooled = 0;
    for (const pool of this.pools.values()) totalPooled += pool.length;
    return {
      acquireCount: this._acquireCount,
      recycleCount: this._recycleCount,
      missCount: this._missCount,
      hitRate: this._acquireCount > 0 ? ((this._acquireCount - this._missCount) / this._acquireCount * 100).toFixed(1) + '%' : '0%',
      totalPooled,
      types: this.pools.size,
    };
  }
}
