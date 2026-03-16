using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace TowerUI
{
    public class UIEventReceiver : MonoBehaviour,
        IPointerClickHandler,
        IPointerDownHandler,
        IPointerUpHandler,
        IPointerEnterHandler,
        IPointerExitHandler
    {
        public Action<int> onPointerClick;
        public Action<int> onPointerDown;
        public Action<int> onPointerUp;
        public Action onPointerEnter;
        public Action onPointerExit;

        public Action<string> onInputChange;
        public Action<string> onInputSubmit;
        public Action<bool> onToggleChange;
        public Action<float> onSliderChange;

        private bool _boundInput;
        private bool _boundToggle;
        private bool _boundSlider;

        public void BindInputEvents()
        {
            if (_boundInput) return;
            _boundInput = true;

            var tmpInput = GetComponent<TMPro.TMP_InputField>();
            if (tmpInput != null)
            {
                tmpInput.onValueChanged.AddListener(v => SafeInvoke(() => onInputChange?.Invoke(v)));
                tmpInput.onSubmit.AddListener(v => SafeInvoke(() => onInputSubmit?.Invoke(v)));
                return;
            }
            var legacyInput = GetComponent<InputField>();
            if (legacyInput != null)
            {
                legacyInput.onValueChanged.AddListener(v => SafeInvoke(() => onInputChange?.Invoke(v)));
                legacyInput.onSubmit.AddListener(v => SafeInvoke(() => onInputSubmit?.Invoke(v)));
            }
        }

        public void BindToggleEvents()
        {
            if (_boundToggle) return;
            _boundToggle = true;
            var toggle = GetComponent<Toggle>();
            if (toggle != null)
                toggle.onValueChanged.AddListener(v => SafeInvoke(() => onToggleChange?.Invoke(v)));
        }

        public void BindSliderEvents()
        {
            if (_boundSlider) return;
            _boundSlider = true;
            var slider = GetComponent<Slider>();
            if (slider != null)
                slider.onValueChanged.AddListener(v => SafeInvoke(() => onSliderChange?.Invoke(v)));
        }

        public void OnPointerClick(PointerEventData e)
        {
            SafeInvoke(() => onPointerClick?.Invoke(e.button == PointerEventData.InputButton.Right ? 1 : 0));
        }

        public void OnPointerDown(PointerEventData e)
        {
            SafeInvoke(() => onPointerDown?.Invoke((int)e.button));
        }

        public void OnPointerUp(PointerEventData e)
        {
            SafeInvoke(() => onPointerUp?.Invoke((int)e.button));
        }

        public void OnPointerEnter(PointerEventData e)
        {
            SafeInvoke(() => onPointerEnter?.Invoke());
        }

        public void OnPointerExit(PointerEventData e)
        {
            SafeInvoke(() => onPointerExit?.Invoke());
        }

        void OnDestroy()
        {
            onPointerClick = null;
            onPointerDown = null;
            onPointerUp = null;
            onPointerEnter = null;
            onPointerExit = null;
            onInputChange = null;
            onInputSubmit = null;
            onToggleChange = null;
            onSliderChange = null;
        }

        private static void SafeInvoke(Action action)
        {
            try { action(); }
            catch (Exception e) { Debug.LogError($"[TowerUI] Event callback error: {e}"); }
        }
    }
}
