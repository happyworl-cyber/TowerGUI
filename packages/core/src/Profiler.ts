/**
 * Performance profiler for TowerUI.
 * Tracks frame times, bridge calls, node counts, and memory.
 */

export interface ProfileFrame {
  timestamp: number;
  frameTimeMs: number;
  fps: number;
  bridgeCalls: number;
  nodeCount: number;
  layoutTimeMs: number;
  renderTimeMs: number;
}

export interface ProfilerAPI {
  /** Start profiling */
  start(): void;
  /** Stop profiling */
  stop(): void;
  /** Record a frame */
  recordFrame(data: Partial<ProfileFrame>): void;
  /** Get last N frames */
  getHistory(count?: number): ProfileFrame[];
  /** Get average stats over last N frames */
  getAverageStats(count?: number): {
    avgFps: number;
    avgFrameTime: number;
    avgBridgeCalls: number;
    avgNodeCount: number;
    maxFrameTime: number;
    minFps: number;
  };
  /** Generate human-readable report */
  report(): string;
  /** Reset all recorded data */
  reset(): void;
  /** Whether profiler is active */
  readonly active: boolean;
}

export class Profiler implements ProfilerAPI {
  private history: ProfileFrame[] = [];
  private maxHistory = 600; // ~10 seconds at 60fps
  private _active = false;
  private _bridgeCallCount = 0;
  private _nodeCount = 0;
  private _lastFrameTime = 0;

  get active(): boolean { return this._active; }

  start(): void {
    this._active = true;
    this._lastFrameTime = Date.now();
  }

  stop(): void {
    this._active = false;
  }

  /** Increment bridge call counter (call from adapter) */
  countBridgeCall(): void {
    this._bridgeCallCount++;
  }

  /** Set current node count */
  setNodeCount(count: number): void {
    this._nodeCount = count;
  }

  recordFrame(data: Partial<ProfileFrame> = {}): void {
    if (!this._active) return;

    const now = Date.now();
    const dt = now - this._lastFrameTime;
    this._lastFrameTime = now;

    const frame: ProfileFrame = {
      timestamp: now,
      frameTimeMs: data.frameTimeMs ?? dt,
      fps: dt > 0 ? 1000 / dt : 60,
      bridgeCalls: data.bridgeCalls ?? this._bridgeCallCount,
      nodeCount: data.nodeCount ?? this._nodeCount,
      layoutTimeMs: data.layoutTimeMs ?? 0,
      renderTimeMs: data.renderTimeMs ?? 0,
    };

    this.history.push(frame);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this._bridgeCallCount = 0;
  }

  getHistory(count: number = 60): ProfileFrame[] {
    return this.history.slice(-count);
  }

  getAverageStats(count: number = 60) {
    const frames = this.getHistory(count);
    if (frames.length === 0) {
      return { avgFps: 0, avgFrameTime: 0, avgBridgeCalls: 0, avgNodeCount: 0, maxFrameTime: 0, minFps: 0 };
    }

    let totalFps = 0, totalFt = 0, totalBc = 0, totalNc = 0;
    let maxFt = 0, minFps = Infinity;

    for (const f of frames) {
      totalFps += f.fps;
      totalFt += f.frameTimeMs;
      totalBc += f.bridgeCalls;
      totalNc += f.nodeCount;
      if (f.frameTimeMs > maxFt) maxFt = f.frameTimeMs;
      if (f.fps < minFps) minFps = f.fps;
    }

    const n = frames.length;
    return {
      avgFps: Math.round(totalFps / n),
      avgFrameTime: +(totalFt / n).toFixed(1),
      avgBridgeCalls: Math.round(totalBc / n),
      avgNodeCount: Math.round(totalNc / n),
      maxFrameTime: +maxFt.toFixed(1),
      minFps: Math.round(minFps),
    };
  }

  report(): string {
    const s = this.getAverageStats();
    const lines = [
      '=== TowerUI Profiler Report ===',
      `  Avg FPS:         ${s.avgFps}`,
      `  Min FPS:         ${s.minFps}`,
      `  Avg Frame Time:  ${s.avgFrameTime}ms`,
      `  Max Frame Time:  ${s.maxFrameTime}ms`,
      `  Avg Bridge Calls:${s.avgBridgeCalls}/frame`,
      `  Avg Node Count:  ${s.avgNodeCount}`,
      `  Frames Recorded: ${this.history.length}`,
    ];
    return lines.join('\n');
  }

  reset(): void {
    this.history = [];
    this._bridgeCallCount = 0;
    this._nodeCount = 0;
  }
}

/** Global profiler instance */
export const profiler = new Profiler();
