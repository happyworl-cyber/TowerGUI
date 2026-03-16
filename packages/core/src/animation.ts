import { useRef, useEffect, useCallback, useState } from 'react';
import { tweenEngine, type TweenConfig, type TweenHandle, type TweenState } from './TweenEngine';
import type { EasingFn, EasingName } from './easing';

// ── useTween ───────────────────────────────────────────────

export interface UseTweenConfig {
  from: number;
  to: number;
  duration: number;
  ease?: EasingName | EasingFn;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  autoPlay?: boolean;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export interface UseTweenReturn {
  value: number;
  state: TweenState;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reverse: () => void;
}

export function useTween(config: UseTweenConfig): UseTweenReturn {
  const [value, setValue] = useState(config.from);
  const [state, setState] = useState<TweenState>('idle');
  const handleRef = useRef<TweenHandle | null>(null);

  useEffect(() => {
    const handle = tweenEngine.create({
      from: config.from,
      to: config.to,
      duration: config.duration,
      ease: config.ease,
      delay: config.delay,
      repeat: config.repeat,
      yoyo: config.yoyo,
      onUpdate: (v) => {
        setValue(v);
        config.onUpdate?.(v);
      },
      onComplete: () => {
        setState('completed');
        config.onComplete?.();
      },
    });
    handleRef.current = handle;

    if (config.autoPlay !== false) {
      handle.play();
      setState('running');
    }

    return () => { handle.stop(); };
  }, [config.from, config.to, config.duration]);

  const play = useCallback(() => { handleRef.current?.play(); setState('running'); }, []);
  const pause = useCallback(() => { handleRef.current?.pause(); setState('paused'); }, []);
  const resume = useCallback(() => { handleRef.current?.resume(); setState('running'); }, []);
  const stop = useCallback(() => { handleRef.current?.stop(); setState('idle'); }, []);
  const reverse = useCallback(() => { handleRef.current?.reverse(); setState('running'); }, []);

  return { value, state, play, pause, resume, stop, reverse };
}

// ── useSpring (simplified spring-like animation) ──────────

export interface UseSpringConfig {
  from: number;
  to: number;
  stiffness?: number;
  damping?: number;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
}

export function useSpring(config: UseSpringConfig): UseTweenReturn {
  return useTween({
    from: config.from,
    to: config.to,
    duration: 600,
    ease: 'easeOutElastic',
    onUpdate: config.onUpdate,
    onComplete: config.onComplete,
  });
}

// ── usePathAnimation ──────────────────────────────────────

export interface PathPoint {
  x: number;
  y: number;
}

export interface UsePathConfig {
  path: PathPoint[];
  duration: number;
  ease?: EasingName | EasingFn;
  loop?: boolean;
  autoPlay?: boolean;
  type?: 'linear' | 'catmullrom' | 'bezier';
  onUpdate?: (point: PathPoint) => void;
  onComplete?: () => void;
}

export interface UsePathReturn {
  point: PathPoint;
  progress: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function samplePath(points: PathPoint[], t: number, type: string): PathPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  if (type === 'catmullrom' && points.length >= 4) {
    const segments = points.length - 1;
    const raw = t * segments;
    const i = Math.min(Math.floor(raw), segments - 1);
    const local = raw - i;

    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    return {
      x: catmullRom(p0.x, p1.x, p2.x, p3.x, local),
      y: catmullRom(p0.y, p1.y, p2.y, p3.y, local),
    };
  }

  if (type === 'bezier' && points.length === 4) {
    return {
      x: cubicBezier(points[0].x, points[1].x, points[2].x, points[3].x, t),
      y: cubicBezier(points[0].y, points[1].y, points[2].y, points[3].y, t),
    };
  }

