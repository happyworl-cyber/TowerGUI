/**
 * TowerUI DevTools — runtime inspection and profiling.
 */

export interface DevNode {
  type: string;
  props: Record<string, any>;
  children: DevNode[];
  instanceId?: number;
}

export interface PerfSnapshot {
  fps: number;
  jsTimeMs: number;
  bridgeCalls: number;
  nodeCount: number;
  tweenCount: number;
  timestamp: number;
}

let _enabled = false;
let _nodeTree: DevNode | null = null;
let _perfHistory: PerfSnapshot[] = [];
let _bridgeCallCount = 0;
let _nodeCount = 0;
let _onTreeUpdate: ((tree: DevNode) => void) | null = null;

export const DevTools = {
  enable(): void {
    _enabled = true;
    console.log('[DevTools] Enabled');
  },

  disable(): void {
    _enabled = false;
    _nodeTree = null;
    _perfHistory = [];
  },

  get isEnabled(): boolean { return _enabled; },

  setNodeTree(tree: DevNode): void {
    if (!_enabled) return;
    _nodeTree = tree;
    _onTreeUpdate?.(tree);
  },

  getNodeTree(): DevNode | null { return _nodeTree; },

  onTreeUpdate(fn: (tree: DevNode) => void): void {
    _onTreeUpdate = fn;
  },

  incrementBridgeCalls(): void {
    if (_enabled) _bridgeCallCount++;
  },

  setNodeCount(count: number): void {
    _nodeCount = count;
  },

  recordFrame(fps: number, jsTimeMs: number, tweenCount: number): void {
    if (!_enabled) return;
    const snapshot: PerfSnapshot = {
      fps, jsTimeMs,
      bridgeCalls: _bridgeCallCount,
      nodeCount: _nodeCount,
      tweenCount,
      timestamp: Date.now(),
    };
    _perfHistory.push(snapshot);
    if (_perfHistory.length > 300) _perfHistory.shift(); // keep 5 seconds at 60fps
    _bridgeCallCount = 0;
  },

  getPerfHistory(): PerfSnapshot[] { return _perfHistory; },

  getLatestPerf(): PerfSnapshot | null {
    return _perfHistory.length > 0 ? _perfHistory[_perfHistory.length - 1] : null;
  },

  printTree(node?: DevNode, depth: number = 0): void {
    const n = node ?? _nodeTree;
    if (!n) { console.log('[DevTools] No tree available'); return; }

    const indent = '  '.repeat(depth);
    const propsStr = Object.entries(n.props)
      .filter(([k]) => k !== 'children')
      .slice(0, 5)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : v}`)
      .join(' ');

    console.log(`${indent}<${n.type} ${propsStr}>`);
    for (const child of n.children) {
      this.printTree(child, depth + 1);
    }
  },

  printPerf(): void {
    const p = this.getLatestPerf();
    if (!p) { console.log('[DevTools] No perf data'); return; }
    console.log(`[Perf] FPS:${p.fps.toFixed(0)} JS:${p.jsTimeMs.toFixed(1)}ms Bridge:${p.bridgeCalls} Nodes:${p.nodeCount} Tweens:${p.tweenCount}`);
  },
};
