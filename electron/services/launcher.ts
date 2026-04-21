import { spawn } from 'node:child_process';
import { shell } from 'electron';

type Result = { ok: boolean; error?: string };

const APP_MAP: Record<string, { cmd: string; args?: string[] }> = {
  openclaw: { cmd: 'openclaw', args: ['agent', '--agent', 'main'] },
  hermes: { cmd: 'hermes' },
  'claude-code': { cmd: 'claude' },
  code: { cmd: 'code' },
};

export async function launchApp(name: string): Promise<Result> {
  const key = name.toLowerCase();
  const entry = APP_MAP[key];
  if (!entry) return { ok: false, error: `unknown app: ${name}` };
  try {
    const child = spawn(entry.cmd, entry.args ?? [], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function launchUrl(url: string): Promise<Result> {
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
