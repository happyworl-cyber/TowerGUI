using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using TowerUI;

/// <summary>
/// Auto-creates Canvas + EventSystem + TowerUIBoot for benchmarking.
/// Attach to an empty GameObject in scene, or use menu item.
/// </summary>
public class BenchmarkSetup : MonoBehaviour
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void AutoSetup()
    {
        if (FindAnyObjectByType<Canvas>() != null) return;

        var canvasGo = new GameObject("Canvas");
        var canvas = canvasGo.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        var scaler = canvasGo.GetComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        scaler.matchWidthOrHeight = 0.5f;

        if (FindAnyObjectByType<EventSystem>() == null)
        {
            var esGo = new GameObject("EventSystem");
            esGo.AddComponent<EventSystem>();
            esGo.AddComponent<StandaloneInputModule>();
        }

        var bootGo = new GameObject("TowerUIBoot");
        bootGo.AddComponent<TowerUIBoot>();

        Debug.Log("[TowerUI] Benchmark scene auto-setup complete");
    }
}
