using UnityEngine;
using UnityEngine.U2D;
using System;
using System.Collections.Generic;
#if TOWER_USE_ADDRESSABLES
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;
#endif

namespace TowerUI
{
    public static class AssetManager
    {
        private static readonly Dictionary<string, Sprite> _spriteCache = new();
        private static readonly Dictionary<string, AudioClip> _audioCache = new();
        private static readonly Dictionary<string, SpriteAtlas> _atlasCache = new();
        private static readonly Dictionary<string, UnityEngine.Object> _addressableCache = new();
        private static readonly HashSet<int> _createdSpriteIds = new();

        private const string UI_ROOT = "UI/";
        private const string AUDIO_ROOT = "Audio/";

        /** Set to true to prefer Addressables over Resources.Load */
        public static bool UseAddressables { get; set; } = false;

        public static Sprite LoadSprite(string path)
        {
            if (string.IsNullOrEmpty(path)) return null;

            if (_spriteCache.TryGetValue(path, out var cached))
                return cached;

            var sprite = Resources.Load<Sprite>(UI_ROOT + path);

            if (sprite == null)
            {
                var tex = Resources.Load<Texture2D>(UI_ROOT + path);
                if (tex != null)
                {
                    sprite = Sprite.Create(tex,
                        new Rect(0, 0, tex.width, tex.height),
                        new Vector2(0.5f, 0.5f), 100f);
                    _createdSpriteIds.Add(sprite.GetInstanceID());
                }
            }

            if (sprite != null)
                _spriteCache[path] = sprite;

            return sprite;
        }

        public static Sprite LoadSpriteFromAtlas(string atlasPath, string spriteName)
        {
            if (string.IsNullOrEmpty(atlasPath) || string.IsNullOrEmpty(spriteName)) return null;

            var cacheKey = atlasPath + ":" + spriteName;
            if (_spriteCache.TryGetValue(cacheKey, out var cached))
                return cached;

            if (!_atlasCache.TryGetValue(atlasPath, out var atlas))
            {
                atlas = Resources.Load<SpriteAtlas>(UI_ROOT + atlasPath);
                if (atlas != null)
                    _atlasCache[atlasPath] = atlas;
            }

            if (atlas == null) return null;

            var sprite = atlas.GetSprite(spriteName);
            if (sprite != null)
                _spriteCache[cacheKey] = sprite;

            return sprite;
        }

        public static void SetSpriteWithSlice(GameObject go, Sprite sprite,
            float sliceLeft, float sliceRight, float sliceTop, float sliceBottom)
        {
            if (go == null) return;
            var img = go.GetComponent<UnityEngine.UI.Image>();
            if (img == null) return;

            img.sprite = sprite;

            bool hasSlice = sliceLeft > 0 || sliceRight > 0 || sliceTop > 0 || sliceBottom > 0;
            if (hasSlice && sprite != null)
            {
                img.type = UnityEngine.UI.Image.Type.Sliced;
                if (sprite.border == Vector4.zero)
                {
                    var tex = sprite.texture;
                    if (tex == null) return;
                    var rect = sprite.rect;
                    if (rect.width <= 0 || rect.height <= 0) return;

                    var sliceKey = $"__slice_{sprite.GetInstanceID()}:{sliceLeft},{sliceRight},{sliceTop},{sliceBottom}";
                    if (!_spriteCache.TryGetValue(sliceKey, out var slicedSprite))
                    {
                        var border = new Vector4(sliceLeft, sliceBottom, sliceRight, sliceTop);
                        var pivot = new Vector2(
                            rect.width > 0 ? sprite.pivot.x / rect.width : 0.5f,
                            rect.height > 0 ? sprite.pivot.y / rect.height : 0.5f);
                        slicedSprite = Sprite.Create(tex, rect, pivot, sprite.pixelsPerUnit, 0,
                            SpriteMeshType.FullRect, border);
                        _createdSpriteIds.Add(slicedSprite.GetInstanceID());
                        _spriteCache[sliceKey] = slicedSprite;
                    }
                    img.sprite = slicedSprite;
                }
            }
            else if (sprite != null && sprite.border != Vector4.zero)
            {
                img.type = UnityEngine.UI.Image.Type.Sliced;
            }
            else
            {
                img.type = UnityEngine.UI.Image.Type.Simple;
                img.preserveAspect = true;
            }
        }

        public static AudioClip LoadAudio(string path)
        {
            if (string.IsNullOrEmpty(path)) return null;

            if (_audioCache.TryGetValue(path, out var cached))
                return cached;

            var clip = Resources.Load<AudioClip>(AUDIO_ROOT + path);
            if (clip != null)
                _audioCache[path] = clip;

            return clip;
        }

        // ── Addressables Async API ────────────────────────────

