using UnityEngine;
using System;

namespace TowerUI
{
    public class InputBridge : MonoBehaviour
    {
        public static Action<string> onNavigate;
        public static Action onTabNext;
        public static Action onTabPrev;
        public static Action onSubmit;
        public static Action onCancel;

        [Header("Repeat Settings")]
        [SerializeField] private float repeatDelay = 0.4f;
        [SerializeField] private float repeatInterval = 0.12f;

        private float _repeatTimer;
        private string _lastDirection;

        private static bool _gamepadAxesAvailable = true;
        private static bool _gamepadAxesChecked;

        void Update()
        {
            try
            {
                HandleKeyboard();
                HandleGamepad();
            }
            catch (Exception e)
            {
                Debug.LogError($"[TowerUI] InputBridge.Update error: {e.Message}");
            }
        }

        private void HandleKeyboard()
        {
            if (Input.GetKeyDown(KeyCode.Tab))
            {
                if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
                    onTabPrev?.Invoke();
                else
                    onTabNext?.Invoke();
                return;
            }

            if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter))
            {
                onSubmit?.Invoke();
                return;
            }

            if (Input.GetKeyDown(KeyCode.Escape))
            {
                onCancel?.Invoke();
                return;
            }

            if (Input.GetKeyDown(KeyCode.UpArrow))    { Navigate("up"); return; }
            if (Input.GetKeyDown(KeyCode.DownArrow))   { Navigate("down"); return; }
            if (Input.GetKeyDown(KeyCode.LeftArrow))   { Navigate("left"); return; }
            if (Input.GetKeyDown(KeyCode.RightArrow))  { Navigate("right"); return; }

            string held = null;
            if (Input.GetKey(KeyCode.UpArrow))    held = "up";
            else if (Input.GetKey(KeyCode.DownArrow))  held = "down";
            else if (Input.GetKey(KeyCode.LeftArrow))  held = "left";
            else if (Input.GetKey(KeyCode.RightArrow)) held = "right";

            HandleRepeat(held);
        }

        private void HandleGamepad()
        {
            if (!_gamepadAxesAvailable) return;
            float h, v;
            try
            {
                if (!_gamepadAxesChecked)
                {
                    _gamepadAxesChecked = true;
                    Input.GetAxisRaw("Horizontal");
                }
                h = Input.GetAxisRaw("Horizontal");
                v = Input.GetAxisRaw("Vertical");
            }
            catch
            {
                _gamepadAxesAvailable = false;
                return;
            }

            const float threshold = 0.5f;
            string dir = null;
            if (v > threshold) dir = "up";
            else if (v < -threshold) dir = "down";
            if (h < -threshold) dir = "left";
            else if (h > threshold) dir = "right";

            if (dir != null && dir != _lastDirection)
            {
                Navigate(dir);
                _lastDirection = dir;
                _repeatTimer = repeatDelay;
            }
            else if (dir == null)
            {
                _lastDirection = null;
            }

            try
            {
                if (Input.GetButtonDown("Submit")) onSubmit?.Invoke();
                if (Input.GetButtonDown("Cancel")) onCancel?.Invoke();
            }
            catch { /* axis not configured */ }
        }

        private void HandleRepeat(string direction)
        {
            if (direction == null || direction != _lastDirection)
            {
                _lastDirection = direction;
                _repeatTimer = repeatDelay;
                return;
            }

            _repeatTimer -= Time.unscaledDeltaTime;
            if (_repeatTimer <= 0)
            {
                Navigate(direction);
                _repeatTimer = repeatInterval;
            }
        }

        private void Navigate(string direction)
        {
            try { onNavigate?.Invoke(direction); }
            catch (Exception e) { Debug.LogError($"[TowerUI] InputBridge navigate error: {e.Message}"); }
        }

        void OnDestroy()
        {
            ClearCallbacks();
        }

        public static void ClearCallbacks()
        {
            onNavigate = null;
            onTabNext = null;
            onTabPrev = null;
            onSubmit = null;
            onCancel = null;
        }

        public static float GetSafeAreaX()
        {
            return Screen.safeArea.x / Mathf.Max(1, Screen.width);
        }

        public static float GetSafeAreaY()
        {
            return Screen.safeArea.y / Mathf.Max(1, Screen.height);
        }

        public static float GetSafeAreaW()
        {
            return Screen.safeArea.width / Mathf.Max(1, Screen.width);
        }

        public static float GetSafeAreaH()
        {
            return Screen.safeArea.height / Mathf.Max(1, Screen.height);
        }

        public static float GetScreenWidth()
        {
            return Screen.width;
        }

        public static float GetScreenHeight()
        {
            return Screen.height;
        }

        public static float GetScreenDpi()
        {
            return Screen.dpi > 0 ? Screen.dpi : 96f;
        }
    }
}
