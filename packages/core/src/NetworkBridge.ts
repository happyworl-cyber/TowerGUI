declare const CS: any;

type HttpCallback = (status: number, body: string, error: string) => void;

function getBridge(): any {
  if (typeof CS === 'undefined') return null;
  return CS?.TowerUI?.NetworkBridge?.Instance ?? null;
}

const DEFAULT_TIMEOUT = 30000;

// ── HTTP ─────────────────────────────────────────────

export interface HttpResponse {
  status: number;
  data: string;
  error: string;
  ok: boolean;
  json: <T = any>() => T;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  /** Timeout in ms (default 30000). 0 = no timeout. */
  timeout?: number;
}

export function http(url: string, options?: RequestOptions): Promise<HttpResponse> {
  const bridge = getBridge();
  if (!bridge) {
    return Promise.reject(new Error('[NetworkBridge] Not available outside Unity'));
  }

  const method = options?.method ?? 'GET';
  const bodyStr = options?.body
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : '';
  const headersStr = options?.headers ? JSON.stringify(options.headers) : '';
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  return new Promise<HttpResponse>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = (res: HttpResponse | null, err?: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (err) reject(err);
      else resolve(res!);
    };

    if (timeout > 0) {
      timer = setTimeout(() => {
        settle(null, new Error(`[NetworkBridge] HTTP request timed out after ${timeout}ms: ${method} ${url}`));
      }, timeout);
    }

    const cb: HttpCallback = (status, data, error) => {
      const ok = status >= 200 && status < 400 && !error;
      settle({
        status,
        data,
        error,
        ok,
        json: <T = any>() => JSON.parse(data) as T,
      });
    };

    try {
      bridge.HttpRequest(method, url, bodyStr, headersStr, cb);
    } catch (e: any) {
      settle(null, new Error(`[NetworkBridge] HttpRequest call failed: ${e.message}`));
    }
  });
}

export function get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
  return http(url, { method: 'GET', headers });
}

export function post(url: string, body?: string | Record<string, any>, headers?: Record<string, string>): Promise<HttpResponse> {
  return http(url, { method: 'POST', body, headers });
}

export function put(url: string, body?: string | Record<string, any>, headers?: Record<string, string>): Promise<HttpResponse> {
  return http(url, { method: 'PUT', body, headers });
}

export function del(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
  return http(url, { method: 'DELETE', headers });
}

// ── WebSocket ────────────────────────────────────────

export interface WsConnection {
  readonly id: number;
  readonly isOpen: boolean;
  send: (message: string) => void;
  sendJson: (data: any) => void;
  close: () => void;
}

export interface WsCallbacks {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: (reason: string) => void;
  onError?: (error: string) => void;
}

export function wsConnect(url: string, callbacks: WsCallbacks): WsConnection {
  const bridge = getBridge();
  if (!bridge) {
    throw new Error('[NetworkBridge] Not available outside Unity');
  }

  let open = false;

  const id: number = bridge.WsConnect(
    url,
    (_id: number) => { open = true; callbacks.onOpen?.(); },
    (_id: number, msg: string) => { callbacks.onMessage?.(msg); },
    (_id: number, reason: string) => { open = false; callbacks.onClose?.(reason); },
    (_id: number, err: string) => { open = false; callbacks.onError?.(err); },
  );

  const conn: WsConnection = {
    get id() { return id; },
    get isOpen() { return open; },
    send(message: string) {
      if (!open) { console.warn('[WsConnection] send called on closed connection'); return; }
      bridge.WsSend(id, message ?? '');
    },
    sendJson(data: any) {
      if (!open) { console.warn('[WsConnection] sendJson called on closed connection'); return; }
      bridge.WsSend(id, JSON.stringify(data));
    },
    close() {
      open = false;
      bridge.WsClose(id);
    },
  };
  return conn;
}

// ── React Hooks ──────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseHttpReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHttp<T = any>(url: string | null, options?: RequestOptions): UseHttpReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const urlRef = useRef(url);
  const optionsRef = useRef(options);
  urlRef.current = url;
  optionsRef.current = options;

  const doFetch = useCallback(() => {
    const currentUrl = urlRef.current;
    if (!currentUrl) return;
    setLoading(true);
    setError(null);
    http(currentUrl, optionsRef.current).then(res => {
      if (!mountedRef.current) return;
      if (res.error) {
        setError(res.error);
        setData(null);
      } else {
        try {
          setData(res.json<T>());
        } catch {
          setError(`Failed to parse response as JSON`);
          setData(null);
        }
      }
      setLoading(false);
    }).catch((e: Error) => {
      if (!mountedRef.current) return;
      setError(e.message);
      setLoading(false);
    });
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    if (url) doFetch();
    return () => { mountedRef.current = false; };
  }, [url, doFetch]);

  return { data, loading, error, refetch: doFetch };
}

export interface UseWsReturn {
  connected: boolean;
  lastMessage: string | null;
  send: (message: string) => void;
  sendJson: (data: any) => void;
  close: () => void;
}

export function useWebSocket(url: string | null, onMessage?: (data: string) => void): UseWsReturn {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const connRef = useRef<WsConnection | null>(null);
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage;

  useEffect(() => {
    if (!url) return;

    try {
      const conn = wsConnect(url, {
        onOpen: () => setConnected(true),
        onMessage: (msg) => {
          setLastMessage(msg);
          onMsgRef.current?.(msg);
        },
        onClose: () => setConnected(false),
        onError: (err) => {
          console.error('[useWebSocket] error:', err);
          setConnected(false);
        },
      });
      connRef.current = conn;
    } catch (e) {
      console.error('[useWebSocket] connect failed:', e);
    }

    return () => {
      connRef.current?.close();
      connRef.current = null;
      setConnected(false);
    };
  }, [url]);

  return {
    connected,
    lastMessage,
    send: useCallback((msg: string) => connRef.current?.send(msg), []),
    sendJson: useCallback((data: any) => connRef.current?.sendJson(data), []),
    close: useCallback(() => connRef.current?.close(), []),
  };
}
