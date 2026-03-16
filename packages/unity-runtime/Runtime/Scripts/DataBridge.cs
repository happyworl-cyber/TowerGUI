using UnityEngine;
using System;
using System.Collections.Generic;
using System.Globalization;

namespace TowerUI
{
    public static class DataBridge
    {
        public static Action<string, string> onDataPush;
        public static Action<string> onBatchPush;

        private static readonly List<(string path, string json)> _batchBuffer = new();
        private static bool _batching;

        public static void Push(string path, object value)
        {
            if (string.IsNullOrEmpty(path))
            {
                Debug.LogWarning("[TowerUI] DataBridge.Push: path is null or empty");
                return;
            }

            string json;
            try { json = SerializeValue(value); }
            catch (Exception e)
            {
                Debug.LogError($"[TowerUI] DataBridge.Push serialize error for '{path}': {e.Message}");
                return;
            }

            if (_batching)
            {
                _batchBuffer.Add((path, json));
                return;
            }

            try { onDataPush?.Invoke(path, json); }
            catch (Exception e) { Debug.LogError($"[TowerUI] DataBridge.Push callback error: {e.Message}"); }
        }

        public static void PushRaw(string path, string jsonValue)
        {
            if (string.IsNullOrEmpty(path)) return;
            jsonValue ??= "null";

            if (_batching)
            {
                _batchBuffer.Add((path, jsonValue));
                return;
            }

            try { onDataPush?.Invoke(path, jsonValue); }
            catch (Exception e) { Debug.LogError($"[TowerUI] DataBridge.PushRaw callback error: {e.Message}"); }
        }

        public static void BeginBatch()
        {
            if (_batching)
            {
                Debug.LogWarning("[TowerUI] DataBridge.BeginBatch called while already batching. Auto-flushing previous batch.");
                EndBatch();
            }
            _batching = true;
            _batchBuffer.Clear();
        }

        public static void EndBatch()
        {
            _batching = false;

            if (_batchBuffer.Count == 0) return;

            try
            {
                if (onBatchPush != null)
                {
                    var json = SerializeBatch();
                    onBatchPush.Invoke(json);
                }
                else if (onDataPush != null)
                {
                    foreach (var (path, value) in _batchBuffer)
                        onDataPush.Invoke(path, value);
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[TowerUI] DataBridge.EndBatch callback error: {e.Message}");
            }
            finally
            {
                _batchBuffer.Clear();
            }
        }

        public static void Batch(Action fn)
        {
            if (fn == null) return;
            BeginBatch();
            try { fn(); }
            catch (Exception e)
            {
                Debug.LogError($"[TowerUI] DataBridge.Batch action error: {e.Message}");
            }
            finally { EndBatch(); }
        }

        public static void PushSnapshot(string jsonState)
        {
            if (string.IsNullOrEmpty(jsonState)) return;
            PushRaw("__snapshot__", jsonState);
        }

        public static void ClearReceivers()
        {
            onDataPush = null;
            onBatchPush = null;
        }

        private static string SerializeValue(object value)
        {
            if (value == null) return "null";
            if (value is string s) return $"\"{EscapeJson(s)}\"";
            if (value is bool b) return b ? "true" : "false";
            if (value is int i) return i.ToString(CultureInfo.InvariantCulture);
            if (value is float f) return f.ToString(CultureInfo.InvariantCulture);
            if (value is double d) return d.ToString(CultureInfo.InvariantCulture);
            if (value is long l) return l.ToString(CultureInfo.InvariantCulture);

            try { return JsonUtility.ToJson(value); }
            catch
            {
                Debug.LogWarning($"[TowerUI] DataBridge: JsonUtility.ToJson failed for type {value.GetType().Name}, using ToString");
                return $"\"{EscapeJson(value.ToString())}\"";
            }
        }

        private static string SerializeBatch()
        {
            var sb = new System.Text.StringBuilder(64 + _batchBuffer.Count * 48);
            sb.Append('[');
            for (int i = 0; i < _batchBuffer.Count; i++)
            {
                if (i > 0) sb.Append(',');
                var (path, val) = _batchBuffer[i];
                sb.Append("{\"p\":\"").Append(EscapeJson(path)).Append("\",\"v\":").Append(val).Append('}');
            }
            sb.Append(']');
            return sb.ToString();
        }

        private static string EscapeJson(string s)
        {
            if (s == null) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"")
                    .Replace("\n", "\\n").Replace("\r", "\\r")
                    .Replace("\t", "\\t").Replace("\0", "");
        }
    }
}
