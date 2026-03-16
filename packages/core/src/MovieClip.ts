import { useState, useEffect, useRef } from 'react';

/**
 * MovieClip — frame-based sprite animation.
 *
 * Usage:
 *   const frame = useMovieClip({ frames: ['f1','f2','f3'], fps: 12, loop: true });
 *   <ui-image src={frame} />
 */

export interface MovieClipConfig {
  /** Array of frame sprite paths */
  frames: string[];
  /** Frames per second */
  fps?: number;
  /** Loop animation */
  loop?: boolean;
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Callback when animation completes (non-loop) */
  onComplete?: () => void;
}

export interface MovieClipReturn {
  /** Current frame sprite path */
  currentFrame: string;
  /** Current frame index */
  frameIndex: number;
  /** Whether animation is playing */
  playing: boolean;
  /** Control methods */
  play: () => void;
  pause: () => void;
  stop: () => void;
  gotoAndPlay: (frame: number) => void;
  gotoAndStop: (frame: number) => void;
}

export function useMovieClip(config: MovieClipConfig): MovieClipReturn {
  const { frames, fps = 12, loop = true, autoPlay = true, onComplete } = config;
  const safeFps = Math.max(1, fps);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const intervalRef = useRef<any>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!playing || frames.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const ms = 1000 / safeFps;
    intervalRef.current = setInterval(() => {
      frameRef.current++;
      if (frameRef.current >= frames.length) {
        if (loop) {
          frameRef.current = 0;
        } else {
          frameRef.current = frames.length - 1;
          setPlaying(false);
          onComplete?.();
          clearInterval(intervalRef.current);
          return;
        }
      }
      setFrameIndex(frameRef.current);
    }, ms);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, fps, frames.length, loop]);

  return {
    currentFrame: frames[frameIndex] ?? '',
    frameIndex,
    playing,
    play: () => { setPlaying(true); },
    pause: () => { setPlaying(false); },
    stop: () => { setPlaying(false); frameRef.current = 0; setFrameIndex(0); },
    gotoAndPlay: (f: number) => { const safe = Math.max(0, Math.min(f, frames.length - 1)); frameRef.current = safe; setFrameIndex(safe); setPlaying(true); },
    gotoAndStop: (f: number) => { const safe = Math.max(0, Math.min(f, frames.length - 1)); frameRef.current = safe; setFrameIndex(safe); setPlaying(false); },
  };
}
