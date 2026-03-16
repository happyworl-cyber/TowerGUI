using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
#if !UNITY_WEBGL
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
#endif

namespace TowerUI
{
    public class NetworkBridge : MonoBehaviour
    {
        private static NetworkBridge _instance;
        private static readonly object _lock = new();

        public static NetworkBridge Instance
        {
            get
            {
                if (_instance != null) return _instance;
                lock (_lock)
                {
                    if (_instance != null) return _instance;
                    var go = new GameObject("[TowerUI] NetworkBridge");
                    DontDestroyOnLoad(go);
                    _instance = go.AddComponent<NetworkBridge>();
                }
                return _instance;
            }
        }

        // ── HTTP ─────────────────────────────────────

        public void HttpRequest(string method, string url, string body, string headersJson,
            Action<int, string, string> onComplete)
        {
            if (string.IsNullOrEmpty(url))
            {
                onComplete?.Invoke(0, "", "URL is null or empty");
                return;
            }
            StartCoroutine(HttpCoroutine(method, url, body, headersJson, onComplete));
        }

        private IEnumerator HttpCoroutine(string method, string url, string body, string headersJson,
            Action<int, string, string> onComplete)
        {
            UnityWebRequest req;
            var upperMethod = (method ?? "GET").ToUpperInvariant();

            switch (upperMethod)
            {
                case "GET":
                    req = UnityWebRequest.Get(url);
                    break;
                case "POST":
                    req = new UnityWebRequest(url, "POST");
                    if (!string.IsNullOrEmpty(body))
                        req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                    req.downloadHandler = new DownloadHandlerBuffer();
                    req.SetRequestHeader("Content-Type", "application/json");
                    break;
                case "PUT":
                    req = UnityWebRequest.Put(url, body ?? "");
                    req.SetRequestHeader("Content-Type", "application/json");
                    break;
                case "DELETE":
                    req = UnityWebRequest.Delete(url);
                    req.downloadHandler = new DownloadHandlerBuffer();
                    break;
                default:
                    req = new UnityWebRequest(url, upperMethod);
                    if (!string.IsNullOrEmpty(body))
                        req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                    req.downloadHandler = new DownloadHandlerBuffer();
                    req.SetRequestHeader("Content-Type", "application/json");
                    break;
            }

            if (!string.IsNullOrEmpty(headersJson))
            {
                try
                {
                    var dict = JsonUtility.FromJson<HeaderDict>(headersJson);
                    // Fallback: simple parse
                    if (dict == null) ApplyHeadersFallback(req, headersJson);
                }
                catch
                {
                    ApplyHeadersFallback(req, headersJson);
                }
            }

            yield return req.SendWebRequest();

            var status = (int)req.responseCode;
            var responseBody = req.downloadHandler?.text ?? "";
            var error = "";

#if UNITY_2020_1_OR_NEWER
            if (req.result != UnityWebRequest.Result.Success)
                error = req.error ?? "Unknown error";
#else
            if (req.isNetworkError || req.isHttpError)
                error = req.error ?? "Unknown error";
#endif

            req.Dispose();

            try { onComplete?.Invoke(status, responseBody, error); }
            catch (Exception e) { Debug.LogError($"[TowerUI] NetworkBridge HTTP callback error: {e}"); }
        }

