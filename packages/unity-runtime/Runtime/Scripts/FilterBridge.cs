using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

namespace TowerUI
{
    public static class FilterBridge
    {
        private static Material _blurMat;
        private static Material _grayscaleMat;
        private static bool _blurShaderMissing;
        private static bool _grayShaderMissing;

        private static readonly Dictionary<int, Material> _instanceMats = new();
        private static readonly Dictionary<int, Color> _originalColors = new();

        private static int GetKey(GameObject go) => go.GetInstanceID();

        private static void DestroyInstanceMat(int key)
        {
            if (_instanceMats.TryGetValue(key, out var old))
            {
                if (old != null) Object.Destroy(old);
                _instanceMats.Remove(key);
            }
        }

        private static void TrackAutoCleanup(GameObject go)
        {
            if (go.GetComponent<FilterCleanupHook>() == null)
                go.AddComponent<FilterCleanupHook>();
        }

        internal static void OnObjectDestroyed(int instanceId)
        {
            DestroyInstanceMat(instanceId);
            _originalColors.Remove(instanceId);
        }

        public static void SetBlur(GameObject go, float radius)
        {
            if (go == null) return;
            var img = go.GetComponent<Image>();
            if (img == null) return;
            int key = GetKey(go);

            if (radius <= 0f)
            {
                DestroyInstanceMat(key);
                img.material = null;
                return;
            }

            if (_blurMat == null && !_blurShaderMissing)
            {
                var shader = Shader.Find("TowerUI/UIBlur");
                if (shader == null)
                {
                    _blurShaderMissing = true;
                    Debug.LogError("[TowerUI] Shader 'TowerUI/UIBlur' not found.");
                    return;
                }
                _blurMat = new Material(shader) { hideFlags = HideFlags.DontSave };
            }
            if (_blurMat == null) return;

            DestroyInstanceMat(key);
            var mat = new Material(_blurMat) { hideFlags = HideFlags.DontSave };
            mat.SetFloat("_BlurRadius", Mathf.Max(0f, radius));
            img.material = mat;
            _instanceMats[key] = mat;
            TrackAutoCleanup(go);
        }

        public static void SetShadow(GameObject go, float offsetX, float offsetY, float blur, float r, float g, float b, float a)
        {
            if (go == null) return;
            var shadow = go.GetComponent<Shadow>();
            if (Mathf.Approximately(offsetX, 0f) && Mathf.Approximately(offsetY, 0f))
            {
                if (shadow != null) Object.Destroy(shadow);
                return;
            }
            if (shadow == null) shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(Mathf.Clamp01(r), Mathf.Clamp01(g), Mathf.Clamp01(b), Mathf.Clamp01(a));
            shadow.effectDistance = new Vector2(offsetX, -offsetY);
        }

        public static void SetOutline(GameObject go, float size, float r, float g, float b, float a)
        {
            if (go == null) return;
            var outline = go.GetComponent<Outline>();
            if (size <= 0f)
            {
                if (outline != null) Object.Destroy(outline);
                return;
            }
            if (outline == null) outline = go.AddComponent<Outline>();
            outline.effectColor = new Color(Mathf.Clamp01(r), Mathf.Clamp01(g), Mathf.Clamp01(b), Mathf.Clamp01(a));
            outline.effectDistance = new Vector2(Mathf.Clamp(size, 0f, 5f), Mathf.Clamp(size, 0f, 5f));
        }

        public static void SetGrayscale(GameObject go, float amount)
        {
            if (go == null) return;
            var img = go.GetComponent<Image>();
            if (img == null) return;
            int key = GetKey(go);

            amount = Mathf.Clamp01(amount);
            if (amount <= 0f)
            {
                DestroyInstanceMat(key);
                img.material = null;
                return;
            }

            if (_grayscaleMat == null && !_grayShaderMissing)
            {
                var shader = Shader.Find("TowerUI/UIGrayscale");
                if (shader == null)
                {
                    _grayShaderMissing = true;
                    Debug.LogError("[TowerUI] Shader 'TowerUI/UIGrayscale' not found.");
                    return;
                }
                _grayscaleMat = new Material(shader) { hideFlags = HideFlags.DontSave };
            }
            if (_grayscaleMat == null) return;

            DestroyInstanceMat(key);
            var mat = new Material(_grayscaleMat) { hideFlags = HideFlags.DontSave };
            mat.SetFloat("_GrayAmount", amount);
            img.material = mat;
            _instanceMats[key] = mat;
            TrackAutoCleanup(go);
        }

        public static void SetBrightness(GameObject go, float brightness)
        {
            if (go == null) return;
            var graphic = go.GetComponent<Graphic>();
            if (graphic == null) return;
            int key = GetKey(go);

            if (!_originalColors.ContainsKey(key))
                _originalColors[key] = graphic.color;

            brightness = Mathf.Clamp(brightness, 0f, 3f);
            var orig = _originalColors[key];
            graphic.color = new Color(
                Mathf.Clamp01(orig.r * brightness),
                Mathf.Clamp01(orig.g * brightness),
                Mathf.Clamp01(orig.b * brightness),
                orig.a
            );
            TrackAutoCleanup(go);
        }

        public static void SetColorTint(GameObject go, float r, float g, float b, float a)
        {
            if (go == null) return;
            var graphic = go.GetComponent<Graphic>();
            if (graphic == null) return;
            graphic.color = new Color(Mathf.Clamp01(r), Mathf.Clamp01(g), Mathf.Clamp01(b), Mathf.Clamp01(a));
        }

        public static void Cleanup()
        {
            foreach (var mat in _instanceMats.Values)
                if (mat != null) Object.Destroy(mat);
            _instanceMats.Clear();
            _originalColors.Clear();
            if (_blurMat != null) { Object.Destroy(_blurMat); _blurMat = null; }
            if (_grayscaleMat != null) { Object.Destroy(_grayscaleMat); _grayscaleMat = null; }
            _blurShaderMissing = false;
            _grayShaderMissing = false;
        }
    }

    internal class FilterCleanupHook : MonoBehaviour
    {
        void OnDestroy()
        {
            FilterBridge.OnObjectDestroyed(gameObject.GetInstanceID());
        }
    }
}
