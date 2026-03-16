import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import * as esbuild from 'esbuild';

export interface DevServerOptions {
  port?: number;
  entry: string;
  outdir?: string;
  width?: number;
  height?: number;
  title?: string;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

export async function startDevServer(opts: DevServerOptions) {
  const port = opts.port ?? 3000;
  const outdir = opts.outdir ?? path.join(process.cwd(), '.tower-preview');
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const title = opts.title ?? 'TowerUI Preview';

  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

  const bundlePath = path.join(outdir, 'bundle.js');

  // Generate HTML shell
  const htmlContent = generateHTML(title, width, height);
  const htmlPath = path.join(outdir, 'index.html');
  fs.writeFileSync(htmlPath, htmlContent);

  // Resolve workspace packages
  const packagesDir = path.resolve(__dirname, '../../');

  const ctx = await esbuild.context({
    entryPoints: [opts.entry],
    bundle: true,
    outfile: bundlePath,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"development"',
      'CS': 'undefined',
    },
    alias: {
      '@tower-ui/core': path.join(packagesDir, 'core/src/index.ts'),
      '@tower-ui/web-adapter': path.join(packagesDir, 'web-adapter/src/index.ts'),
    },
    external: ['csharp', 'puerts'],
    loader: { '.ts': 'ts', '.tsx': 'tsx' },
    logLevel: 'warning',
  });

  await ctx.rebuild();
  console.log(`[TowerUI Preview] Initial build done`);

  // WebSocket for HMR
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  function notifyClients() {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'reload' }));
      }
    }
  }

  // Watch for changes
  const watcher = fs.watch(path.dirname(opts.entry), { recursive: true }, async (event, filename) => {
    if (!filename) return;
    if (!filename.match(/\.(tsx?|css)$/)) return;
    try {
      const start = Date.now();
      await ctx.rebuild();
      const elapsed = Date.now() - start;
      console.log(`[HMR] Rebuilt in ${elapsed}ms: ${filename}`);
      notifyClients();
    } catch (e) {
      console.error('[HMR] Build error:', e);
    }
  });

  // HTTP server
  const server = http.createServer((req, res) => {
    let urlPath = req.url ?? '/';
    if (urlPath === '/') urlPath = '/index.html';

    // WebSocket upgrade is handled separately
    const filePath = path.join(outdir, urlPath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/__hmr') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`\n  🚀 TowerUI Preview running at http://localhost:${port}`);
    console.log(`  📐 Canvas: ${width}x${height}`);
    console.log(`  📂 Entry: ${opts.entry}`);
    console.log(`  ⚡ HMR enabled — save a file to see changes\n`);
  });

  return { server, watcher, ctx };
}

