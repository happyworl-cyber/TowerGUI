import { resolveEasing, type EasingFn, type EasingName } from './easing';

export interface TweenConfig {
  from: number;
  to: number;
  duration: number;
  ease?: EasingName | EasingFn;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export type TweenState = 'idle' | 'running' | 'paused' | 'completed';

export interface TweenHandle {
  play(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  reverse(): void;
  seek(time: number): void;
  readonly state: TweenState;
  readonly value: number;
  readonly progress: number;
}

interface ActiveTween {
  id: number;
  config: TweenConfig;
  easeFn: EasingFn;
  state: TweenState;
  elapsed: number;
  value: number;
  repeatCount: number;
  reversed: boolean;
}

let _nextId = 1;

export class TweenEngine {
  private tweens = new Map<number, ActiveTween>();
  private _running = false;
  private _lastTime = 0;
  private _updateFn: ((dt: number) => void) | null = null;

  create(config: TweenConfig): TweenHandle {
    const id = _nextId++;
    const tween: ActiveTween = {
      id,
      config,
      easeFn: resolveEasing(config.ease ?? 'easeOutQuad'),
      state: 'idle',
      elapsed: -(config.delay ?? 0),
      value: config.from,
      repeatCount: 0,
      reversed: false,
    };

    this.tweens.set(id, tween);

    const handle: TweenHandle = {
      play: () => {
        tween.state = 'running';
        tween.elapsed = -(config.delay ?? 0);
        tween.repeatCount = 0;
        tween.reversed = false;
        this.ensureRunning();
      },
      pause: () => {
        if (tween.state === 'running') tween.state = 'paused';
      },
      resume: () => {
        if (tween.state === 'paused') {
          tween.state = 'running';
          this.ensureRunning();
        }
      },
      stop: () => {
        tween.state = 'idle';
        tween.elapsed = 0;
        tween.value = config.from;
        this.tweens.delete(id);
      },
      reverse: () => {
        tween.reversed = !tween.reversed;
        if (tween.state !== 'running') {
          tween.state = 'running';
          this.ensureRunning();
        }
      },
      seek: (time: number) => {
        tween.elapsed = time;
        this.updateTween(tween, 0);
      },
      get state() { return tween.state; },
      get value() { return tween.value; },
      get progress() { return config.duration > 0 ? Math.max(0, Math.min(1, tween.elapsed / config.duration)) : 1; },
    };

    return handle;
  }

  remove(id: number): void {
    this.tweens.delete(id);
  }

  tick(dt: number): void {
    const toRemove: number[] = [];
    for (const tween of this.tweens.values()) {
      if (tween.state === 'running') {
        this.updateTween(tween, dt);
      } else if (tween.state === 'completed') {
        toRemove.push(tween.id);
      }
    }
    for (const id of toRemove) {
      this.tweens.delete(id);
    }
  }

  setUpdateCallback(fn: (dt: number) => void): void {
    this._updateFn = fn;
  }

  get activeTweenCount(): number {
    let count = 0;
    for (const t of this.tweens.values()) {
      if (t.state === 'running') count++;
    }
    return count;
  }

  dispose(): void {
    this.tweens.clear();
    this._running = false;
  }

  private updateTween(tween: ActiveTween, dt: number): void {
    const { config, easeFn } = tween;
    tween.elapsed += dt;

    if (tween.elapsed < 0) return; // still in delay

    const safeDur = config.duration > 0 ? config.duration : 1;
    const progress = Math.min(tween.elapsed / safeDur, 1);
    const directed = tween.reversed ? 1 - progress : progress;
    const yoyoDir = (config.yoyo && tween.repeatCount % 2 === 1) ? 1 - directed : directed;
    const eased = easeFn(yoyoDir);
    tween.value = config.from + (config.to - config.from) * eased;

    config.onUpdate?.(tween.value);

    if (progress >= 1) {
      const maxRepeat = config.repeat ?? 0;
      if (maxRepeat === -1 || tween.repeatCount < maxRepeat) {
        tween.repeatCount++;
        tween.elapsed = 0;
      } else {
        tween.state = 'completed';
        tween.value = tween.reversed ? config.from : config.to;
        config.onUpdate?.(tween.value);
        config.onComplete?.();
      }
    }
  }

  private ensureRunning(): void {
    // Engine needs an external tick — no internal loop needed
    // The adapter calls tick() each frame
  }
}

export const tweenEngine = new TweenEngine();