        private static void ApplyHeadersFallback(UnityWebRequest req, string headersJson)
        {
            try
            {
                var json = headersJson.Trim();
                if (!json.StartsWith("{") || !json.EndsWith("}")) return;
                json = json.Substring(1, json.Length - 2);
                foreach (var pair in json.Split(','))
                {
                    var colon = pair.IndexOf(':');
                    if (colon < 0) continue;
                    var key = pair.Substring(0, colon).Trim().Trim('"');
                    var val = pair.Substring(colon + 1).Trim().Trim('"');
                    if (!string.IsNullOrEmpty(key))
                        req.SetRequestHeader(key, val);
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[TowerUI] NetworkBridge: failed to parse headers: {e.Message}");
            }
        }

        [Serializable]
        private class HeaderDict { }

        // ── WebSocket ────────────────────────────────

#if !UNITY_WEBGL
        private readonly Dictionary<int, WebSocketConnection> _wsConnections = new();
        private int _wsNextId = 1;

        public int WsConnect(string url,
            Action<int> onOpen,
            Action<int, string> onMessage,
            Action<int, string> onClose,
            Action<int, string> onError)
        {
            var id = _wsNextId++;
            if (_wsNextId < 0) _wsNextId = 1;
            var conn = new WebSocketConnection(id, url, onOpen, onMessage, onClose, onError);
            _wsConnections[id] = conn;
            _ = conn.ConnectAsync();
            return id;
        }

        public void WsSend(int id, string message)
        {
            if (_wsConnections.TryGetValue(id, out var conn))
                _ = conn.SendAsync(message ?? "");
        }

        public void WsClose(int id)
        {
            if (_wsConnections.TryGetValue(id, out var conn))
            {
                _ = conn.CloseAsync();
                _wsConnections.Remove(id);
            }
        }

        private void OnDestroy()
        {
            foreach (var kv in _wsConnections)
                _ = kv.Value.CloseAsync();
            _wsConnections.Clear();
            _instance = null;
        }

        private class WebSocketConnection
        {
            private readonly int _id;
            private readonly string _url;
            private ClientWebSocket _ws;
            private CancellationTokenSource _cts;
            private readonly object _wsLock = new();
            private volatile bool _closed;
            private readonly Action<int> _onOpen;
            private readonly Action<int, string> _onMessage;
            private readonly Action<int, string> _onClose;
            private readonly Action<int, string> _onError;

            public WebSocketConnection(int id, string url,
                Action<int> onOpen, Action<int, string> onMessage,
                Action<int, string> onClose, Action<int, string> onError)
            {
                _id = id; _url = url;
                _onOpen = onOpen; _onMessage = onMessage;
                _onClose = onClose; _onError = onError;
            }

            public async Task ConnectAsync()
            {
                try
                {
                    var ws = new ClientWebSocket();
                    var cts = new CancellationTokenSource();
                    lock (_wsLock) { _ws = ws; _cts = cts; }
                    await ws.ConnectAsync(new Uri(_url), cts.Token);

                    UnityMainThread.Post(() =>
                    {
                        try { _onOpen?.Invoke(_id); }
                        catch (Exception e) { Debug.LogError($"[TowerUI] WS onOpen error: {e}"); }
                    });

                    _ = ReceiveLoop(ws, cts.Token);
                }
                catch (Exception e)
                {
                    UnityMainThread.Post(() =>
                    {
                        try { _onError?.Invoke(_id, e.Message); }
                        catch { /* safe */ }
                    });
                }
            }

            private async Task ReceiveLoop(ClientWebSocket ws, CancellationToken ct)
            {
                var buffer = new byte[8192];
                var sb = new StringBuilder();
                try
                {
                    while (!_closed && ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
                    {
                        var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            UnityMainThread.Post(() =>
                            {
                                try { _onClose?.Invoke(_id, result.CloseStatusDescription ?? "closed"); }
                                catch { /* safe */ }
                            });
                            break;
                        }

                        sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                        if (result.EndOfMessage)
                        {
                            var msg = sb.ToString();
                            sb.Clear();
                            UnityMainThread.Post(() =>
                            {
                                try { _onMessage?.Invoke(_id, msg); }
                                catch (Exception e) { Debug.LogError($"[TowerUI] WS onMessage error: {e}"); }
                            });
                        }
                    }
                }
                catch (OperationCanceledException) { /* normal close */ }
                catch (Exception e)
                {
                    if (!_closed)
                    {
                        UnityMainThread.Post(() =>
                        {
                            try { _onError?.Invoke(_id, e.Message); }
                            catch { /* safe */ }
                        });
                    }
                }
            }

            public async Task SendAsync(string message)
            {
                ClientWebSocket ws;
                lock (_wsLock) { ws = _ws; }
                if (_closed || ws == null || ws.State != WebSocketState.Open) return;
                try
                {
                    var bytes = Encoding.UTF8.GetBytes(message);
                    CancellationToken ct;
                    lock (_wsLock) { ct = _cts?.Token ?? CancellationToken.None; }
                    await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"[TowerUI] WS send error: {e.Message}");
                }
            }

            public async Task CloseAsync()
            {
                if (_closed) return;
                _closed = true;
                ClientWebSocket ws;
                CancellationTokenSource cts;
                lock (_wsLock)
                {
                    ws = _ws; _ws = null;
                    cts = _cts; _cts = null;
                }
                try { cts?.Cancel(); } catch { /* safe */ }
                try
                {
                    if (ws != null && ws.State == WebSocketState.Open)
                    {
                        using var closeCts = new CancellationTokenSource(3000);
                        await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", closeCts.Token);
                    }
                }
                catch { /* safe */ }
                try { ws?.Dispose(); } catch { /* safe */ }
                try { cts?.Dispose(); } catch { /* safe */ }
            }
        }
#else
        // WebGL stub — WebSocket not available via System.Net.WebSockets
        public int WsConnect(string url, Action<int> onOpen, Action<int, string> onMessage,
            Action<int, string> onClose, Action<int, string> onError)
        {
            Debug.LogWarning("[TowerUI] WebSocket is not supported on WebGL via NetworkBridge. Use JavaScript WebSocket directly.");
            onError?.Invoke(-1, "WebSocket not supported on WebGL");
            return -1;
        }
        public void WsSend(int id, string message) { }
        public void WsClose(int id) { }

        private void OnDestroy() { _instance = null; }
#endif
    }

    public static class UnityMainThread
    {
        private static readonly Queue<Action> _queue = new();
        private static volatile bool _hasQueued;

        public static void Post(Action action)
        {
            lock (_queue)
            {
                _queue.Enqueue(action);
                _hasQueued = true;
            }
        }

        public static void Tick()
        {
            if (!_hasQueued) return;
            Action[] batch;
            lock (_queue)
            {
                if (_queue.Count == 0) return;
                batch = _queue.ToArray();
                _queue.Clear();
                _hasQueued = false;
            }
            foreach (var a in batch)
            {
                try { a(); }
                catch (Exception e) { Debug.LogError($"[TowerUI] MainThread dispatch error: {e}"); }
            }
        }
    }
}
