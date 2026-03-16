#if UNITY_EDITOR
using UnityEngine;
using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace TowerUI
{
    public class HotReloadClient : MonoBehaviour
    {
        [SerializeField] private string serverUrl = "ws://localhost:3000/__hmr";
        [SerializeField] private float reconnectDelay = 3f;

        public static Action onReloadRequested;

        private ClientWebSocket _ws;
        private CancellationTokenSource _cts;
        private volatile bool _connected;
        private readonly ConcurrentQueue<Action> _mainThreadQueue = new();

        void OnEnable()
        {
            _cts = new CancellationTokenSource();
            _ = ConnectLoop(_cts.Token);
        }

        void OnDisable()
        {
            var cts = _cts;
            _cts = null;
            cts?.Cancel();
            cts?.Dispose();
            _ = CloseSocket();
            _connected = false;
        }

        void OnDestroy()
        {
            onReloadRequested = null;
        }

        void Update()
        {
            while (_mainThreadQueue.TryDequeue(out var action))
            {
                try { action?.Invoke(); }
                catch (Exception e) { Debug.LogError($"[HMR] Main thread action error: {e}"); }
            }
        }

        private async Task ConnectLoop(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                ClientWebSocket ws = null;
                try
                {
                    ws = new ClientWebSocket();
                    await ws.ConnectAsync(new Uri(serverUrl), ct);
                    _ws = ws;
                    _connected = true;
                    _mainThreadQueue.Enqueue(() => Debug.Log("[HMR] Connected to dev server"));

                    await ReceiveLoop(ws, ct);
                }
                catch (OperationCanceledException) { break; }
                catch (Exception e)
                {
                    if (!ct.IsCancellationRequested)
                        _mainThreadQueue.Enqueue(() => Debug.Log($"[HMR] Connection failed: {e.Message}. Retrying..."));
                }
                finally
                {
                    _connected = false;
                    if (ws != null)
                    {
                        try { ws.Dispose(); } catch { /* safe */ }
                    }
                    _ws = null;
                }

                if (!ct.IsCancellationRequested)
                {
                    try { await Task.Delay((int)(reconnectDelay * 1000), ct); }
                    catch (OperationCanceledException) { break; }
                }
            }
        }

        private async Task ReceiveLoop(ClientWebSocket ws, CancellationToken ct)
        {
            var buffer = new byte[8192];
            var sb = new StringBuilder();
            while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                WebSocketReceiveResult result;
                try
                {
                    result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                }
                catch (OperationCanceledException) { break; }
                catch { break; }

                if (result.MessageType == WebSocketMessageType.Close) break;

                sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
                if (result.EndOfMessage)
                {
                    var msg = sb.ToString();
                    sb.Clear();
                    if (msg == "reload" || msg.Contains("\"type\":\"reload\""))
                    {
                        _mainThreadQueue.Enqueue(() =>
                        {
                            Debug.Log("[HMR] Reload signal received");
                            try { onReloadRequested?.Invoke(); }
                            catch (Exception e) { Debug.LogError($"[HMR] Reload callback error: {e}"); }
                        });
                    }
                }
            }
        }

        private async Task CloseSocket()
        {
            var ws = _ws;
            _ws = null;
            if (ws != null && ws.State == WebSocketState.Open)
            {
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", cts.Token);
                }
                catch { /* safe close */ }
            }
            try { ws?.Dispose(); } catch { /* safe dispose */ }
        }

        public bool IsConnectedInstance() => _connected;
    }
}
#else
// Stub for non-editor builds
namespace TowerUI
{
    public class HotReloadClient : UnityEngine.MonoBehaviour
    {
        public static System.Action onReloadRequested;
        public bool IsConnectedInstance() => false;
    }
}
#endif