function generateHTML(title: string, width: number, height: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a2e;
      color: #e0e0e0;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    #toolbar {
      height: 40px;
      background: #16213e;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
      border-bottom: 1px solid #333;
      font-size: 13px;
      flex-shrink: 0;
    }
    #toolbar .title { font-weight: 600; color: #4da6ff; }
    #toolbar .sep { width: 1px; height: 20px; background: #444; }
    #toolbar select, #toolbar button {
      background: #0f3460;
      color: #e0e0e0;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
    }
    #toolbar button:hover { background: #1a5276; }
    #toolbar .status { margin-left: auto; font-size: 11px; color: #6c757d; }
    #main {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: auto;
      background: #111;
    }
    #canvas-frame {
      width: ${width}px;
      height: ${height}px;
      background: #0a0e1a;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.5);
      border: 1px solid #333;
    }
    #props-panel {
      position: fixed;
      right: 0;
      top: 40px;
      width: 280px;
      height: calc(100vh - 40px);
      background: #16213e;
      border-left: 1px solid #333;
      overflow-y: auto;
      display: none;
      padding: 12px;
      font-size: 12px;
    }
    #props-panel.open { display: block; }
    #props-panel h3 { color: #4da6ff; margin-bottom: 8px; font-size: 14px; }
    #props-panel .prop-row {
      display: flex; justify-content: space-between; padding: 3px 0;
      border-bottom: 1px solid #222;
    }
    #props-panel .prop-key { color: #888; }
    #props-panel .prop-val { color: #e0e0e0; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
    .hmr-indicator {
      width: 8px; height: 8px; border-radius: 50%;
      background: #4caf50; display: inline-block; margin-right: 6px;
    }
    .hmr-indicator.disconnected { background: #f44336; }
  </style>
</head>
<body>
  <div id="toolbar">
    <span class="title">TowerUI Preview</span>
    <div class="sep"></div>
    <select id="resolution">
      <option value="${width}x${height}" selected>${width}x${height}</option>
      <option value="1920x1080">1920x1080</option>
      <option value="1280x720">1280x720</option>
      <option value="750x1334">750x1334 (iPhone)</option>
      <option value="1080x1920">1080x1920 (Android)</option>
      <option value="2560x1440">2560x1440</option>
    </select>
    <button id="btn-inspector">Inspector</button>
    <button id="btn-refresh">Refresh</button>
    <span class="status">
      <span class="hmr-indicator" id="hmr-dot"></span>
      <span id="hmr-status">Connecting...</span>
    </span>
  </div>
  <div id="main">
    <div id="canvas-frame"></div>
  </div>
  <div id="props-panel">
    <h3>Inspector</h3>
    <div id="props-content">Click an element to inspect</div>
  </div>

  <script type="module">
    // HMR WebSocket
    const ws = new WebSocket('ws://' + location.host + '/__hmr');
    const dot = document.getElementById('hmr-dot');
    const status = document.getElementById('hmr-status');
    ws.onopen = () => { dot.className = 'hmr-indicator'; status.textContent = 'HMR Connected'; };
    ws.onclose = () => { dot.className = 'hmr-indicator disconnected'; status.textContent = 'Disconnected'; };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'reload') {
        status.textContent = 'Reloading...';
        location.reload();
      }
    };

    // Resolution switcher
    document.getElementById('resolution').addEventListener('change', (e) => {
      const [w, h] = e.target.value.split('x').map(Number);
      const frame = document.getElementById('canvas-frame');
      frame.style.width = w + 'px';
      frame.style.height = h + 'px';
    });

    // Refresh
    document.getElementById('btn-refresh').addEventListener('click', () => location.reload());

    // Inspector toggle
    document.getElementById('btn-inspector').addEventListener('click', () => {
      document.getElementById('props-panel').classList.toggle('open');
    });

    // Inspector click handler
    document.getElementById('canvas-frame').addEventListener('click', (e) => {
      const panel = document.getElementById('props-panel');
      if (!panel.classList.contains('open')) return;

      const el = e.target;
      if (!(el instanceof HTMLElement)) return;

      const content = document.getElementById('props-content');
      const type = el.dataset.type || 'unknown';
      const style = el.style;
      const rows = [
        '<div class="prop-row"><span class="prop-key">type</span><span class="prop-val">' + type + '</span></div>',
      ];

      const interesting = ['width', 'height', 'backgroundColor', 'color', 'fontSize',
        'flexDirection', 'justifyContent', 'alignItems', 'padding', 'margin',
        'opacity', 'display', 'position', 'top', 'left', 'overflow', 'flex'];

      for (const prop of interesting) {
        const val = style[prop];
        if (val) {
          rows.push('<div class="prop-row"><span class="prop-key">' + prop + '</span><span class="prop-val">' + val + '</span></div>');
        }
      }

      content.innerHTML = rows.join('');
      e.stopPropagation();
    });

    // Load the app bundle
    import('./bundle.js').catch(err => {
      document.getElementById('canvas-frame').innerHTML =
        '<div style="padding:20px;color:#f44336;">Load error: ' + err.message + '</div>';
    });
  </script>
</body>
</html>`;
}
