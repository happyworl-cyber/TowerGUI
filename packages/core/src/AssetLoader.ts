import { useState, useEffect } from 'react';

declare const CS: any;

type Sprite = any;
type AudioClip = any;

function getAM(): any {
  if (typeof CS === 'undefined') return null;
  return CS?.TowerUI?.AssetManager ?? null;
}

export interface AssetState<T> {
  asset: T | null;
  loading: boolean;
  error: string | null;
}

export function loadSprite(path: string): Sprite | null {
  const am = getAM();
  if (!am) return null;
  return am.LoadSprite(path);
}

export function loadSpriteFromAtlas(atlasPath: string, spriteName: string): Sprite | null {
  const am = getAM();
  if (!am) return null;
  return am.LoadSpriteFromAtlas(atlasPath, spriteName);
}

export function applySpriteWithSlice(
  go: any, sprite: Sprite,
  sliceLeft = 0, sliceRight = 0, sliceTop = 0, sliceBottom = 0,
): void {
  const am = getAM();
  if (!am) return;
  am.SetSpriteWithSlice(go, sprite, sliceLeft, sliceRight, sliceTop, sliceBottom);
}

export function loadAudio(path: string): AudioClip | null {
  const am = getAM();
  if (!am) return null;
  return am.LoadAudio(path);
}

export function useSprite(path: string | undefined): AssetState<Sprite> {
  const [state, setState] = useState<AssetState<Sprite>>(() => {
    if (!path) return { asset: null, loading: false, error: null };
    try {
      const sprite = loadSprite(path);
      return { asset: sprite, loading: false, error: sprite ? null : `Sprite not found: ${path}` };
    } catch (e: any) {
      return { asset: null, loading: false, error: e.message };
    }
  });

  useEffect(() => {
    if (!path) {
      setState({ asset: null, loading: false, error: null });
      return;
    }
    try {
      const sprite = loadSprite(path);
      setState({ asset: sprite, loading: false, error: sprite ? null : `Sprite not found: ${path}` });
    } catch (e: any) {
      setState({ asset: null, loading: false, error: e.message });
    }
  }, [path]);

  return state;
}

export function preloadSprites(paths: string[]): void {
  for (const p of paths) loadSprite(p);
}

export function getCacheStats() {
  const am = getAM();
  if (!am) return { sprites: 0, audio: 0 };
  return {
    sprites: am.CachedSpriteCount as number,
    audio: am.CachedAudioCount as number,
  };
}

export function clearCache(): void {
  const am = getAM();
  if (am) am.ClearCache();
}

// ── Addressables Async API ─────────────────────────────

const ASYNC_TIMEOUT = 15000;

export function setUseAddressables(enabled: boolean): void {
  const am = getAM();
  if (am) am.UseAddressables = enabled;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error(`[AssetLoader] ${label} timed out after ${ms}ms`)); }
    }, ms);
    promise.then(v => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(v); }
    }, e => {
      if (!settled) { settled = true; clearTimeout(timer); reject(e); }
    });
  });
}

export function loadSpriteAsync(key: string): Promise<Sprite | null> {
  const am = getAM();
  if (!am) return Promise.resolve(null);
  return withTimeout(
    new Promise<Sprite | null>(resolve => {
      am.LoadSpriteAsync(key, (sprite: Sprite | null) => resolve(sprite));
    }),
    ASYNC_TIMEOUT,
    `LoadSpriteAsync(${key})`,
  );
}

export function loadAudioAsync(key: string): Promise<AudioClip | null> {
  const am = getAM();
  if (!am) return Promise.resolve(null);
  return withTimeout(
    new Promise<AudioClip | null>(resolve => {
      am.LoadAudioAsync(key, (clip: AudioClip | null) => resolve(clip));
    }),
    ASYNC_TIMEOUT,
    `LoadAudioAsync(${key})`,
  );
}

export function releaseAsset(key: string): void {
  const am = getAM();
  if (am) am.ReleaseAsset(key);
}

export function useSpriteAsync(key: string | undefined): AssetState<Sprite> {
  const [state, setState] = useState<AssetState<Sprite>>({
    asset: null, loading: !!key, error: null,
  });

  useEffect(() => {
    if (!key) {
      setState({ asset: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: null }));
    loadSpriteAsync(key).then(sprite => {
      if (cancelled) return;
      setState({
        asset: sprite,
        loading: false,
        error: sprite ? null : `Sprite not found: ${key}`,
      });
    }).catch((e: Error) => {
      if (cancelled) return;
      setState({ asset: null, loading: false, error: e.message });
    });
    return () => {
      cancelled = true;
      releaseAsset(key);
    };
  }, [key]);

  return state;
}