  // Linear interpolation along segments
  const totalSegments = points.length - 1;
  const raw = t * totalSegments;
  const idx = Math.min(Math.floor(raw), totalSegments - 1);
  const local = raw - idx;
  return {
    x: lerp(points[idx].x, points[idx + 1].x, local),
    y: lerp(points[idx].y, points[idx + 1].y, local),
  };
}

export function usePathAnimation(config: UsePathConfig): UsePathReturn {
  const [point, setPoint] = useState<PathPoint>(config.path[0] ?? { x: 0, y: 0 });
  const [progress, setProgress] = useState(0);
  const handleRef = useRef<TweenHandle | null>(null);

  useEffect(() => {
    const pathType = config.type ?? 'linear';
    const handle = tweenEngine.create({
      from: 0,
      to: 1,
      duration: config.duration,
      ease: config.ease ?? 'easeInOutQuad',
      repeat: config.loop ? -1 : 0,
      onUpdate: (v) => {
        const p = samplePath(config.path, v, pathType);
        setPoint(p);
        setProgress(v);
        config.onUpdate?.(p);
      },
      onComplete: config.onComplete,
    });
    handleRef.current = handle;

    if (config.autoPlay !== false) handle.play();
    return () => { handle.stop(); };
  }, [config.path, config.duration]);

  const play = useCallback(() => handleRef.current?.play(), []);
  const pause = useCallback(() => handleRef.current?.pause(), []);
  const stop = useCallback(() => handleRef.current?.stop(), []);

  return { point, progress, play, pause, stop };
}

// ── useTransition (timeline) ──────────────────────────────

export interface TransitionStep {
  from: number;
  to: number;
  duration: number;
  ease?: EasingName | EasingFn;
  delay?: number;
  property: string;
  onUpdate?: (value: number) => void;
}

export interface UseTransitionConfig {
  steps: TransitionStep[];
  autoPlay?: boolean;
  onComplete?: () => void;
}

export interface UseTransitionReturn {
  values: Record<string, number>;
  play: () => void;
  stop: () => void;
  isPlaying: boolean;
}

export function useTransition(config: UseTransitionConfig): UseTransitionReturn {
  const initValues: Record<string, number> = {};
  for (const s of config.steps) initValues[s.property] = s.from;

  const [values, setValues] = useState(initValues);
  const [isPlaying, setIsPlaying] = useState(false);
  const handlesRef = useRef<TweenHandle[]>([]);

  const play = useCallback(() => {
    for (const h of handlesRef.current) h.stop();
    handlesRef.current = [];

    let completedCount = 0;
    const total = config.steps.length;

    setIsPlaying(true);

    for (const step of config.steps) {
      const handle = tweenEngine.create({
        from: step.from,
        to: step.to,
        duration: step.duration,
        ease: step.ease,
        delay: step.delay,
        onUpdate: (v) => {
          setValues(prev => ({ ...prev, [step.property]: v }));
          step.onUpdate?.(v);
        },
        onComplete: () => {
          completedCount++;
          if (completedCount >= total) {
            setIsPlaying(false);
            config.onComplete?.();
          }
        },
      });
      handle.play();
      handlesRef.current.push(handle);
    }
  }, [config.steps]);

  const stop = useCallback(() => {
    for (const h of handlesRef.current) h.stop();
    handlesRef.current = [];
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (config.autoPlay !== false) play();
    return stop;
  }, []);

  return { values, play, stop, isPlaying };
}

// ── Animation Presets ─────────────────────────────────────

export interface PresetConfig {
  duration?: number;
  delay?: number;
  onComplete?: () => void;
}

export function useFadeIn(config?: PresetConfig) {
  return useTween({
    from: 0, to: 1,
    duration: config?.duration ?? 300,
    delay: config?.delay,
    ease: 'easeOutQuad',
    onComplete: config?.onComplete,
  });
}

export function useFadeOut(config?: PresetConfig) {
  return useTween({
    from: 1, to: 0,
    duration: config?.duration ?? 300,
    delay: config?.delay,
    ease: 'easeInQuad',
    onComplete: config?.onComplete,
  });
}

export function useSlideIn(from: 'left' | 'right' | 'top' | 'bottom', distance: number, config?: PresetConfig) {
  const start = (from === 'left' || from === 'top') ? -distance : distance;
  return useTween({
    from: start, to: 0,
    duration: config?.duration ?? 400,
    delay: config?.delay,
    ease: 'easeOutCubic',
    onComplete: config?.onComplete,
  });
}

export function useScaleIn(config?: PresetConfig) {
  return useTween({
    from: 0, to: 1,
    duration: config?.duration ?? 350,
    delay: config?.delay,
    ease: 'easeOutBack',
    onComplete: config?.onComplete,
  });
}

export function useBounceIn(config?: PresetConfig) {
  return useTween({
    from: 0, to: 1,
    duration: config?.duration ?? 600,
    delay: config?.delay,
    ease: 'easeOutBounce',
    onComplete: config?.onComplete,
  });
}

export function useShake(intensity: number = 10, config?: PresetConfig) {
  return useTween({
    from: -intensity, to: intensity,
    duration: config?.duration ?? 500,
    delay: config?.delay,
    ease: 'easeInOutQuad',
    repeat: 3,
    yoyo: true,
    onComplete: config?.onComplete,
  });
}

export function usePulse(config?: PresetConfig) {
  return useTween({
    from: 1, to: 1.15,
    duration: config?.duration ?? 400,
    ease: 'easeInOutSine',
    repeat: -1,
    yoyo: true,
  });
}

export function useRotateIn(config?: PresetConfig) {
  return useTween({
    from: -180, to: 0,
    duration: config?.duration ?? 500,
    delay: config?.delay,
    ease: 'easeOutBack',
    onComplete: config?.onComplete,
  });
}
