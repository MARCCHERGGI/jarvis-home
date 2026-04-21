// Backend data sources for JARVIS panels.
// Runs in main process — can read files, call APIs, execute skills.

import { ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir, cpus, totalmem, freemem, loadavg, networkInterfaces } from 'node:os';
import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
const execP = promisify(exec);

const HOME = homedir();

// ─────────────────────────────────────────────────────────────
// 1. STRIPE REVENUE
// ─────────────────────────────────────────────────────────────
async function getStripeRevenue(): Promise<any> {
  try {
    const cfg = JSON.parse(await fs.readFile(
      join(HOME, '.openclaw', 'stripe', 'stripe-config.json'), 'utf-8'
    ));
    const key = cfg.secret_key;

    const todayStart = Math.floor(new Date().setHours(0,0,0,0) / 1000);
    const weekStart = Math.floor((Date.now() - 7*86400000) / 1000);

    // Balance transactions (last week)
    const res = await fetch(
      `https://api.stripe.com/v1/balance_transactions?limit=100&created[gte]=${weekStart}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    const data = await res.json();

    if (!data.data) return { error: 'Stripe API error', todayCents: 0, weekCents: 0, txns: [] };

    const txns = data.data.filter((t: any) => t.type === 'charge');
    const todayCents = txns
      .filter((t: any) => t.created >= todayStart)
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const weekCents = txns.reduce((sum: number, t: any) => sum + t.amount, 0);

    return {
      todayCents,
      weekCents,
      txnCount: txns.length,
      todayCount: txns.filter((t: any) => t.created >= todayStart).length,
      recent: txns.slice(0, 5).map((t: any) => ({
        amount: t.amount / 100,
        desc: t.description || 'Payment',
        time: new Date(t.created * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      })),
    };
  } catch (err) {
    return { error: (err as Error).message, todayCents: 0, weekCents: 0, txns: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// 2. CRYPTO PRICES (public, no key)
// ─────────────────────────────────────────────────────────────
async function getCryptoPrices(): Promise<any> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'
    );
    const data = await res.json();
    return {
      btc: { price: data.bitcoin?.usd, change: data.bitcoin?.usd_24h_change },
      eth: { price: data.ethereum?.usd, change: data.ethereum?.usd_24h_change },
      sol: { price: data.solana?.usd, change: data.solana?.usd_24h_change },
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. OPENCLAW WORKSPACE (read local files)
// ─────────────────────────────────────────────────────────────
async function getOpenClawActivity(): Promise<any> {
  try {
    const memDir = join(HOME, '.openclaw', 'workspace', 'memory');
    const files = await fs.readdir(memDir);
    // Find most recent YYYY-MM-DD.md
    const notes = files.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().reverse();
    const latestNote = notes[0];

    let activity: string[] = [];
    if (latestNote) {
      const content = await fs.readFile(join(memDir, latestNote), 'utf-8');
      // Extract bullet points / list items
      activity = content
        .split('\n')
        .filter(l => l.match(/^[-*]\s+/) || l.match(/^\d+\.\s+/))
        .slice(0, 8)
        .map(l => l.replace(/^[-*\d.]\s+\*\*?/, '').replace(/\*\*/g, '').slice(0, 80));
    }

    // Try to get follow-up queue
    let followups: string[] = [];
    try {
      const fq = await fs.readFile(join(memDir, 'follow-up-queue.md'), 'utf-8');
      followups = fq.split('\n').filter(l => l.match(/^[-*]\s+/)).slice(0, 5)
        .map(l => l.replace(/^[-*]\s+/, '').slice(0, 70));
    } catch {}

    return { latestNote, activity, followups };
  } catch (err) {
    return { error: (err as Error).message, activity: [], followups: [] };
  }
}

// ─────────────────────────────────────────────────────────────
// 4. COMMAND PALETTE — execute skills
// ─────────────────────────────────────────────────────────────
const COMMANDS: Record<string, { label: string; icon: string; cmd: string; args: string[] }> = {
  deploy: {
    label: 'Deploy Vercel',
    icon: '🚀',
    cmd: 'node',
    args: [`${HOME}/.claude/skills/vercel-deploy.mjs`, '--action', 'list'],
  },
  money: {
    label: 'Revenue Check',
    icon: '💰',
    cmd: 'node',
    args: [`${HOME}/.claude/skills/money-dashboard.mjs`, '--action', 'overview'],
  },
  aura: {
    label: 'AURA Status',
    icon: '🌀',
    cmd: 'node',
    args: [`${HOME}/.claude/skills/aura-status.mjs`, '--action', 'overview'],
  },
  trading: {
    label: 'Trading Portfolio',
    icon: '📈',
    cmd: 'node',
    args: [`${HOME}/.claude/skills/trading-control.mjs`, '--action', 'portfolio'],
  },
  telegram: {
    label: 'Send Telegram',
    icon: '💬',
    cmd: 'node',
    args: [`${HOME}/.claude/skills/telegram-send.mjs`, '--action', 'text', '--message', 'Test from JARVIS'],
  },
  vault: {
    label: 'Media Vault',
    icon: '📸',
    cmd: 'node',
    args: [`${HOME}/.claude/skills/media-vault.mjs`, '--action', 'stats'],
  },
};

async function runCommand(id: string): Promise<any> {
  const cmd = COMMANDS[id];
  if (!cmd) return { error: 'Unknown command' };

  return new Promise((resolve) => {
    const proc = spawn(cmd.cmd, cmd.args, { shell: true, windowsHide: true });
    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });
    proc.on('close', (code) => {
      resolve({ code, output: output.slice(0, 500) });
    });
    setTimeout(() => {
      try { proc.kill(); } catch {}
      resolve({ code: -1, output: 'timeout' });
    }, 15000);
  });
}

// ─────────────────────────────────────────────────────────────
// 5. REAL PC STATS
// ─────────────────────────────────────────────────────────────
let prevCpu = cpus().map(c => c.times);
async function getSystemStats() {
  const cs = cpus();
  const curr = cs.map(c => c.times);
  let totalUsage = 0;
  curr.forEach((c, i) => {
    const prev = prevCpu[i];
    const totalDelta = (c.user + c.nice + c.sys + c.idle + c.irq) - (prev.user + prev.nice + prev.sys + prev.idle + prev.irq);
    const idleDelta = c.idle - prev.idle;
    if (totalDelta > 0) totalUsage += 1 - idleDelta / totalDelta;
  });
  prevCpu = curr;
  const cpu = Math.min(1, totalUsage / cs.length);
  const memUsed = (totalmem() - freemem()) / totalmem();
  return {
    cpu,
    mem: memUsed,
    cpuCount: cs.length,
    memTotalGB: (totalmem() / 1e9).toFixed(1),
    memFreeGB: (freemem() / 1e9).toFixed(1),
    uptimeHours: Math.floor(process.uptime() / 3600),
  };
}

// ─────────────────────────────────────────────────────────────
// 6. WEATHER (Open-Meteo, no key, NYC)
// ─────────────────────────────────────────────────────────────
async function getWeather() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=40.7233&longitude=-74.0030&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York'
    );
    const d = await res.json();
    const codeMap: Record<number, string> = {
      0: 'CLEAR', 1: 'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
      45: 'FOG', 48: 'FOG',
      51: 'DRIZZLE', 53: 'DRIZZLE', 55: 'DRIZZLE',
      61: 'RAIN', 63: 'RAIN', 65: 'HEAVY RAIN',
      71: 'SNOW', 73: 'SNOW', 75: 'HEAVY SNOW',
      95: 'STORM', 96: 'STORM', 99: 'HAIL',
    };
    return {
      temp: Math.round(d.current?.temperature_2m ?? 0),
      cond: codeMap[d.current?.weather_code] ?? 'UNKNOWN',
      wind: Math.round(d.current?.wind_speed_10m ?? 0),
      humidity: d.current?.relative_humidity_2m ?? 0,
      sunrise: d.daily?.sunrise?.[0]?.split('T')[1] ?? '—',
      sunset:  d.daily?.sunset?.[0]?.split('T')[1] ?? '—',
      high: Math.round(d.daily?.temperature_2m_max?.[0] ?? 0),
      low:  Math.round(d.daily?.temperature_2m_min?.[0] ?? 0),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// 7. NEWS (Hacker News top stories)
// ─────────────────────────────────────────────────────────────
async function getNews() {
  try {
    const ids = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r => r.json());
    const top = ids.slice(0, 5);
    const stories = await Promise.all(
      top.map((id: number) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
      )
    );
    return stories.map((s: any) => ({
      title: s.title,
      score: s.score,
      by: s.by,
      url: s.url,
      comments: s.descendants,
    }));
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// 8. RECENT GIT COMMITS (from ~/Playground/scripts)
// ─────────────────────────────────────────────────────────────
async function getGitCommits() {
  try {
    const repos = [
      join(HOME, 'OneDrive', 'Documents', 'Playground', 'scripts'),
      join(HOME, 'JARVIS_HOME'),
    ];
    const all: Array<{ repo: string; msg: string; time: string; hash: string }> = [];
    for (const repo of repos) {
      try {
        const { stdout } = await execP(
          `git -C "${repo}" log --pretty=format:"%h|%s|%ar" -5`,
          { timeout: 3000 }
        );
        const lines = stdout.split('\n').filter(Boolean);
        for (const line of lines) {
          const [hash, msg, time] = line.split('|');
          all.push({ repo: repo.split(/[\\/]/).pop() ?? '', hash, msg, time });
        }
      } catch {}
    }
    return all.slice(0, 8);
  } catch (err) {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// 9. MORNING CONTEXT — feeds the morning ritual LLM with who Marco
//    actually is, not a generic user. Pulls mind_intelligence + war_plan
//    + latest OpenClaw note, trimmed aggressively so the prompt stays lean.
// ─────────────────────────────────────────────────────────────
async function readTrimmed(path: string, maxChars: number): Promise<string> {
  try {
    const raw = await fs.readFile(path, 'utf-8');
    // Strip YAML frontmatter if present
    const body = raw.replace(/^---[\s\S]*?---\s*/m, '').trim();
    if (body.length <= maxChars) return body;
    return body.slice(0, maxChars) + '…';
  } catch {
    return '';
  }
}

async function getLatestOpenClawNote(maxChars: number): Promise<string> {
  try {
    const notesDir = join(HOME, '.openclaw', 'workspace', 'memory');
    const files = await fs.readdir(notesDir);
    const dated = files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse();
    if (!dated.length) return '';
    return readTrimmed(join(notesDir, dated[0]), maxChars);
  } catch {
    return '';
  }
}

async function getMorningContext(): Promise<any> {
  const memDir = join(HOME, '.claude', 'projects', 'C--Users-hergi', 'memory');
  const [mind, warPlan, latestNote, frontier] = await Promise.all([
    readTrimmed(join(memDir, 'mind_intelligence.md'), 2400),
    readTrimmed(join(memDir, 'project_war_plan.md'), 1400),
    getLatestOpenClawNote(900),
    readTrimmed(join(memDir, 'frontier_intel.md'), 800),
  ]);
  return { mind, warPlan, latestNote, frontier };
}

// ─────────────────────────────────────────────────────────────
// Register all IPC handlers
// ─────────────────────────────────────────────────────────────
export function registerDataSources() {
  ipcMain.handle('data:stripe', async () => getStripeRevenue());
  ipcMain.handle('data:crypto', async () => getCryptoPrices());
  ipcMain.handle('data:openclaw', async () => getOpenClawActivity());
  ipcMain.handle('cmd:list', async () => Object.entries(COMMANDS).map(([id, c]) => ({
    id, label: c.label, icon: c.icon,
  })));
  ipcMain.handle('cmd:run', async (_e, id: string) => runCommand(id));
  ipcMain.handle('data:system', async () => getSystemStats());
  ipcMain.handle('data:weather', async () => getWeather());
  ipcMain.handle('data:news', async () => getNews());
  ipcMain.handle('data:commits', async () => getGitCommits());
  ipcMain.handle('data:morningContext', async () => getMorningContext());
}
