import { useState, useEffect, useRef, useCallback } from 'react';

export interface CountdownConfig {
  /** Target timestamp (ms since epoch) */
  target?: number;
  /** Duration in seconds (alternative to target) */
  duration?: number;
  /** Update interval in ms (default 1000, min 50) */
  interval?: number;
  /** Auto-start (default true) */
  autoStart?: boolean;
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
}

export interface CountdownReturn {
  remaining: number;
  formatted: string;
  formattedLong: string;
  isRunning: boolean;
  isComplete: boolean;
  progress: number;
  start: () => void;
  pause: () => void;
  reset: (newDuration?: number) => void;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatTimeLong(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return d > 0 ? `${d}d ${time}` : time;
}

export function useCountdown(config: CountdownConfig): CountdownReturn {
  const {
    target,
    duration,
    interval: rawInterval = 1000,
    autoStart = true,
    onTick,
    onComplete,
  } = config;

  const interval = Math.max(50, rawInterval);
  const totalDuration = useRef(duration ?? 0);
  const startTimeRef = useRef(Date.now());
  const startRemainingRef = useRef(0);

  const calcRemaining = useCallback(() => {
    if (target != null) {
      return Math.max(0, Math.ceil((target - Date.now()) / 1000));
    }
    return Math.max(0, totalDuration.current);
  }, [target]);

  const [remaining, setRemaining] = useState(calcRemaining);
  const [isRunning, setIsRunning] = useState(autoStart);
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  onTickRef.current = onTick;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;

    startTimeRef.current = Date.now();
    startRemainingRef.current = remaining;

    const timer = setInterval(() => {
      let next: number;
      if (target != null) {
        next = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      } else {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        next = Math.max(0, Math.ceil(startRemainingRef.current - elapsed));
      }
      onTickRef.current?.(next);
      setRemaining(next);
      if (next <= 0) {
        onCompleteRef.current?.();
        setIsRunning(false);
      }
    }, interval);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, remaining <= 0, interval, target]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((newDuration?: number) => {
    if (newDuration != null) totalDuration.current = newDuration;
    setRemaining(target != null
      ? Math.max(0, Math.ceil((target - Date.now()) / 1000))
      : Math.max(0, totalDuration.current));
    setIsRunning(autoStart);
  }, [target, autoStart]);

  const progress = totalDuration.current > 0
    ? 1 - remaining / totalDuration.current
    : (remaining <= 0 ? 1 : 0);

  return {
    remaining,
    formatted: formatTime(remaining),
    formattedLong: formatTimeLong(remaining),
    isRunning,
    isComplete: remaining <= 0,
    progress: Math.max(0, Math.min(1, progress)),
    start,
    pause,
    reset,
  };
}
