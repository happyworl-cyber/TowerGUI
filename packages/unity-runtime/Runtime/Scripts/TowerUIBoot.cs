using UnityEngine;
using Puerts;
using System;

#pragma warning disable CS0618
namespace TowerUI
{
    public class TowerUIBoot : MonoBehaviour
    {
        private JsEnv jsEnv;
        private bool _initialized;

        public static Action<float> onUpdate;

        void Start()
        {
            try
            {
                jsEnv = new JsEnv();
                jsEnv.ExecuteModule("main.mjs");
                _initialized = true;
                Debug.Log("[TowerUI] JS environment initialized");
            }
            catch (Exception e)
            {
                Debug.LogError($"[TowerUI] Failed to initialize JS environment: {e}");
                _initialized = false;
            }
        }

        void Update()
        {
            if (!_initialized || jsEnv == null) return;

            try { jsEnv.Tick(); }
            catch (Exception e) { Debug.LogError($"[TowerUI] JS Tick error: {e.Message}"); }

            try { onUpdate?.Invoke(Time.deltaTime * 1000f); }
            catch (Exception e) { Debug.LogError($"[TowerUI] onUpdate callback error: {e.Message}"); }

            UnityMainThread.Tick();
        }

        void OnDestroy()
        {
            onUpdate = null;
            _initialized = false;

            if (jsEnv != null)
            {
                try { jsEnv.Dispose(); }
                catch (Exception e) { Debug.LogWarning($"[TowerUI] JsEnv dispose error: {e.Message}"); }
                jsEnv = null;
            }

            FilterBridge.Cleanup();
            SoundBridge.Shutdown();
            AssetManager.ClearCache();
            DataBridge.ClearReceivers();
            InputBridge.ClearCallbacks();
        }
    }
}
