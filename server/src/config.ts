import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = resolve(here, '..');
export const REPO_ROOT = resolve(SERVER_DIR, '..');

/** Minimal .env parser: KEY=VALUE lines, # comments, optional quotes. Never overrides real env. */
export function loadDotEnv(path: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    else val = val.replace(/\s+#.*$/, '');
    if (env[key] === undefined) env[key] = val;
  }
}

export interface Config {
  port: number;
  apiKey: string | undefined;
  model: string;
  dataDir: string;
  memoLimit: { max: number; windowMs: number };
  askLimit: { max: number; windowMs: number };
  allowedOrigins: string[];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  loadDotEnv(resolve(SERVER_DIR, '.env'), env);
  loadDotEnv(resolve(REPO_ROOT, '.env'), env);
  const key = env.ANTHROPIC_API_KEY?.trim();
  return {
    port: Number(env.PORT) || 8787,
    apiKey: key ? key : undefined,
    model: env.MODEL?.trim() || 'claude-sonnet-5',
    dataDir: env.DATA_DIR ? resolve(env.DATA_DIR) : resolve(REPO_ROOT, 'web/public/data'),
    memoLimit: { max: Number(env.MEMO_RATE_MAX) || 10, windowMs: 10 * 60_000 },
    askLimit: { max: Number(env.ASK_RATE_MAX) || 30, windowMs: 10 * 60_000 },
    allowedOrigins: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'],
  };
}