        /**
         * Load a sprite by Addressables key. onLoaded(sprite) is called on main thread.
         * Falls back to Resources.Load if Addressables is not enabled.
         */
        public static void LoadSpriteAsync(string key, Action<Sprite> onLoaded)
        {
            if (string.IsNullOrEmpty(key)) { onLoaded?.Invoke(null); return; }

            if (_spriteCache.TryGetValue(key, out var cached)) { onLoaded?.Invoke(cached); return; }

#if TOWER_USE_ADDRESSABLES
            if (UseAddressables)
            {
                if (_addressableCache.TryGetValue(key, out var obj) && obj is Sprite s)
                {
                    _spriteCache[key] = s;
                    onLoaded?.Invoke(s);
                    return;
                }
                var handle = Addressables.LoadAssetAsync<Sprite>(key);
                handle.Completed += op =>
                {
                    if (op.Status == AsyncOperationStatus.Succeeded && op.Result != null)
                    {
                        _spriteCache[key] = op.Result;
                        _addressableCache[key] = op.Result;
                        onLoaded?.Invoke(op.Result);
                    }
                    else
                    {
                        Debug.LogWarning($"[TowerUI] Addressables load failed: {key}");
                        onLoaded?.Invoke(null);
                    }
                };
                return;
            }
#endif
            var sprite = LoadSprite(key);
            onLoaded?.Invoke(sprite);
        }

        /**
         * Load an audio clip by Addressables key.
         */
        public static void LoadAudioAsync(string key, Action<AudioClip> onLoaded)
        {
            if (string.IsNullOrEmpty(key)) { onLoaded?.Invoke(null); return; }

            if (_audioCache.TryGetValue(key, out var cached)) { onLoaded?.Invoke(cached); return; }

#if TOWER_USE_ADDRESSABLES
            if (UseAddressables)
            {
                var handle = Addressables.LoadAssetAsync<AudioClip>(key);
                handle.Completed += op =>
                {
                    if (op.Status == AsyncOperationStatus.Succeeded && op.Result != null)
                    {
                        _audioCache[key] = op.Result;
                        _addressableCache[key] = op.Result;
                        onLoaded?.Invoke(op.Result);
                    }
                    else
                    {
                        Debug.LogWarning($"[TowerUI] Addressables audio load failed: {key}");
                        onLoaded?.Invoke(null);
                    }
                };
                return;
            }
#endif
            var clip = LoadAudio(key);
            onLoaded?.Invoke(clip);
        }

        /**
         * Load any asset by Addressables key (GameObject, ScriptableObject, etc).
         */
        public static void LoadAssetAsync<T>(string key, Action<T> onLoaded) where T : UnityEngine.Object
        {
            if (string.IsNullOrEmpty(key)) { onLoaded?.Invoke(null); return; }

            if (_addressableCache.TryGetValue(key, out var cached) && cached is T t)
            {
                onLoaded?.Invoke(t);
                return;
            }

#if TOWER_USE_ADDRESSABLES
            if (UseAddressables)
            {
                var handle = Addressables.LoadAssetAsync<T>(key);
                handle.Completed += op =>
                {
                    if (op.Status == AsyncOperationStatus.Succeeded && op.Result != null)
                    {
                        _addressableCache[key] = op.Result;
                        onLoaded?.Invoke(op.Result);
                    }
                    else
                    {
                        Debug.LogWarning($"[TowerUI] Addressables load failed: {key} ({typeof(T).Name})");
                        onLoaded?.Invoke(null);
                    }
                };
                return;
            }
#endif
            var asset = Resources.Load<T>(key);
            onLoaded?.Invoke(asset);
        }

        /**
         * Release an Addressables asset by key to free memory.
         */
        public static void ReleaseAsset(string key)
        {
            if (string.IsNullOrEmpty(key)) return;

            // Also release any slice sprites derived from this key
            var slicePrefix = $"__slice_";
            var keysToRemove = new List<string>();
            foreach (var kv in _spriteCache)
            {
                if (kv.Key == key || kv.Key.StartsWith(slicePrefix))
                {
                    if (IsCreatedSprite(kv.Value))
                        UnityEngine.Object.Destroy(kv.Value);
                    keysToRemove.Add(kv.Key);
                }
            }
            foreach (var k in keysToRemove) _spriteCache.Remove(k);

            _audioCache.Remove(key);
#if TOWER_USE_ADDRESSABLES
            if (_addressableCache.TryGetValue(key, out var obj))
            {
                _addressableCache.Remove(key);
                Addressables.Release(obj);
            }
#else
            _addressableCache.Remove(key);
#endif
        }

        public static void ClearCache()
        {
            foreach (var kv in _spriteCache)
            {
                if (IsCreatedSprite(kv.Value))
                {
                    try { UnityEngine.Object.Destroy(kv.Value); } catch { /* safe */ }
                }
            }
            _spriteCache.Clear();
            _createdSpriteIds.Clear();
            _audioCache.Clear();
            _atlasCache.Clear();
#if TOWER_USE_ADDRESSABLES
            foreach (var kv in _addressableCache)
            {
                try { Addressables.Release(kv.Value); } catch { /* safe */ }
            }
#endif
            _addressableCache.Clear();
        }

        private static bool IsCreatedSprite(Sprite sprite)
        {
            return sprite != null && _createdSpriteIds.Contains(sprite.GetInstanceID());
        }

        public static int CachedSpriteCount => _spriteCache.Count;
        public static int CachedAudioCount => _audioCache.Count;
    }
}
