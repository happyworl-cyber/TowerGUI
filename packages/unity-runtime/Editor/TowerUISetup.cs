#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace TowerUI.Editor
{
    [InitializeOnLoad]
    internal static class TowerUISetup
    {
        private const string TMP_CHECK_KEY = "TowerUI_TMP_Checked";

        static TowerUISetup()
        {
            EditorApplication.delayCall += OnEditorReady;
        }

        private static void OnEditorReady()
        {
            if (SessionState.GetBool(TMP_CHECK_KEY, false)) return;
            SessionState.SetBool(TMP_CHECK_KEY, true);

            if (IsTMPReady()) return;

            var result = EditorUtility.DisplayDialog(
                "TowerUI — Import TMP Resources",
                "TextMeshPro Essential Resources have not been imported yet.\n\n" +
                "TowerUI uses TMP for high-quality text rendering. " +
                "Without it, text will fall back to Legacy UI Text.\n\n" +
                "Import now?",
                "Import TMP Resources",
                "Skip (use Legacy Text)"
            );

            if (result)
            {
                OpenTMPImporter();
            }
        }

        private static bool IsTMPReady()
        {
            try
            {
                var font = TMPro.TMP_Settings.defaultFontAsset;
                return font != null;
            }
            catch
            {
                return false;
            }
        }

        private static void OpenTMPImporter()
        {
            EditorApplication.ExecuteMenuItem("Window/TextMeshPro/Import TMP Essential Resources");
        }

        [MenuItem("TowerUI/Import TMP Essential Resources")]
        private static void MenuImportTMP()
        {
            OpenTMPImporter();
        }

        [MenuItem("TowerUI/Check TMP Status")]
        private static void MenuCheckTMP()
        {
            if (IsTMPReady())
                EditorUtility.DisplayDialog("TowerUI", "TMP is ready! Default font asset found.", "OK");
            else
                EditorUtility.DisplayDialog("TowerUI", "TMP resources not found. Use TowerUI → Import TMP Essential Resources.", "OK");
        }
    }
}
#endif
