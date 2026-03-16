declare const CS: any;

const SoundBridge = typeof CS !== 'undefined' ? CS?.TowerUI?.SoundBridge : null;

/**
 * UI Sound Manager — wraps C# SoundBridge for playing UI audio effects.
 *
 * Usage:
 *   SoundManager.play('btn_click');       // plays Resources/Audio/btn_click
 *   SoundManager.setVolume(0.5);
 *   SoundManager.mute(true);
 */
export const SoundManager = {
  /**
   * Play a one-shot UI sound effect.
   * @param path - Relative to Resources/Audio/ (no extension)
   * @param volume - 0..1, multiplied by master volume
   */
  play(path: string, volume: number = 1): void {
    if (!SoundBridge) return;
    try { SoundBridge.Play(path, volume); } catch { /* no-op */ }
  },

  setVolume(vol: number): void {
    if (SoundBridge) SoundBridge.SetMasterVolume(vol);
  },

  getVolume(): number {
    return SoundBridge ? SoundBridge.GetMasterVolume() : 1;
  },

  mute(muted: boolean): void {
    if (SoundBridge) SoundBridge.SetMuted(muted);
  },

  isMuted(): boolean {
    return SoundBridge ? SoundBridge.IsMuted() : false;
  },

  stopAll(): void {
    if (SoundBridge) SoundBridge.StopAll();
  },
};
