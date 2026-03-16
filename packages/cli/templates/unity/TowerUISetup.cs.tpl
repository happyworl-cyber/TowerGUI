using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

/// <summary>
/// Auto-creates Canvas + EventSystem + TowerUIBoot on scene load.
/// Attach to an empty GameObject, or let [RuntimeInitializeOnLoadMethod] do it.
/// Remove this script once you have your own scene setup.
/// </summary>
public class TowerUISetup : MonoBehaviour
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void AutoSetup()
    {
#if UNITY_EDITOR
        if (FindAnyObjectByType<Canvas>() != null) return;

        var canvasGO = new GameObject("Canvas");
        var canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;

        var scaler = canvasGO.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        scaler.matchWidthOrHeight = 0.5f;

        canvasGO.AddComponent<GraphicRaycaster>();

        if (FindAnyObjectByType<EventSystem>() == null)
        {
            var esGO = new GameObject("EventSystem");
            esGO.AddComponent<EventSystem>();
            esGO.AddComponent<StandaloneInputModule>();
        }

        var bootGO = new GameObject("TowerUIBoot");
        bootGO.AddComponent<TowerUI.TowerUIBoot>();
        Debug.Log("[TowerUI] Scene auto-setup complete.");
#endif
    }
}
