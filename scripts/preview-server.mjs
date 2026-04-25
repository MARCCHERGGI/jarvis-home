/**
 * JARVIS repo preview — what people will see at github.com/MARCCHERGGI/jarvis-home
 * once public. Renders all key markdown + source files with a GitHub-ish look.
 *
 *   node scripts/preview-server.mjs
 *
 * Then open http://localhost:7901
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = 7901;

const FILES = [
  { section: 'Repo root' },
  { path: 'README.md', label: 'README.md' },
  { path: 'LICENSE', label: 'LICENSE' },
  { path: 'CONTRIBUTING.md', label: 'CONTRIBUTING.md' },
  { path: 'SECURITY.md', label: 'SECURITY.md' },
  { path: '.env.example', label: '.env.example' },
  { path: 'package.json', label: 'package.json' },

  { section: 'Briefing scripts (the soul)' },
  { path: 'briefing-scripts/README.md', label: 'README — format' },
  { path: 'briefing-scripts/morning.md', label: 'morning.md' },
  { path: 'briefing-scripts/evening.md', label: 'evening.md' },
  { path: 'briefing-scripts/arrival.md', label: 'arrival.md' },

  { section: 'Plugin docs' },
  { path: 'docs/architecture.md', label: 'architecture' },
  { path: 'docs/voices.md', label: 'voices (TTS)' },
  { path: 'docs/brains.md', label: 'brains (LLM)' },
  { path: 'docs/scenes.md', label: 'scenes (3D)' },

  { section: 'Examples' },
  { path: 'examples/minimal/README.md', label: 'minimal/README' },
  { path: 'examples/minimal/main.ts', label: 'minimal/main.ts' },

  { section: 'Framework core (~200 LOC)' },
  { path: 'src/core/index.ts', label: 'index.ts' },
  { path: 'src/core/types.ts', label: 'types.ts' },
  { path: 'src/core/parse-briefing.ts', label: 'parse-briefing.ts' },
  { path: 'src/core/briefing-engine.ts', label: 'briefing-engine.ts' },

  { section: 'CI / build' },
  { path: '.github/workflows/release.yml', label: 'release.yml' },
  { path: '.github/ISSUE_TEMPLATE/bug_report.md', label: 'bug_report' },
  { path: '.github/ISSUE_TEMPLATE/feature_request.md', label: 'feature_request' },
  { path: 'build/entitlements.mac.plist', label: 'mac entitlements' },
];

const HTML = `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8">
  <title>jarvis-home — repo preview</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown-light.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11/lib/common.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      background: #f6f8fa;
      color: #1f2328;
      display: grid;
      grid-template-columns: 300px 1fr;
      min-height: 100vh;
    }
    .sidebar {
      background: #ffffff;
      border-right: 1px solid #d0d7de;
      padding: 20px 0;
      position: sticky;
      top: 0;
      max-height: 100vh;
      overflow-y: auto;
    }
    .brand { padding: 0 20px 16px; border-bottom: 1px solid #d0d7de; margin-bottom: 12px; }
    .brand h1 { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
    .brand p { margin: 4px 0 0; font-size: 12px; color: #59636e; line-height: 1.4; }
    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 2px 8px;
      background: #ddf4ff;
      color: #0969da;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
    }
    .section {
      padding: 14px 20px 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #59636e;
    }
    .file {
      display: block;
      padding: 6px 20px 6px 22px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      color: #1f2328;
      text-decoration: none;
      border-left: 2px solid transparent;
      cursor: pointer;
    }
    .file:hover { background: #f6f8fa; }
    .file.active {
      background: #ddf4ff;
      border-left-color: #0969da;
      color: #0969da;
      font-weight: 500;
    }
    .main {
      padding: 32px 48px 80px;
      max-width: 980px;
      width: 100%;
    }
    .breadcrumb {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      color: #59636e;
      margin-bottom: 22px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .breadcrumb code {
      background: #eaeef2;
      padding: 3px 8px;
      border-radius: 6px;
      color: #1f2328;
      font-size: 12px;
    }
    .markdown-body {
      font-size: 16px;
      line-height: 1.6;
      background: transparent !important;
    }
    .markdown-body pre {
      background: #f6f8fa !important;
      border: 1px solid #d0d7de;
      border-radius: 6px;
    }
    .markdown-body img[src*="shields.io"] { display: inline-block; vertical-align: middle; margin: 2px; }
    pre code.hljs {
      padding: 18px;
      border-radius: 6px;
      font-size: 13.5px;
      line-height: 1.55;
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      display: block;
      overflow-x: auto;
    }
    .raw-pre {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 18px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      line-height: 1.5;
      overflow-x: auto;
      white-space: pre;
      color: #1f2328;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #d0d7de;
      font-size: 12px;
      color: #59636e;
    }
    .footer code {
      background: #eaeef2;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .top-meta {
      padding: 16px 20px;
      background: linear-gradient(135deg, #ddf4ff, #fff);
      border-bottom: 1px solid #d0d7de;
      font-size: 12px;
      color: #59636e;
    }
    .top-meta strong { color: #1f2328; }
  </style>
</head><body>
  <aside class="sidebar">
    <div class="brand">
      <h1>MARCCHERGGI / jarvis-home</h1>
      <p>open-source cinematic AI desktop UI framework</p>
      <span class="badge">MIT · forkable</span>
    </div>
    <div class="top-meta">
      <strong>Preview:</strong> what visitors see when you flip the repo public. Click any file in the tree.
    </div>
    <div id="tree"></div>
  </aside>
  <main class="main">
    <div class="breadcrumb">
      <span>📁</span><code id="crumb">README.md</code>
    </div>
    <article class="markdown-body" id="content">loading…</article>
    <div class="footer">
      Local preview at <code>localhost:${PORT}</code> · once public, this lives at <code>github.com/MARCCHERGGI/jarvis-home</code>.
    </div>
  </main>
  <script>
    const FILES = ${JSON.stringify(FILES)};
    const tree = document.getElementById('tree');
    const content = document.getElementById('content');
    const crumb = document.getElementById('crumb');

    function renderTree() {
      tree.innerHTML = FILES.map(f => {
        if (f.section) return '<div class="section">' + f.section + '</div>';
        return '<a class="file" href="#' + encodeURIComponent(f.path) + '" data-path="' + f.path + '">' + f.label + '</a>';
      }).join('');
    }

    function escape(s) {
      return s.replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
    }

    async function loadFile(path) {
      crumb.textContent = path;
      try {
        const res = await fetch('/file?path=' + encodeURIComponent(path));
        if (!res.ok) throw new Error('http ' + res.status);
        const text = await res.text();
        const ext = (path.split('.').pop() || '').toLowerCase();
        const isMd = ext === 'md';
        const codeExts = ['ts','tsx','js','mjs','json','yml','yaml','plist'];
        const isCode = codeExts.includes(ext);

        if (isMd) {
          content.innerHTML = marked.parse(text);
        } else if (isCode) {
          const langMap = { mjs: 'javascript', plist: 'xml', yml: 'yaml' };
          const lang = langMap[ext] || ext;
          content.innerHTML = '<pre><code class="hljs language-' + lang + '">' + escape(text) + '</code></pre>';
        } else {
          content.innerHTML = '<pre class="raw-pre">' + escape(text) + '</pre>';
        }
        if (window.hljs) hljs.highlightAll();
        document.querySelectorAll('.file').forEach(a => a.classList.toggle('active', a.dataset.path === path));
        window.scrollTo(0, 0);
      } catch (e) {
        content.innerHTML = '<p style="color:#cf222e">Could not load <code>' + path + '</code>: ' + e.message + '</p>';
      }
    }

    function load() {
      const hash = decodeURIComponent(location.hash.slice(1)) || 'README.md';
      loadFile(hash);
    }

    renderTree();
    window.addEventListener('hashchange', load);
    load();
  </script>
</body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(HTML);
    return;
  }
  if (url.pathname === '/file') {
    const path = url.searchParams.get('path') || '';
    if (path.includes('..') || path.startsWith('/') || path.startsWith('\\')) {
      res.writeHead(400); res.end('bad path'); return;
    }
    try {
      const data = await readFile(join(ROOT, path), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('not found');
    }
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('JARVIS repo preview at http://localhost:' + PORT);
});
