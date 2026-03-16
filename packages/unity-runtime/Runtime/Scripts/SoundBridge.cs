using UnityEngine;
using System.Collections.Generic;

namespace TowerUI
{
    public static class SoundBridge
    {
        private static GameObject _soundRoot;
        private static readonly List<AudioSource> _pool = new();
        private static float _masterVolume = 1f;
        private static bool _muted;
        private const int POOL_SIZE = 8;

        private static void EnsureInit()
        {
            if (_soundRoot != null) return;
            _soundRoot = new GameObject("[TowerUI] SoundManager");
            Object.DontDestroyOnLoad(_soundRoot);
            for (int i = 0; i < POOL_SIZE; i++)
            {
                var src = _soundRoot.AddComponent<AudioSource>();
                src.playOnAwake = false;
                _pool.Add(src);
            }
        }

        public static void Play(string path, float volume = 1f)
        {
            if (_muted || string.IsNullOrEmpty(path)) return;

            var clip = AssetManager.LoadAudio(path);
            if (clip == null) return;

            PlayClip(clip, volume);
        }

        public static void PlayClip(AudioClip clip, float volume = 1f)
        {
            if (_muted || clip == null) return;
            EnsureInit();

            var src = GetAvailableSource();
            if (src == null) return;
            src.volume = Mathf.Clamp01(volume) * _masterVolume;
            src.PlayOneShot(clip);
        }

        public static void SetMasterVolume(float vol)
        {
            _masterVolume = Mathf.Clamp01(vol);
        }

        public static float GetMasterVolume() => _masterVolume;
        public static void SetMuted(bool muted) => _muted = muted;
        public static bool IsMuted() => _muted;

        public static void StopAll()
        {
            foreach (var src in _pool)
            {
                if (src != null) src.Stop();
            }
        }

        public static void Shutdown()
        {
            StopAll();
            _pool.Clear();
            if (_soundRoot != null)
            {
                Object.Destroy(_soundRoot);
                _soundRoot = null;
            }
        }

        private static AudioSource GetAvailableSource()
        {
            for (int i = 0; i < _pool.Count; i++)
            {
                if (_pool[i] == null) continue;
                if (!_pool[i].isPlaying) return _pool[i];
            }
            if (_pool.Count > 0 && _pool[0] != null) return _pool[0];
            return null;
        }
    }
}
